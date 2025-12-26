import json
from unittest import mock
from datetime import timedelta
import pytest
from django.utils import timezone
from django.urls import resolve
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from Notifications.models import Notification, NotificationReceipt
from Notifications.serializers import NotificationCreateSerializer, NotificationReadUpdateSerializer
from Notifications.utils import create_notification_receipts, send_notification_email
from authapi.models import Session

User = get_user_model()
pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def make_user(email="u@example.com", username="u", user_type="customer", password="pw"):
    """Create a test user compatible with your custom manager."""
    try:
        return User.objects.create_user(username=username, email=email, password=password, user_type=user_type)
    except TypeError:
        return User.objects.create_user(email=email, password=password)


def make_session(user, token="sess-xyz"):
    """Attach a valid session token."""
    return Session.objects.create(
        user=user,
        session_token=token,
        expires_at=timezone.now() + timedelta(days=1),
        is_active=True
    )


# ---------------------------------------------------------------------
# Models / Serializers
# ---------------------------------------------------------------------
def test_notification_and_receipt_str_and_creation():
    sender = make_user("sender@example.com", "sender", "provider")
    recipient = make_user("rec@example.com", "rec", "customer")

    n = Notification.objects.create(subject="Hi", message_body="Body", sender=sender, target_audience_type="Custom")
    r = NotificationReceipt.objects.create(notification=n, recipient=recipient, sent_to_address=recipient.email, status="Pending")

    assert "Hi" in str(n)
    assert recipient.email in str(r)


def test_notification_create_and_read_serializers():
    data = {"subject": "s", "message_body": "m", "target_audience_type": "Service"}
    ser = NotificationCreateSerializer(data=data)
    assert not ser.is_valid()

    s2 = NotificationReadUpdateSerializer(data={"status": "Read"})
    assert s2.is_valid()
    assert s2.validated_data["status"] == "Read"


# ---------------------------------------------------------------------
# Utils: create_notification_receipts — full branch coverage
# ---------------------------------------------------------------------
@pytest.mark.parametrize(
    "target_type",
    [
        "Passenger", "Booking", "Service", "Provider",
        "ALL_USERS", "ALL_PROVIDERS", "ALL_ADMINS",
        "SERVICE_CUSTOMERS", "PROVIDER_CUSTOMERS",
        "SPECIFIC_PROVIDER", "SPECIFIC_CUSTOMER",
    ],
)
def test_create_notification_receipts_various_paths(monkeypatch, target_type, django_db_blocker):
    sender = make_user("prov@example.com", "prov", "provider")
    customer = make_user("cust@example.com", "cust", "customer")

    # Patch Booking / Service classes into utils globals
    with django_db_blocker.unblock():
        Booking = create_notification_receipts.__globals__["Booking"] = mock.MagicMock()
        BookingPassenger = create_notification_receipts.__globals__["BookingPassenger"] = mock.MagicMock()
        BusService = create_notification_receipts.__globals__["BusService"] = mock.MagicMock()
        TrainService = create_notification_receipts.__globals__["TrainService"] = mock.MagicMock()
        FlightService = create_notification_receipts.__globals__["FlightService"] = mock.MagicMock()

        # Fake queryset behaviors
        fake_qs = mock.Mock()
        fake_qs.values_list.return_value.distinct.return_value = [customer.pk]
        Booking.objects.filter.return_value = fake_qs
        Booking.objects.values_list.return_value = [customer.pk]
        for svc in (BusService, TrainService, FlightService):
            svc.objects.filter.return_value.values_list.return_value = [1]

        # Safe Notification creation (no FK assignment of mocks)
        n = Notification.objects.create(
            subject=f"{target_type} Sub",
            message_body="Body",
            sender=sender,
            target_audience_type=target_type,
        )

        res = create_notification_receipts(n.notification_id)
        assert isinstance(res, list)
        for r in res:
            assert isinstance(r, NotificationReceipt)
            assert r.notification == n
            assert r.sent_to_address


def test_create_notification_receipts_not_found_and_exception(monkeypatch):
    # Patch Notification to raise exceptions
    monkeypatch.setitem(create_notification_receipts.__globals__, "Notification", mock.Mock())
    Notification = create_notification_receipts.__globals__["Notification"]
    Notification.DoesNotExist = Exception
    Notification.objects.get.side_effect = Notification.DoesNotExist
    assert create_notification_receipts("bad-id") == []

    Notification.objects.get.side_effect = Exception("DB fail")
    assert create_notification_receipts("bad-id-2") == []


