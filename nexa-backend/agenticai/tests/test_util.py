import pytest
from agenticai.utils import BookingAgent, TripPlanner
from unittest.mock import MagicMock


@pytest.mark.django_db
def test_booking_agent_executes_with_mock(monkeypatch):
    """Ensure BookingAgent executes a mock Gemini query successfully."""
    def mock_generate_content(*args, **kwargs):
        class MockResp:
            text = '{"steps": [{"service_type": "flights", "source": "Delhi", "destination": "Goa", "date": "2025-11-20"}]}'
        return MockResp()

    monkeypatch.setattr("agenticai.utils.genai.GenerativeModel.generate_content", mock_generate_content)
    agent = BookingAgent()
    result = agent.execute("Find me a flight from Delhi to Goa")

    assert isinstance(result, dict)
    assert "step_1_flights_Delhi_to_Goa" in result or "error" in result


@pytest.mark.django_db
def test_booking_agent_handles_invalid_json(monkeypatch):
    """Ensure BookingAgent gracefully handles malformed Gemini output."""
    def bad_genai(*args, **kwargs):
        class BadResp:
            text = "not-json"
        return BadResp()

    monkeypatch.setattr("agenticai.utils.genai.GenerativeModel.generate_content", bad_genai)
    agent = BookingAgent()
    result = agent.execute("test invalid json")
    assert "error" in result


@pytest.mark.django_db
def test_booking_agent_handles_gemini_exception(monkeypatch):
    """Ensure exception inside _create_plan_with_gemini returns error dict."""
    def raise_error(*args, **kwargs):
        raise Exception("Gemini down")

    monkeypatch.setattr("agenticai.utils.genai.GenerativeModel.generate_content", raise_error)
    agent = BookingAgent()
    result = agent._create_plan_with_gemini("test query")
    assert "error" in result


@pytest.mark.django_db
def test_booking_agent_search_trains_handles_invalid(monkeypatch):
    """Mock DB filters to return no stations (error path)."""
    monkeypatch.setattr("agenticai.utils.Station.objects.filter", lambda *a, **k: [])
    agent = BookingAgent()
    result = agent._search_trains({"source": "X", "destination": "Y", "date": "2025-11-12"})
    assert "error" in result


@pytest.mark.django_db
def test_booking_agent_search_flights_no_route(monkeypatch):
    """Ensure no route found case returns error."""
    class DummyQS:
        def values_list(self, *args, **kwargs):
            return []  # ✅ behaves like a queryset with no results

    monkeypatch.setattr("agenticai.utils.Route.objects.filter", lambda *a, **k: DummyQS())
    agent = BookingAgent()
    result = agent._search_flights({"source": "BLR", "destination": "DEL", "date": "2025-11-12"})
    assert "error" in result


@pytest.mark.django_db
def test_trip_planner_with_mock(monkeypatch):
    """Ensure TripPlanner can produce a structured plan with mocked Gemini."""
    def mock_genai(*args, **kwargs):
        class MockResp:
            text = '{"mode": "flights", "reason": "mocked response"}'
        return MockResp()

    monkeypatch.setattr("agenticai.utils.genai.GenerativeModel.generate_content", mock_genai)
    planner = TripPlanner()
    plan = planner.plan_trip("Plan a Goa trip for 3 days under 20000")

    assert isinstance(plan, dict)
    assert "trip_summary" in plan or "error" in plan


@pytest.mark.django_db
def test_trip_planner_handles_invalid_json(monkeypatch):
    """Ensure TripPlanner does not crash on invalid LLM responses."""
    def bad_genai(*args, **kwargs):
        class BadResp:
            text = "INVALID"
        return BadResp()

    monkeypatch.setattr("agenticai.utils.genai.GenerativeModel.generate_content", bad_genai)
    planner = TripPlanner()
    result = planner.plan_trip("Bad trip plan")

    assert isinstance(result, dict)
    assert "trip_summary" in result or "error" in result


@pytest.mark.django_db
def test_trip_planner_parse_fails_for_bad_query():
    """Ensure TripPlanner._parse_trip_query handles non-matching text."""
    planner = TripPlanner()
    result = planner._parse_trip_query("nonsense with no from/to/days")
    assert "error" in result
