import pytest
from rest_framework.exceptions import AuthenticationFailed
from authapi.authentication import CustomTokenAuthentication

@pytest.mark.django_db
def test_invalid_auth_header_format():
    request = type("obj", (), {"headers": {"Authorization": "Invalid 123"}})
    with pytest.raises(AuthenticationFailed):
        CustomTokenAuthentication().authenticate(request)

@pytest.mark.django_db
def test_missing_token_value():
    request = type("obj", (), {"headers": {"Authorization": "Token"}})
    with pytest.raises(AuthenticationFailed):
        CustomTokenAuthentication().authenticate(request)

@pytest.mark.django_db
def test_valid_token_authentication(active_session):
    request = type("obj", (), {"headers": {"Authorization": f"Token {active_session.session_token}"}})
    user, token = CustomTokenAuthentication().authenticate(request)
    assert user == active_session.user

@pytest.mark.django_db
def test_expired_token_authentication(expired_session):
    request = type("obj", (), {"headers": {"Authorization": f"Bearer {expired_session.session_token}"}})
    with pytest.raises(AuthenticationFailed, match="expired"):
        CustomTokenAuthentication().authenticate(request)

@pytest.mark.django_db
def test_missing_token_header():
    request = type("obj", (), {"headers": {}})
    assert CustomTokenAuthentication().authenticate(request) is None
