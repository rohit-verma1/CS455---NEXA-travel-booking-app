import pytest
from unittest.mock import patch
from django.urls import reverse

pytestmark = pytest.mark.django_db


@patch("provideranalytics.serializers.DashboardSummarySerializer.get_dashboard_data", return_value={"ok": True})
def test_dashboard_view(mock_data, auth_client):
    url = reverse("provider-dashboard")
    resp = auth_client.get(url)
    assert resp.status_code == 200
    assert "ok" in resp.data


@patch("provideranalytics.serializers.DateOccupancyHeatmapSerializer.get_date_occupancy_data", return_value={"ok": True})
def test_heatmap_view(mock_data, auth_client):
    url = reverse("occupancy-heatmap")  # both /occupancy-heatmap/ and /monthly-trend/ share this name
    resp = auth_client.get(url)
    assert resp.status_code == 200
    assert isinstance(resp.data, dict)


@patch("provideranalytics.serializers.MonthlyRevenueTrendSerializer.get_monthly_revenue_data", return_value={"revenue_trends": []})
def test_monthly_trend_view(mock_data, auth_client):
    url = "/provideranalytics/monthly-trend/"
    resp = auth_client.get(url)
    assert resp.status_code == 200
    assert "revenue_trends" in resp.data


@patch("provideranalytics.serializers.RouteComparisonSerializer.get_route_comparison_data", return_value=[{"routes": []}])
def test_route_comparison_view(mock_data, auth_client):
    url = reverse("route-comparision")
    resp = auth_client.get(url)
    assert resp.status_code == 200
