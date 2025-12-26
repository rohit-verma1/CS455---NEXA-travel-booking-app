# user_management/tests/test_permissions.py
import pytest
from user_management.permissions import IsAdmin, IsServiceProvider, IsCustomer, IsUserType

class DummyUser:
    def __init__(self, is_authenticated, user_type=None):
        self.is_authenticated = is_authenticated
        self.user_type = user_type

class DummyRequest:
    def __init__(self, user):
        self.user = user

def test_is_user_type_denies_anonymous():
    perm = IsUserType()
    req = DummyRequest(user=None)
    assert perm.has_permission(req, None) is False

def test_is_admin_allows_admin():
    perm = IsAdmin()
    req = DummyRequest(user=DummyUser(True, "admin"))
    assert perm.has_permission(req, None) is True

def test_is_service_provider_allows_provider():
    perm = IsServiceProvider()
    req = DummyRequest(user=DummyUser(True, "provider"))
    assert perm.has_permission(req, None) is True

def test_is_customer_denies_other_types():
    perm = IsCustomer()
    req = DummyRequest(user=DummyUser(True, "provider"))
    assert perm.has_permission(req, None) is False
