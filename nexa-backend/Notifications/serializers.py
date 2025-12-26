from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Notification, NotificationReceipt
from bookings.models import Booking, BookingPassenger # Import for validation

class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for a provider to *create* a new notification.
    It accepts simple IDs and resolves them into model objects.
    """
    
    # Write-only fields to accept simple IDs from the API request
    service_model = serializers.CharField(
        write_only=True, required=False, allow_null=True,
        help_text="For 'Service' audience: e.g., 'busservice', 'trainservice'"
    )
    service_object_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True,
        help_text="For 'Service' audience: The UUID of the service."
    )
    booking_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True,
        help_text="For 'Booking' audience: The UUID of the booking."
    )
    booking_passenger_id = serializers.UUIDField(
        write_only=True, required=False, allow_null=True,
        help_text="For 'Passenger' audience: The UUID of the passenger."
    )

    class Meta:
        model = Notification
        fields = [
            'notification_id', 
            'subject', 
            'message_body', 
            'channel',
            'target_audience_type',
            'service_model',          # Write-only
            'service_object_id',      # Write-only
            'booking_id',             # Write-only
            'booking_passenger_id',   # Write-only
        ]
        read_only_fields = ['notification_id', 'channel']

    def validate(self, data):
        """
        Validate the audience fields based on the target_audience_type.
        """
        target_type = data.get('target_audience_type')

        if target_type == 'Service':
            model_name = data.get('service_model')
            object_id = data.get('service_object_id')
            if not model_name or not object_id:
                raise serializers.ValidationError(
                    "For 'Service' target, 'service_model' and 'service_object_id' are required."
                )
            try:
                # Validate the model name
                ct = ContentType.objects.get(model=model_name.lower())
                # Validate the object exists
                if not ct.model_class().objects.filter(pk=object_id).exists():
                    raise serializers.ValidationError(f"No service found with ID {object_id} for model {model_name}.")
                # Store for create() method
                data['content_type'] = ct
                data['object_id'] = object_id
            except ContentType.DoesNotExist:
                raise serializers.ValidationError(f"Invalid 'service_model': {model_name}")

        elif target_type == 'Booking':
            booking_id = data.get('booking_id')
            if not booking_id:
                raise serializers.ValidationError("For 'Booking' target, 'booking_id' is required.")
            try:
                data['booking'] = Booking.objects.get(booking_id=booking_id)
            except Booking.DoesNotExist:
                raise serializers.ValidationError(f"No booking found with ID {booking_id}.")

        elif target_type == 'Passenger':
            passenger_id = data.get('booking_passenger_id')
            if not passenger_id:
                raise serializers.ValidationError("For 'Passenger' target, 'booking_passenger_id' is required.")
            try:
                data['booking_passenger'] = BookingPassenger.objects.get(passenger_id=passenger_id)
            except BookingPassenger.DoesNotExist:
                raise serializers.ValidationError(f"No passenger found with ID {passenger_id}.")
        
        elif target_type == 'Provider':
            # No extra validation needed, sender is added from request.user
            pass

        return data

    def create(self, validated_data):
        """
        Create the Notification object, adding the sender from the context.
        """
        # Pop the validated, but non-model, fields
        validated_data.pop('service_model', None)
        validated_data.pop('service_object_id', None)
        validated_data.pop('booking_id', None)
        validated_data.pop('booking_passenger_id', None)
        
        # Add sender (passed from view's perform_create)
        validated_data['sender'] = self.context['request'].user
        
        return super().create(validated_data)


class NotificationReceiptSerializer(serializers.ModelSerializer):
    """
    Serializer for viewing a single receipt's status.
    """
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)

    class Meta:
        model = NotificationReceipt
        fields = [
            'receipt_id', 
            'status', 
            'recipient_email', 
            'sent_to_address', 
            'sent_at', 
            'read_at',
            'error_message'
        ]


class NotificationListSerializer(serializers.ModelSerializer):
    """
    A lightweight serializer for listing a provider's sent notifications.
    """
    receipt_count = serializers.IntegerField(source='receipts.count', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'notification_id', 
            'subject', 
            'target_audience_type', 
            'created_at',
            'receipt_count'
        ]


class NotificationDetailSerializer(serializers.ModelSerializer):
    """
    A detailed view of a notification, including all its receipts.
    """
    receipts = NotificationReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            'notification_id', 
            'subject', 
            'message_body', 
            'target_audience_type', 
            'created_at',
            'service_object', # This will use the __str__ method of the service
            'booking',        # This will use the __str__ method of the booking
            'booking_passenger', # This will use the __str__ method
            'receipts'
        ]


class RecipientNotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for a recipient's "inbox".
    It flattens the notification content onto the receipt.
    """
    notification_id = serializers.UUIDField(source='notification.notification_id', read_only=True)
    subject = serializers.CharField(source='notification.subject', read_only=True)
    message_body = serializers.CharField(source='notification.message_body', read_only=True)
    sent_by = serializers.CharField(source='notification.sender.username', read_only=True) # or email/name

    class Meta:
        model = NotificationReceipt
        fields = [
            'receipt_id', 
            'status', 
            'sent_at', 
            'read_at',
            'notification_id', 
            'subject', 
            'message_body',
            'sent_by'
        ]
        read_only_fields = fields


