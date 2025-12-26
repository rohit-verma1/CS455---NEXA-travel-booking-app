"""
Modern Service Seeder for Nexa Backend
Generates realistic bus, flight, and train services matching the frontend API structure.
"""

import json
import random
import requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

# ==========================
# Configuration
# ==========================
BASE_URL = "http://127.0.0.1:8000"
AUTH_TOKEN = "onKSFH0puJZYJ75MQ8JaAnNN5qV6uvjBXcXxB26w"  # Replace with your actual token

# Load station data
BUS_STATIONS = json.load(open("BusStopsList.json"))
FLIGHT_STATIONS = json.load(open("Airportslist.json"))
TRAIN_STATIONS = json.load(open("TrainStationsList.json"))

# Available amenities
AMENITIES_LIST = [
    'ac', 'blanket', 'charging_ports', 'entertainment_system', 'meal_service',
    'pillow', 'reading_light', 'washroom', 'water_bottle', 'wifi'
]


# ==========================
# Helper Functions
# ==========================

def build_amenities_object(selected_amenities: List[str]) -> Dict[str, bool]:
    """Build amenities object with alphabetically sorted keys."""
    amenities = {}
    for amenity in AMENITIES_LIST:
        amenities[amenity] = amenity in selected_amenities
    return amenities


def random_amenities(min_count: int = 3, max_count: int = 7) -> List[str]:
    """Select random amenities."""
    count = random.randint(min_count, max_count)
    return random.sample(AMENITIES_LIST, count)


