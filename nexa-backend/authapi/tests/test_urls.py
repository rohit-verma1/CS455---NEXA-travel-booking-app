import pytest
from django.urls import reverse, resolve
from authapi import views

@pytest.mark.parametrize("name,view_func", [
    ("register", views.register),
    ("login", views.login_user),
    ("logout", views.logout_user),
    ("verify_otp", views.verify_otp),
])
def test_url_resolves(name, view_func):
    path = reverse(name)
    assert resolve(path).func == view_func
