import os
import tempfile
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from celery import shared_task

from .models import Booking,BookingStatus

# IMPORT YOUR PDF GENERATOR (update this path to where generate_booking_pdf actually is)
# from payments.utils import generate_booking_pdf
from payments.utils import generate_booking_pdf

logger = logging.getLogger(__name__)


def get_booking_recipient_email(booking):
    """
    Return the best email address for the booking:
    - booking.email (explicit on booking)
    - booking.customer.email (if customer relation exists and email set)
    - None if no email found
    """
    if booking.email:
        return booking.email
    try:
        # Some user objects store email on a field named 'email'
        if booking.customer and getattr(booking.customer, "email", None):
            return booking.customer.email
    except Exception:
        pass
    return None

@shared_task
def delete_unconfirmed_bookings():
    """Delete or cancel bookings that are still Pending after 15 minutes."""
    threshold = timezone.now() - timedelta(minutes=15)
    expired_bookings = Booking.objects.filter(status="Pending", booking_date__lt=threshold)
    
    for booking in expired_bookings:
        # Optionally log before deletion
        BookingStatus.objects.create(
            booking=booking,
            status="Auto-Cancelled",
            remarks="Booking auto-cancelled after 15 minutes without confirmation."
        )

    count = expired_bookings.count()
    expired_bookings.delete()

    return f"Deleted {count} expired pending bookings."
