# services/test/test_serializers_views.py
import pytest
from rest_framework.test import APIRequestFactory
from services.serializers import (
    BusServiceCreateSerializer,
    TrainServiceCreateSerializer,
    FlightServiceCreateSerializer
)
from django.utils import timezone
from datetime import timedelta
from services.models import TrainSeat, FlightSeat, BusSeat

@pytest.fixture
def route_data():
    return {
        "source": {"name": "Bangalore", "code": "BLR"},
        "destination": {"name": "Delhi", "code": "DEL"},
        "distance_km": 500
    }

@pytest.fixture
def vehicle_data():
    return {
        "registration_no": "TN01AA1234",
        "model": "Volvo AC",
        "capacity": 45,
        "amenities": ["WiFi"],
        "status": "Active"
    }

@pytest.fixture
def policy_data():
    return {
        "cancellation_window": 12,
        "cancellation_fee": "50.00",
        "reschedule_allowed": True,
        "reschedule_fee": "25.00",
        "no_show_penalty": "75.00",
        "terms_conditions": "Standard Policy"
    }

# ---------------------------
# Bus create + save + assert
# ---------------------------
@pytest.mark.django_db
def test_busservice_serializer_valid(provider_user, route_data, vehicle_data, policy_data):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = provider_user

    data = {
        "route": route_data,
        "vehicle": vehicle_data,
        "policy": policy_data,
        "departure_time": timezone.now(),
        "arrival_time": timezone.now() + timedelta(hours=5),
        "base_price": "500.00",
        "bus_number": 101,
        "bus_travels_name": "Test Travels",
        # keep seat config minimal so seats generated deterministically
        "num_rows_sleeper": 1,
        "num_columns_sleeper": 2,
        "num_rows_non_sleeper": 0,
        "num_columns_non_sleeper": 0,
        "sleeper_price": "500.00",
        "non_sleeper_price": "500.00"
    }

    serializer = BusServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    instance = serializer.save()
    assert instance is not None
    # route nested creation check
    assert instance.route.source.name == "Bangalore"
    # seats created
    seats = BusSeat.objects.filter(bus_service=instance).count()
    assert seats == 2  # 1 row * 2 columns

# ---------------------------
# Train create + save + seats
# ---------------------------
@pytest.mark.django_db
def test_trainservice_serializer_valid(provider_user, route_data, vehicle_data, policy_data):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = provider_user

    data = {
        "route": route_data,
        "vehicle": vehicle_data,
        "policy": policy_data,
        "train_name": "Intercity Express",
        "train_number": "IC123",
        "base_price": "700.00",
        "departure_time": timezone.now(),
        "arrival_time": timezone.now() + timedelta(hours=3),
        # minimal bogies_config -> 1 bogie with 4 seats
        "bogies_config": {
            "Sleeper": {"count": 1, "seats_per_bogie": 4}
        },
    }

    serializer = TrainServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    instance = serializer.save()
    assert instance is not None
    # ensure route is created
    assert instance.route.source.code == "BLR"
    # check seats created according to bogies_config
    seat_count = TrainSeat.objects.filter(train_service=instance).count()
    assert seat_count == 4

# ---------------------------
# Flight create + save + assert
# ---------------------------
@pytest.mark.django_db
def test_flightservice_serializer_valid(provider_user, route_data, vehicle_data, policy_data):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = provider_user

    data = {
        "route": route_data,
        "vehicle": vehicle_data,
        "policy": policy_data,
        "flight_number": "AI303",
        "airline_name": "Air India",
        "base_price": "5000.00",
        "departure_time": timezone.now(),
        "arrival_time": timezone.now() + timedelta(hours=2),
        # minimal seating so generation is small
        "num_rows_business": 0,
        "num_columns_business": 0,
        "num_rows_premium": 0,
        "num_columns_premium": 0,
        "num_rows_economy": 1,
        "num_columns_economy": 2,
        "business_price": "8000.00",
        "premium_price": "6000.00",
        "economy_price": "3000.00",
    }

    serializer = FlightServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    instance = serializer.save()
    assert instance is not None
    assert instance.airline_name == "Air India"
    # seats created for economy: 1 * 2
    seat_count = FlightSeat.objects.filter(flight_service=instance).count()
    assert seat_count == 2
