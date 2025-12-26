# user_management/tests/test_views_cotravellers.py
import pytest
from django.urls import reverse
from user_management.models import CoTraveller

pytestmark = pytest.mark.django_db

def test_cotraveller_create_and_list(auth_client_customer, customer_profile):
    url = reverse("co-traveller-list")
    payload = {"first_name": "Joe", "last_name": "Bloggs"}
    resp = auth_client_customer.post(url, payload, format="json")
    assert resp.status_code in (201, 200)
    # Now list and ensure the created traveller appears
    resp2 = auth_client_customer.get(url)
    assert resp2.status_code == 200
    assert any(item["first_name"] == "Joe" for item in resp2.data)