@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={'max_retries': 3})
def mail_recent_bookings_to_customers_with_pdf(self):
    """
    Celery task:
    - Runs every 5 minutes (schedule via celery-beat)
    - Finds bookings updated in the last 5 minutes
    - Sends each booking's PDF to the email present on the booking (or the customer's email)
    """
    now = timezone.now()
    window_start = now - timedelta(minutes=5)

    recent_bookings = Booking.objects.filter(updated_at__gte=window_start).order_by('-updated_at')
    if not recent_bookings.exists():
        logger.debug("No bookings updated in the last 5 minutes.")
        return "no_updates"

    sent_count = 0
    skipped_no_email = 0
    errors = 0

    for b in recent_bookings:
        try:
            recipient = get_booking_recipient_email(b)
            if not recipient:
                logger.info("Skipping booking %s — no email found.", b.booking_id)
                skipped_no_email += 1
                continue

            # Build booking_data dict expected by your generate_booking_pdf
            # Adapt fields to match your function signature / expected dict structure.

            booking_data = {
                "booking_id": str(b.booking_id),
                "customer": str(b.customer) if b.customer else "Guest",
                "mobile_number": b.phone_number,
                "email_address": b.email,
                "service_details": {
                    "type": b.service_object.__class__.__name__ if b.service_object else "UnknownService",
                    "service_id": str(getattr(b.service_object, "id", "N/A")),
                    "source": getattr(b.source_id, "name", "N/A"),
                    "destination": getattr(b.destination_id, "name", "N/A"),
                    "departure_time": getattr(b.service_object, "departure_time", timezone.now()).isoformat() if getattr(b.service_object, "departure_time", None) else timezone.now().isoformat(),
                    "arrival_time": getattr(b.service_object, "arrival_time", timezone.now()).isoformat() if getattr(b.service_object, "arrival_time", None) else timezone.now().isoformat(),
                    "status": b.status,
                    # Service-specific fields
                    "flight_number": getattr(b.service_object, "flight_number", "N/A") if b.service_object.__class__.__name__ == "FlightService" else None,
                    "airline_name": getattr(b.service_object, "airline_name", getattr(b.service_object, "provider_name", "N/A")) if b.service_object.__class__.__name__ == "FlightService" else None,
                    "train_name": getattr(b.service_object, "train_name", "N/A") if b.service_object.__class__.__name__ == "TrainService" else None,
                    "train_number": getattr(b.service_object, "train_number", "N/A") if b.service_object.__class__.__name__ == "TrainService" else None,
                    "travels_name": getattr(b.service_object, "travels_name", getattr(b.service_object, "operator_name", "N/A")) if b.service_object.__class__.__name__ == "BusService" else None,
                    "bus_number": getattr(b.service_object, "bus_number", "N/A") if b.service_object.__class__.__name__ == "BusService" else None
                },
                "total_amount": str(b.total_amount),
                "status": b.status,
                "payment_status": b.payment_status,
                "booking_date": b.booking_date.isoformat() if b.booking_date else timezone.now().isoformat(),
                "passengers": [
                    {
                        "name": getattr(p, "name", "N/A"),
                        "age": getattr(p, "age", "N/A"),
                        "gender": getattr(p, "gender", "N/A"),
                        "seat_no": getattr(p, "seat_number", "N/A"),
                        "document_id": getattr(p, "document_id", "N/A")
                    } for p in b.passengers.all()
                ] if hasattr(b, 'passengers') and b.passengers.exists() else [],
                "ticket": {
                    "ticket_no": getattr(b, "ticket_number", f"NEXA-{str(b.booking_id)[:8].upper()}"),
                    "issued_at": b.updated_at.isoformat() if b.updated_at else timezone.now().isoformat()
                },
                "status_logs": [
                    {
                        "status": log.status,
                        "timestamp": log.created_at.isoformat(),
                        "remarks": log.remarks
                    } for log in b.bookingstatus_set.all().order_by('-created_at')
                ] if hasattr(b, 'bookingstatus_set') else [],
                "class_type": getattr(b, "class_type", "economy").lower(),
                "policy": {
                    "cancellation_window": getattr(b.service_object, "cancellation_window", 48),
                    "cancellation_fee": getattr(b.service_object, "cancellation_fee", 0),
                    "reschedule_allowed": getattr(b.service_object, "reschedule_allowed", True),
                    "reschedule_fee": getattr(b.service_object, "reschedule_fee", 0),
                    "no_show_penalty": getattr(b.service_object, "no_show_penalty", 0),
                    "terms_conditions": getattr(b.service_object, "terms_conditions", "Standard return policy.")
                }
            }

            # Create temp file to store generated PDF
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            tmp.close()  # close so generate_booking_pdf can write to it on some OSes

            # generate_booking_pdf should accept output_filename and write the file
            # Some implementations return the path, others write directly; adjust as needed.
            try:
                pdf_path = generate_booking_pdf(booking_data, output_filename=tmp.name)
                # If your generator returns None and writes to tmp.name, set pdf_path accordingly
                if not pdf_path:
                    pdf_path = tmp.name
            except TypeError:
                # If your generate_booking_pdf signature is different, try calling with just booking_data
                pdf_path = generate_booking_pdf(booking_data) or tmp.name

            # Compose message
            subject = f"Nexa: Booking {b.booking_id} — {b.status}"
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "support@nexa.com")

            # HTML body: customize as desired
            html_body = f"""
            <html>
            <body>
              <p>Dear {booking_data['customer']},</p>
              <p>Your booking <strong>{b.booking_id}</strong> was updated on {b.updated_at.strftime('%b %d, %Y %I:%M %p')}.</p>
              <p>Status: <strong>{b.status}</strong><br/>
                 Payment: <strong>{b.payment_status}</strong></p>
              <p>The booking confirmation PDF is attached to this email.</p>
              <p>If you have any questions, contact support at {getattr(settings, 'SUPPORT_EMAIL', 'support@nexa.com')}.</p>
              <p>— Nexa</p>
            </body>
            </html>
            """
            plain_body = f"Your booking {b.booking_id} was updated. Status: {b.status}. Please see attached PDF."

            email = EmailMultiAlternatives(subject=subject, body=plain_body, from_email=from_email, to=[recipient])
            email.attach_alternative(html_body, "text/html")

            # Attach the PDF
            try:
                with open(pdf_path, "rb") as f:
                    email.attach(filename=f"Booking_{b.booking_id}.pdf", content=f.read(), mimetype="application/pdf")
            except Exception as exc_attach:
                logger.error("Failed to attach PDF for booking %s: %s", b.booking_id, exc_attach)
                # We still attempt to send the email without attachment
            # Send email
            email.send(fail_silently=False)
            sent_count += 1

            # cleanup
            try:
                if os.path.exists(pdf_path):
                    os.remove(pdf_path)
            except Exception:
                pass

        except Exception as exc:
            logger.exception("Error processing booking %s: %s", getattr(b, "booking_id", "unknown"), exc)
            errors += 1

    result = {
        "total_found": recent_bookings.count(),
        "sent": sent_count,
        "skipped_no_email": skipped_no_email,
        "errors": errors,
    }
    logger.info("Booking notification summary: %s", result)
    return result

