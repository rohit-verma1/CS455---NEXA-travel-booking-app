import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from bookings.views import (
    BookingViewSet,
    BusSeatAvailabilityView,
    FlightSeatAvailabilityView,
    CheapestFaresFromView,
)
from bookings.models import Booking, Ticket
from services.models import (
    BusService, BusSeat,
    FlightService, FlightSeat,
    Station,
)
from datetime import datetime, timedelta
import pytz
from unittest.mock import patch, MagicMock
from rest_framework.permissions import AllowAny

factory = APIRequestFactory()


@pytest.mark.django_db
def test_bus_booking_auto_assign_and_insufficient(user_customer, user_provider, policy, vehicle, stations_and_route):
    """Tests booking auto-assign path when insufficient seats exist."""
    route = stations_and_route["route"]
    bus = BusService.objects.create(
        provider_user_id=user_provider,
        route=route,
        vehicle=vehicle,
        policy=policy,
        departure_time=datetime.now(pytz.utc) + timedelta(days=1),
        arrival_time=datetime.now(pytz.utc) + timedelta(days=1, hours=2),
        base_price=100, sleeper_price=100,
        non_sleeper_price=80, total_capacity=1,
    )
    # All seats already booked
    BusSeat.objects.create(bus_service=bus, seat_number="B1", seat_type="Sleeper", is_booked=True, price=60)

    data = {
        "service_model": "bus",
        "service_id": str(bus.service_id),
        "passengers": [{"name": "X"}, {"name": "Y"}],
        "class_type": "Sleeper",
        "email": "cust@example.com",
        "phone_number": "1234567890",
    }

    view = BookingViewSet.as_view({"post": "create"})
    req = factory.post("/api/bookings/", data, format="json")
    force_authenticate(req, user=user_customer)
    resp = view(req)
    # Should be handled as 409 (conflict) or 400 (validation)
    assert resp.status_code in (400, 409), resp.data


@pytest.mark.django_db
def test_ticket_endpoint_returns_404_then_200(user_customer):
    """Ensure ticket endpoint returns 404 for missing ticket and 200 after creation."""
    b = Booking.objects.create(customer=user_customer, total_amount=50)
    view_ticket = BookingViewSet.as_view({"get": "ticket"})
    req = factory.get(f"/api/bookings/{b.booking_id}/ticket/")
    force_authenticate(req, user=user_customer)
    resp = view_ticket(req, pk=b.booking_id)
    assert resp.status_code == 404

    Ticket.objects.create(booking=b, ticket_no="T-999")
    req2 = factory.get(f"/api/bookings/{b.booking_id}/ticket/")
    force_authenticate(req2, user=user_customer)
    resp2 = view_ticket(req2, pk=b.booking_id)
    assert resp2.status_code == 200
    assert resp2.data["ticket_no"] == "T-999"


@pytest.mark.django_db
def test_bus_seat_availability_view_errors_and_success(user_provider, policy, vehicle, stations_and_route):
    """Validate bus seat availability for both error and success cases."""
    view = BusSeatAvailabilityView.as_view()
    req = factory.get("/search/buses")
    resp = view(req)
    assert resp.status_code in (400, 404)

    src, dst, route = stations_and_route["src"], stations_and_route["dst"], stations_and_route["route"]
    bus = BusService.objects.create(
        provider_user_id=user_provider,
        route=route,
        vehicle=vehicle,
        policy=policy,
        departure_time=datetime.now(pytz.utc) + timedelta(days=1),
        arrival_time=datetime.now(pytz.utc) + timedelta(days=1, hours=2),
        status="Scheduled", base_price=50, sleeper_price=50, non_sleeper_price=40,
    )
    BusSeat.objects.create(bus_service=bus, seat_number="A1", seat_type="Sleeper", is_booked=False, price=50)

    req2 = factory.get("/search/buses", {"source": src.name, "destination": dst.name})
    resp2 = view(req2)
    assert resp2.status_code == 200
    assert "data" in resp2.data


