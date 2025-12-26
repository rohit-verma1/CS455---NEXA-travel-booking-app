# your_app/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    CoTravellerViewSet,
    ServiceProviderViewSet,
    ServiceProviderRatingViewSet,
    add_comment_booking,
    ServiceProviderCommentsViewset
)

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'co-travellers', CoTravellerViewSet, basename='co-traveller')
router.register(r'service-providers', ServiceProviderViewSet, basename='service-provider')
router.register(r'service-provider-ratings', ServiceProviderRatingViewSet, basename='service-provider-rating')
router.register(r'service-provider-comments', ServiceProviderCommentsViewset, basename='service-provider-comments')
urlpatterns = [
    path('', include(router.urls)),
    path('add-comment-booking/', add_comment_booking, name='add-comment-booking'),
]
