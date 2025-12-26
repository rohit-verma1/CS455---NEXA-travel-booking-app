# payments/models.py
import uuid
from django.db import models
from django.conf import settings

from bookings.models import Booking

User = settings.AUTH_USER_MODEL

class Transaction(models.Model):
    STATUS_CHOICES = [('Initiated','Initiated'),('Success','Success'),('Failed','Failed'),('Refunded','Refunded')]
    txn_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.PROTECT, related_name="transactions")
    customer_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="paid_transactions")
    provider_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="received_transactions", null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    method = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Initiated')
    transaction_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Txn {self.txn_id} for Booking {self.booking.booking_id}"


class Refund(models.Model):
    STATUS_CHOICES = [('Pending','Pending'),('Completed','Completed'),('Failed','Failed')]
    refund_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.PROTECT, related_name="refunds")
    processed_by_admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    initiated_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Refund {self.refund_id}"


class Settlement(models.Model):
    STATUS_CHOICES = [('Pending','Pending'),('Completed','Completed'),('Failed','Failed')]
    settlement_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="settlements")
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Settlement {self.settlement_id} for {self.provider_user}"


class LoyaltyWallet(models.Model):
    wallet_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="loyalty_wallet")
    balance_points = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    conversion_rate = models.FloatField(default=1.0)  # how many points per currency unit (or vice versa)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Loyalty {self.user}"
