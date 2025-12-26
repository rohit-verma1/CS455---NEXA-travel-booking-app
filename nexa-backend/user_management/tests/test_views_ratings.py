# user_management/tests/test_views_ratings.py
import pytest
from django.urls import reverse

pytestmark = pytest.mark.django_db

def test_provider_rating_update(auth_client_admin, provider_profile):
    # admin updating provider rating via update (PATCH)
    url = reverse("service-provider-rating-detail", args=[provider_profile.user.user_id])
    resp = auth_client_admin.patch(url, {"rating": 5}, format="json")
    assert resp.status_code == 200
    provider_profile.refresh_from_db()
    assert provider_profile.total_reviews >= 1

def test_provider_add_review_invalid(auth_client_customer, provider_profile):
    url = reverse("service-provider-rating-add-review", args=[provider_profile.user.user_id])
    resp = auth_client_customer.post(url, {}, format="json")
    assert resp.status_code == 400


def test_provider_add_review_bad_rating(auth_client_customer, provider_profile):
    url = reverse("service-provider-rating-add-review", args=[provider_profile.user.user_id])
    resp = auth_client_customer.post(url, {"rating": 10}, format="json")
    assert resp.status_code == 400


def test_provider_add_review_success_comment_and_rating(auth_client_customer, provider_profile, customer_user):
    url = reverse("service-provider-rating-add-review", args=[provider_profile.user.user_id])
    resp = auth_client_customer.post(url, {"rating": 4, "comment": "Good"}, format="json")
    assert resp.status_code == 200
    provider_profile.refresh_from_db()
    assert any("Good" in c["comment"] for c in provider_profile.comments)

