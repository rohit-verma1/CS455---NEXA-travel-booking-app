import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
from authapi.models import User, Session
from django.conf import settings


@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()

@pytest.fixture
def user_customer(db):
    """Verified test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="password123",
        user_type="customer",
        is_verified=True
    )

@pytest.fixture
def user_unverified(db):
    return User.objects.create_user(
        username="unverified",
        email="unverified@example.com",
        password="password123",
        user_type="customer",
        is_verified=False
    )

@pytest.fixture
def active_session(user_customer):
    """Active session for authentication header tests."""
    session = Session.objects.create(
        user=user_customer,
        session_token="abc123",
        expires_at=timezone.now() + timedelta(days=1)
    )
    return session

@pytest.fixture
def expired_session(user_customer):
    """Expired session."""
    return Session.objects.create(
        user=user_customer,
        session_token="expired123",
        expires_at=timezone.now() - timedelta(days=1),
        is_active=True
    )

@pytest.fixture
def auth_client(api_client, active_session):
    """Authenticated API client using valid token."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {active_session.session_token}")
    return api_client

@pytest.fixture(autouse=True)
def celery_eager_settings(settings):
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
