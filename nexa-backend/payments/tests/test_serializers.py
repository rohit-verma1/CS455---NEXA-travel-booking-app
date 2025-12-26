import pytest
from bookings.models import Booking
from payments.models import Transaction, Refund
from payments.serializers import TransactionSerializer, RefundSerializer

pytestmark = pytest.mark.django_db


def test_transaction_serializer_roundtrip(create_user):
    user = create_user(email="s@ex.com", username="suser")
    booking = Booking.objects.create(customer=user, total_amount=1200)
    txn = Transaction.objects.create(
        booking=booking,
        customer_user=user,
        amount=1200,
        method="Card"
    )
    data = TransactionSerializer(txn).data
    assert "txn_id" in data
    assert data["status"] == "Initiated"


def test_refund_serializer_fields(create_user):
    user = create_user(email="r@ex.com", username="ruser")
    booking = Booking.objects.create(customer=user, total_amount=300)
    txn = Transaction.objects.create(booking=booking, customer_user=user, amount=300, method="UPI")
    refund = Refund.objects.create(transaction=txn, amount=300)
    serialized = RefundSerializer(refund).data
    assert "refund_id" in serialized
    assert serialized["status"] == "Pending"
