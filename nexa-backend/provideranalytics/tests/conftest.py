import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def provider_user(db):
    return User.objects.create_user(
        username="prov", email="prov@example.com", password="testpass", user_type="provider"
    )

@pytest.fixture
def auth_client(api_client, provider_user):
    api_client.force_authenticate(user=provider_user)
    return api_client
