# analytics/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProviderAnalyticsSummary, ProviderTimeSeries, ProviderServiceMetrics,
    ReviewViewSet, ProviderReviews, TrainNumberReviews
)

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='analytics-reviews')

urlpatterns = [
    path('', include(router.urls)),
    path('provider/summary/', ProviderAnalyticsSummary.as_view(), name='provider-summary'),
    path('provider/timeseries/', ProviderTimeSeries.as_view(), name='provider-timeseries'),
    path('provider/services/', ProviderServiceMetrics.as_view(), name='provider-service-metrics'),
    path('provider/reviews/', ProviderReviews.as_view(), name='provider-reviews'),
    path('reviews/train/', TrainNumberReviews.as_view(), name='train-reviews'),
]
