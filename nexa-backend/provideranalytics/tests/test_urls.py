import pytest
from django.urls import reverse, resolve
from provideranalytics import views

def test_url_mappings_correct_classes():
    assert resolve(reverse("provider-dashboard")).func.view_class is views.ProviderDashboardView
    # 'occupancy-heatmap' points to MonthlyRevenueTrendView in your urls.py
    assert resolve(reverse("occupancy-heatmap")).func.view_class is views.MonthlyRevenueTrendView
    assert resolve(reverse("route-comparision")).func.view_class is views.RouteComparisonView
