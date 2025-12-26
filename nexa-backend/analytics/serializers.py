from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializes reviews for both customers and providers.
    Automatically includes the customer's username and provider_user's ID.
    """
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    provider_user_id = serializers.UUIDField(source='provider_user.id', read_only=True)

    class Meta:
        model = Review
        fields = [
            'review_id',
            'customer',
            'customer_username',
            'provider_user_id',
            'service_mode',
            'service_id',
            'train_number',
            'rating',
            'title',
            'comment',
            'created_at',
            'is_public',
        ]
        read_only_fields = ['review_id', 'customer', 'customer_username', 'created_at']


class ProviderSummarySerializer(serializers.Serializer):
    """
    Serializer for provider analytics summary KPIs.
    """
    provider_user_id = serializers.CharField()
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_bookings = serializers.IntegerField()
    avg_occupancy = serializers.FloatField()
    avg_rating = serializers.FloatField(allow_null=True)
    total_services = serializers.IntegerField()
    active_services = serializers.IntegerField()
    cancellation_rate = serializers.FloatField()
    refund_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
