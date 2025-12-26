import pytest
from django.urls import reverse
from authapi.models import User, Session
from unittest.mock import patch

@pytest.mark.django_db
def test_register_new_user(api_client):
    url = reverse("register")
    payload = {"username": "john", "email": "john@x.com", "password": "password123"}
    response = api_client.post(url, payload)
    assert response.status_code in (200, 201)
    assert User.objects.filter(email="john@x.com").exists()

@pytest.mark.django_db
def test_login_valid_user(user_customer, api_client):
    url = reverse("login")
    response = api_client.post(url, {"email": user_customer.email, "password": "password123"})
    assert response.status_code == 200
    assert "token" in response.data

@pytest.mark.django_db
def test_login_unverified_user(user_unverified, api_client):
    url = reverse("login")
    response = api_client.post(url, {"email": user_unverified.email, "password": "password123"})
    assert response.status_code == 401

@pytest.mark.django_db
def test_logout_user(active_session, api_client):
    url = reverse("logout")
    response = api_client.post(url, {"token": active_session.session_token})
    assert response.status_code == 200
    active_session.refresh_from_db()
    assert active_session.is_active is False


