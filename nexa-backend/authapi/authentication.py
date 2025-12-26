# authapi/authentication.py

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import Session


class CustomTokenAuthentication(BaseAuthentication):
    """
    Custom authentication using session tokens stored in the database.

    Expected header format:
        Authorization: Token <your_session_token>
    or:
        Authorization: Bearer <your_session_token>
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        # No Authorization header — fail silently so DRF can continue to next auth class
        if not auth_header:
            return None

        # Allow both "Token <token>" and "Bearer <token>"
        if auth_header.startswith('Token '):
            token = auth_header.split('Token ')[1].strip()
        elif auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ')[1].strip()
        else:
            raise AuthenticationFailed('Invalid authorization header format. Use "Token <token>".')

        # If the token is missing or malformed
        if not token:
            raise AuthenticationFailed('Missing authentication token.')

        # Try to fetch the active session
        try:
            session = Session.objects.select_related('user').get(
                session_token=token,
                is_active=True
            )
        except Session.DoesNotExist:
            raise AuthenticationFailed('Invalid or expired token.')

        # Check if the session has expired
        if session.expires_at <= timezone.now():
            # Auto-deactivate expired sessions
            session.is_active = False
            session.save(update_fields=['is_active'])
            raise AuthenticationFailed('Session has expired. Please log in again.')

        # Everything is valid — return the user and token
        return (session.user, token)
