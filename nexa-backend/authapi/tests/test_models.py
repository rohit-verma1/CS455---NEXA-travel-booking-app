import pytest
from django.utils import timezone
from datetime import timedelta
from authapi.models import User, Session, OTPVerification, PasswordResetToken

@pytest.mark.django_db
def test_user_creation_without_email_raises_value_error():
    with pytest.raises(ValueError):
        User.objects.create_user(username="x", email=None, password="123")

@pytest.mark.django_db
def test_create_user_and_superuser():
    user = User.objects.create_user("user1", "u1@example.com", "pass123")
    admin = User.objects.create_superuser("admin", "a@example.com", "adminpass")
    assert user.user_type == "customer"
    assert admin.is_superuser
    assert str(admin).startswith("admin")

@pytest.mark.django_db
def test_session_expiry_flag():
    user = User.objects.create_user("u", "u@e.com", "p")
    session = Session.objects.create(
        user=user,
        session_token="tok",
        expires_at=timezone.now() + timedelta(days=1)
    )
    assert session.is_active

@pytest.mark.django_db
def test_otp_verification_entry():
    user = User.objects.create_user("otp", "otp@x.com", "p") # type : ignore
    otp = OTPVerification.objects.create(
        user=user, otp_code="123456", otp_type="registration",
        expires_at=timezone.now() + timedelta(minutes=10)
    )
    assert otp.is_used is False
    assert "123456" in str(otp.otp_code)

@pytest.mark.django_db
def test_password_reset_token():
    user = User.objects.create_user("p", "p@x.com", "pw") # type : ignore
    token = PasswordResetToken.objects.create(
        user=user, reset_token="reset123", expires_at=timezone.now() + timedelta(hours=1)
    )
    assert token.reset_token == "reset123"
