import pytest
from bookings.models import Booking, BookingPassenger, Ticket, BookingStatus

@pytest.mark.django_db
def test_booking_str_and_defaults(user_customer):
    b = Booking.objects.create(customer=user_customer, total_amount=0)
    s = str(b)
    assert "Booking" in s
    assert "(" in s

@pytest.mark.django_db
def test_passenger_and_ticket_str(user_customer):
    b = Booking.objects.create(customer=user_customer, total_amount=0)
    bp = BookingPassenger.objects.create(booking=b, name="Alice", seat_no="A1")
    t = Ticket.objects.create(booking=b, ticket_no="T-100")
    assert "Alice" in str(bp)
    assert str(t) == "T-100"

@pytest.mark.django_db
def test_bookingstatus_ordering(user_customer):
    b = Booking.objects.create(customer=user_customer, total_amount=1)
    s1 = BookingStatus.objects.create(booking=b, status="Pending", remarks="r1")
    s2 = BookingStatus.objects.create(booking=b, status="Confirmed", remarks="r2")
    logs = list(b.status_logs.all())
    assert logs[0].timestamp >= logs[-1].timestamp
