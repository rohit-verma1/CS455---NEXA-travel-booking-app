import pytest
from django.urls import reverse
from authapi.models import OTPVerification, User

@pytest.mark.django_db
def test_forgot_password_sends_otp(user_customer, api_client):
    url = reverse("forgot_password")
    response = api_client.post(url, {"email": user_customer.email})
    assert response.status_code == 200
    assert OTPVerification.objects.filter(user=user_customer, otp_type="password_reset").exists()

@pytest.mark.django_db
def test_reset_password_with_valid_otp(user_customer, api_client):
    otp = OTPVerification.objects.create(
        user=user_customer, otp_code="123456", otp_type="password_reset",
        expires_at="2999-12-31T00:00Z"
    )
    url = reverse("reset_password")
    payload = {"email": user_customer.email, "otp": "123456", "new_password": "newpassword123"}
    response = api_client.post(url, payload)
    assert response.status_code == 200
    user_customer.refresh_from_db()
    assert user_customer.check_password("newpassword123")
