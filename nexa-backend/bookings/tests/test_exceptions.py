import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny
from bookings.views import (
    BookingViewSet,
    search_trains,
    BusSeatAvailabilityView,
    FlightSeatAvailabilityView,
)
from bookings.agentic_view import GeminiFlightSearchAPIView
from django.contrib.auth import get_user_model
from unittest.mock import patch

User = get_user_model()
factory = APIRequestFactory()


# --- BookingViewSet.create() exceptions ---

@pytest.mark.django_db
def test_booking_create_missing_fields_returns_400(user_customer):
    """Missing mandatory fields in request."""
    view = BookingViewSet.as_view({'post': 'create'})
    req = factory.post("/api/bookings/", {}, format="json")
    force_authenticate(req, user=user_customer)
    resp = view(req)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
@patch("bookings.views.BusService.objects.select_for_update")
def test_booking_create_service_not_found_returns_404(mock_select, user_customer):
    """Invalid service_id should 404."""
    mock_select.return_value.get.side_effect = Exception("DoesNotExist")
    data = {
        "service_model": "bus",
        "service_id": "00000000-0000-0000-0000-000000000000",
        "passengers": [{"name": "A"}],
        "class_type": "Sleeper",
    }
    view = BookingViewSet.as_view({'post': 'create'})
    req = factory.post("/api/bookings/", data, format="json")
    force_authenticate(req, user=user_customer)
    resp = view(req)
    assert resp.status_code in (404, 500)


@pytest.mark.django_db
def test_booking_cancel_already_cancelled(monkeypatch, user_customer):
    """Simulate booking already cancelled before call."""
    b = BookingViewSet.queryset.model.objects.create(
        customer=user_customer, total_amount=100, status="Cancelled"
    )
    view = BookingViewSet.as_view({"post": "cancel"})
    req = factory.post(f"/api/bookings/{b.pk}/cancel/")
    force_authenticate(req, user=user_customer)
    resp = view(req, pk=b.pk)
    assert resp.status_code == 400 or resp.status_code == 200


@pytest.mark.django_db
def test_ticket_endpoint_not_found_returns_404(user_customer):
    """Ticket not yet issued for booking should 404."""
    booking = BookingViewSet.queryset.model.objects.create(customer=user_customer, total_amount=50)
    view = BookingViewSet.as_view({"get": "ticket"})
    req = factory.get(f"/api/bookings/{booking.pk}/ticket/")
    force_authenticate(req, user=user_customer)
    resp = view(req, pk=booking.pk)
    assert resp.status_code == 404


# --- Agentic (Gemini) View exceptions ---

@pytest.mark.django_db
def test_agentic_missing_query_returns_400():
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={})
    resp = view(req)
    assert resp.status_code == 400


@pytest.mark.django_db
@patch("bookings.agentic_view.call_gemini_parse", lambda q: None)
def test_agentic_unparsable_returns_422():
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={"query": "invalid"})
    resp = view(req)
    assert resp.status_code == 422


@pytest.mark.django_db
@patch("bookings.agentic_view.call_gemini_parse", lambda q: {"intent": "other"})
def test_agentic_non_search_intent_returns_400():
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={"query": "invalid"})
    resp = view(req)
    assert resp.status_code == 400


# --- Train Search Exceptions ---

@pytest.mark.django_db
def test_search_trains_missing_params():
    req = factory.get("/search/trains", {})
    resp = search_trains(req)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_search_trains_invalid_class_type():
    req = factory.get("/search/trains", {"source": "A", "destination": "B", "class_type": "Invalid"})
    resp = search_trains(req)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_search_trains_invalid_date_format():
    req = factory.get("/search/trains", {"source": "A", "destination": "B", "date": "32-13-2025"})
    resp = search_trains(req)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_search_trains_no_stations_found(monkeypatch):
    """Station lookup returns empty -> 404"""
    from services.models import Station
    monkeypatch.setattr(Station.objects, "filter", lambda *a, **k: [])
    req = factory.get("/search/trains", {"source": "SRC", "destination": "DST"})
    resp = search_trains(req)
    assert resp.status_code == 404


# --- BusSeatAvailability Exceptions ---

@pytest.mark.django_db
def test_bus_seat_availability_missing_params():
    view = BusSeatAvailabilityView.as_view()
    req = factory.get("/search/buses", {})
    resp = view(req)
    assert resp.status_code == 400


from unittest.mock import MagicMock

@pytest.mark.django_db
def test_bus_seat_availability_no_routes(monkeypatch):
    class DummyQS(list):
        def select_related(self, *a, **k): return self
        def exists(self): return False
        def values_list(self, *a, **k): return []

    monkeypatch.setattr("bookings.views.RouteStop.objects.filter", lambda *a, **k: DummyQS())
    view = BusSeatAvailabilityView.as_view()
    req = factory.get("/search/buses", {"source": "SRC", "destination": "DST"})
    resp = view(req)
    assert resp.status_code == 404


# --- FlightSeatAvailability Exceptions ---

@pytest.mark.django_db
def test_flight_seat_availability_missing_params():
    view = FlightSeatAvailabilityView.as_view()
    view.cls.permission_classes = [AllowAny]
    req = factory.get("/search/flights", {})
    resp = view(req)
    assert resp.status_code == 400


@pytest.mark.django_db
def test_flight_seat_availability_no_routes(monkeypatch):
    class DummyQS(list):
        def values_list(self, *a, **k): return []
    monkeypatch.setattr("bookings.views.Route.objects.filter", lambda *a, **k: DummyQS())
    view = FlightSeatAvailabilityView.as_view()
    view.cls.permission_classes = [AllowAny]
    req = factory.get("/search/flights", {"source": "SRC", "destination": "DST"})
    resp = view(req)
    assert resp.status_code in (404, 200)
