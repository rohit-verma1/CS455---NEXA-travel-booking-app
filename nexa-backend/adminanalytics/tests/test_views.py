import pytest
import uuid
from rest_framework.test import APIClient
from django.urls import reverse
from django.utils import timezone
from payments.models import Transaction, Settlement, Refund
from bookings.models import Booking
from user_management.models import ServiceProvider
from authapi.models import User
from django.db import connection


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def sample_user(db):
    """Creates a fresh unique user each time."""
    return User.objects.create_user(
        username=f"user_{uuid.uuid4().hex[:6]}",
        email=f"{uuid.uuid4().hex[:6]}@example.com",
        password="testpass123",
        user_type="customer"
    )


@pytest.fixture
def sample_provider(db):
    """Creates or retrieves a fresh provider each time."""
    provider_user = User.objects.create_user(
        username=f"provider_{uuid.uuid4().hex[:6]}",
        email=f"prov_{uuid.uuid4().hex[:6]}@example.com",
        password="testpass123",
        user_type="provider"
    )
    provider, _ = ServiceProvider.objects.get_or_create(
        user=provider_user,
        defaults={"company_name": "Test Travels", "rating": 4.5, "status": "Approved"},
    )
    return provider


@pytest.fixture
def sample_booking(db, sample_user, sample_provider):
    """Creates a booking for today."""
    today = timezone.now()
    return Booking.objects.create(
        customer=sample_user,
        provider=sample_provider.user,
        booking_date=today,
        status="Confirmed"
    )


@pytest.fixture
def sample_transaction(db, sample_user, sample_booking):
    """Creates a valid transaction (booking is required for PG)."""
    return Transaction.objects.create(
        txn_id=uuid.uuid4(),
        booking=sample_booking,
        customer_user=sample_user,
        amount=200.0,
        currency="INR",
        status="Success",
        method="Card",
        transaction_date=timezone.now()
    )


@pytest.mark.django_db
def test_admin_dashboard_view(api_client, sample_user, sample_booking, sample_transaction):
    url = reverse("admin-dashboard")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert "total_active_users" in data
    assert "bookings_today" in data
    assert "revenue_today" in data


@pytest.mark.django_db
def test_admin_dashboard_growth_calculation():
    from adminanalytics.views import AdminDashboardView
    view = AdminDashboardView()
    assert view.calculate_growth(0, 0) == "0%"
    assert view.calculate_growth(10, 0) == "+∞%"
    assert view.calculate_growth(120, 100) == "+20.0%"
    assert view.calculate_growth(80, 100) == "-20.0%"


@pytest.mark.django_db
def test_admin_user_list_view(api_client, sample_user, sample_booking):
    url = reverse("admin-user-stats")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "results" in data


@pytest.mark.django_db
def test_admin_provider_performance_view(api_client, sample_provider, sample_booking):
    url = reverse("admin-provider-performance")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "name" in data[0]
    assert "bookings" in data[0]


@pytest.mark.django_db
def test_financial_center_overview(api_client, sample_transaction):
    from datetime import timedelta

    Settlement.objects.create(
        amount=500.0,
        status="Pending",
        period_start=timezone.now() - timedelta(days=7),
        period_end=timezone.now(),
        provider_user=sample_transaction.booking.provider  # if this FK exists
    )

    Refund.objects.create(
        transaction=sample_transaction,
        amount=100.0,
        status="Processed" if hasattr(Refund, "status") else None
    )

    url = reverse("financial-overview")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "transactions" in data


@pytest.mark.django_db
def test_financial_center_with_no_data(api_client):
    url = reverse("financial-overview")
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["today_revenue"] == 0.0


@pytest.mark.django_db
def test_full_access_query_runner_select(api_client):
    """Use PostgreSQL syntax for CREATE TABLE."""
    url = reverse("execute-sql")
    with connection.cursor() as cursor:
        cursor.execute("CREATE TABLE IF NOT EXISTS test_table (id SERIAL PRIMARY KEY, name TEXT);")
        cursor.execute("INSERT INTO test_table (name) VALUES ('John Doe');")

    response = api_client.post(url, {"query": "SELECT * FROM test_table;"}, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["query_type"] == "SELECT"
    assert "rows_returned" in data



@pytest.mark.django_db
def test_full_access_query_runner_no_query(api_client):
    url = reverse("execute-sql")
    response = api_client.post(url, {"query": ""}, format="json")
    assert response.status_code == 400
    assert "error" in response.json()


@pytest.mark.django_db
def test_full_access_query_runner_sql_error(api_client):
    url = reverse("execute-sql")
    response = api_client.post(url, {"query": "BAD SQL"}, format="json")
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
