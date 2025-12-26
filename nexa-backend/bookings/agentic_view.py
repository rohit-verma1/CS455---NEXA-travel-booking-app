# apps/travel/views_gemini.py
import os
from datetime import datetime
from typing import Optional, Dict

from django.conf import settings
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Google GenAI client (Gemini)
from google import genai  # pip install google-genai

# Import your models/serializers - adapt to your project
from services.models import Station, Route, FlightService
from .serializers import FlightServiceSeatAvailabilitySerializer

# Initialize Gemini client once (module-level)
_genai_client = None
def get_gemini_client():
    global _genai_client
    if _genai_client is None:
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set in settings.")
        _genai_client = genai.Client(api_key=api_key)
    return _genai_client

# Prompt template for parsing search queries into structured output
PARSER_PROMPT = """
You are a travel assistant that extracts structured fields from short user requests.
Return ONLY a JSON object with keys: intent, source, destination, date, class.
- intent: either "search_flight" or "other"
- source/destination: canonical city or airport code if present (e.g., "DEL" or "Delhi")
- date: ISO format YYYY-MM-DD if a date is found, otherwise null
- class: one of ["Economy","Business","First","Any"] or null

Examples:
Input: "Book Flight from Delhi to Bangalore on 10th Nov"
Output: {{"intent":"search_flight","source":"Delhi","destination":"Bangalore","date":"2025-11-10","class":"Any"}}

Now parse this input:
### USER_INPUT: {user_input}
"""
# Note: adjust example year if you want relative-date parsing logic (Gemini can parse relative dates)

def call_gemini_parse(user_input: str) -> Optional[Dict]:
    client = get_gemini_client()
    prompt = PARSER_PROMPT.format(user_input=user_input)
    # Use a compact generation call
    resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    # response text should be a JSON string; best-effort parse
    text = getattr(resp, "text", None) or str(resp)
    import json
    try:
        # sometimes models add extraneous text; try to find first JSON object
        start = text.find("{")
        end = text.rfind("}") + 1
        json_text = text[start:end]
        parsed = json.loads(json_text)
        return parsed
    except Exception:
        return None

class GeminiFlightSearchAPIView(APIView):
    """
    Agentic-style Travel Search endpoint using Gemini to parse the natural search.
    POST body: { "query": "Book Flight from Delhi to Bangalore on 10th Nov" }
    """
    permission_classes = [permissions.AllowAny]
    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'query': openapi.Schema(type=openapi.TYPE_STRING, description='Natural language flight search query'),
            },
            required=['query'],
        ),
        responses={200: openapi.Response('Search Results', FlightServiceSeatAvailabilitySerializer(many=True))},
    )
    def post(self, request):
        query = request.data.get("query")
        if not query:
            return Response({"error": "query is required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1) Parse using Gemini
        parsed = call_gemini_parse(query)
        if not parsed:
            return Response({"error": "Could not parse query."}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        if parsed.get("intent") != "search_flight":
            return Response({"error": "Intent not recognized as flight search."}, status=status.HTTP_400_BAD_REQUEST)

        source_raw = parsed.get("source")
        destination_raw = parsed.get("destination")
        date_raw = parsed.get("date")
        class_raw = parsed.get("class") or "Any"

        # 2) Normalize / validate against fixed set of airports (your fixed set)
        # Exact/partial match strategy - try code then city/name
        def find_airport(value: str):
            if not value:
                return None
            v = value.strip()
            # try code exact
            ap = Station.objects.filter(name__iexact=v).first()
            if ap:
                return ap
            # try city or name contains
            ap = Station.objects.filter(Q(city__iexact=v) | Q(name__icontains=v)).first()
            return ap

        src_ap = find_airport(source_raw)
        dst_ap = find_airport(destination_raw)

        if not src_ap or not dst_ap:
            return Response({"error": "Source or Destination not in allowed list."}, status=status.HTTP_404_NOT_FOUND)

        # 3) Parse date
        travel_date = None
        if date_raw:
            try:
                travel_date = datetime.strptime(date_raw, "%Y-%m-%d").date()
            except ValueError:
                # try other common patterns
                try:
                    travel_date = datetime.fromisoformat(date_raw).date()
                except Exception:
                    return Response({"error": "Unable to parse date."}, status=status.HTTP_400_BAD_REQUEST)

        # 4) Query FlightService for matching scheduled flights
        qs = FlightService.objects.filter(
            route__source=src_ap,
            route__destination=dst_ap,
            status="Scheduled"
        )

        if travel_date:
            qs = qs.filter(departure_time__date=travel_date)

        # Optionally filter by class availability — logic here depends on your model fields
        # e.g., check at least one seat in any class
        serializer = FlightServiceSeatAvailabilitySerializer(qs, many=True, context={"request": request})
        results = serializer.data

        return Response({
            "query": query,
            "parsed": parsed,
            "count": len(results),
            "results": results
        }, status=status.HTTP_200_OK)
