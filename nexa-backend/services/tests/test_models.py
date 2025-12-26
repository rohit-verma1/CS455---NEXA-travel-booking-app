import pytest
from django.utils import timezone
from datetime import timedelta
from services.models import BusService, TrainService, FlightService

@pytest.mark.django_db
def test_bus_service_creation(provider_user, base_route, vehicle, policy):
    service = BusService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=5),
        base_price=500.0,
        sleeper_price=600.0,
        non_sleeper_price=400.0
    )
    assert service.route == base_route
    service.apply_dynamic_pricing()
    assert service.current_sleeper_price is None or service.current_sleeper_price >= 0

@pytest.mark.django_db
def test_train_service_creation_and_price(provider_user, base_route, vehicle, policy):
    t_service = TrainService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        train_name="Superfast Express",
        train_number="12345",
        base_price=1000.0,
        sleeper_price=1200.0,
        second_ac_price=1500.0,
        third_ac_price=900.0,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=8)
    )
    assert "Superfast" in str(t_service)
    assert t_service.total_bogies == 0
    assert t_service.total_seats == 0

@pytest.mark.django_db
def test_flight_service_creation_and_pricing(provider_user, base_route, vehicle, policy):
    f_service = FlightService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        flight_number="AI202",
        airline_name="Air India",
        base_price=8000.0,
        business_price=10000.0,
        premium_price=9000.0,
        economy_price=7000.0,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=3)
    )
    f_service.dynamic_pricing_enabled = True
    f_service.apply_dynamic_pricing(occupancy_rate=0.3, time_to_departure_hours=6)
    assert "Air India" in str(f_service)
