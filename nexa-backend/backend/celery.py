import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('backend')

# Load config from Django settings, using the "CELERY_" namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks in installed apps
app.autodiscover_tasks()

# Schedule the cleanup task
app.conf.beat_schedule = {
    'delete-old-pending-bookings-every-5-minutes': {
        'task': 'bookings.tasks.delete_unconfirmed_bookings',
        'schedule': 300.0,  # every 5 minutes
    },
    'clean-expired-sessions-every-10-minutes': {
        'task': 'authapi.tasks.clean_expired_sessions',
        'schedule': 600.0,  # every 10 minutes
    },
    'mail-recent-bookings-with-pdf-every-5-minutes': {
        'task': 'bookings.tasks.mail_recent_bookings_to_customers_with_pdf',
        'schedule': 300.0,  # every 5 minutes
    },
    
}

app.conf.timezone = 'Asia/Kolkata'