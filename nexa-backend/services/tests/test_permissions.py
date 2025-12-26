import pytest
from rest_framework.test import APIRequestFactory
from services.permissions import IsServiceProvider, IsCustomer, IsAdmin
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_is_service_provider_permission(provider_user):
    perm = IsServiceProvider()
    request = APIRequestFactory().get("/")
    request.user = provider_user
    assert perm.has_permission(request, None) is True

@pytest.mark.django_db
def test_customer_and_admin_permissions(customer_user):
    perm_c = IsCustomer()
    req = APIRequestFactory().get("/")
    req.user = customer_user
    assert perm_c.has_permission(req, None) is True

    admin = User.objects.create_superuser(
        username="adminx",
        email="adminx@example.com",
        password="p"
    )
    perm_a = IsAdmin()
    req.user = admin
    assert perm_a.has_permission(req, None) is True
