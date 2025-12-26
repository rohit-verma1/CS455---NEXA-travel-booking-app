# adminanalytics/tests/conftest.py
import pytest
from rest_framework.test import APIClient

@pytest.fixture(scope="session")
def django_db_setup():
    """Ensure the test database is set up correctly."""
    pass  # Uses default Django DB setup

@pytest.fixture
def api_client():
    """Provides a reusable DRF APIClient for test functions."""
    return APIClient()
