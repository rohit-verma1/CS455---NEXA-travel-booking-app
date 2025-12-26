import pytest
from types import SimpleNamespace
from bookings.permissions import IsAdmin, IsServiceProvider, IsCustomer

def make_user(user_type=None, authenticated=True):
    return SimpleNamespace(user_type=user_type, is_authenticated=authenticated)

def test_is_admin():
    perm = IsAdmin()
    req = SimpleNamespace(user=None)
    assert not perm.has_permission(req, None)
    u = make_user("admin", True)
    req2 = SimpleNamespace(user=u)
    assert perm.has_permission(req2, None)

def test_is_provider_and_customer():
    p = IsServiceProvider()
    u = make_user("provider")
    assert p.has_permission(SimpleNamespace(user=u), None)
    c = IsCustomer()
    cu = make_user("customer")
    assert c.has_permission(SimpleNamespace(user=cu), None)
    # unauthenticated should fail
    cu2 = make_user("customer", authenticated=False)
    assert not c.has_permission(SimpleNamespace(user=cu2), None)
