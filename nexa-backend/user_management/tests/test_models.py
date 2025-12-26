# user_management/tests/test_models.py
import pytest
from django.utils import timezone
from user_management.models import Customer, CoTraveller, ServiceProvider, AdminUser

pytestmark = pytest.mark.django_db

def test_customer_str_and_profile(customer_profile):
    assert "Customer:" in str(customer_profile)
    assert customer_profile.user.username == "cust"

def test_cotraveller_customer_name(customer_profile):
    cot = CoTraveller.objects.create(
        customer=customer_profile,
        first_name="A", last_name="B"
    )
    assert cot.customer_name == customer_profile.user.username
    assert str(cot) == "A B"

def test_serviceprovider_approve_reject(provider_profile):
    # initial status is Pending
    assert provider_profile.status == "Pending"
    provider_profile.approve()
    provider_profile.refresh_from_db()
    assert provider_profile.status == "Approved"
    assert provider_profile.verified is True
    assert provider_profile.verified_at is not None

    provider_profile.reject()
    provider_profile.refresh_from_db()
    assert provider_profile.status == "Rejected"
    assert provider_profile.verified is False
    assert provider_profile.verified_at is None

def test_serviceprovider_rate_and_comment(provider_profile, provider_profile__user=None):
    # ensure ratings_dict initial
    provider_profile.ratings_dict = {}
    provider_profile.total_reviews = 0
    provider_profile.rating = 0.0
    provider_profile.save()

    # rate 5
    provider_profile.rate(5)
    provider_profile.refresh_from_db()
    assert provider_profile.total_reviews >= 1
    assert isinstance(provider_profile.rating, float)

    # add comment
    provider_profile.add_comment("Nice service", user=None)
    provider_profile.refresh_from_db()
    assert isinstance(provider_profile.comments, list)
    assert any("Nice service" in c["comment"] for c in provider_profile.comments)

def test_adminuser_str(admin_user):
    admin_profile = AdminUser.objects.get(user=admin_user)
    assert "Admin:" in str(admin_profile)
