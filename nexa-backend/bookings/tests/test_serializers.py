import pytest
from bookings.serializers import BookingCreateSerializer, BookingListSerializer
from bookings.models import Booking
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_booking_create_serializer_requires_train_fields():
    data = {
        "service_model": "train",
        "service_id": "00000000-0000-0000-0000-000000000000",
        "passengers": [{"name": "A"}]
    }
    s = BookingCreateSerializer(data=data)
    assert not s.is_valid()
    assert "class_type" in s.errors or "from_station_id" in s.errors

@pytest.mark.django_db
def test_booking_list_serializer_without_service_obj():
    u = User.objects.create_user(username="u1", email="u1@example.com", password="pw")
    b = Booking.objects.create(customer=u, total_amount=10)
    s = BookingListSerializer(b)
    assert s.data["service_id"] is None
    assert s.data["passenger_name"] == "u1"
