# your_app/views.py

from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from .models import Customer, CoTraveller, ServiceProvider
from .serializers import (
    CustomerSerializer,
    CoTravellerSerializer,
    ServiceProviderSerializer, 
    ServiceProviderRatingSerializer,
)
from bookings.models import Booking
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# ---------------------------
# CUSTOMER VIEWSET
# ---------------------------
class CustomerViewSet(viewsets.ModelViewSet):
    """
    - Customer can view/update their own profile.
    - Admin can view/manage all customers.
    """
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # FIX: Handle anonymous users during schema generation
        if not user.is_authenticated:
            return Customer.objects.none()

        # Admin: can view all
        if user.user_type.lower() == "admin" :
            return Customer.objects.all()
        if user.user_type.lower() == "customer":
            if Customer.objects.filter(user=user).exists():
                return Customer.objects.filter(user=user)
            else:
                Customer.objects.create(user=user)
                return Customer.objects.filter(user=user)
        # Customer: only their own data
        return Customer.objects.filter(user=user)

    def perform_create(self, serializer):
        # Create only if user is a customer
        serializer.save(user=self.request.user)


# ---------------------------
# CO-TRAVELLER VIEWSET
# ---------------------------
class CoTravellerViewSet(viewsets.ModelViewSet):
    """
    Customer can manage their own CoTravellers.
    """
    serializer_class = CoTravellerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # FIX: Handle anonymous users during schema generation
        if not user.is_authenticated:
            return CoTraveller.objects.none()

        # Admins can view all CoTravellers
        if user.user_type == "admin":
            return CoTraveller.objects.all()
        # Customer: only their own CoTravellers
        return CoTraveller.objects.filter(customer__user=user)

    def perform_create(self, serializer):
        customer = Customer.objects.get(user=self.request.user)
        serializer.save(customer=customer)


# ---------------------------
# SERVICE PROVIDER VIEWSET
# ---------------------------
class ServiceProviderViewSet(viewsets.ModelViewSet):
    """
    - Service Provider can view/update their own info.
    - Admin can view/manage all service providers.
    """
    serializer_class = ServiceProviderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # FIX: Handle anonymous users during schema generation
        if not user.is_authenticated:
            return ServiceProvider.objects.none()

        # Admin: view all
        if user.user_type == "admin":
            return ServiceProvider.objects.all()
        if user.user_type == "provider":
            if ServiceProvider.objects.filter(user=user).exists():
                return ServiceProvider.objects.filter(user=user)
            else:
                ServiceProvider.objects.create(user=user, company_name=f"{user.username}'s Company")
                return ServiceProvider.objects.filter(user=user)
        # Service Provider: only their own
        return ServiceProvider.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ServiceProviderRatingViewSet(mixins.RetrieveModelMixin,
                                   mixins.UpdateModelMixin,
                                   viewsets.GenericViewSet):
    """
    ViewSet to retrieve and update Service Provider ratings and comments.
    """
    serializer_class = ServiceProviderRatingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ServiceProvider.objects.none()
        if user.user_type == "admin":
            return ServiceProvider.objects.all()
        if user.user_type == "provider":
            return ServiceProvider.objects.filter(user=user)
    # Customers can view any provider for rating
        if user.user_type == "customer":
            return ServiceProvider.objects.all()
        return ServiceProvider.objects.none()



    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        rating = request.data.get('rating')
        comment = request.data.get('comment')

        if rating:
            instance.rate(int(rating))
        if comment:
            instance.add_comment(comment, request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_name='add-review')
    def add_review(self, request, pk=None):
        """
        Add a rating and/or a comment to a Service Provider.
        """
        # Get the specific provider instance (/service-providers/{pk}/add_review/)
        instance = self.get_object() 
        
        rating = request.data.get('rating')
        comment = request.data.get('comment')
        user = request.user

        # Validate that at least one is provided
        if rating is None and comment is None:
            return Response(
                {"error": "You must provide a 'rating' or a 'comment'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if rating:
            try:
                # Add validation for the rating
                rating_int = int(rating)
                if not 1 <= rating_int <= 5: # Assuming a 1-5 scale
                     raise ValueError()
                instance.rate(rating_int)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Rating must be a valid integer (e.g., 1, 2, 3, 4, 5)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if comment:
            instance.add_comment(comment, user)

        # Return the updated provider's data
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)
from .models import comment
booking_id_param = openapi.Parameter(
    'booking_id', in_=openapi.IN_QUERY,
    description='UUID or ID of the booking',
    type=openapi.TYPE_STRING
)

comment_param = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'comment_title': openapi.Schema(type=openapi.TYPE_STRING, description='Title of the comment'),
        'comment_body': openapi.Schema(type=openapi.TYPE_STRING, description='Body text of the comment'),
        'rating': openapi.Schema(type=openapi.TYPE_INTEGER, description='Rating (1–5)'),
    },
    required=['comment_body', 'rating']
)


@swagger_auto_schema(
    method='post',
    manual_parameters=[booking_id_param],
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'comment': comment_param,
        },
        required=['comment']
    ),
    responses={200: ServiceProviderSerializer}
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment_booking(request):
    """
    Add a structured comment and rating for a Service Provider through a Booking.
    Automatically updates provider's ratings and legacy JSON field.
    """
    user = request.user
    booking_id = request.query_params.get('booking_id') 
    comment_data = request.data.get('comment', {})

    # ✅ Validate request
    if not booking_id or not comment_data:
        return Response(
            {"error": "You must provide both 'booking_id' and 'comment'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ Validate booking belongs to user
    try:
        booking = Booking.objects.get(booking_id=booking_id)
    except Booking.DoesNotExist:
        return Response(
            {"error": "Booking not found or not associated with the user."},
            status=status.HTTP_404_NOT_FOUND
        )

    # ✅ Extract and validate comment fields
    title = comment_data.get('comment_title', 'Review')
    body = comment_data.get('comment_body')
    rating = comment_data.get('rating')

    if not body or rating is None:
        return Response(
            {"error": "Both 'comment_body' and 'rating' are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ Get provider associated with booking
    provider = ServiceProvider.objects.filter(user=booking.provider).first()

    if not provider:
        return Response(
            {"error": "No Service Provider linked to this booking."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ Create Comment entry
    comment.objects.create(
        service_provider=provider,
        booking=booking,
        user=user,
        comment_title=title,
        comment_body=body,
        rating=int(rating)
    )

    # ✅ Fetch updated provider with recalculated data (signals handle this)
    provider.refresh_from_db()
    serializer = ServiceProviderSerializer(provider)
    return Response(serializer.data, status=status.HTTP_200_OK)
from .serializers import ServiceProviderCommentsSerializer
class ServiceProviderCommentsViewset(viewsets.ModelViewSet):
    """
    ViewSet to retrieve Service Provider comments.
    """
    serializer_class = ServiceProviderCommentsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ServiceProvider.objects.none()
        if user.user_type == "admin":
            return ServiceProvider.objects.all()
        if user.user_type == "provider":
            return ServiceProvider.objects.filter(user=user)
        # Customers can view any provider for comments
        if user.user_type == "customer":
            return ServiceProvider.objects.all()
        return ServiceProvider.objects.none()