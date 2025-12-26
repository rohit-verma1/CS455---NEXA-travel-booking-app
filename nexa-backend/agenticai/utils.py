import json
from django.db.models import Q, Min, Subquery, OuterRef, JSONField, IntegerField
from django.conf import settings
import google.generativeai as genai
from google.generativeai.protos import Tool, FunctionDeclaration, Schema, Type
from django.utils import timezone
from services.models import (
    Station, TrainService, RouteStop, Route,
    BusService, FlightService
)
from bookings.serializers import (
    TrainSearchResultSerializer,
    BusServiceSeatAvailabilitySerializer,
    
)
from .serializers import FlightSearchResultSerializer
from user_management.models import ServiceProvider
import datetime
from decimal import Decimal

def parse_date(date_str):
    """Parse a date string in YYYY-MM-DD format."""
    try:
        return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        return None
class BookingAgent:
    def __init__(self):
        """
        Initializes Gemini and defines the tool schema.
        """
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

        self.booking_tool = Tool(
            function_declarations=[
                FunctionDeclaration(
                    name='create_booking_plan',
                    description="Creates a step-by-step plan to fulfill a user's travel booking request.",
                    parameters=Schema(
                        type=Type.OBJECT,
                        properties={
                            'steps': Schema(
                                type=Type.ARRAY,
                                description="Sequence of booking search actions.",
                                items=Schema(
                                    type=Type.OBJECT,
                                    properties={
                                        'service_type': Schema(type=Type.STRING, enum=["flights", "buses", "trains"]),
                                        'source': Schema(type=Type.STRING),
                                        'destination': Schema(type=Type.STRING),
                                        'date': Schema(type=Type.STRING),
                                        'price_lt': Schema(type=Type.INTEGER),
                                    },
                                    required=["service_type", "source", "destination", "date"]
                                ),
                            )
                        },
                        required=["steps"]
                    )
                )
            ]
        )

    def _create_plan_with_gemini(self, query: str) -> dict:
        """
        Uses Gemini API to produce a structured booking plan.
        Ensures function call output even if model responds conversationally.
        """
        try:
            # 🔧 Make the instruction explicit
            prompt = f"""
            You are a travel booking assistant. 
            Your job is to plan how to fulfill the user's travel query.

            - You MUST call the tool function `create_booking_plan` exactly once.
            - Each plan step should specify:
            - service_type: "flights", "buses", or "trains"
            - source: city/station/airport name
            - destination: city/station/airport name
            - date: in YYYY-MM-DD format
            - price_lt (optional): integer budget limit

            Example call:
            create_booking_plan({{
                "steps": [
                    {{
                        "service_type": "flights",
                        "source": "Bangalore",
                        "destination": "Delhi",
                        "date": "2025-11-12",
                        "price_lt": 5000
                    }}
                ]
            }})

            Now, generate a valid structured plan for this request:
            ---
            {query}
            ---
            """
            prompt =  prompt + "Today's date is " + datetime.date.today().strftime("%Y-%m-%d") + "."

            # Call Gemini with the tool definition
            response = self.model.generate_content(
                prompt ,
                tools=[self.booking_tool]
            )

            # ✅ Extract function call safely
            candidate = response.candidates[0]
            if not candidate.content.parts:
                return {'error': 'Empty response from Gemini.'}

            part = candidate.content.parts[0]
            if not hasattr(part, "function_call") or part.function_call.name != "create_booking_plan":
                # Fallback: try to parse JSON text manually (for non-function replies)
                raw_text = candidate.content.parts[0].text if hasattr(candidate.content.parts[0], "text") else ""
                try:
                    possible_json = json.loads(raw_text)
                    if isinstance(possible_json, dict) and "steps" in possible_json:
                        return possible_json
                except Exception:
                    pass
                return {'error': 'Invalid plan structure from Gemini (no function call).'}

            # ✅ Proper function call path
            function_call = part.function_call
            plan = {key: value for key, value in function_call.args.items()}
            return plan

        except Exception as e:
            return {'error': f"Gemini API error: {e}"}


    # -----------------------------------------------------------------------------------
    #  MODEL-BASED SEARCH FUNCTIONS
    # -----------------------------------------------------------------------------------

    def _search_trains(self, step):
        source = step["source"]
        destination = step["destination"]
        date = step.get("date")
        class_type = "Sleeper"
        date_filter = parse_date(date)

        source_stations = list(Station.objects.filter(Q(name__icontains=source) | Q(code__iexact=source) | Q(city__icontains=source)))
        dest_stations = list(Station.objects.filter(Q(name__icontains=destination) | Q(code__iexact=destination) | Q(city__icontains=destination)))

        if not source_stations or not dest_stations:
            return {"error": "Invalid source or destination."}

        source_station_ids = {s.station_id for s in source_stations}
        dest_station_ids = {s.station_id for s in dest_stations}

        query_filters = Q(route__source__in=source_stations) | Q(route__stops__station__in=source_stations)
        if date_filter:
            query_filters &= Q(departure_time__date=date_filter)

        candidate_services = TrainService.objects.select_related(
            "route", "route__source", "route__destination", "vehicle"
        ).prefetch_related("segments", "segments__from_station", "segments__to_station").filter(query_filters).distinct()

        results = []
        for svc in candidate_services:
            full_stop_list = svc.get_full_stop_list()
            stop_order_map = {station.station_id: order for order, station in full_stop_list}
            try:
                start_station_id = next(sid for sid in stop_order_map if sid in source_station_ids)
                end_station_id = next(sid for sid in stop_order_map if sid in dest_station_ids)
                start_station_obj = next(s for _, s in full_stop_list if s.station_id == start_station_id)
                end_station_obj = next(s for _, s in full_stop_list if s.station_id == end_station_id)
            except StopIteration:
                continue

            start_order, end_order = stop_order_map[start_station_id], stop_order_map[end_station_id]
            if start_order >= end_order:
                continue

            availability_field = {
                'Sleeper': 'available_count_sleeper',
                'SecondAC': 'available_count_second_ac',
                'ThirdAC': 'available_count_third_ac'
            }[class_type]

            min_availability = svc.segments.filter(
                segment_index__in=range(start_order, end_order)
            ).aggregate(min_seats=Min(availability_field))['min_seats'] or 0

            price = svc.get_price_for_journey(start_station_obj, end_station_obj, class_type)

            serializer = TrainSearchResultSerializer(
                svc, context={
                    "from_station": start_station_obj.station_id,
                    "to_station": end_station_obj.station_id,
                    "class_type": class_type
                }
            )
            data = serializer.data
            data.update({
                "price": float(price or 0.0),
                "available_seats": min_availability,
                "bookable": min_availability > 0 and price is not None
            })
            results.append(data)

        return {"mode": "train", "count": len(results), "results": results}

    def _search_buses(self, step):
        source = step["source"]
        destination = step["destination"]
        date = step.get("date")
 
        source_filter = Q(station__code__iexact=source) | Q(station__name__icontains=source) | Q(station__city__icontains=source)
        dest_filter = Q(station__code__iexact=destination) | Q(station__name__icontains=destination) | Q(station__city__icontains=destination)
        source_stops = RouteStop.objects.filter(source_filter)
        dest_stops = RouteStop.objects.filter(dest_filter)

        valid_routes = {s.route_id for s in source_stops for d in dest_stops if s.route_id == d.route_id and s.stop_order < d.stop_order}
        if not valid_routes:
            return {"error": "No valid route found."}

        bus_services = BusService.objects.filter(route_id__in=valid_routes, status="Scheduled")
        if date:
            bus_services = bus_services.filter(departure_time__date=date)

        provider_query = ServiceProvider.objects.filter(user=OuterRef('provider_user_id'))
        bus_services = bus_services.annotate(
            rating=Subquery(provider_query.values('ratings_dict')[:1], output_field=JSONField()),
            no_of_reviews=Subquery(provider_query.values('total_reviews')[:1], output_field=IntegerField()),
        )
        serializer = BusServiceSeatAvailabilitySerializer(bus_services, many=True)
        return {"mode": "bus", "count": len(serializer.data), "results": serializer.data}

    def _search_flights(self, step):
        source = step["source"]
        destination = step["destination"]
        date = step.get("date")
        print("Searching flights:", source, "to", destination, "on", date)

        # ✅ Match either airport code OR airport name
        source_filter = Q(source__code__iexact=source) | Q(source__name__icontains=source) | Q(source__city__icontains=source)
        dest_filter = Q(destination__code__iexact=destination) | Q(destination__name__icontains=destination) | Q(destination__city__icontains=destination)

        valid_routes = Route.objects.filter(source_filter, dest_filter).values_list('route_id', flat=True)
        print(valid_routes)
        if not valid_routes:
            return {"error": f"No route found for '{source}' → '{destination}'."}

        flights = FlightService.objects.filter(route_id__in=valid_routes, status="Scheduled")
        if date:
            flights = flights.filter(departure_time__date=date)

        if not flights.exists():
            return {"error": f"No scheduled flights found for {source} → {destination} on {date or 'any date'}."}
    
        serializer = FlightSearchResultSerializer(flights, many=True)
        return {
            "mode": "flight",
            "count": len(serializer.data),
            "results": serializer.data
        }


    # -----------------------------------------------------------------------------------

    def execute(self, query: str):
        plan = self._create_plan_with_gemini(query)
        if 'error' in plan or not plan.get("steps"):
            return {'error': 'Unable to create a plan.'}

        plan_results = {}
        for i, step in enumerate(plan["steps"]):
            step_type = step["service_type"]
            step_key = f"step_{i+1}_{step_type}_{step['source']}_to_{step['destination']}"
            if step_type == "trains":
                result = self._search_trains(step)
            elif step_type == "buses":
                result = self._search_buses(step)
            elif step_type == "flights":
                result = self._search_flights(step)
            else:
                result = {"error": f"Unsupported service type: {step_type}"}
            plan_results[step_key] = result
            print(plan_results)

        return plan_results