def format_iso_timestamp(dt: datetime) -> str:
    """Format datetime as ISO 8601 timestamp."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def calculate_duration(departure: datetime, arrival: datetime) -> str:
    """Calculate duration in HH:MM:SS format."""
    diff = arrival - departure
    total_seconds = int(diff.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def random_city_pair(stations: List[Dict]) -> tuple:
    """Pick two distinct cities."""
    return random.sample(stations, 2)


def build_terms_conditions(baggage: str, luggage: str, terms: str) -> str:
    """Build terms & conditions with baggage/luggage prepended."""
    return f"Baggage Allowance: {baggage}kg. Luggage Allowance: {luggage}kg. {terms}"


# ==========================
# Bus Service Generator
# ==========================

class BusServiceGenerator:
    def __init__(self, api_url: str, token: str):
        self.api_url = f"{api_url}/services/bus-services/"
        self.token = token

    def random_vehicle(self, capacity: int) -> Dict[str, Any]:
        """Generate random bus vehicle details."""
        models = ["Volvo AC Sleeper", "Scania Comfort", "Ashok Leyland Semi-Sleeper", "Tata Starbus"]
        reg_prefixes = ['DL', 'MH', 'KA', 'TS', 'UP', 'GJ', 'RJ']
        
        return {
            "registration_no": f"{random.choice(reg_prefixes)}{random.randint(1,99):02d}AB{random.randint(1000,9999)}",
            "model": random.choice(models),
            "capacity": capacity,
            "amenities": build_amenities_object(random_amenities()),
            "status": "Active"
        }
    
    def random_policy(self) -> Dict[str, Any]:
        """Generate random cancellation policy."""
        baggage = str(random.choice([15, 20, 25]))
        luggage = str(random.choice([10, 15, 20]))
        terms = "Standard cancellation and refund terms apply. No refund for no-show."
        
        return {
            "cancellation_window": random.choice([6, 12, 24]),
            "cancellation_fee": f"{random.randint(100, 200)}.00",
            "reschedule_allowed": True,
            "reschedule_fee": f"{random.randint(50, 150)}.00",
            "no_show_penalty": f"{random.randint(150, 300)}.00",
            "terms_conditions": build_terms_conditions(baggage, luggage, terms),
            "no_cancellation_fee_markup": f"{random.randint(0, 100)}.00",
            "no_reschedule_fee_markup": f"{random.randint(0, 50)}.00"
        }

    def format_bus_stations(self, bus_stops: List[Dict], base_time: datetime) -> List[Dict[str, str]]:
        """Format bus stations with time offsets."""
        result = []
        for i, stop in enumerate(bus_stops):
            stop_time = base_time + timedelta(minutes=(i + 1) * random.randint(5, 15))
            result.append({
                "code": stop["code"],
                "name": stop["name"],
                "time": format_iso_timestamp(stop_time)
            })
        return result
    
    def format_stops(self, stops: List[Dict], destination_arrival: datetime, base_price: float) -> List[Dict[str, Any]]:
        """Format intermediate stops."""
        result = []
        for i, stop in enumerate(stops):
            stop_time = datetime.fromisoformat(stop["departure_time"].replace("Z", ""))
            duration = calculate_duration(stop_time, destination_arrival)
            price_reduction = random.uniform(0.2, 0.4) * base_price
            
            result.append({
                "stop_order": i + 1,
                "station": {
                    "name": stop["station"]["name"],
                    "code": stop["station"]["code"],
                    "city": stop["station"]["city"],
                    "state": stop["station"]["state"],
                    "BusStations": self.format_bus_stations(
                        stop["station"]["points"][:random.randint(2, 4)],
                        stop_time
                    )
                },
                "price_to_destination": f"{base_price - price_reduction:.2f}",
                "duration_to_destination": duration
            })
        return result
    
    def generate_service(self, start_date: datetime) -> Dict[str, Any]:
        """Generate a complete bus service payload."""
        source, destination = random_city_pair(BUS_STATIONS)
        
        # Random departure and arrival times
        departure = start_date.replace(
            hour=random.randint(5, 22),
            minute=random.choice([0, 15, 30, 45]),
            second=0,
            microsecond=0
        )
        travel_hours = random.randint(4, 16)
        arrival = departure + timedelta(hours=travel_hours, minutes=random.randint(0, 59))
        
        # Seat configuration
        num_rows_sleeper = random.randint(5, 10)
        num_columns_sleeper = 2
        num_rows_seater = random.randint(8, 15)
        num_columns_seater = 4
        capacity = (num_rows_sleeper * num_columns_sleeper) + (num_rows_seater * num_columns_seater)
        
        # Pricing
        base_price = random.randint(400, 1200)
        sleeper_price = base_price * random.uniform(1.5, 2.0)
        seater_price = base_price
        
        # Intermediate stops (0-2 stops)
        num_stops = random.randint(0, 2)
        intermediate_stops = []
        if num_stops > 0:
            available_stations = [s for s in BUS_STATIONS if s not in (source, destination)]
            selected_stops = random.sample(available_stations, min(num_stops, len(available_stations)))
            
            for i, stop in enumerate(selected_stops):
                stop_time = departure + timedelta(hours=(i + 1) * (travel_hours / (num_stops + 1)))
                intermediate_stops.append({
                    "departure_time": format_iso_timestamp(stop_time),
                    "station": stop
                })
        
        # Build payload matching frontend structure
        payload = {
            "route": {
                "source": {
                    "name": source["name"],
                    "code": source["code"],
                    "city": source["city"],
                    "state": source["state"],
                    "BusStations": self.format_bus_stations(
                        source["points"][:random.randint(3, 5)],
                        departure
                    )
                },
                "destination": {
                    "name": destination["name"],
                    "code": destination["code"],
                    "city": destination["city"],
                    "state": destination["state"],
                    "BusStations": self.format_bus_stations(
                        destination["points"][:random.randint(3, 5)],
                        arrival
                    )
                },
                "distance_km": random.randint(100, 1500),
                "estimated_duration": calculate_duration(departure, arrival),
                "stops": self.format_stops(intermediate_stops, arrival, base_price),
                "source_pickup_points": {},
                "destination_dropoff_points": {}
            },
            "vehicle": self.random_vehicle(capacity),
            "policy": self.random_policy(),
            "departure_time": format_iso_timestamp(departure),
            "arrival_time": format_iso_timestamp(arrival),
            "status": "Scheduled",
            "bus_number": str(random.randint(1000, 9999)),
            "bus_travels_name": random.choice([
                "RedBus Travels", "BlueLine Coaches", "ExpressWay Buses",
                "CityLink Travels", "Royal Cruiser", "VRL Travels"
            ]),
            "num_rows_sleeper": num_rows_sleeper,
            "num_columns_sleeper": num_columns_sleeper,
            "num_rows_non_sleeper": num_rows_seater,
            "num_columns_non_sleeper": num_columns_seater,
            "base_price": f"{base_price:.2f}",
            "sleeper_price": f"{sleeper_price:.2f}",
            "non_sleeper_price": f"{seater_price:.2f}",
            "dynamic_pricing_enabled": random.choice([True, False]),
            "dynamic_factor": round(random.uniform(1.0, 1.5), 2)
        }
        
        return payload
    
    def create_service(self, payload: Dict[str, Any]) -> bool:
        """Post service to backend."""
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Token {self.token}"
                },
                json=payload
            )
            
            if response.ok:
                print(f"✅ Bus service created: {payload['route']['source']['city']} → "
                      f"{payload['route']['destination']['city']} ({payload['bus_number']})")
                return True
            else:
                print(f"❌ Failed to create bus service: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
        except Exception as e:
            print(f"❌ Error creating bus service: {str(e)}")
            return False
    
    def seed(self, num_services: int, start_date: datetime):
        """Generate and create multiple services."""
        print(f"\n{'='*60}")
        print(f"🚌 Creating {num_services} Bus Services")
        print(f"{'='*60}\n")
        
        success_count = 0
        for i in range(num_services):
            date = start_date + timedelta(days=random.randint(0, 30))
            payload = self.generate_service(date)
            if self.create_service(payload):
                success_count += 1
        
        print(f"\n✨ Successfully created {success_count}/{num_services} bus services\n")



# ==========================
# Flight Service Generator
# ==========================

class FlightServiceGenerator:
    def __init__(self, api_url: str, token: str):
        self.api_url = f"{api_url}/services/flight-services/"
        self.token = token
    
    def random_vehicle(self, capacity: int) -> Dict[str, Any]:
        """Generate random aircraft details."""
        models = ["Airbus A320", "Boeing 737", "Airbus A321neo", "Boeing 787", "ATR 72"]
        reg_prefixes = ['VT-ALQ', 'VT-BXN', 'VT-CKD', 'VT-DLZ', 'VT-EPH']
        
        return {
            "registration_no": random.choice(reg_prefixes),
            "model": random.choice(models),
            "capacity": capacity,
            "amenities": build_amenities_object(random_amenities(5, 9)),
            "status": "Active"
        }
    
    def random_policy(self) -> Dict[str, Any]:
        """Generate random flight policy."""
        baggage = str(random.choice([15, 20, 25, 30]))
        luggage = str(random.choice([7, 10, 15]))
        terms = "Standard airline cancellation policy applies. Check-in closes 45 minutes before departure."
        
        return {
            "cancellation_window": random.choice([24, 48, 72]),
            "cancellation_fee": f"{random.randint(1000, 2500)}.00",
            "reschedule_allowed": True,
            "reschedule_fee": f"{random.randint(800, 1500)}.00",
            "no_show_penalty": f"{random.randint(2000, 4000)}.00",
            "terms_conditions": build_terms_conditions(baggage, luggage, terms),
            "no_cancellation_fee_markup": f"{random.randint(0, 500)}.00",
            "no_reschedule_fee_markup": f"{random.randint(0, 300)}.00"
        }
    
    def generate_service(self, start_date: datetime) -> Dict[str, Any]:
        """Generate a complete flight service payload."""
        source, destination = random_city_pair(FLIGHT_STATIONS)
        
        # Random departure and arrival times
        departure = start_date.replace(
            hour=random.randint(5, 22),
            minute=random.choice([0, 15, 30, 45]),
            second=0,
            microsecond=0
        )
        travel_hours = random.randint(1, 4)
        travel_minutes = random.choice([0, 15, 30, 45])
        arrival = departure + timedelta(hours=travel_hours, minutes=travel_minutes)
        
        # Seat configuration
        num_rows_business = random.randint(3, 6)
        num_columns_business = 4
        num_rows_premium = random.randint(5, 10)
        num_columns_premium = 6
        num_rows_economy = random.randint(15, 25)
        num_columns_economy = 6
        
        capacity = (num_rows_business * num_columns_business + 
                   num_rows_premium * num_columns_premium + 
                   num_rows_economy * num_columns_economy)
        
        # Pricing
        base_economy = random.randint(3000, 8000)
        premium_price = base_economy * random.uniform(1.6, 2.0)
        business_price = base_economy * random.uniform(2.5, 3.5)
        
        # Build payload matching frontend structure
        payload = {
            "route": {
                "source": {
                    "name": source["name"],
                    "code": source["code"],
                    "city": source["city"],
                    "state": source["state"],
                    "BusStations": {}
                },
                "destination": {
                    "name": destination["name"],
                    "code": destination["code"],
                    "city": destination["city"],
                    "state": destination["state"],
                    "BusStations": {}
                },
                "distance_km": random.randint(300, 2500),
                "estimated_duration": calculate_duration(departure, arrival),
                "stops": [],
                "source_pickup_points": {},
                "destination_dropoff_points": {}
            },
            "vehicle": self.random_vehicle(capacity),
            "policy": self.random_policy(),
            "flight_number": f"{random.choice(['AI', '6E', 'UK', 'SG', 'QP'])}{random.randint(100, 999)}",
            "airline_name": random.choice([
                "Air India", "IndiGo", "Vistara", "SpiceJet", "Akasa Air", "Go First"
            ]),
            "aircraft_model": random.choice(["Airbus A320", "Boeing 737", "A321neo", "Boeing 787"]),
            "num_rows_business": num_rows_business,
            "num_columns_business": num_columns_business,
            "num_rows_premium": num_rows_premium,
            "num_columns_premium": num_columns_premium,
            "num_rows_economy": num_rows_economy,
            "num_columns_economy": num_columns_economy,
            "base_price": f"{base_economy:.2f}",
            "business_price": f"{business_price:.2f}",
            "premium_price": f"{premium_price:.2f}",
            "economy_price": f"{base_economy:.2f}",
            "dynamic_pricing_enabled": random.choice([True, False]),
            "dynamic_factor": round(random.uniform(1.0, 1.8), 2),
            "departure_time": format_iso_timestamp(departure),
            "arrival_time": format_iso_timestamp(arrival),
            "status": "Scheduled"
        }
        
        return payload
    
    def create_service(self, payload: Dict[str, Any]) -> bool:
        """Post service to backend."""
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Token {self.token}"
                },
                json=payload
            )
            
            if response.ok:
                print(f"✅ Flight service created: {payload['route']['source']['city']} → "
                      f"{payload['route']['destination']['city']} ({payload['flight_number']})")
                return True
            else:
                print(f"❌ Failed to create flight service: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
        except Exception as e:
            print(f"❌ Error creating flight service: {str(e)}")
            return False
    
    def seed(self, num_services: int, start_date: datetime):
        """Generate and create multiple services."""
        print(f"\n{'='*60}")
        print(f"✈️  Creating {num_services} Flight Services")
        print(f"{'='*60}\n")
        
        success_count = 0
        for i in range(num_services):
            date = start_date + timedelta(days=random.randint(0, 60))
            payload = self.generate_service(date)
            if self.create_service(payload):
                success_count += 1
        
        print(f"\n✨ Successfully created {success_count}/{num_services} flight services\n")



# ==========================
# Train Service Generator
# ==========================

class TrainServiceGenerator:
    def __init__(self, api_url: str, token: str):
        self.api_url = f"{api_url}/services/train-services/"
        self.token = token
    
    def random_vehicle(self, capacity: int) -> Dict[str, Any]:
        """Generate random locomotive details."""
        models = ["WAP-7", "WAG-9", "WDP-4D", "WAP-4", "WAP-5"]
        
        return {
            "registration_no": f"{random.choice(models)} {random.randint(30000, 39999)}",
            "model": random.choice(models),
            "capacity": capacity,
            "amenities": build_amenities_object(random_amenities(4, 8)),
            "status": "Active"
        }
    
    def random_policy(self) -> Dict[str, Any]:
        """Generate random train policy."""
        baggage = str(random.choice([40, 50, 60]))
        luggage = str(random.choice([20, 25, 30]))
        terms = "Indian Railways cancellation policy applies. Refund as per railway rules."
        
        return {
            "cancellation_window": random.choice([4, 6, 12]),
            "cancellation_fee": f"{random.randint(80, 200)}.00",
            "reschedule_allowed": True,
            "reschedule_fee": f"{random.randint(50, 150)}.00",
            "no_show_penalty": f"{random.randint(300, 600)}.00",
            "terms_conditions": build_terms_conditions(baggage, luggage, terms),
            "no_cancellation_fee_markup": f"{random.randint(0, 100)}.00",
            "no_reschedule_fee_markup": f"{random.randint(0, 80)}.00"
        }
    
    def random_bogies_config(self) -> tuple:
        """Generate random bogie configuration and calculate capacity."""
        config = {}
        total_capacity = 0
        
        # Sleeper class
        if random.choice([True, True, False]):
            count = random.randint(5, 12)
            seats_per = 72
            config['sleeper'] = {'count': count, 'seats_per_bogie': seats_per}
            total_capacity += count * seats_per
        
        # Third AC
        if random.choice([True, False]):
            count = random.randint(2, 6)
            seats_per = 64
            config['third_ac'] = {'count': count, 'seats_per_bogie': seats_per}
            total_capacity += count * seats_per
        
        # Second AC
        if random.choice([True, False, False]):
            count = random.randint(1, 4)
            seats_per = 48
            config['second_ac'] = {'count': count, 'seats_per_bogie': seats_per}
            total_capacity += count * seats_per
        
        # Ensure at least one bogie type
        if not config:
            count = random.randint(8, 12)
            config['sleeper'] = {'count': count, 'seats_per_bogie': 72}
            total_capacity = count * 72
        
        return config, total_capacity
    
    def generate_service(self, start_date: datetime) -> Dict[str, Any]:
        """Generate a complete train service payload with 2-6 intermediate stops."""
        source, destination = random_city_pair(TRAIN_STATIONS)

        # Random departure and arrival times
        departure = start_date.replace(
            hour=random.randint(0, 23),
            minute=random.choice([0, 15, 30, 45]),
            second=0,
            microsecond=0
        )
        travel_hours = random.randint(6, 48)
        travel_minutes = random.choice([0, 15, 30, 45])
        arrival = departure + timedelta(hours=travel_hours, minutes=travel_minutes)

        # Bogie configuration and capacity
        bogies_config, capacity = self.random_bogies_config()

        # Pricing based on available classes
        base_price = random.randint(300, 1500)
        prices = {}

        if 'sleeper' in bogies_config:
            prices['sleeper_price'] = f"{base_price:.2f}"
        if 'third_ac' in bogies_config:
            prices['third_ac_price'] = f"{base_price * 0.8:.2f}"
        if 'second_ac' in bogies_config:
            prices['second_ac_price'] = f"{base_price * 3.5:.2f}"

        # Base price should be the lowest available
        base_price_value = base_price

        # Generate 2-6 intermediate stops (distinct from source and destination)
        num_stops = random.randint(2, 6)
        available_stations = [s for s in TRAIN_STATIONS if s not in (source, destination)]
        selected_stops = random.sample(available_stations, min(num_stops, len(available_stations)))

        # Distribute stop times evenly between departure and arrival (further stops are closer to destination)
        total_trip_seconds = (arrival - departure).total_seconds()
        stops = []
        # Generate decreasing price and duration as stop_order increases
        # Closest to source: highest price/duration; closest to destination: lowest
        for i, stop in enumerate(selected_stops):
            # Reverse order: first stop is farthest from destination
            stop_index = len(selected_stops) - i  # 1-based: highest for first stop
            stop_time = departure + timedelta(seconds=(i + 1) * total_trip_seconds / (len(selected_stops) + 1))
            # Price: start from a higher value, decrease as stop_index decreases
            max_markup = 0.5  # up to 50% more than base price for farthest stop
            min_markup = 0.1  # at least 10% more than base price for closest stop
            markup = max_markup - (max_markup - min_markup) * (i / (len(selected_stops) - 1)) if len(selected_stops) > 1 else max_markup
            price_to_dest = base_price_value * (1 + markup)
            # Duration: time from stop to arrival
            duration_to_dest = calculate_duration(stop_time, arrival)
            stops.append({
                "stop_order": i + 1,
                "station": {
                    "name": stop["name"],
                    "code": stop["code"],
                    "city": stop["city"],
                    "state": stop["state"],
                    "BusStations": {}
                },
                "arrival_time": format_iso_timestamp(stop_time),
                "price_to_destination": f"{price_to_dest:.2f}",
                "duration_to_destination": duration_to_dest
            })

        # Build payload matching frontend structure
        payload = {
            "route": {
                "source": {
                    "name": source["name"],
                    "code": source["code"],
                    "city": source["city"],
                    "state": source["state"],
                    "BusStations": {}
                },
                "destination": {
                    "name": destination["name"],
                    "code": destination["code"],
                    "city": destination["city"],
                    "state": destination["state"],
                    "BusStations": {}
                },
                "distance_km": random.randint(200, 3500),
                "estimated_duration": calculate_duration(departure, arrival),
                "stops": stops,
                "source_pickup_points": {},
                "destination_dropoff_points": {}
            },
            "vehicle": self.random_vehicle(capacity),
            "policy": self.random_policy(),
            "train_name": random.choice([
                "Rajdhani Express", "Shatabdi Express", "Duronto Express",
                "Garib Rath", "Sampark Kranti", "Humsafar Express",
                "Jan Shatabdi", "Tejas Express", "Vande Bharat"
            ]),
            "train_number": str(random.randint(10000, 99999)),
            "bogies_config": bogies_config,
            "base_price": f"{base_price_value:.2f}",
            **prices,
            "dynamic_pricing_enabled": random.choice([True, False]),
            "dynamic_factor": round(random.uniform(1.0, 1.4), 2),
            "departure_time": format_iso_timestamp(departure),
            "arrival_time": format_iso_timestamp(arrival),
            "status": "Scheduled"
        }

        return payload
    
    def create_service(self, payload: Dict[str, Any]) -> bool:
        """Post service to backend."""
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Token {self.token}"
                },
                json=payload
            )
            
            if response.ok:
                print(f"✅ Train service created: {payload['route']['source']['city']} → "
                      f"{payload['route']['destination']['city']} ({payload['train_number']})")
                return True
            else:
                print(f"❌ Failed to create train service: {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
        except Exception as e:
            print(f"❌ Error creating train service: {str(e)}")
            return False
    
    def seed(self, num_services: int, start_date: datetime):
        """Generate and create multiple services."""
        print(f"\n{'='*60}")
        print(f"🚂 Creating {num_services} Train Services")
        print(f"{'='*60}\n")
        
        success_count = 0
        for i in range(num_services):
            date = start_date + timedelta(days=random.randint(0, 45))
            payload = self.generate_service(date)
            if self.create_service(payload):
                success_count += 1
        
        print(f"\n✨ Successfully created {success_count}/{num_services} train services\n")


# ==========================
# Main Script
# ==========================

def main():
    """Main seeder script."""
    print("\n" + "="*60)
    print("🌟 NEXA SERVICE SEEDER")
    print("="*60)
    
    # Configuration
    start_date = datetime(2025, 11, 23)
    num_buses = 10
    num_flights = 10
    num_trains = 10
    
    # Initialize generators
    bus_gen = BusServiceGenerator(BASE_URL, AUTH_TOKEN)
    flight_gen = FlightServiceGenerator(BASE_URL, AUTH_TOKEN)
    train_gen = TrainServiceGenerator(BASE_URL, AUTH_TOKEN)
    
    # Run seeders
    bus_gen.seed(num_buses, start_date)
    flight_gen.seed(num_flights, start_date)
    train_gen.seed(num_trains, start_date)
    
    print("\n" + "="*60)
    print("✨ SEEDING COMPLETE!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()