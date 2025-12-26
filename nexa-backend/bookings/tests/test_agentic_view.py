import pytest
from rest_framework.test import APIRequestFactory
from bookings.agentic_view import GeminiFlightSearchAPIView
from types import SimpleNamespace
from datetime import datetime, timedelta
import pytz

factory = APIRequestFactory()

@pytest.mark.django_db
def test_agentic_view_missing_query():
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={})
    resp = view(req)
    assert resp.status_code == 400

@pytest.mark.django_db
def test_agentic_view_parse_fail(monkeypatch):
    monkeypatch.setattr("bookings.agentic_view.call_gemini_parse", lambda q: None)
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={"query": "x"})
    resp = view(req)
    assert resp.status_code == 422

@pytest.mark.django_db
def test_agentic_view_non_search(monkeypatch):
    monkeypatch.setattr("bookings.agentic_view.call_gemini_parse", lambda q: {"intent":"other"})
    view = GeminiFlightSearchAPIView.as_view()
    req = factory.post("/search/flights/agentic", data={"query":"x"})
    resp = view(req)
    assert resp.status_code == 400
