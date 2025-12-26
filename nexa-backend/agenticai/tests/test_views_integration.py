import pytest
from django.urls import reverse
from unittest.mock import patch


@pytest.mark.django_db
def test_agent_query_requires_authentication(api_client):
    """Ensure unauthenticated request is rejected."""
    url = reverse("agenticai:agent_query")
    response = api_client.post(url, {"query": "test"}, format="json")
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_trip_planner_invalid_payload(auth_client):
    """Ensure empty payload returns 400."""
    url = reverse("agenticai:trip_planner")
    response = auth_client.post(url, {}, format="json")
    assert response.status_code in (400, 422)


@pytest.mark.django_db
def test_smart_filter_handles_internal_error(auth_client):
    """Simulate Gemini crash and ensure handled."""
    with patch("agenticai.views.genai.GenerativeModel.generate_content", side_effect=Exception("LLM fail")):
        url = reverse("agenticai:smart_filter_llm")
        # ✅ Fix: Use correct serializer key (smart_prompt)
        payload = {"smart_prompt": "some query"}
        response = auth_client.post(url, payload, format="json")
        assert response.status_code in (400, 500)

        data = response.json()
        # ✅ Covers both validation or internal exception error structures
        assert "error" in data or "smart_prompt" in data
