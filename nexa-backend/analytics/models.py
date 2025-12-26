# analytics/models.py
import uuid
from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL

class Review(models.Model):
    """
    Generic review model used for provider-level reviews and service-specific reviews (train number, etc).
    - service_mode + service_id identify the service (optional for provider-wide reviews).
    """
    review_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="analytics_reviews")
    provider_user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name="provider_reviews", null=True, blank=True)
    service_mode = models.CharField(max_length=20, choices=[('Bus','Bus'),('Train','Train'),('Flight','Flight')], null=True, blank=True)
    service_id = models.UUIDField(null=True, blank=True)  # optional: points to specific service.service_id
    train_number = models.CharField(max_length=64, blank=True, null=True)  # for train number based reviews
    rating = models.PositiveSmallIntegerField(default=5)  # 1-5
    title = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_public = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review {self.review_id} by {self.customer} ({self.rating})"
