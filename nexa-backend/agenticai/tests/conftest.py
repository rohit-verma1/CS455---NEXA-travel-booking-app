import pytest
from rest_framework.test import APIClient
from django.utils import timezone
from authapi.models import User, Session
import uuid
import datetime
from unittest.mock import patch


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username=f"user_{uuid.uuid4().hex[:6]}",
        email=f"{uuid.uuid4().hex[:6]}@example.com",
        password="testpass123",
        user_type="customer",
    )


@pytest.fixture
def active_session(user):
    """Create a valid session with session_token."""
    token = str(uuid.uuid4())
    session = Session.objects.create(
        user=user,
        session_token=token,  # ✅ Correct field name
        created_at=timezone.now(),
        expires_at=timezone.now() + datetime.timedelta(days=1),
        is_active=True,
    )
    return session


@pytest.fixture
def auth_client(api_client, active_session):
    """API client including Authorization header."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {active_session.session_token}")
    return api_client


@pytest.fixture
def mock_gemini():
    """Mock Gemini generate_content calls globally."""
    with patch("agenticai.utils.genai.GenerativeModel.generate_content") as mock:
        class MockResp:
            def __init__(self, text):
                self.text = text
        mock.return_value = MockResp('{"result": "mocked"}')
        yield mock
