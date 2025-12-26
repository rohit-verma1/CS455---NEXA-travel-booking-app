# payments/serializers.py
from rest_framework import serializers
from .models import Transaction, Refund, Settlement, LoyaltyWallet
from django.utils.timezone import localtime

class TransactionSerializer(serializers.ModelSerializer):
    booking_id = serializers.UUIDField(source='booking.booking_id', read_only=True)
    customer_username = serializers.CharField(source='customer_user.username', read_only=True)
    provider_username = serializers.CharField(source='provider_user.username', read_only=True)

    class Meta:
        model = Transaction
        fields = ['txn_id', 'booking_id', 'customer_username', 'provider_username', 'amount', 'currency', 'method', 'status', 'transaction_date']


class RefundSerializer(serializers.ModelSerializer):
    transaction_id = serializers.UUIDField(source='transaction.txn_id', read_only=True)
    customer_username = serializers.CharField(source='transaction.customer_user.username', read_only=True)

    class Meta:
        model = Refund
        fields = ['refund_id', 'transaction_id', 'customer_username', 'amount', 'reason', 'status', 'initiated_at', 'completed_at']


class SettlementSerializer(serializers.ModelSerializer):
    provider_username = serializers.CharField(source='provider_user.username', read_only=True)

    class Meta:
        model = Settlement
        fields = ['settlement_id', 'provider_username', 'period_start', 'period_end', 'amount', 'currency', 'status', 'processed_at']


class LoyaltyWalletSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = LoyaltyWallet
        fields = ['wallet_id', 'user_username', 'balance_points', 'conversion_rate', 'last_updated']

        
class TransactionListSerializer(serializers.ModelSerializer):
    booking_id = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()
    formatted_amount = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'txn_id',
            'type',
            'booking_id',
            'formatted_amount',
            'date',
        ]

    def get_booking_id(self, obj):
        return str(obj.booking.booking_id) if obj.booking else "—"

    def get_type(self, obj):
        if obj.status == "Refunded":
            return "Refund Issued"
        elif obj.status == "Success":
            return "Payment Received"
        elif obj.status == "Failed":
            return "Payment Failed"
        elif obj.status == "Initiated":
            return "Payment Initiated"
        return obj.status

    def get_formatted_amount(self, obj):
        sign = "-" if obj.status == "Refunded" else "+"
        return f"{sign}₹{obj.amount:.0f}"

    def get_date(self, obj):
        # Safely return only the date part
        return localtime(obj.transaction_date).date()
    
class LoyaltyWalletDetailSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    formatted_balance = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyWallet
        fields = [
            'wallet_id',
            'user_username',
            'formatted_balance',
            'conversion_rate',
            'last_updated',
        ]

    def get_formatted_balance(self, obj):
        return f"{obj.balance_points} points"