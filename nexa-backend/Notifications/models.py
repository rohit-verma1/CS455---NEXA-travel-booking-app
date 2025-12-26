import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

User = settings.AUTH_USER_MODEL

class Notification(models.Model):
    """
    Represents the core message to be sent.
    
    This model defines *what* is sent (subject, body), *who* sent it (sender),
    and the *intended audience* (e.G., all users of a service, or just
    one passenger).
    """
    
    CHANNEL_CHOICES = [
        ('Email', 'Email'),
        # ('SMS', 'SMS'), # Can be added later
        # ('Push', 'Push'), # Can be added later
    ]
    
    # This field captures the *intent* of the notification,
    # fulfilling your three requirements.
    TARGET_AUDIENCE_CHOICES = [
        ('Service', 'All users of a specific service'), # Req 1
        ('Provider', 'All users of the provider'),     # Req 2
        ('Passenger', 'A specific passenger'),         # Req 3
        ('Booking', 'A specific booking'),             
        ('Custom', 'A custom list of users'),        
    ]

    notification_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # The provider (User) who is sending this notification
    sender = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="sent_notifications"
    )
    
    # The message content
    subject = models.CharField(max_length=255)
    message_body = models.TextField()
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='Email')
    
    # --- Context / Audience Fields ---
    target_audience_type = models.CharField(
        max_length=20, 
        choices=TARGET_AUDIENCE_CHOICES, 
        default='Custom',
        help_text="Defines the group this notification is intended for."
    )
    
    # For 'Service' audience (BusService, TrainService, FlightService)
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="For 'Service' audience: the model of the service (e.g., BusService)."
    )
    object_id = models.UUIDField(
        null=True, blank=True,
        help_text="For 'Service' audience: the UUID of the service instance."
    )
    service_object = GenericForeignKey('content_type', 'object_id')

    # For 'Booking' audience
    booking = models.ForeignKey(
        'bookings.Booking', # Uses string to avoid circular import
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name="notifications",
        help_text="For 'Booking' audience: the specific booking."
    )
    
    # For 'Passenger' audience (Req 3)
    booking_passenger = models.ForeignKey(
        'bookings.BookingPassenger', # Uses string
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="notifications",
        help_text="For 'Passenger' audience: the specific passenger."
    )
    # --- End Context ---

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"'{self.subject}' from {self.sender} ({self.target_audience_type})"

    class Meta:
        ordering = ['-created_at']


class NotificationReceipt(models.Model):
    """
    Tracks the delivery status of a specific Notification to a specific User.
    
    This acts as a "delivery log" for each recipient of a notification.
    """
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Sent', 'Sent'),
        ('Failed', 'Failed'),
        ('Read', 'Read'), # For future use (e.g., tracking pixel)
    ]

    receipt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # The notification that was sent
    notification = models.ForeignKey(
        Notification, 
        on_delete=models.CASCADE, 
        related_name="receipts"
    )
    
    # The user who should receive/received it
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="notification_receipts"
    )
    
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    
    # Store the actual email address used at the time of sending
    sent_to_address = models.EmailField(
        blank=True,
        help_text="The email address this was sent to."
    ) 
    
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the email was successfully sent.")
    read_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the notification was read.")
    error_message = models.TextField(blank=True, null=True, help_text="Error message if status is 'Failed'.")

    class Meta:
        # A user should only receive one receipt for the same notification
        unique_together = ('notification', 'recipient')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recipient.email} - {self.notification.subject} ({self.status})"
