import pytest
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from services.models import Station, Route, Vehicle, Policy

User = get_user_model()

@pytest.fixture
def provider_user(db):
    return User.objects.create_user(
        username="provuser",
        email="prov@example.com",
        password="pass",
        user_type="provider"
    )

@pytest.fixture
def customer_user(db):
    return User.objects.create_user(
        username="custuser",
        email="cust@example.com",
        password="pass",
        user_type="customer"
    )

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(
        username="adminuser",
        email="admin@example.com",
        password="pass"
    )

@pytest.fixture
def base_stations(db):
    source = Station.objects.create(name="Bangalore", code="BLR")
    destination = Station.objects.create(name="Delhi", code="DEL")
    return source, destination

@pytest.fixture
def base_route(db, base_stations):
    source, destination = base_stations
    return Route.objects.create(
        source=source,
        destination=destination,
        distance_km=250.0
    )

@pytest.fixture
def vehicle(db):
    return Vehicle.objects.create(
        registration_no="KA01AA1234",
        model="Volvo AC",
        capacity=50,
        amenities=["WiFi", "Charger"],
        status="Active"
    )

@pytest.fixture
def policy(db):
    return Policy.objects.create(
        cancellation_window=12,
        cancellation_fee=50.0,
        reschedule_allowed=True,
        reschedule_fee=20.0,
        no_show_penalty=100.0,
        terms_conditions="Standard T&C"
    )
