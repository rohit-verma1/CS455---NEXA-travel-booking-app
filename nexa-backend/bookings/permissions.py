# your_app/permissions.py
from rest_framework.permissions import BasePermission

class IsUserType(BasePermission):
    """
    A base permission class that can be configured with a list of allowed user types.
    """
    # This list should be overridden by subclasses
    allowed_user_types = []

    def has_permission(self, request, view):
        # Ensure the user is authenticated first
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Check if the user's type is in the allowed list
        return request.user.user_type in self.allowed_user_types
    
# your_app/permissions.py (continued)

class IsAdmin(IsUserType):
    """Allows access only to 'admin' users."""
    allowed_user_types = ['admin']

class IsServiceProvider(IsUserType):
    """Allows access only to 'provider' users."""
    # Assuming your user_type for Service Provider is 'provider'
    allowed_user_types = ['provider']

class IsCustomer(IsUserType):
    """Allows access only to 'customer' users."""
    allowed_user_types = ['customer']