from rest_framework import serializers
from django.utils import timezone
import pytz

class UTCDateTimeField(serializers.DateTimeField):
    """Always represent datetimes in UTC for API responses."""
    def to_representation(self, value):
        if value is None:
            return None
        value = timezone.localtime(value, pytz.UTC)
        return super().to_representation(value)
