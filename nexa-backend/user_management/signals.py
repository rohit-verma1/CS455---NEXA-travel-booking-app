from django.db.models.signals import post_save,post_delete
from django.dispatch import receiver
from authapi.models import User
from .models import Customer, ServiceProvider, AdminUser
from django.utils import timezone
from .models import comment
from bookings.models import Booking

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create profile based on user_type."""
    if created:
        if instance.user_type == "customer":
            Customer.objects.create(user=instance)
        elif instance.user_type == "provider":
            ServiceProvider.objects.create(user=instance)
        elif instance.user_type == "admin":
            AdminUser.objects.create(user=instance)



def update_provider_rating(provider: ServiceProvider):
    """
    Recalculate and update provider ratings and total reviews based on Comment model.
    """
    comments = provider.service_comments.all()
    total_reviews = comments.count()

    if total_reviews == 0:
        provider.rating = 0
        provider.total_reviews = 0
        provider.ratings_dict = {}
    else:
        ratings_dict = {}
        total_score = 0

        for c in comments:
            r = int(c.rating)
            ratings_dict[str(r)] = ratings_dict.get(str(r), 0) + 1
            total_score += r

        provider.ratings_dict = ratings_dict
        provider.total_reviews = total_reviews
        provider.rating = round(total_score / total_reviews, 2)

    provider.save(update_fields=["rating", "total_reviews", "ratings_dict"])


@receiver(post_save, sender=comment)
def sync_comment_to_provider(sender, instance, created, **kwargs):
    """
    When a new comment is created or updated:
    1. Add it to ServiceProvider.comments JSON (legacy field)
    2. Update ratings and review summary
    """
    provider = instance.service_provider

    # --- Legacy JSON sync ---
    if provider.comments is None:
        provider.comments = []

    # Prevent duplicate entries (if edited)
    existing = [
        # c for c in provider.comments
        # if c.get("comment_title") == instance.comment_title
        # and c.get("user") == instance.user.username
        # and c.get("comment_body") == instance.comment_body
    ]
    if not existing:
        provider.comments.append({
            "user": instance.user.username,
            "comment_title": instance.comment_title,
            "comment_body": instance.comment_body,
            "rating": instance.rating,
            "date": instance.created_at.isoformat(),
            "booking_source": str(Booking.objects.filter(booking_id=instance.booking_id).first().source_id), 
            "booking_destination": str(Booking.objects.filter(booking_id=instance.booking_id).first().destination_id),
        })
        provider.save(update_fields=["comments"])

    # --- Update provider ratings ---
    update_provider_rating(provider)


@receiver(post_delete, sender=comment)
def remove_comment_from_provider(sender, instance, **kwargs):
    """
    When a comment is deleted, remove it from JSON field and recalc ratings.
    """
    provider = instance.service_provider

    if provider.comments:
        provider.comments = [
            c for c in provider.comments
            if not (
                c.get("comment_title") == instance.comment_title
                and c.get("user") == instance.user.username
                and c.get("comment_body") == instance.comment_body
            )
        ]
        provider.save(update_fields=["comments"])

    # --- Update ratings ---
    update_provider_rating(provider)
