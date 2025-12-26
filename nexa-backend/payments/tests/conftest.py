import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest import mock

User = get_user_model()


@pytest.fixture
def create_user(db):
    """
    Create a User compatible with your custom manager.
    Tries (username,email) signature first then fallback to older signature.
    """
    def _make(email="user@example.com", username="user", user_type="customer", password="pass123"):
        try:
            return User.objects.create_user(username=username, email=email, password=password, user_type=user_type)
        except TypeError:
            # fallback if manager expects (email, password) only
            return User.objects.create_user(email=email, password=password)
    return _make


@pytest.fixture
def create_session(db):
    """
    Create a Session row (your auth uses Session.session_token).
    Returns the session_token string.
    """
    from authapi.models import Session
    def _make(user, token="sess-xyz", expires_in_days=1):
        return Session.objects.create(
            user=user,
            session_token=token,
            ip_address="127.0.0.1",
            expires_at=timezone.now() + timedelta(days=expires_in_days),
            is_active=True,
            device="test"
        )
    return _make


@pytest.fixture
def auth_client(client, create_user, create_session):
    """
    Returns (client, user, token) with a valid Session and header set.
    Use this for authenticated requests under your CustomTokenAuthentication.
    """
    user = create_user(email="cust@example.com", username="cust", user_type="customer")
    session = create_session(user, token="test-session-token")
    client.defaults["HTTP_AUTHORIZATION"] = f"Token {session.session_token}"
    return client, user, session.session_token


@pytest.fixture
def provider_client(client, create_user, create_session):
    user = create_user(email="prov@example.com", username="prov", user_type="provider")
    session = create_session(user, token="prov-session-token")
    client.defaults["HTTP_AUTHORIZATION"] = f"Token {session.session_token}"
    return client, user, session.session_token


@pytest.fixture
def admin_client(client, create_user, create_session):
    # Create admin user and session
    user = create_user(email="admin@example.com", username="admin", user_type="admin")
    # ensure admin flags if your system checks them
    user.is_staff = True
    user.is_superuser = True
    user.save()
    session = create_session(user, token="admin-session-token")
    client.defaults["HTTP_AUTHORIZATION"] = f"Token {session.session_token}"
    return client, user, session.session_token


@pytest.fixture
def mock_booking_models(monkeypatch):
    """
    Provide mocks for Booking, Ticket, BookingStatus where tests want isolation from bookings DB complexity.
    If a test needs real Booking, don't use this fixture.
    """
    Booking = mock.Mock()
    Ticket = mock.Mock()
    BookingStatus = mock.Mock()

    # default behaviors
    Booking.objects = mock.Mock()
    Ticket.objects = mock.Mock()
    BookingStatus.objects = mock.Mock()

    monkeypatch.setattr("payments.views.Booking", Booking)
    monkeypatch.setattr("payments.views.Ticket", Ticket)
    monkeypatch.setattr("payments.views.BookingStatus", BookingStatus)
    return Booking, Ticket, BookingStatus
