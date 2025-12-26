# auth_api/utils.py
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.conf import settings
from smtplib import SMTPRecipientsRefused, SMTPAuthenticationError  # <- add this


# from django.core.mail import EmailMultiAlternatives
# from django.core.validators import validate_email
# from django.core.exceptions import ValidationError
# from django.conf import settings
# from smtplib import SMTPRecipientsRefused, SMTPAuthenticationError

def send_otp_email(email, otp, otp_type="registration"):
    """
    Validate email and send OTP. Returns status message string.
    """

    # 1) Validate format
    try:
        validate_email(email)
    except ValidationError:
        print(f"❌ Invalid email format: {email}")
        return f"Invalid email format: {email}"

    # 2) Subject selection
    subject_map = {
        "registration": "Verify your email - OTP Code",
        "password_reset": "Password Reset OTP",
        "email_change": "Verify your new email address",
    }
    subject = subject_map.get(otp_type, "Your OTP Code")

    # 3) Body
    text_content = f"Your OTP code is {otp}. It will expire in 10 minutes."
    html_content = f"""
    <div style="font-family:Arial,sans-serif;">
        <h2>Your OTP Code</h2>
        <p style="font-size:18px;">Use the following OTP to complete your process:</p>
        <p style="font-size:24px;font-weight:bold;">{otp}</p>
        <p>This OTP will expire in 10 minutes.</p>
        <br>
        <p>Thanks,<br>The Booking Platform Team</p>
    </div>
    """

    # 4) Prepare message and send
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", settings.EMAIL_HOST_USER),
        to=[email],
    )
    msg.attach_alternative(html_content, "text/html")

    # 5) Send email with error handling
    try:
        msg.send()
        print(f"✅ OTP email successfully sent to {email}")
        return "OTP successfully sent"
    except SMTPRecipientsRefused as e:
        print(f"❌ Invalid recipient: {email} - {e}")
        return f"Invalid recipient: {email}"
    except SMTPAuthenticationError as e:
        print(f"❌ SMTP authentication failed: {e}")
        return "SMTP authentication failed"
    except Exception as e:
        print(f"❌ Unexpected error while sending OTP to {email}: {e}")
        return "Unexpected error while sending OTP"

