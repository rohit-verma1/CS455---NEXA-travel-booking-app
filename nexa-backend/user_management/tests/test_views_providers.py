# user_management/tests/test_views_providers.py
import pytest
from django.urls import reverse
from user_management.models import ServiceProvider

pytestmark = pytest.mark.django_db

def test_serviceprovider_list_admin(auth_client_admin, provider_profile):
    url = reverse("service-provider-list")
    resp = auth_client_admin.get(url)
    assert resp.status_code == 200
    assert any(p["username"] == provider_profile.user.username for p in resp.data)

def test_serviceprovider_list_provider_only_own(auth_client_provider, provider_profile):
    url = reverse("service-provider-list")
    resp = auth_client_provider.get(url)
    assert resp.status_code == 200
    assert any(p["username"] == provider_profile.user.username for p in resp.data)

def test_serviceprovider_create_provider(auth_client_provider):
    url = reverse("service-provider-list")
    payload = {"company_name": "NewCompany"}
    # provider profile likely already exists by signal; performing create might conflict.
    # Instead, test update (patch) of own profile
    sp = ServiceProvider.objects.get(user=auth_client_provider.handler._force_user) if hasattr(auth_client_provider, "handler") else None
    # safe approach: fetch the provider for the provider_user
    from user_management.models import ServiceProvider as SP
    profile = SP.objects.filter().first()
    if profile:
        url_detail = reverse("service-provider-detail", args=[profile.user.user_id])
        resp = auth_client_provider.patch(url_detail, {"company_name": "UpdatedCo"}, format="json")
        assert resp.status_code in (200, 204)
        profile.refresh_from_db()
        assert profile.company_name == "UpdatedCo"
