from celery import shared_task
from django.utils import timezone
from .models import Session

@shared_task
def clean_expired_sessions():
    """Deactivate or delete sessions that have expired."""
    now = timezone.now()
    expired_sessions = Session.objects.filter(expires_at__lt=now, is_active=True)

    count = expired_sessions.count()
    # Option 1: Mark them inactive (recommended if you want logs)
    expired_sessions.update(is_active=False)

    # Option 2 (optional): Delete them entirely
    # expired_sessions.delete()

    return f"Cleaned {count} expired sessions."