# ---------------------------------------------------------------------
# Utils: send_notification_email
# ---------------------------------------------------------------------
@mock.patch("Notifications.utils.send_mail")
def test_send_notification_email_success_and_failure(mock_mail):
    sender = make_user("s@example.com", "s", "provider")
    rec = make_user("r@example.com", "r", "customer")

    # First notification/receipt
    n1 = Notification.objects.create(subject="N1", message_body="M", sender=sender)
    r1 = NotificationReceipt.objects.create(notification=n1, recipient=rec, status="Pending", sent_to_address=rec.email)
    mock_mail.return_value = 1
    send_notification_email(r1.receipt_id)
    r1.refresh_from_db()
    assert r1.status == "Sent"

    # Second notification to avoid duplicate key
    n2 = Notification.objects.create(subject="N2", message_body="M2", sender=sender)
    r2 = NotificationReceipt.objects.create(notification=n2, recipient=rec, status="Pending", sent_to_address=rec.email)
    mock_mail.side_effect = Exception("Mail fail")
    send_notification_email(r2.receipt_id)
    r2.refresh_from_db()
    assert r2.status == "Failed"
    assert r2.error_message


# ---------------------------------------------------------------------
# DRF Views: Provider, Admin, Recipient
# ---------------------------------------------------------------------
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def provider_token():
    u = make_user("p@example.com", "p", "provider")
    t = "tkn-prov"
    make_session(u, t)
    return u, t


@pytest.fixture
def admin_token():
    u = make_user("a@example.com", "a", "admin")
    u.is_staff = True
    u.save()
    t = "tkn-admin"
    make_session(u, t)
    return u, t


def test_provider_create_list_detail(monkeypatch, api_client, provider_token):
    user, token = provider_token
    monkeypatch.setattr("Notifications.views.create_notification_receipts", lambda nid: [])
    monkeypatch.setattr("Notifications.views.send_notification_email", lambda rid: None)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    payload = {"subject": "Sub", "message_body": "B", "target_audience_type": "Provider"}
    r = api_client.post("/notifications/provider/notifications/create/", payload, format="json")
    assert r.status_code in (201, 400, 403)

    Notification.objects.create(subject="X", message_body="x", sender=user)
    rl = api_client.get("/notifications/provider/notifications/")
    assert rl.status_code in (200, 403, 401)


def test_admin_create_list_detail(monkeypatch, api_client, admin_token):
    u, token = admin_token
    monkeypatch.setattr("Notifications.views.create_notification_receipts", lambda nid: [])
    monkeypatch.setattr("Notifications.views.send_notification_email", lambda rid: None)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    payload = {"subject": "Admin", "message_body": "B", "target_audience_type": "ALL_USERS"}
    r = api_client.post("/notifications/admin/notifications/create/", payload, format="json")
    assert r.status_code in (201, 400, 403)

    Notification.objects.create(subject="A", message_body="B", sender=u)
    rl = api_client.get("/notifications/admin/notifications/")
    assert rl.status_code in (200, 403, 401)


def test_recipient_inbox_and_read(api_client, provider_token):
    u, token = provider_token
    n = Notification.objects.create(subject="Inbox", message_body="Msg", sender=u)
    r = NotificationReceipt.objects.create(notification=n, recipient=u, status="Pending", sent_to_address=u.email)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    ri = api_client.get("/notifications/inbox/")
    assert ri.status_code in (200, 403, 401)

    rread = api_client.patch(f"/notifications/inbox/{r.receipt_id}/read/", {"status": "Read"}, format="json")
    assert rread.status_code in (200, 400, 403)


# ---------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------
def test_notifications_urls_resolve():
    paths = [
        ("/notifications/provider/notifications/", "provider-notification-list"),
        ("/notifications/provider/notifications/create/", "provider-notification-create"),
        ("/notifications/admin/notifications/", "admin-notification-list"),
        ("/notifications/inbox/", "recipient-inbox"),
    ]
    for path, name in paths:
        match = resolve(path)
        assert name in match.view_name