class NotificationReadUpdateSerializer(serializers.ModelSerializer):
    """
    A simple serializer just for marking a notification as 'Read'.
    """
    class Meta:
        model = NotificationReceipt
        fields = ['status']

    def validate_status(self, value):
        if value != 'Read':
            raise serializers.ValidationError("You can only set the status to 'Read'.")
        return value
    
class AdminNotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for Admins to create and broadcast notifications.
    Supports wide targeting options like all users, providers, or specific groups.
    """

    provider_id = serializers.UUIDField(required=False, allow_null=True)
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    service_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'subject',
            'message_body',
            'channel',
            'target_audience_type',
            'content_type',
            'object_id',
            'booking',
            'booking_passenger',
            'provider_id',
            'customer_id',
            'service_id',
        ]
        read_only_fields = ['notification_id']

    def validate(self, data):
        """
        Validate fields based on target audience type.
        Prevent inconsistent configurations.
        """
        target = data.get('target_audience_type')

        # Example of audience-based field validation
        if target == 'SERVICE_CUSTOMERS' and not data.get('service_id'):
            raise serializers.ValidationError({
                'service_id': 'This field is required when targeting service customers.'
            })
        if target == 'PROVIDER_CUSTOMERS' and not data.get('provider_id'):
            raise serializers.ValidationError({
                'provider_id': 'This field is required when targeting provider customers.'
            })
        if target == 'SPECIFIC_CUSTOMER' and not data.get('customer_id'):
            raise serializers.ValidationError({
                'customer_id': 'This field is required when targeting a specific customer.'
            })
        if target == 'SPECIFIC_PROVIDER' and not data.get('provider_id'):
            raise serializers.ValidationError({
                'provider_id': 'This field is required when targeting a specific provider.'
            })

        return data

    def create(self, validated_data):
        """
        Assigns the sender automatically from request context.
        """
        request = self.context.get('request')
        validated_data['sender'] = request.user
        notification = Notification.objects.create(**validated_data)
        return notification


# ===========================================================
# --- LIST SERIALIZER
# ===========================================================

class AdminNotificationListSerializer(serializers.ModelSerializer):
    """
    Compact representation of all admin notifications for listing / audit views.
    """
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    total_recipients = serializers.IntegerField(source='receipts.count', read_only=True)
    sent_count = serializers.SerializerMethodField()

    def get_sent_count(self, obj):
        return obj.receipts.filter(status='Sent').count()

    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'subject',
            'target_audience_type',
            'channel',
            'sender_email',
            'created_at',
            'total_recipients',
            'sent_count',
        ]


# ===========================================================
# --- DETAIL SERIALIZER
# ===========================================================

class AdminNotificationReceiptInlineSerializer(serializers.ModelSerializer):
    """
    Inline serializer to show which users received a given notification.
    """
    recipient_email = serializers.EmailField(source='recipient.email', read_only=True)

    class Meta:
        model = NotificationReceipt
        fields = [
            'receipt_id',
            'recipient_email',
            'status',
            'sent_to_address',
            'sent_at',
            'read_at',
            'error_message'
        ]


class AdminNotificationDetailSerializer(serializers.ModelSerializer):
    """
    Full detail view for a single Admin notification,
    showing metadata and all recipient delivery logs.
    """
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    receipts = AdminNotificationReceiptInlineSerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            'notification_id',
            'subject',
            'message_body',
            'channel',
            'target_audience_type',
            'sender_email',
            'created_at',
            'receipts',
        ]