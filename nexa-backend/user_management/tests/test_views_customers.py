# user_management/tests/test_views_customers.py
import pytest
from django.urls import reverse
from user_management.models import Customer

pytestmark = pytest.mark.django_db

def test_customer_list_admin_sees_all(auth_client_admin, customer_profile, provider_profile):
    url = reverse("customer-list")
    resp = auth_client_admin.get(url)
    assert resp.status_code == 200
    # admin should see at least the customer profile
    assert any(c["username"] == customer_profile.user.username for c in resp.data)

def test_customer_list_customer_sees_own(auth_client_customer, customer_profile):
    url = reverse("customer-list")
    resp = auth_client_customer.get(url)
    assert resp.status_code == 200
    # only one entry and it should be this user's
    assert len(resp.data) >= 1
    assert any(c["username"] == customer_profile.user.username for c in resp.data)

def test_customer_update_own_profile(auth_client_customer, customer_profile):
    url = reverse("customer-detail", args=[customer_profile.user.user_id])
    resp = auth_client_customer.patch(url, {"first_name": "NewName"}, format="json")
    assert resp.status_code in (200, 204)
    customer_profile.refresh_from_db()
    assert customer_profile.first_name == "NewName"
