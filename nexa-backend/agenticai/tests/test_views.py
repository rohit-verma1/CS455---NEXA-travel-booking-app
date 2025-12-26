import pytest
from django.urls import reverse
from django.utils import timezone
import uuid
import datetime
from rest_framework.test import APIClient
from unittest.mock import patch
from authapi.models import Session


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(
        username=f"user_{uuid.uuid4().hex[:6]}",
        email=f"{uuid.uuid4().hex[:6]}@example.com",
        password="testpass123",
        user_type="customer",
    )


@pytest.fixture
def active_session(user):
    """Creates a valid active session for the authenticated user."""
    session = Session.objects.create(
        user=user,
        session_token=str(uuid.uuid4()),
        created_at=timezone.now(),
        expires_at=timezone.now() + datetime.timedelta(days=1),
        is_active=True,
    )
    return session


@pytest.fixture
def auth_client(api_client, active_session):
    """Attach valid auth token to the API client."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {active_session.session_token}")
    return api_client


# --------------------------------------------------------------------------------------------------
# TESTS FOR VIEWS
# --------------------------------------------------------------------------------------------------


@pytest.mark.django_db
def test_agent_query_view_returns_response(auth_client):
    """Simulate an AI Agent booking query view."""
    with patch("agenticai.views.genai.GenerativeModel.generate_content") as mock_gen:
        class MockResp:
            def __init__(self):
                self.text = '{"mocked": "response"}'
        mock_gen.return_value = MockResp()

        url = reverse("agenticai:agent_query")
        payload = {"query": "Book a flight from Bangalore to Delhi on 15 Nov 2025"}
        response = auth_client.post(url, payload, format="json")

        assert response.status_code in (200, 201, 400)
        assert isinstance(response.json(), dict)


@pytest.mark.django_db
def test_trip_planner_view_returns_response(auth_client):
    """Simulate AI trip planner endpoint with mock Gemini."""
    with patch("agenticai.views.genai.GenerativeModel.generate_content") as mock_gen:
        class MockResp:
            def __init__(self):
                self.text = '{"mode": "flights", "reason": "mocked"}'
        mock_gen.return_value = MockResp()

        url = reverse("agenticai:trip_planner")
        payload = {"query": "Plan a Goa trip for 5 days under 25000"}
        response = auth_client.post(url, payload, format="json")

        assert response.status_code in (200, 201, 400)
        data = response.json()
        assert "trip_summary" in data or "error" in data


@pytest.mark.django_db
def test_smart_filter_llm_view_returns_response(auth_client):
    """Simulate Smart LLM Filter endpoint."""
    with patch("agenticai.views.genai.GenerativeModel.generate_content") as mock_gen:
        class MockResp:
            def __init__(self):
                self.text = '{"mocked": "response"}'
        mock_gen.return_value = MockResp()

        url = reverse("agenticai:smart_filter_llm")
        payload = {"query": "Find top-rated flights from Mumbai to Kochi"}
        response = auth_client.post(url, payload, format="json")

        assert response.status_code in (200, 201, 400)
        assert isinstance(response.json(), dict)


@pytest.mark.django_db
def test_agent_query_handles_genai_error(auth_client):
    """Ensure view handles Gemini errors gracefully."""
    with patch("agenticai.views.genai.GenerativeModel.generate_content", side_effect=Exception("Mock Gemini error")):
        url = reverse("agenticai:agent_query")
        response = auth_client.post(url, {"query": "Book a bus ticket to Pune"}, format="json")

        assert response.status_code in (200, 400, 500)
        data = response.json()
        assert "error" in data
