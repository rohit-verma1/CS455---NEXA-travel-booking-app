import pytest
from django.utils import timezone
from datetime import timedelta
from bookings.models import Booking
from payments.models import Transaction, Refund, Settlement, LoyaltyWallet

pytestmark = pytest.mark.django_db


def _make_booking(customer, total_amount=1000):
    # Create a minimal Booking required by Transaction FK. Adapt fields if your Booking requires extras.
    return Booking.objects.create(customer=customer, total_amount=total_amount)


def test_transaction_and_refund_str_and_fields(create_user):
    customer = create_user(email="c1@example.com", username="c1")
    booking = _make_booking(customer, total_amount=500)
    txn = Transaction.objects.create(
        booking=booking,
        customer_user=customer,
        amount=500,
        method="UPI",
        status="Success"
    )
    assert str(txn).startswith("Txn")
    refund = Refund.objects.create(transaction=txn, amount=100)
    assert str(refund).startswith("Refund")
    assert refund.status == "Pending"


def test_settlement_and_loyaltywallet(create_user):
    provider = create_user(email="prov1@example.com", username="prov1", user_type="provider")
    settle = Settlement.objects.create(
        provider_user=provider,
        period_start=timezone.now() - timedelta(days=7),
        period_end=timezone.now(),
        amount=1500.00
    )
    assert "Settlement" in str(settle)
    w = LoyaltyWallet.objects.create(user=provider, balance_points=100)
    assert "Loyalty" in str(w)
    w.balance_points += 50
    w.save()
    w.refresh_from_db()
    assert float(w.balance_points) == 150.0
