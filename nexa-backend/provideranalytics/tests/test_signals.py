import pytest
from unittest.mock import patch
from provideranalytics.signals import update_analytics_on_booking

@pytest.mark.django_db
@patch("provideranalytics.signals.RouteAnalytics.update_from_bookings")
@patch("provideranalytics.signals.ProviderPerformance.update_from_bookings")
def test_signal_triggers_updates(mock_perf, mock_route):
    class Dummy:
        status = "Confirmed"
        payment_status = "Paid"
    update_analytics_on_booking(sender=None, instance=Dummy())
    mock_perf.assert_called_once()
    mock_route.assert_called_once()

@patch("provideranalytics.signals.RouteAnalytics.update_from_bookings")
@patch("provideranalytics.signals.ProviderPerformance.update_from_bookings")
def test_signal_skips_unpaid(mock_perf, mock_route):
    class Dummy:
        status = "Pending"
        payment_status = "Unpaid"
    update_analytics_on_booking(sender=None, instance=Dummy())
    mock_perf.assert_not_called()
    mock_route.assert_not_called()
