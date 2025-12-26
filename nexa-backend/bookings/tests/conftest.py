import pytest
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
import pytz

User = get_user_model()

@pytest.fixture
def user_customer(db):
    u = User.objects.create_user(username="cust", email="cust@example.com", password="pw")
    if not hasattr(u, "user_type"):
        setattr(u, "user_type", "customer")
    return u

@pytest.fixture
def user_provider(db):
    u = User.objects.create_user(username="prov", email="prov@example.com", password="pw")
    if not hasattr(u, "user_type"):
        setattr(u, "user_type", "provider")
    return u

@pytest.fixture
def user_admin(db):
    u = User.objects.create_user(username="admin", email="admin@example.com", password="pw")
    if not hasattr(u, "user_type"):
        setattr(u, "user_type", "admin")
    return u

@pytest.fixture
def policy(db):
    from services.models import Policy
    return Policy.objects.create(
        cancellation_window=24,
        cancellation_fee=10.0,
        reschedule_allowed=True,
        reschedule_fee=5.0,
        no_show_penalty=20.0,
        terms_conditions="T&C",
        no_cancellation_fee_markup=0,
        no_reschedule_fee_markup=0,
    )

@pytest.fixture
def vehicle(db):
    from services.models import Vehicle
    return Vehicle.objects.create(
        registration_no="REG1",
        model="M1",
        capacity=10,
        amenities=[],
        status="Active",
    )

@pytest.fixture
def stations_and_route(db):
    from services.models import Station, Route, RouteStop
    src = Station.objects.create(name="SRCCITY", code="SRC", city="SRC")
    dst = Station.objects.create(name="DSTCITY", code="DST", city="DST")
    route = Route.objects.create(source=src, destination=dst, distance_km=100.0)
    RouteStop.objects.create(route=route, station=src, stop_order=0, price_to_destination=100.0)
    RouteStop.objects.create(route=route, station=dst, stop_order=1, price_to_destination=0.0)
    return {"src": src, "dst": dst, "route": route}