import re
import json
import datetime
from django.db.models import Q, Min
from django.utils import timezone
from django.conf import settings
from rest_framework.response import Response

import google.generativeai as genai

from services.models import Route, FlightService, BusService, TrainService
import time

import re, json, datetime
from django.conf import settings
from django.db.models import Q, Min
from django.utils import timezone
import google.generativeai as genai


class TripPlanner:
    """
    AI Trip Planner — Integrates LLM reasoning with real route + fare data.
    """

    SUPPORTED_LOCATIONS = [
        "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
        "Goa", "Pune", "Jaipur", "Ahmedabad", "Lucknow", "Kochi", "Varanasi",
        "Chandigarh", "Bhopal", "Indore", "Guwahati", "Patna", "Surat", "Nagpur"
    ]

    def __init__(self):
        if not getattr(settings, "GEMINI_API_KEY", None):
            raise ValueError("GEMINI_API_KEY is not configured.")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    # -------------------------------------------------------------------------
    def _safe_extract_json(self, text: str):
        """Extract the first valid JSON object from any LLM response."""
        # Try to find the first {...} block in the response
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            json_str = match.group(0)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # Try to fix trailing commas and such
                json_str = re.sub(r",\s*([\]}])", r"\1", json_str)
                try:
                    return json.loads(json_str)
                except Exception:
                    pass
        # fallback: detect mode words manually
        lowered = text.lower()
        if "flight" in lowered:
            return {"mode": "flights", "reason": "LLM hint: flight"}
        elif "train" in lowered:
            return {"mode": "trains", "reason": "LLM hint: train"}
        elif "bus" in lowered:
            return {"mode": "buses", "reason": "LLM hint: bus"}
        return {"mode": "unknown", "reason": "Unclear response"}

    # -------------------------------------------------------------------------
    def _extract_location(self, text: str) -> str:
        """Find the first known location mentioned in user text."""
        for loc in self.SUPPORTED_LOCATIONS:
            if re.search(rf"\b{loc}\b", text, re.IGNORECASE):
                return loc
        return None

    # -------------------------------------------------------------------------
    def _parse_trip_query(self, query: str) -> dict:
        """
        Extract trip info from free-form text.
        Example: "Plan a 5-day trip from Delhi to Goa for 2 people under 30000 starting 15th Dec 2025"
        """
        pattern = re.compile(
            r"from\s+(?P<source>[A-Za-z\s]+)\s+to\s+(?P<destination>[A-Za-z\s]+)"
            r"(?:.*?\bfor\s+(?P<days>\d+)\s+days?)?"
            r"(?:.*?\bfor\s+(?P<people>\d+)\s+(?:people|persons|travellers|adults))?"
            r"(?:.*?\bstarting\s+(?P<start_date>[0-9]{1,2}\w*\s+\w+\s+[0-9]{4}))?"
            r"(?:.*?\bunder\s+(?P<budget>[0-9,]+))?",
            re.IGNORECASE,
        )

        match = pattern.search(query)
        groups = match.groupdict() if match else {}

        source = groups.get("source") or self._extract_location(query)
        destination = groups.get("destination") or self._extract_location(
            query.replace(source or "", "")
        )

        days = int(groups.get("days") or 3)
        people = int(groups.get("people") or 2)
        budget = int(str(groups.get("budget") or "20000").replace(",", ""))

        start_date = None
        if groups.get("start_date"):
            try:
                start_date = datetime.datetime.strptime(
                    groups["start_date"]
                    .replace("st", "")
                    .replace("nd", "")
                    .replace("rd", "")
                    .replace("th", ""),
                    "%d %B %Y",
                ).date()
            except Exception:
                start_date = None

        return {
            "source": source or "Delhi",
            "destination": destination or "Goa",
            "days": days,
            "people": people,
            "start_date": start_date or timezone.now().date() + datetime.timedelta(days=7),
            "budget": budget,
            "raw_query": query.strip(),
        }

    # -------------------------------------------------------------------------
    def _decide_transport_mode(self, info: dict, direction="outbound"):
        """Ask Gemini to suggest best transport mode (clean JSON enforced)."""
        prompt = f"""
        You are an intelligent Indian travel planner.
        The raw user query is:
        \"\"\"{info['raw_query']}\"\"\"

        Extracted Trip details:
        - Direction: {direction}
        - Source: {info['source']}
        - Destination: {info['destination']}
        - Days: {info['days']}
        - People: {info['people']}
        - Total Budget: ₹{info['budget']}

        Choose the best mode of transport for this trip (flights, trains, or buses).
        Respond *only* in pure JSON:
        {{
          "mode": "<flights|trains|buses>",
          "reason": "Explain your reasoning briefly."
        }}
        """
        response = self.model.generate_content(prompt)
        time.sleep(10)  # To avoid rate limits
        text = getattr(response, "text", str(response))
        print(f"LLM {direction.capitalize()} Transport Decision Response:", text)
        return self._safe_extract_json(text)

    # -------------------------------------------------------------------------
    def _get_cheapest_fare(self, source, destination, mode="Flight"):
        """Fetch real cheapest fare for validation."""
        source_filter = (
            Q(source__code__iexact=source)
            | Q(source__city__icontains=source)
            | Q(source__name__icontains=source)
        )
        destination_filter = (
            Q(destination__code__iexact=destination)
            | Q(destination__city__icontains=destination)
            | Q(destination__name__icontains=destination)
        )
        routes = Route.objects.filter(source_filter & destination_filter)
        if not routes.exists():
            return None

        if mode.lower() == "flight":
            fare = FlightService.objects.filter(route__in=routes, status="Scheduled").aggregate(
                min_price=Min("economy_price")
            )
        elif mode.lower() == "bus":
            fare = BusService.objects.filter(route__in=routes, status="Scheduled").aggregate(
                min_price=Min("non_sleeper_price")
            )
        else:
            fare = TrainService.objects.filter(route__in=routes, status="Scheduled").aggregate(
                min_price=Min("sleeper_price")
            )
        return fare.get("min_price")

    # -------------------------------------------------------------------------
    def _llm_budget_split(self, info: dict):
        """Ask Gemini for intelligent budget split for N people."""
        prompt = f"""
        You are an Indian travel budgeting expert.
        The raw user query is:
        \"\"\"{info['raw_query']}\"\"\"
        Extracted Trip details:
        - Source: {info['source']} → Destination: {info['destination']}
        - {info['days']} days, {info['people']} people
        - Total budget: ₹{info['budget']}
        - Main transport: {info['mode']}

        Split the total budget into categories (transport, stay, food, misc, total).
        Respond *only* in JSON format.
        """
        response = self.model.generate_content(prompt)
        time.sleep(10)  # To avoid rate limits
        text = getattr(response, "text", str(response))
        print("LLM Budget Split Response:", text)
        data = self._safe_extract_json(text)

        # fallback if structure not perfect
        if not isinstance(data, dict) or "transport" not in data:
            total = info["budget"]
            mode = info["mode"]
            if mode == "flights":
                data = {"transport": total * 0.4, "stay": total * 0.35, "food": total * 0.15, "misc": total * 0.1}
            elif mode == "buses":
                data = {"transport": total * 0.2, "stay": total * 0.45, "food": total * 0.25, "misc": total * 0.1}
            else:
                data = {"transport": total * 0.25, "stay": total * 0.45, "food": total * 0.2, "misc": total * 0.1}
            data["total"] = total

        for k in data:
            try:
                data[k] = round(float(data[k]), 2)
            except Exception:
                pass
        return data

    # -------------------------------------------------------------------------
    def _generate_itinerary(self, info: dict):
        """Generate a rich daily itinerary."""
        prompt = f"""
        Generate a {info['days']}-day itinerary for a trip from {info['source']} to {info['destination']}
        starting on {info['start_date'].strftime('%d %B %Y')}, for {info['people']} people.
        Include morning, afternoon, and evening activities for each day.
        End with a return travel note. the raw user query is:
        \"\"\"{info['raw_query']}\"\"\"
        Output should be human-readable (no JSON).
        """
        response = self.model.generate_content(prompt)
        return getattr(response, "text", str(response)).strip()

    # -------------------------------------------------------------------------
    def plan_trip(self, query: str) -> dict:
        """Main orchestrator."""
        info = self._parse_trip_query(query)
        source, destination = info["source"], info["destination"]

        # 1️⃣ Decide transport modes (outbound and return)
        outbound = self._decide_transport_mode(info, "outbound")
        return_trip = self._decide_transport_mode(info, "return")

        # 2️⃣ Verify cheapest fares
        outbound_mode = outbound["mode"].capitalize().rstrip("s")
        return_mode = return_trip["mode"].capitalize().rstrip("s")
        cheapest_out = self._get_cheapest_fare(source, destination, outbound_mode)
        cheapest_back = self._get_cheapest_fare(destination, source, return_mode)
        outbound["cheapest_fare"] = cheapest_out or "Not available"
        return_trip["cheapest_fare"] = cheapest_back or "Not available"

        # 3️⃣ Budget split
        info["mode"] = outbound["mode"]
        expense_split = self._llm_budget_split(info)

        # 4️⃣ Itinerary
        itinerary = self._generate_itinerary(info)

        end_date = info["start_date"] + datetime.timedelta(days=info["days"])

        return {
            "trip_summary": {
                **info,
                "end_date": str(end_date),
            },
            "transport_decision": {"outbound": outbound, "return": return_trip},
            "expenses": expense_split,
            "itinerary": itinerary,
        }

