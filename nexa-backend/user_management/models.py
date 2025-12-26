# your_app/models.py

from django.db import models
from django.utils import timezone
from authapi.models import User # Assuming your custom User model is here
import uuid
from bookings.models import Booking
class Customer(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="customer_profile",
        primary_key=True
    )
    nationality = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    marital_status = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    secondary_email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    preferences = models.JSONField(blank=True, null=True)
    mobile_number =  models.CharField(max_length=15, blank=True)
    first_name =  models.CharField(max_length=28, blank=True)
    last_name  =  models.CharField(max_length=28, blank=True)

    def __str__(self):
        return f"Customer: {self.user.username}"

class CoTraveller(models.Model):
    traveller_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="co_travellers")
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    gender = models.CharField(max_length=20, blank=True)
    marital_status = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)

    @property
    def customer_name(self): 
        return self.customer.user.username

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class ServiceProvider(models.Model):
    STATUS_CHOICES = [("Pending", "Pending"), ("Approved", "Approved"), ("Rejected", "Rejected")]
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="provider_profile",
        primary_key=True
    )
    company_name = models.CharField(max_length=100, blank=True)
    license_info = models.CharField(max_length=100, blank=True)
    contact_number = models.CharField(max_length=15, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    rating = models.FloatField(default=0.0)
    total_reviews = models.IntegerField(default=0)
    ratings_dict = models.JSONField(default=dict)  # e.g., {"5": 10, "4": 5, "3": 2, "2": 1, "1": 0}
    comments  =  models.JSONField(blank=True, null=True, default= list)  # To store reviews/comments
    def approve(self):
        self.status = "Approved"
        self.verified = True
        self.verified_at = timezone.now()
        self.save()

    def reject(self):
        self.status = "Rejected"
        self.verified = False
        self.verified_at = None
        self.save()
    def rate(self, rating):
        if rating not in self.ratings_dict:
            self.ratings_dict[rating] = 0
        self.ratings_dict[rating] += 1
        total_reviews = sum(int(k) * v for k, v in self.ratings_dict.items())
        total_counts = sum(v for v in self.ratings_dict.values())
        self.rating = total_reviews / total_counts if total_counts > 0 else 0
        self.total_reviews = total_counts
        self.save()
        pass
    def add_comment(self, comment,user = None):
        if self.comments is None:
            self.comments = []
        self.comments.append({"user": user.username if user else "Anonymous", "comment": comment, "date": timezone.now().isoformat()})
        self.save()
        
    def __str__(self):
        return f"Provider: {self.company_name or self.user.username} ({self.status})"
class comment(models.Model):
    service_provider = models.ForeignKey(ServiceProvider, on_delete=models.CASCADE, related_name="service_comments")
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="booking_comments")
    user = models.CharField(max_length=150)
    comment_title = models.CharField(max_length=200)
    comment_body = models.TextField()
    rating = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Comment by {self.user.username} on {self.service_provider.company_name}"
class AdminUser(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="admin_profile",
        primary_key=True
    )
    mfa_enabled = models.BooleanField(default=False)

    def __str__(self):
        return f"Admin: {self.user.username}"