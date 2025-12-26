from rest_framework import serializers

class AgentQuerySerializer(serializers.Serializer):
    query = serializers.CharField()

class BookingResponseSerializer(serializers.Serializer):
    results = serializers.JSONField()
    
    
# agent/serializers.py

from rest_framework import serializers


class TripTransportSerializer(serializers.Serializer):
    mode = serializers.CharField()
    price = serializers.FloatField()
    data = serializers.JSONField()


class ExpenseSplitSerializer(serializers.Serializer):
    transport = serializers.FloatField()
    stay = serializers.FloatField()
    food = serializers.FloatField()
    misc = serializers.FloatField()
    total = serializers.FloatField()


class TripSummarySerializer(serializers.Serializer):
    source = serializers.CharField()
    destination = serializers.CharField()
    days = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    budget = serializers.IntegerField()


class TripPlanResponseSerializer(serializers.Serializer):
    trip_summary = TripSummarySerializer()
    transport = serializers.DictField(child=TripTransportSerializer())
    expenses = ExpenseSplitSerializer()
    itinerary = serializers.CharField()
class SmartPromptSerializer(serializers.Serializer):
    smart_prompt = serializers.CharField(
        required=True,
        help_text="Natural language input like 'Flights under ₹8000, 1 stop, after 6PM'"
    )


class SmartFilterLLMResponseSerializer(serializers.Serializer):
    stops = serializers.ChoiceField(
        choices=[("non-stop", "Non Stop"), ("1-stop", "1 Stop"), ("2-stop", "2 Stop")],
        required=False, allow_null=True
    )
    price_min = serializers.FloatField(required=False, allow_null=True)
    price_max = serializers.FloatField(required=False, allow_null=True)
    duration_min = serializers.FloatField(required=False, allow_null=True)
    duration_max = serializers.FloatField(required=False, allow_null=True)
    departure_time = serializers.ChoiceField(
        choices=[
            ("before_6am", "Before 6AM"),
            ("6am_12pm", "6AM - 12PM"),
            ("12pm_6pm", "12PM - 6PM"),
            ("after_6pm", "After 6PM")
        ],
        required=False, allow_null=True
    )
    arrival_time = serializers.ChoiceField(
        choices=[
            ("before_6am", "Before 6AM"),
            ("6am_12pm", "6AM - 12PM"),
            ("12pm_6pm", "12PM - 6PM"),
            ("after_6pm", "After 6PM")
        ],
        required=False, allow_null=True
    )
    airlines = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_null=True
    )
from services.models import FlightService, Route
class FlightSearchResultSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider_user_id.username", read_only=True)
    airline_name = serializers.CharField(read_only=True)
    aircraft_model = serializers.CharField(read_only=True)
    source = serializers.CharField(source="route.source", read_only=True)
    destination = serializers.CharField(source="route.destination", read_only=True)
    stops = serializers.ListField(source="route.via_points", read_only=True)
    amenities = serializers.ListField(source="vehicle.amenities", read_only=True)

    class_type = serializers.CharField(read_only=True)
    price = serializers.FloatField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)
    bookable = serializers.BooleanField(read_only=True)


    class Meta:
        model = FlightService
        fields = [
            "service_id",
            "provider_name",
            "airline_name",
            "aircraft_model",
            "source",
            "destination",
            "departure_time",
            "arrival_time",
            "class_type",
            "price",
            "available_seats",
            "bookable",
            "amenities",
            "stops",

        ]