import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class AdminNotification(models.Model):
    """
    Represents system-wide or targeted notifications sent by admins.

    This model allows admins to send emails or alerts to:
        ('ALL_USERS', 'All Users'),
        ('ALL_PROVIDERS', 'All Providers'),
        ('ALL_ADMINS', 'All Admins'),
        ('SERVICE_CUSTOMERS', 'Service Customers'),
        ('PROVIDER_CUSTOMERS', 'Provider Customers'),
        ('SPECIFIC_PROVIDER', 'Specific Provider'),
        ('SPECIFIC_CUSTOMER', 'Specific Customer'),
    """

    AUDIENCE_CHOICES = [
        ('ALL_USERS', 'All Users'),
        ('ALL_PROVIDERS', 'All Providers'),
        ('ALL_ADMINS', 'All Admins'),
        ('SERVICE_CUSTOMERS', 'Service Customers'),
        ('PROVIDER_CUSTOMERS', 'Provider Customers'),
        ('SPECIFIC_PROVIDER', 'Specific Provider'),
        ('SPECIFIC_CUSTOMER', 'Specific Customer'),
    ]

    CHANNEL_CHOICES = [
        ('Email', 'Email'),
        # ('SMS', 'SMS'),
        # ('Push', 'Push'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admin_notifications_sent',
        help_text="Admin who created/sent this notification."
    )

    subject = models.CharField(max_length=255)
    message_body = models.TextField()
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='Email')

    target_audience = models.CharField(max_length=50, choices=AUDIENCE_CHOICES)

    # Contextual targeting
    provider_id = models.UUIDField(
        null=True, blank=True,
        help_text="Used if target_audience is SPECIFIC_PROVIDER or PROVIDER_CUSTOMERS"
    )

    customer_id = models.UUIDField(
        null=True, blank=True,
        help_text="Used if target_audience is SPECIFIC_CUSTOMER"
    )

    service_id = models.UUIDField(
        null=True, blank=True,
        help_text="Used if target_audience is SERVICE_CUSTOMERS"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Admin Notification"
        verbose_name_plural = "Admin Notifications"

    def __str__(self):
        return f"Admin Notification: {self.subject} ({self.target_audience})"

    def resolve_recipients(self):
        """
        Returns a queryset/list of Users who should receive this notification,
        based on the target_audience field.
        """
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()

        if self.target_audience == 'ALL_USERS':
            return UserModel.objects.all()

        elif self.target_audience == 'ALL_PROVIDERS':
            return UserModel.objects.filter(role='Provider')  # assuming role field exists

        elif self.target_audience == 'ALL_ADMINS':
            return UserModel.objects.filter(is_staff=True)

        elif self.target_audience == 'SPECIFIC_PROVIDER' and self.provider_id:
            return UserModel.objects.filter(id=self.provider_id)

        elif self.target_audience == 'SPECIFIC_CUSTOMER' and self.customer_id:
            return UserModel.objects.filter(id=self.customer_id)

        elif self.target_audience == 'PROVIDER_CUSTOMERS' and self.provider_id:
            # Example: all customers linked to bookings from a provider
            from bookings.models import BookingPassenger
            return UserModel.objects.filter(
                id__in=BookingPassenger.objects.filter(
                    booking__provider_id=self.provider_id
                ).values_list('user_id', flat=True)
            )

        elif self.target_audience == 'SERVICE_CUSTOMERS' and self.service_id:
            from bookings.models import BookingPassenger
            return UserModel.objects.filter(
                id__in=BookingPassenger.objects.filter(
                    booking__service_id=self.service_id
                ).values_list('user_id', flat=True)
            )

        return UserModel.objects.none()
    
class AdminNotificationReceipt(models.Model):
    """
    Tracks which users received an AdminNotification,
    along with their delivery status and timestamps.
    """

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Sent', 'Sent'),
        ('Failed', 'Failed'),
        ('Read', 'Read'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    notification = models.ForeignKey(
        AdminNotification,
        on_delete=models.CASCADE,
        related_name='receipts'
    )

    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='admin_notification_receipts'
    )

    sent_to_address = models.EmailField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')
    error_message = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('notification', 'recipient')
        ordering = ['-created_at']
        verbose_name = "Admin Notification Receipt"
        verbose_name_plural = "Admin Notification Receipts"

    def __str__(self):
        return f"{self.recipient.email} - {self.notification.subject} ({self.status})"
