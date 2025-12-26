# bookings/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookingViewSet,search_trains,BusSeatAvailabilityView,FlightSeatAvailabilityView,BookingListViewSet,CheapestFaresFromView
from .agentic_view import GeminiFlightSearchAPIView as AgenticFlightSeatAvailabilityView
router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'bookings-list', BookingListViewSet, basename  = 'booking-list')
urlpatterns = [
    path('', include(router.urls)),
    # optional: if you prefer search endpoints inside bookings app:
    path('search/trains/', search_trains),
    path('search/buses/', BusSeatAvailabilityView.as_view(), name='bus-seat-availability'),
    path('search/flights', FlightSeatAvailabilityView.as_view(), name='flight-seat-availability' ),
    path('search/flights/agentic', AgenticFlightSeatAvailabilityView.as_view(), name='agentic-flight-seat-availability' ),
    path('search/cheap-fares', CheapestFaresFromView.as_view(), name =  'cheap fares from')
]
