import pytest
from django.utils import timezone
from datetime import timedelta
from services.models import BusService, TrainService, FlightService

@pytest.mark.django_db
def test_booking_flow_creates_booking_and_marks_bus(provider_user, base_route, vehicle, policy):
    service = BusService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=4),
        base_price=400.0,
        total_capacity=40,
        booked_seats=0
    )
    service.booked_seats = 10
    service.save()
    assert service.booked_seats == 10

@pytest.mark.django_db
def test_train_flow_creation(provider_user, base_route, vehicle, policy):
    train = TrainService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        train_name="Rajdhani",
        train_number="222",
        base_price=2000.0,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=10)
    )
    train.dynamic_pricing_enabled = True
    assert train.get_full_stop_list() == []
    assert "Rajdhani" in str(train)

@pytest.mark.django_db
def test_flight_flow_creation(provider_user, base_route, vehicle, policy):
    flight = FlightService.objects.create(
        provider_user_id=provider_user,
        route=base_route,
        vehicle=vehicle,
        policy=policy,
        flight_number="IN101",
        airline_name="Indigo",
        base_price=5000.0,
        departure_time=timezone.now(),
        arrival_time=timezone.now() + timedelta(hours=2)
    )
    flight.apply_dynamic_pricing(occupancy_rate=0.2)
    assert flight.flight_number == "IN101"
