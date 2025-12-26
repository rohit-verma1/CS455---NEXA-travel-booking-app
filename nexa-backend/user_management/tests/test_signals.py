# user_management/tests/test_signals.py
import pytest
from authapi.models import User
from user_management.models import Customer, ServiceProvider, AdminUser

pytestmark = pytest.mark.django_db

def test_signal_creates_customer_profile():
    u = User.objects.create_user("sigcust", "sigcust@test.com", "pwd", user_type="customer")
    assert Customer.objects.filter(user=u).exists()

def test_signal_creates_provider_profile():
    u = User.objects.create_user("sigprov", "sigprov@test.com", "pwd", user_type="provider")
    assert ServiceProvider.objects.filter(user=u).exists()

def test_signal_creates_admin_profile():
    u = User.objects.create_user("sigadmin", "sigadmin@test.com", "pwd", user_type="admin")
    assert AdminUser.objects.filter(user=u).exists()
