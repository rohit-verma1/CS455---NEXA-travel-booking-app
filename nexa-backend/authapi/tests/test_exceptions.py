import pytest
from django.urls import reverse
from unittest.mock import patch
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    """Reusable DRF test client."""
    return APIClient()


# ---------- Registration & OTP Edge Cases ----------

def test_register_missing_fields(api_client):
    resp = api_client.post(reverse("register"), {"username": "abc"}, format="json")
    assert resp.status_code == 400


def test_register_duplicate_username(api_client, user_customer):
    payload = {"username": user_customer.username, "email": "x@x.com", "password": "pass12345"}
    resp = api_client.post(reverse("register"), payload, format="json")
    assert resp.status_code == 400


def test_resend_otp_no_email(api_client):
    resp = api_client.post(reverse("resend_otp"), {}, format="json")
    assert resp.status_code == 400


def test_resend_otp_user_not_found(api_client):
    resp = api_client.post(reverse("resend_otp"), {"email": "not@exist.com"}, format="json")
    assert resp.status_code == 404


def test_verify_otp_invalid_user(api_client):
    resp = api_client.post(reverse("verify_otp"), {"email": "not@exist.com", "otp": "123456"}, format="json")
    assert resp.status_code == 404


def test_verify_otp_missing_fields(api_client):
    resp = api_client.post(reverse("verify_otp"), {}, format="json")
    assert resp.status_code == 400


# ---------- Login & Logout ----------

def test_login_missing_fields(api_client):
    resp = api_client.post(reverse("login"), {"email": ""}, format="json")
    assert resp.status_code == 400


def test_logout_no_token(api_client):
    resp = api_client.post(reverse("logout"), {}, format="json")
    assert resp.status_code == 400


def test_logout_invalid_token(api_client):
    resp = api_client.post(reverse("logout"), {"token": "invalid"}, format="json")
    assert resp.status_code == 400


def test_logout_all_invalid_token(api_client):
    resp = api_client.post(reverse("logout_all"), {"token": "badtoken"}, format="json")
    assert resp.status_code == 401


# ---------- Password & Session Management ----------

def test_change_password_invalid_token(api_client):
    data = {"token": "invalid", "old_password": "old", "new_password": "newpassword123"}
    resp = api_client.post(reverse("change_password"), data, format="json")
    assert resp.status_code == 401


def test_change_password_short_new(api_client, active_session):
    data = {"token": active_session.session_token, "old_password": "password123", "new_password": "123"}
    resp = api_client.post(reverse("change_password"), data, format="json")
    assert resp.status_code == 400


def test_check_email_no_email(api_client):
    resp = api_client.post(reverse("check_email"), {}, format="json")
    assert resp.status_code == 400


def test_check_username_no_username(api_client):
    resp = api_client.post(reverse("check_username"), {}, format="json")
    assert resp.status_code == 400


def test_verify_token_no_token(api_client):
    resp = api_client.post(reverse("verify_token"), {}, format="json")
    assert resp.status_code == 400


def test_check_sessions_invalid_token(api_client):
    resp = api_client.post(reverse("active_sessions"), {"token": "invalid"}, format="json")
    assert resp.status_code == 401


def test_update_profile_missing_token(api_client):
    resp = api_client.post(reverse("update_profile"), {"email": "x@x.com"}, format="json")
    assert resp.status_code == 400


def test_update_profile_invalid_token(api_client):
    resp = api_client.post(reverse("update_profile"), {"token": "invalid", "email": "a@b.com"}, format="json")
    assert resp.status_code == 401


# ---------- OAuth (Google & GitHub) Edge Cases ----------

@patch("authapi.views.requests.get")
def test_login_with_google_invalid_token(mock_get, api_client):
    mock_get.return_value.status_code = 401
    resp = api_client.post(reverse("google_login"), {"token": "bad"}, format="json")
    assert resp.status_code == 401


def test_login_with_google_no_token(api_client):
    resp = api_client.post(reverse("google_login"), {}, format="json")
    assert resp.status_code == 400


@patch("authapi.views.requests.post")
def test_github_login_missing_code(mock_post, api_client):
    resp = api_client.post(reverse("github_login"), {}, format="json")
    assert resp.status_code == 400


@patch("authapi.views.requests.post")
def test_github_login_fail(mock_post, api_client):
    mock_post.side_effect = Exception("Boom")
    resp = api_client.post(reverse("github_login"), {"code": "abc"}, format="json")
    assert resp.status_code >= 400
