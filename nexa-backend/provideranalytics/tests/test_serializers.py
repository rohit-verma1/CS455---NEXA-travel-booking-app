import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
from uuid import uuid4
import provideranalytics.serializers as s

pytestmark = pytest.mark.django_db


@patch("bookings.models.Booking.objects.filter")
@patch("provideranalytics.serializers.RouteAnalytics.objects.all")
@patch("provideranalytics.serializers.BusService.objects.filter")
@patch("provideranalytics.serializers.TrainService.objects.filter")
@patch("provideranalytics.serializers.FlightService.objects.filter")
def test_dashboard_summary_happy_path(
    mock_flight, mock_train, mock_bus, mock_routeanalytics, mock_booking_filter
):
    mock_booking_filter.return_value.count.return_value = 5
    mock_booking_filter.return_value.aggregate.return_value = {
        "sum_total_amount": Decimal("1000.0"),
        "sum": Decimal("1000.0"),
    }
    mock_routeanalytics.return_value.aggregate.return_value = {"avg": 75.0}
    mock_routeanalytics.return_value.count.return_value = 3
    mock_bus.return_value.count.return_value = 1
    mock_train.return_value.count.return_value = 1
    mock_flight.return_value.count.return_value = 1

    result = s.DashboardSummarySerializer.get_dashboard_data(provider=None)
    assert "total_bookings" in result
    assert "growth_rates" in result


@patch("provideranalytics.serializers.BusService.objects.filter")
@patch("provideranalytics.serializers.TrainService.objects.filter")
@patch("provideranalytics.serializers.FlightService.objects.filter")
def test_date_occupancy_with_and_without_data(mock_flight, mock_train, mock_bus):
    mock_bus.return_value = [
        MagicMock(
            departure_time=MagicMock(date=lambda: "2024-01-01"),
            total_capacity=10,
            booked_seats=8,
        )
    ]
    mock_train.return_value = []
    mock_flight.return_value = []
    res = s.DateOccupancyHeatmapSerializer.get_date_occupancy_data(provider=None)
    assert "date_occupancy_heatmap" in res

    mock_bus.return_value = mock_train.return_value = mock_flight.return_value = []
    res2 = s.DateOccupancyHeatmapSerializer.get_date_occupancy_data(provider=None)
    assert isinstance(res2["date_occupancy_heatmap"], list)


@patch("bookings.models.Booking.objects.filter")
def test_monthly_revenue_paths_ok_and_exception(mock_booking_filter):
    mock_booking_filter.return_value.annotate.return_value.values.return_value.annotate.return_value.order_by.return_value = []
    res = s.MonthlyRevenueTrendSerializer.get_monthly_revenue_data(provider=None)
    assert "revenue_trends" in res

    mock_booking_filter.return_value.annotate.side_effect = Exception("agg fail")
    with pytest.raises(Exception):
        s.MonthlyRevenueTrendSerializer.get_monthly_revenue_data(provider=None)


@patch("provideranalytics.serializers.Route.objects.all")
@patch("provideranalytics.serializers.BusService.objects.filter")
@patch("provideranalytics.serializers.TrainService.objects.filter")
@patch("provideranalytics.serializers.FlightService.objects.filter")
@patch("bookings.models.Booking.objects.filter")
def test_route_comparison_valid_uuid_and_empty(
    mock_booking_filter, mock_flight, mock_train, mock_bus, mock_routes
):
    route = MagicMock(
        route_id=uuid4(),
        source=MagicMock(code="DEL"),
        destination=MagicMock(code="BOM"),
    )
    mock_routes.return_value = [route]
    mock_booking_filter.return_value.count.return_value = 5
    mock_booking_filter.return_value.aggregate.return_value = {
        "sum_total_amount": Decimal("500.00"),
        "sum": Decimal("500.00"),
    }

    # patch filter to avoid ORM validation
    mock_bus.return_value = mock_train.return_value = mock_flight.return_value = []

    res = s.RouteComparisonSerializer.get_route_comparison_data(provider=None)
    assert isinstance(res, list)

    mock_routes.return_value = []
    res2 = s.RouteComparisonSerializer.get_route_comparison_data(provider=None)
    assert isinstance(res2, list)
