# user_management/tests/conftest.py
import pytest
from rest_framework.test import APIClient
from authapi.models import User
from user_management.models import Customer, ServiceProvider, AdminUser

pytest_plugins = ["django.contrib.auth"]  # if helpful in your environment

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def customer_user(db):
    u = User.objects.create_user(
        username="cust", email="cust@test.com", password="pass123", user_type="customer"
    )
    # signals should auto-create Customer profile via user_management.signals
    return u

@pytest.fixture
def provider_user(db):
    u = User.objects.create_user(
        username="prov", email="prov@test.com", password="pass123", user_type="provider"
    )
    return u

@pytest.fixture
def admin_user(db):
    u = User.objects.create_user(
        username="admin", email="admin@test.com", password="pass123", user_type="admin"
    )
    return u

@pytest.fixture
def customer_profile(customer_user):
    # signal should have created profile
    return Customer.objects.get(user=customer_user)

@pytest.fixture
def provider_profile(provider_user):
    return ServiceProvider.objects.get(user=provider_user)

@pytest.fixture
def auth_client_admin(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    return api_client

@pytest.fixture
def auth_client_customer(api_client, customer_user):
    api_client.force_authenticate(user=customer_user)
    return api_client

@pytest.fixture
def auth_client_provider(api_client, provider_user):
    api_client.force_authenticate(user=provider_user)
    return api_client
