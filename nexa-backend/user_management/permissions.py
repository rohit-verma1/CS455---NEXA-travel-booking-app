from rest_framework.permissions import BasePermission


class IsUserType(BasePermission):
    """
    Base permission class to check if the user belongs to allowed user types.
    Subclasses should override `allowed_user_types`.
    """
    allowed_user_types = []  # override in subclasses

    def has_permission(self, request, view):
        """
        Return True if:
        - The user is authenticated, AND
        - The user's type is in the allowed_user_types list.
        """
        user = request.user

        # Deny if not authenticated
        if not user or not user.is_authenticated:
            return False

        # Allow only if user's type matches
        return getattr(user, 'user_type', None) in self.allowed_user_types


class IsAdmin(IsUserType):
    """Allows access only to 'admin' users."""
    allowed_user_types = ['admin']


class IsServiceProvider(IsUserType):
    """Allows access only to 'provider' (service provider) users."""
    allowed_user_types = ['provider']


class IsCustomer(IsUserType):
    """Allows access only to 'customer' users."""
    allowed_user_types = ['customer']
