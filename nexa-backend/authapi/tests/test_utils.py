import pytest
from unittest.mock import patch
from smtplib import SMTPRecipientsRefused, SMTPAuthenticationError
from authapi.utlis import send_otp_email

@patch("authapi.utlis.EmailMultiAlternatives.send", return_value=1)
def test_send_otp_email_success(mock_send):
    result = send_otp_email("valid@example.com", "123456")
    assert "successfully" in result.lower()

def test_send_otp_email_invalid_format():
    result = send_otp_email("bademail", "123456")
    assert "invalid email" in result.lower()

@patch("authapi.utlis.EmailMultiAlternatives.send", side_effect=SMTPRecipientsRefused("bad"))
def test_send_otp_email_recipient_refused(mock_send):
    result = send_otp_email("test@example.com", "123456")
    assert "invalid recipient" in result.lower()

@patch("authapi.utlis.EmailMultiAlternatives.send", side_effect=SMTPAuthenticationError(535, b"bad creds"))
def test_send_otp_email_auth_error(mock_send):
    result = send_otp_email("test@example.com", "123456")
    assert "authentication failed" in result.lower()

@patch("authapi.utlis.EmailMultiAlternatives.send", side_effect=Exception("boom"))
def test_send_otp_email_generic_exception(mock_send):
    result = send_otp_email("test@example.com", "123456")
    assert "unexpected error" in result.lower()
