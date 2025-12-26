import pytest


@pytest.mark.django_db
def test_fixtures_load_correctly(api_client, user, active_session, auth_client, mock_gemini):
    """Ensure fixtures initialize without errors."""
    assert user.username.startswith("user_")
    assert active_session.session_token
    assert auth_client is not None
    assert callable(mock_gemini)
