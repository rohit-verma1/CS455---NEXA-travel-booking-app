import pytest
from django.db import transaction
from services.models import Station

@pytest.mark.django_db
def test_station_saved_by_add_and_remove(customer_user):
    station = Station.objects.create(name="Mumbai", code="BOM")
    station.saved_by.add(customer_user)
    station.refresh_from_db()
    assert customer_user in station.saved_by.all()
    station.saved_by.remove(customer_user)
    station.refresh_from_db()
    assert customer_user not in station.saved_by.all()


@pytest.mark.django_db
def test_station_saved_by_handles_duplicate_add(customer_user):
    station = Station.objects.create(name="Delhi", code="DEL")
    station.saved_by.add(customer_user)
    station.saved_by.add(customer_user)  # Duplicate add should not error
    assert station.saved_by.count() == 1


@pytest.mark.django_db
def test_station_saved_by_favorites_list(customer_user):
    s1 = Station.objects.create(name="Bangalore", code="BLR")
    s2 = Station.objects.create(name="Hyderabad", code="HYD")
    s1.saved_by.add(customer_user)
    s2.saved_by.add(customer_user)
    favorites = customer_user.saved_stations.all()
    assert len(favorites) == 2
    assert all(isinstance(st, Station) for st in favorites)
