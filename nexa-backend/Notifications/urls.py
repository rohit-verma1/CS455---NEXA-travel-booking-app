from django.urls import path
from . import views

urlpatterns = [
    # Provider APIs
    path('provider/notifications/', views.ProviderNotificationListView.as_view(), name='provider-notification-list'),
    path('provider/notifications/create/', views.ProviderNotificationCreateView.as_view(), name='provider-notification-create'),
    path('provider/notifications/<uuid:notification_id>/', views.ProviderNotificationDetailView.as_view(), name='provider-notification-detail'),

    # Admin APIs
    path('admin/notifications/', views.AdminNotificationListView.as_view(), name='admin-notification-list'),
    path('admin/notifications/create/', views.AdminNotificationCreateView.as_view(), name='admin-notification-create'),
    path('admin/notifications/<uuid:notification_id>/', views.AdminNotificationDetailView.as_view(), name='admin-notification-detail'),

    # Recipient APIs
    path('inbox/', views.RecipientNotificationInboxView.as_view(), name='recipient-inbox'),
    path('inbox/<uuid:receipt_id>/read/', views.RecipientNotificationReadView.as_view(), name='recipient-mark-read'),
]
