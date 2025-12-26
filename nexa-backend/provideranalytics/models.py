import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.db.models import Sum, Avg, Count, F
from django.utils import timezone

User = settings.AUTH_USER_MODEL


class RouteAnalytics(models.Model):
    """
    Aggregated analytics for a specific (source → destination) route
    across all services (Bus, Train, Flight, Misc).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    source = models.ForeignKey(
        'services.Station',
        on_delete=models.CASCADE,
        related_name='analytics_source'
    )
    destination = models.ForeignKey(
        'services.Station',
        on_delete=models.CASCADE,
        related_name='analytics_destination'
    )

    # General stats
    total_bookings = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    avg_occupancy = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)

    # Provider stats
    active_providers = models.PositiveIntegerField(default=0)
    active_services = models.PositiveIntegerField(default=0)

    # Differentiated route-type performance
    bus_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    train_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    flight_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    misc_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('source', 'destination')
        verbose_name_plural = "Route Analytics"

    def __str__(self):
        return f"{self.source} → {self.destination}"

    # --- Aggregation Helpers ---

    @classmethod
    def update_from_bookings(cls):
        """
        Periodically aggregates booking + service data into RouteAnalytics.
        Call this via a cron/scheduled job or signal.
        """
        from bookings.models import Booking
        from django.contrib.contenttypes.models import ContentType
        from services.models import BusService, TrainService, FlightService

        # Preload content types for faster comparisons
        bus_ct = ContentType.objects.get_for_model(BusService)
        train_ct = ContentType.objects.get_for_model(TrainService)
        flight_ct = ContentType.objects.get_for_model(FlightService)

        # Group bookings by (source, destination)
        bookings = (
            Booking.objects
            .filter(status='Confirmed', payment_status='Paid')
            .values('source_id', 'destination_id')
            .annotate(
                total_bookings=Count('booking_id'),
                total_revenue=Sum('total_amount'),
                bus_revenue=Sum('total_amount', filter=models.Q(content_type=bus_ct)),
                train_revenue=Sum('total_amount', filter=models.Q(content_type=train_ct)),
                flight_revenue=Sum('total_amount', filter=models.Q(content_type=flight_ct)),
            )
        )

        for b in bookings:
            obj, _ = cls.objects.get_or_create(
                source_id=b['source_id'], destination_id=b['destination_id']
            )
            obj.total_bookings = b['total_bookings'] or 0
            obj.total_revenue = b['total_revenue'] or Decimal('0.0')
            obj.bus_revenue = b['bus_revenue'] or Decimal('0.0')
            obj.train_revenue = b['train_revenue'] or Decimal('0.0')
            obj.flight_revenue = b['flight_revenue'] or Decimal('0.0')
            obj.last_updated = timezone.now()
            obj.save(update_fields=[
                'total_bookings', 'total_revenue',
                'bus_revenue', 'train_revenue', 'flight_revenue', 'last_updated'
            ])

    def calculate_avg_occupancy(self):
        """
        Computes average occupancy for the route across service types.
        Train handled via total capacity-based ratio (no segments).
        """
        from services.models import BusService, TrainService, FlightService

        total_capacity = 0
        total_booked = 0

        bus_services = BusService.objects.filter(route__source=self.source, route__destination=self.destination)
        for b in bus_services:
            total_capacity += b.total_capacity
            total_booked += b.booked_seats

        train_services = TrainService.objects.filter(route__source=self.source, route__destination=self.destination)
        for t in train_services:
            total_capacity += t.total_seats
            booked_train = sum(
                (t.total_seats - seg.available_count_sleeper
                 - seg.available_count_second_ac
                 - seg.available_count_third_ac)
                for seg in t.segments.all()
            )
            total_booked += booked_train

        flight_services = FlightService.objects.filter(route__source=self.source, route__destination=self.destination)
        for f in flight_services:
            total_capacity += f.total_capacity
            total_booked += f.booked_seats

        self.avg_occupancy = (total_booked / total_capacity * 100) if total_capacity else 0
        self.save(update_fields=['avg_occupancy', 'last_updated'])


class ProviderPerformance(models.Model):
    """
    Tracks per-provider performance across their routes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(User, on_delete=models.CASCADE, related_name='provider_performance')

    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_bookings = models.PositiveIntegerField(default=0)
    avg_occupancy = models.FloatField(default=0.0)
    active_services = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Performance: {self.provider}"

    @classmethod
    def update_from_bookings(cls):
        from bookings.models import Booking
        from django.db.models import Sum, Count

        data = (
            Booking.objects
            .filter(status='Confirmed', payment_status='Paid')
            .values('provider')
            .annotate(
                total_bookings=Count('booking_id'),
                total_revenue=Sum('total_amount')
            )
        )

        for item in data:
            obj, _ = cls.objects.get_or_create(provider_id=item['provider'])
            obj.total_bookings = item['total_bookings'] or 0
            obj.total_revenue = item['total_revenue'] or Decimal('0.0')
            obj.last_updated = timezone.now()
            obj.save(update_fields=['total_bookings', 'total_revenue', 'last_updated'])
