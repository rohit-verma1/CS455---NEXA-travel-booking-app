import pytest
from django.urls import reverse, resolve

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("name,kwargs", [
    ("bus-service-list", None),
    ("bus-service-detail", {"pk": "00000000-0000-0000-0000-000000000000"}),
    ("train-service-list", None),
    ("flight-service-list", None),
    ("flight-service-detail", {"pk": "00000000-0000-0000-0000-000000000000"}),
    ("flight-card-list", None),
    ("train-card-list", None),
    ("bus-card-list", None),
])
def test_reverse_and_resolve(name, kwargs):
    """All registered routes should reverse & resolve cleanly."""
    url = reverse(name, kwargs=kwargs)
    match = resolve(url)
    assert match.func is not None, f"{name} failed to resolve"
