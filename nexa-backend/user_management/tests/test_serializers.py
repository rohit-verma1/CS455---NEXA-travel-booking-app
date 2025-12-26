# user_management/tests/test_serializers.py
import pytest
from user_management.serializers import (
    CustomerSerializer, CoTravellerSerializer,
    ServiceProviderSerializer, AdminUserSerializer, ServiceProviderRatingSerializer
)
from user_management.models import CoTraveller, ServiceProvider

pytestmark = pytest.mark.django_db

def test_customer_serializer_fields(customer_profile):
    ser = CustomerSerializer(instance=customer_profile)
    data = ser.data
    assert "username" in data and "email" in data
    # read-only fields present
    assert data["username"] == customer_profile.user.username
    assert data["email"] == customer_profile.user.email

def test_cotraveller_serializer(customer_profile):
    cot = CoTraveller.objects.create(customer=customer_profile, first_name="X", last_name="Y", email="a@b.com")
    ser = CoTravellerSerializer(instance=cot)
    data = ser.data
    assert data["customer_name"] == customer_profile.user.username
    assert data["traveller_id"] is not None

def test_serviceprovider_serializer(provider_profile):
    ser = ServiceProviderSerializer(instance=provider_profile)
    data = ser.data
    assert "company_name" in data
    assert data["username"] == provider_profile.user.username

def test_admin_serializer(admin_user):
    admin_profile = admin_user.admin_profile
    ser = AdminUserSerializer(instance=admin_profile)
    assert ser.data["username"] == admin_user.username

def test_provider_rating_serializer(provider_profile):
    ser = ServiceProviderRatingSerializer(instance=provider_profile)
    d = ser.data
    assert "rating" in d and "comments" in d
