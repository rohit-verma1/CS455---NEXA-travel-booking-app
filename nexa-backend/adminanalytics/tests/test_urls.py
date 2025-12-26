import pytest
from django.urls import reverse, resolve
from adminanalytics import views


@pytest.mark.parametrize("url_name,view_class", [
    ("admin-dashboard", views.AdminDashboardView),
    ("admin-user-stats", views.AdminUserListView),
    ("admin-provider-performance", views.AdminProviderPerformanceOverviewView),
    ("financial-overview", views.FinancialCenterOverviewView),
    ("execute-sql", views.FullAccessQueryRunnerView),
])
def test_url_resolves_to_correct_view(url_name, view_class):
    path = reverse(url_name)
    resolved = resolve(path)
    assert resolved.func.view_class == view_class


@pytest.mark.django_db
def test_all_urls_accessible(api_client):
    """Ensures all adminanalytics endpoints return valid responses"""
    endpoints = [
        "admin-dashboard",
        "admin-user-stats",
        "admin-provider-performance",
        "financial-overview",
    ]
    for name in endpoints:
        response = api_client.get(reverse(name))
        assert response.status_code in [200, 403]  # Allow permission-blocked views too

    # POST endpoint for SQL execution
    sql_url = reverse("execute-sql")
    response = api_client.post(sql_url, {"query": "SELECT 1;"}, format="json")
    assert response.status_code in [200, 400]