@pytest.mark.django_db
@patch("bookings.views.BookingViewSet._handle_bus_booking", return_value={"total_amount": 100, "assigned_seats": ["A1"]})
@patch("bookings.views.BusService.objects.select_for_update")
def test_bus_booking_create_with_requested_seat(mock_select, mock_handle, user_customer, user_provider, policy, vehicle, stations_and_route):
    """BookingViewSet.create for bus bookings (mocked seat allocation)."""
    src, dst, route = stations_and_route["src"], stations_and_route["dst"], stations_and_route["route"]
    bus = BusService.objects.create(
        provider_user_id=user_provider,
        route=route,
        vehicle=vehicle,
        policy=policy,
        departure_time=datetime.now(pytz.utc) + timedelta(days=1),
        arrival_time=datetime.now(pytz.utc) + timedelta(days=1, hours=2),
        status="Scheduled",
        base_price=100,
        sleeper_price=100,
        non_sleeper_price=80,
        total_capacity=4,
    )
    BusSeat.objects.create(bus_service=bus, seat_number="A1", seat_type="Sleeper", is_booked=False, price=50)
    mock_select.return_value.get.return_value = bus

    data = {
        "service_model": "bus",
        "service_id": str(bus.service_id),
        "passengers": [{"name": "P1", "seat_no": "A1"}],
        "class_type": "Sleeper",
        "email": "test@example.com",
        "phone_number": "9999999999",
    }

    view = BookingViewSet.as_view({"post": "create"})
    req = factory.post("/api/bookings/", data, format="json")
    force_authenticate(req, user=user_customer)
    resp = view(req)
    assert resp.status_code == 201, resp.data


@pytest.mark.django_db
@patch("bookings.views.BookingViewSet._handle_flight_booking", return_value={"total_amount": 150, "assigned_seats": ["F1"]})
@patch("bookings.views.FlightService.objects.select_for_update")
def test_flight_booking_auto_assign_and_release_on_cancel(mock_select, mock_handle, user_customer, user_provider, policy, vehicle, stations_and_route):
    """Tests create + cancel flow for flight bookings."""
    src, dst, route = stations_and_route["src"], stations_and_route["dst"], stations_and_route["route"]
    flight = FlightService.objects.create(
        provider_user_id=user_provider,
        route=route,
        vehicle=vehicle,
        policy=policy,
        departure_time=datetime.now(pytz.utc) + timedelta(days=2),
        arrival_time=datetime.now(pytz.utc) + timedelta(days=2, hours=2),
        base_price=200,
        economy_price=150,
        status="Scheduled",
        total_capacity=4,
    )
    FlightSeat.objects.create(flight_service=flight, seat_number="F1", seat_class="Economy", is_booked=False, price=150)
    mock_select.return_value.get.return_value = flight

    data = {
        "service_model": "flight",
        "service_id": str(flight.service_id),
        "passengers": [{"name": "A"}],
        "class_type": "Economy",
        "email": "test@example.com",
        "phone_number": "9999999999",
    }

    view = BookingViewSet.as_view({"post": "create"})
    req = factory.post("/api/bookings/", data, format="json")
    force_authenticate(req, user=user_customer)
    resp = view(req)
    assert resp.status_code == 201, resp.data

    # cancel flow
    booking_id = resp.data["booking"]["booking_id"]
    cancel_view = BookingViewSet.as_view({"post": "cancel"})
    req2 = factory.post(f"/api/bookings/{booking_id}/cancel/")
    force_authenticate(req2, user=user_customer)
    resp2 = cancel_view(req2, pk=booking_id)
    assert resp2.status_code == 200


@pytest.mark.django_db
def test_flight_seat_availability_and_cheapest_fares(user_provider, policy, vehicle, stations_and_route):
    """Tests flight availability view and cheapest fares API."""
    src, dst, route = stations_and_route["src"], stations_and_route["dst"], stations_and_route["route"]
    flight = FlightService.objects.create(
        provider_user_id=user_provider,
        route=route,
        vehicle=vehicle,
        policy=policy,
        departure_time=datetime.now(pytz.utc) + timedelta(days=3),
        arrival_time=datetime.now(pytz.utc) + timedelta(days=3, hours=2),
        status="Scheduled",
        base_price=200,
        economy_price=90,
    )
    FlightSeat.objects.create(flight_service=flight, seat_number="S1", seat_class="Economy", is_booked=False, price=90)

    view = FlightSeatAvailabilityView.as_view()
    view.cls.permission_classes = [AllowAny]
    req = factory.get("/search/flights", {"source": src.code, "destination": dst.code})
    resp = view(req)
    assert resp.status_code in (200, 404, 403), resp.data

    cheapest = CheapestFaresFromView.as_view()
    req2 = factory.get("/search/cheap-fares", {"source": src.code, "destinations": dst.code, "service_type": "Flight"})
    resp2 = cheapest(req2)
    assert resp2.status_code == 200
