import pytest
from django.utils import timezone
from datetime import timedelta
from authapi.models import Session
from authapi.tasks import clean_expired_sessions

@pytest.mark.django_db
def test_clean_expired_sessions_marks_expired_as_inactive(user_customer):
    # Create expired and active sessions
    expired = Session.objects.create(
        user=user_customer,
        session_token="expired",
        expires_at=timezone.now() - timedelta(days=1),
        is_active=True,
    )
    active = Session.objects.create(
        user=user_customer,
        session_token="active",
        expires_at=timezone.now() + timedelta(days=1),
        is_active=True,
    )

    result = clean_expired_sessions()  # direct call (or .delay() if eager mode on)
    expired.refresh_from_db()
    active.refresh_from_db()

    assert not expired.is_active
    assert active.is_active
    assert "Cleaned 1 expired sessions" in result or "Cleaned 1" in result
