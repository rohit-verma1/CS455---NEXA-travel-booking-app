import uuid
from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

User = settings.AUTH_USER_MODEL


class Booking(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Confirmed', 'Confirmed'),
        ('Cancelled', 'Cancelled')
    ]
    PAYMENT_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Refunded', 'Refunded')
    ]

    booking_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    provider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="provider_bookings")
    # --- MODIFIED: Replaced 'mode' and 'service_id' ---
    # This allows linking to BusService, TrainService, or FlightService
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.CASCADE,
        help_text="The model of the service being booked (e.g., BusService, TrainService).", 
        null=True, blank=True
    )
    object_id = models.UUIDField(
        help_text="The UUID of the specific service instance.", 
        null=True, blank=True
    )
    service_object = GenericForeignKey('content_type', 'object_id')
    # ----------------------------------------------------
    email  = models.EmailField(default= None, null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Pending')
    booking_date = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    no_cancellation_free_markup = models.BooleanField(default=False)
    no_reschedule_free_markup = models.BooleanField(default=False)
    source_id  =  models.ForeignKey('services.Station', on_delete=models.SET_NULL, null=True, blank=True, related_name='booking_source_station')
    destination_id  =  models.ForeignKey('services.Station', on_delete=models.SET_NULL, null=True, blank=True, related_name='booking_destination_station')
    class_type=  models.CharField(max_length=50, blank=True, null=True)
    email  =  models.EmailField(max_length=254, blank=True, null=True)
    phone_number  =  models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        # The service_object might be None if the related object is deleted
        # or during certain admin operations, so we check for it.
        service_name = "Service"
        if self.service_object:
            service_name = self.service_object.__class__.__name__ # e.g., "TrainService"
        
        return f"Booking {self.booking_id} ({service_name})"

    # ⛔️ The get_service() and get_service_name() methods are no longer needed!
    # You can now simply access 'booking.service_object' to get the
    # BusService, TrainService, or FlightService instance directly.


class BookingPassenger(models.Model):
    passenger_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="passengers",null=True, blank=True)
    name = models.CharField(max_length=200)
    age = models.PositiveIntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    seat_no = models.CharField(max_length=20, blank=True, null=True)
    document_id = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.seat_no})"


class Ticket(models.Model):
    ticket_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="ticket")
    ticket_no = models.CharField(max_length=100, unique=True)
    qr_code = models.TextField(blank=True, null=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    is_valid = models.BooleanField(default=True)

    def __str__(self):
        return self.ticket_no


class BookingStatus(models.Model):
    status_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="status_logs")
    status = models.CharField(max_length=50)
    timestamp = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.booking.booking_id} → {self.status}"