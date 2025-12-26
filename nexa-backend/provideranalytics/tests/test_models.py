import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
import importlib, sys, types

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def mock_routes_module(monkeypatch):
    """Ensure routes.models.Station exists so FK references don't crash."""
    fake_routes = types.SimpleNamespace(models=types.SimpleNamespace(Station=MagicMock()))
    sys.modules["routes"] = fake_routes
    sys.modules["routes.models"] = fake_routes.models
    yield


@patch("services.models.FlightService")
@patch("services.models.TrainService")
@patch("services.models.BusService")
@patch("bookings.models.Booking")
@patch("django.contrib.contenttypes.models.ContentType")
def test_routeanalytics_update_from_bookings(
    mock_contenttype, mock_booking, mock_bus, mock_train, mock_flight
):
    import provideranalytics.models as models
    importlib.reload(models)
    RouteAnalytics = models.RouteAnalytics

    mock_booking.objects.filter.return_value.values.return_value.annotate.return_value = [
        {
            "source_id": 1,
            "destination_id": 2,
            "total_bookings": 5,
            "total_revenue": Decimal("2000.00"),
            "bus_revenue": Decimal("500.00"),
            "train_revenue": Decimal("800.00"),
            "flight_revenue": Decimal("700.00"),
        }
    ]
    with patch.object(RouteAnalytics.objects, "get_or_create", return_value=(MagicMock(), True)):
        RouteAnalytics.update_from_bookings()
    mock_booking.objects.filter.assert_called_once()


@patch("bookings.models.Booking")
def test_providerperformance_update_from_bookings(mock_booking):
    import provideranalytics.models as models
    importlib.reload(models)
    ProviderPerformance = models.ProviderPerformance

    mock_booking.objects.filter.return_value.values.return_value.annotate.return_value = [
        {"provider": 1, "total_bookings": 2, "total_revenue": Decimal("500.00")},
    ]

    with patch.object(ProviderPerformance.objects, "get_or_create", return_value=(MagicMock(), False)) as g:
        ProviderPerformance.update_from_bookings()
        assert g.called
    mock_booking.objects.filter.assert_called_once()

