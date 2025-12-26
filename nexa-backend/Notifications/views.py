from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import Notification, NotificationReceipt
from .serializers import (
    NotificationCreateSerializer,
    NotificationListSerializer,
    NotificationDetailSerializer,
    RecipientNotificationSerializer,
    NotificationReadUpdateSerializer
)
from .utils import create_notification_receipts, send_notification_email
# from .tasks import create_notification_receipts  # for Celery async use


# ----------------------------------------------------------------------
# --- BASE CLASSES (Shared across Provider & Admin)
# ----------------------------------------------------------------------

class BaseNotificationCreateView(generics.CreateAPIView):
    """
    Abstract base class for creating and sending notifications.
    """
    serializer_class = NotificationCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        """
        Saves the notification and triggers the receipt creation and sending.
        """
        notification = serializer.save(sender=self.request.user)

        # Trigger synchronous or async receipt generation
        receipts = create_notification_receipts(notification.notification_id)
        for receipt in receipts:
            send_notification_email(receipt.receipt_id)

        return notification


class BaseNotificationListView(generics.ListAPIView):
    """
    Abstract base for listing sent notifications.
    """
    serializer_class = NotificationListSerializer
    permission_classes = [permissions.IsAuthenticated]


class BaseNotificationDetailView(generics.RetrieveAPIView):
    """
    Abstract base for viewing details of a single notification.
    """
    serializer_class = NotificationDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'notification_id'


# ----------------------------------------------------------------------
# --- PROVIDER NOTIFICATION VIEWS
# ----------------------------------------------------------------------

class ProviderNotificationCreateView(BaseNotificationCreateView):
    """
    API for a Provider to create and send notifications.
    """
    # Add custom permission in production: e.g., [IsAuthenticated, IsProviderUser]

    def perform_create(self, serializer):
        # Providers can only send notifications as themselves
        notification = serializer.save(sender=self.request.user)
        receipts = create_notification_receipts(notification.notification_id)
        for r in receipts:
            send_notification_email(r.receipt_id)
        return notification


class ProviderNotificationListView(BaseNotificationListView):
    """
    Provider can see all notifications they have sent.
    """
    def get_queryset(self):
        return Notification.objects.filter(sender=self.request.user).prefetch_related('receipts')


class ProviderNotificationDetailView(BaseNotificationDetailView):
    """
    Provider can view a specific notification and its recipients.
    """
    def get_queryset(self):
        return Notification.objects.filter(sender=self.request.user)


# ----------------------------------------------------------------------
# --- ADMIN NOTIFICATION VIEWS
# ----------------------------------------------------------------------
from .serializers import (
    AdminNotificationCreateSerializer,
    AdminNotificationListSerializer,
    AdminNotificationDetailSerializer,
)
import logging
from django.db import transaction
from rest_framework import generics, status
from rest_framework.response import Response
from bookings.permissions import IsAdmin
from .models import Notification
from .utils import create_notification_receipts, send_notification_email

logger = logging.getLogger(__name__)


class AdminNotificationCreateView(generics.CreateAPIView):
    """
    API for Admins to create and send notifications to:
    - All users
    - All providers
    - Fellow admins
    - Service customers
    - Provider customers
    - Specific provider or customer
    """
    serializer_class = AdminNotificationCreateSerializer
    permission_classes = [IsAdmin]

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Admins can broadcast notifications to a large audience.
        Handles creation, receipt generation, and email sending.
        """
        notification = serializer.save(sender=self.request.user)

        logger.info(f"[AdminNotification] Created {notification.subject} ({notification.target_audience_type})")

        # Generate recipient receipts
        receipts = create_notification_receipts(notification.notification_id)
        logger.info(f"[AdminNotification] {len(receipts)} recipients found for notification {notification.notification_id}")

        # Send emails synchronously (replace with async Celery if needed)
        for receipt in receipts:
            try:
                send_notification_email(receipt.receipt_id)
            except Exception as e:
                logger.error(f"Failed to send notification email to {receipt.sent_to_address}: {e}")

        return notification

    def create(self, request, *args, **kwargs):
        """
        Override to return a nicer response format after creation.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification = self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            {
                "message": "Notification successfully created and dispatched.",
                "notification_id": str(notification.notification_id),
                "target_audience_type": notification.target_audience_type,
                "subject": notification.subject,
            },
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class AdminNotificationListView(generics.ListAPIView):
    """
    Lists all notifications (for monitoring and audit).
    Supports pagination and filtering by target type if needed.
    """
    serializer_class = AdminNotificationListSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = Notification.objects.all().prefetch_related('receipts')
        target_type = self.request.query_params.get('target_audience_type')
        if target_type:
            queryset = queryset.filter(target_audience_type=target_type)
        return queryset
    
class AdminNotificationDetailView(generics.RetrieveAPIView):
    """
    Retrieves detailed info for a single admin notification,
    including all recipient delivery receipts.
    """
    serializer_class = AdminNotificationDetailSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'notification_id'

    def get_queryset(self):
        user =  self.request.user
        user_email  = user.email
        return Notification.objects.filter(sender__email=user_email).prefetch_related('receipts__recipient')


# ----------------------------------------------------------------------
# --- RECIPIENT (CUSTOMER) VIEWS
# ----------------------------------------------------------------------

class RecipientNotificationInboxView(generics.ListAPIView):
    """
    For customers or users — view all received notifications.
    """
    serializer_class = RecipientNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return NotificationReceipt.objects.filter(
            recipient=self.request.user
        ).select_related('notification', 'notification__sender')


class RecipientNotificationReadView(generics.UpdateAPIView):
    """
    For recipients to mark notifications as 'Read'.
    """
    serializer_class = NotificationReadUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'receipt_id'
    http_method_names = ['patch']

    def get_queryset(self):
        return NotificationReceipt.objects.filter(recipient=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Update read timestamp if marking as 'Read'
        if serializer.validated_data.get('status') == 'Read' and not instance.read_at:
            instance.read_at = timezone.now()

        self.perform_update(serializer)

        # Return full notification representation
        full_serializer = RecipientNotificationSerializer(instance)
        return Response(full_serializer.data)
