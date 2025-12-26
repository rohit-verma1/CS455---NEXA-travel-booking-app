import pytest
from rest_framework.test import APIRequestFactory
from services.serializers import (
    BusServiceCreateSerializer,
    TrainServiceCreateSerializer,
    FlightServiceCreateSerializer
)
from django.utils import timezone
from datetime import timedelta


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
        "bus_travels_name": "Test Travels"
    }

    serializer = BusServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    instance = serializer.save()
    assert instance.route.source.name == "Bangalore"


import pytest
from unittest.mock import patch

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
        "bogies_config": {
            "Sleeper": {"count": 1, "seats_per_bogie": 4}
        },
    }

    serializer = TrainServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors



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
        "arrival_time": timezone.now() + timedelta(hours=2)
    }

    serializer = FlightServiceCreateSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors
    instance = serializer.save()
    assert instance.airline_name == "Air India"
