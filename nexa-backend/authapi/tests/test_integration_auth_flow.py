import pytest
from django.urls import reverse
from authapi.models import User, Session

@pytest.mark.django_db(transaction=True)
def test_full_auth_flow(api_client):
    # Register
    r = api_client.post(reverse("register"), {"username": "flow", "email": "flow@x.com", "password": "password123"})
    assert r.status_code == 200

    user = User.objects.get(email="flow@x.com")
    user.is_verified = True
    user.save()

    # Login
    l = api_client.post(reverse("login"), {"email": "flow@x.com", "password": "password123"})
    assert l.status_code == 200
    token = l.data["token"]

    # Get profile
    p = api_client.post(reverse("get_profile"), {"token": token})
    assert p.status_code == 200
    assert p.data["email"] == "flow@x.com"

    # Logout
    lo = api_client.post(reverse("logout"), {"token": token})
    assert lo.status_code == 200
