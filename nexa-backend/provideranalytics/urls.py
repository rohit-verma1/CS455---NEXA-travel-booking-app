from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import ProviderDashboardView,DateOccupancyHeatmapView,MonthlyRevenueTrendView,RouteComparisonView

urlpatterns = [
    path('provider-dashboard/', ProviderDashboardView.as_view(), name='provider-dashboard'),
    path('occupancy-heatmap/',DateOccupancyHeatmapView.as_view(), name =  'occupancy-heatmap'),
    path('monthly-trend/',MonthlyRevenueTrendView.as_view(), name =  'occupancy-heatmap'),
    path('route-comparison/',RouteComparisonView.as_view(), name = 'route-comparision' )
]