import pytest
from django.urls import reverse
from authapi.models import Session, User

@pytest.mark.django_db
def test_check_active_sessions(auth_client, active_session):
    url = reverse("active_sessions")
    response = auth_client.post(url, {"token": active_session.session_token})
    assert response.status_code == 200
    assert "active_sessions" in response.data

@pytest.mark.django_db
def test_update_profile_email_conflict(user_customer, api_client):
    User.objects.create_user(username="conflict", email="conflict@x.com", password="pw")
    url = reverse("update_profile")
    response = api_client.post(url, {
        "token": "invalid",
        "email": "conflict@x.com"
    })
    assert response.status_code in (400, 401)

@pytest.mark.django_db
def test_check_username_available(api_client):
    response = api_client.post(reverse("check_username"), {"username": "randomname"})
    assert response.status_code == 200
    assert response.data["available"] is True

@pytest.mark.django_db
def test_check_email_exists(user_customer, api_client):
    response = api_client.post(reverse("check_email"), {"email": user_customer.email})
    assert response.status_code == 200
    assert response.data["exists"] is True

@pytest.mark.django_db
def test_verify_token_valid(auth_client, active_session):
    response = auth_client.post(reverse("verify_token"), {"token": active_session.session_token})
    assert response.status_code == 200
    assert response.data["valid"]

@pytest.mark.django_db
def test_logout_all_sessions(api_client, active_session):
    response = api_client.post(reverse("logout_all"), {"token": active_session.session_token})
    assert response.status_code == 200
    assert "sessions_closed" in response.data

@pytest.mark.django_db
def test_get_profile(api_client, active_session):
    response = api_client.post(reverse("get_profile"), {"token": active_session.session_token})
    assert response.status_code == 200
    assert "email" in response.data

@pytest.mark.django_db
def test_delete_user(api_client, active_session):
    response = api_client.post(reverse("Delete User"), {"token": active_session.session_token})
    assert response.status_code in (200, 401)
