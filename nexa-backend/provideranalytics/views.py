# analytics/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import DashboardSummarySerializer,DateOccupancyHeatmapSerializer,MonthlyRevenueTrendSerializer,RouteComparisonSerializer

class ProviderDashboardView(APIView):
    """
    API endpoint for provider analytics dashboard.
    """
    def get(self, request):
        provider = request.user if request.user.is_authenticated else None
        data = DashboardSummarySerializer.get_dashboard_data(provider)
        return Response(data)
class DateOccupancyHeatmapView(APIView):
    """
    Returns date-wise occupancy heatmap (Bus + Train + Flight combined).
    """
    def get(self, request):
        provider = request.user if request.user.is_authenticated else None
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = DateOccupancyHeatmapSerializer.get_date_occupancy_data(provider, start_date, end_date)
        return Response(data)

class MonthlyRevenueTrendView(APIView):
    """
    Returns monthly revenue trends for provider or global analytics.
    """
    def get(self, request):
        provider = request.user if request.user.is_authenticated else None
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        data = MonthlyRevenueTrendSerializer.get_monthly_revenue_data(provider, start_date, end_date)
        return Response(data)

class RouteComparisonView(APIView):
    """
    Returns comparison metrics for all routes (bookings, revenue, occupancy, performance).
    """
    def get(self, request):
        provider = request.user if request.user.is_authenticated else None
        routes_data = RouteComparisonSerializer.get_route_comparison_data(provider)
        return Response({"routes": routes_data})