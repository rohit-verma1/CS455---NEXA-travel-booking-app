import logging
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.utils import timezone
from django.conf import settings

try:
    from bookings.models import Booking, BookingPassenger
    from services.models import BusService, TrainService, FlightService
except ImportError:
    pass

from .models import Notification, NotificationReceipt

User = get_user_model()
logger = logging.getLogger(__name__)


import logging
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from .models import Notification, NotificationReceipt
from bookings.models import Booking
logger = logging.getLogger(__name__)
User = get_user_model()


def create_notification_receipts(notification_id):
    """
    Finds all intended recipients for a notification and creates
    NotificationReceipt objects for them.

    Supports both Provider and Admin notification audiences.
    Returns the list of created NotificationReceipt instances.
    """
    try:
        notification = Notification.objects.get(notification_id=notification_id)
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found.")
        return []

    target_type = notification.target_audience_type
    recipient_ids = set()

    try:
        # ================================================================
        # ===============  PROVIDER Notification Targets  ================
        # ================================================================

        # ------------- Passenger Target -------------
        if target_type == 'Passenger':
            if notification.booking_passenger and notification.booking_passenger.booking:
                customer = notification.booking_passenger.booking.customer
                if customer:
                    recipient_ids.add(customer.pk)

        # ------------- Booking Target -------------
        elif target_type == 'Booking':
            if notification.booking and notification.booking.customer:
                recipient_ids.add(notification.booking.customer.pk)

        # ------------- Service Target -------------
        elif target_type == 'Service':
            if notification.content_type and notification.object_id:
                bookings = Booking.objects.filter(
                    content_type=notification.content_type,
                    object_id=notification.object_id,
                    customer__isnull=False
                )
                ids = bookings.values_list('customer__pk', flat=True).distinct()
                recipient_ids.update(ids)

        # ------------- Provider Target -------------
        elif target_type == 'Provider':
            provider = notification.sender
            if not provider:
                logger.warning(f"Notification {notification_id} has no sender; skipping provider resolution.")
            else:
                bus_ct = ContentType.objects.get_for_model(BusService)
                train_ct = ContentType.objects.get_for_model(TrainService)
                flight_ct = ContentType.objects.get_for_model(FlightService)

                bus_service_ids = BusService.objects.filter(provider_user_id=provider).values_list('service_id', flat=True)
                train_service_ids = TrainService.objects.filter(provider_user_id=provider).values_list('service_id', flat=True)
                flight_service_ids = FlightService.objects.filter(provider_user_id=provider).values_list('service_id', flat=True)

                query = (
                    Q(content_type=bus_ct, object_id__in=list(bus_service_ids)) |
                    Q(content_type=train_ct, object_id__in=list(train_service_ids)) |
                    Q(content_type=flight_ct, object_id__in=list(flight_service_ids))
                )

                all_bookings = Booking.objects.filter(query, customer__isnull=False)
                ids = all_bookings.values_list('customer__pk', flat=True).distinct()
                recipient_ids.update(ids)

        # ================================================================
        # =================  ADMIN Notification Targets  =================
        # ================================================================

        elif target_type == 'ALL_USERS':
            ids = User.objects.values_list('pk', flat=True)
            recipient_ids.update(ids)

        elif target_type == 'ALL_PROVIDERS':
            ids = User.objects.filter(role='Provider').values_list('pk', flat=True)
            recipient_ids.update(ids)

        elif target_type == 'ALL_ADMINS':
            ids = User.objects.filter(is_staff=True).values_list('pk', flat=True)
            recipient_ids.update(ids)

        elif target_type == 'SERVICE_CUSTOMERS' and notification.object_id:
            ids = Booking.objects.filter(
                object_id=notification.object_id, 
                customer__isnull=False
            ).values_list('customer__pk', flat=True).distinct()
            recipient_ids.update(ids)

        elif target_type == 'PROVIDER_CUSTOMERS' and notification.sender:
            ids = Booking.objects.filter(
                provider_id=notification.sender.id, 
                customer__isnull=False
            ).values_list('customer__pk', flat=True).distinct()
            recipient_ids.update(ids)

        elif target_type == 'SPECIFIC_PROVIDER' and notification.sender:
            recipient_ids.add(notification.sender.pk)

        elif target_type == 'SPECIFIC_CUSTOMER' and notification.booking_passenger:
            customer = notification.booking_passenger.booking.customer
            if customer:
                recipient_ids.add(customer.pk)

        # ================================================================
        # =================  CREATE RECEIPTS  ============================
        # ================================================================

        recipients = User.objects.filter(pk__in=recipient_ids)
        receipts_to_create = []

        for user in recipients:
            if user.email:
                receipts_to_create.append(
                    NotificationReceipt(
                        notification=notification,
                        recipient=user,
                        status='Pending',
                        sent_to_address=user.email
                    )
                )

        created_receipts = NotificationReceipt.objects.bulk_create(
            receipts_to_create,
            ignore_conflicts=True
        )

        logger.info(f"Created {len(created_receipts)} notification receipts for Notification {notification_id}.")
        return created_receipts

    except Exception as e:
        logger.exception(f"Error in create_notification_receipts for {notification_id}: {e}")
        return []

def send_notification_email(receipt_id):
    """
    Sends a single notification email based on a receipt.
    """
    try:
        receipt = NotificationReceipt.objects.select_related(
            'notification', 'recipient'
        ).get(receipt_id=receipt_id)

        if receipt.status != 'Pending':
            logger.warning(f"Skipping email for receipt {receipt_id}, status is '{receipt.status}'.")
            return

        notification = receipt.notification
        recipient = receipt.recipient

        send_mail(
            subject=notification.subject,
            message=notification.message_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[receipt.sent_to_address],
            fail_silently=False,
        )

        receipt.status = 'Sent'
        receipt.sent_at = timezone.now()
        receipt.save(update_fields=['status', 'sent_at'])
        logger.info(f"Successfully sent email for receipt {receipt_id}.")

    except NotificationReceipt.DoesNotExist:
        logger.error(f"NotificationReceipt {receipt_id} not found.")
    except Exception as e:
        logger.error(f"Failed to send email for receipt {receipt_id}: {e}")
        try:
            receipt = NotificationReceipt.objects.get(receipt_id=receipt_id)
            receipt.status = 'Failed'
            receipt.error_message = str(e)
            receipt.save(update_fields=['status', 'error_message'])
        except NotificationReceipt.DoesNotExist:
            pass
