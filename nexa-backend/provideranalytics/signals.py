# analytics/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from provideranalytics.models import RouteAnalytics, ProviderPerformance

@receiver(post_save, sender=Booking)
def update_analytics_on_booking(sender, instance, **kwargs):
    if instance.status == 'Confirmed' and instance.payment_status == 'Paid':
        RouteAnalytics.update_from_bookings()
        ProviderPerformance.update_from_bookings()
