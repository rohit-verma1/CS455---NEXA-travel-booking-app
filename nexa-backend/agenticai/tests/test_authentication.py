import pytest
from rest_framework.test import APIRequestFactory
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
import datetime
from authapi.models import Session
from authapi.authentication import CustomTokenAuthentication


@pytest.mark.django_db
def test_valid_token_authentication(user):
    """Ensure a valid session_token authenticates successfully."""
    token_auth = CustomTokenAuthentication()
    session = Session.objects.create(
        user=user,
        session_token="validtoken",
        created_at=timezone.now(),
        expires_at=timezone.now() + datetime.timedelta(days=1),
        is_active=True,
    )
    factory = APIRequestFactory()
    request = factory.get("/", HTTP_AUTHORIZATION="Token validtoken")
    user_out, token_out = token_auth.authenticate(request)

    assert user_out == user
    # ✅ Fix: compare to session.session_token (string)
    assert token_out == session.session_token


@pytest.mark.django_db
def test_expired_token_marks_inactive(user):
    """Expired sessions should be marked inactive and rejected."""
    token_auth = CustomTokenAuthentication()
    session = Session.objects.create(
        user=user,
        session_token="expiredtoken",
        created_at=timezone.now() - datetime.timedelta(days=5),
        expires_at=timezone.now() - datetime.timedelta(days=1),
        is_active=True,
    )
    factory = APIRequestFactory()
    request = factory.get("/", HTTP_AUTHORIZATION="Token expiredtoken")

    with pytest.raises(AuthenticationFailed):
        token_auth.authenticate(request)

    session.refresh_from_db()
    assert not session.is_active


@pytest.mark.django_db
def test_invalid_token_header():
    """Invalid header format should raise AuthenticationFailed."""
    token_auth = CustomTokenAuthentication()
    factory = APIRequestFactory()
    request = factory.get("/", HTTP_AUTHORIZATION="InvalidHeader")

    # ✅ Fix: expect AuthenticationFailed instead of None
    with pytest.raises(AuthenticationFailed):
        token_auth.authenticate(request)


@pytest.mark.django_db
def test_missing_token_header():
    """No Authorization header should safely return None."""
    token_auth = CustomTokenAuthentication()
    factory = APIRequestFactory()
    request = factory.get("/")  # No header
    assert token_auth.authenticate(request) is None
