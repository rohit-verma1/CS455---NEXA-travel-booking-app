from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import BusService, TrainService, FlightService
from .serializers import (
    BusServiceCreateSerializer,BusServiceDetailSerializer,BusServiceListSerializer,BusServiceCardSerializer,
    TrainServiceListSerializer,TrainServiceDetailSerializer, TrainServiceCreateSerializer,TrainServiceCardSerializer,
    FlightServiceListSerializer,FlightServiceDetailSerializer, FlightServiceCreateSerializer, FlightServiceCardSerializer
)
from .permissions import IsAdmin,IsCustomer,IsServiceProvider
from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Min
from decimal import Decimal
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from services.models import TrainService, Station
from services.serializers import TrainServiceDetailSerializer
class TrainServiceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    # ✅ ensures DRF uses `service_id` for lookups
    lookup_field = 'service_id'
    lookup_url_kwarg = 'service_id'

    CLASS_MAP = {
        "Sleeper": "available_count_sleeper",
        "SecondAC": "available_count_second_ac",
        "ThirdAC": "available_count_third_ac",
    }

    def get_queryset(self):
        base_queryset = TrainService.objects.select_related('route', 'vehicle', 'policy')
        user = self.request.user

        if user.is_authenticated and self.action == 'list':
            return base_queryset.filter(provider_user_id=user)
        if self.action == 'retrieve':
            return base_queryset.prefetch_related('train_seats')
        return base_queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return TrainServiceListSerializer
        if self.action == 'retrieve':
            return TrainServiceDetailSerializer
        if self.action == 'create':
            return TrainServiceCreateSerializer
        return TrainServiceDetailSerializer

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                name="from_station_id",
                in_=openapi.IN_QUERY,
                description="UUID of the source station",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                name="to_station_id",
                in_=openapi.IN_QUERY,
                description="UUID of the destination station",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ]
    )
    @action(
        detail=True,
        methods=['get'],
        url_path='detail'
    )
    def service_detail(self, request, pk=None, *args, **kwargs):
        """
        GET /services/train-services/{service_id}/detail/?from_station_id=...&to_station_id=...
        """
        # ✅ Fix: self.get_object() now correctly resolves by `service_id`
        train_service = self.get_object()
        from_station_id = request.query_params.get("from_station_id")
        to_station_id = request.query_params.get("to_station_id")

        if not from_station_id or not to_station_id:
            serializer = self.get_serializer(train_service)
            return Response(serializer.data)

        from_station = get_object_or_404(Station, station_id=from_station_id)
        to_station = get_object_or_404(Station, station_id=to_station_id)

        full_stops = train_service.get_full_stop_list()
        start_index = next((order for order, st in full_stops if st == from_station), None)
        end_index = next((order for order, st in full_stops if st == to_station), None)

        if start_index is None or end_index is None or end_index <= start_index:
            return Response({"error": "Invalid station sequence"}, status=400)

        segments = train_service.segments.filter(
            segment_index__gte=start_index,
            segment_index__lt=end_index
        )

        # 💡 Safe fallback computation
        class_prices, availability = {}, {}
        for class_type, field_name in self.CLASS_MAP.items():
            try:
                price = train_service.get_price_for_journey(from_station, to_station, class_type)
                class_prices[class_type] = str(price or Decimal("0.00"))
            except Exception:
                class_prices[class_type] = "0.00"

            try:
                min_val = segments.aggregate(min_val=Min(field_name))["min_val"]
                availability[class_type] = int(min_val or 0)
            except Exception:
                availability[class_type] = 0
        journey_time,arival_time,departure_time=train_service.get_journey_times(from_station,to_station)
        base_data = self.get_serializer(train_service).data
        base_data.pop('base_price', None)  # Remove seats info if present
        base_data.pop('sleeper_price', None)  # Remove seats info if present
        base_data.pop('second_ac_price', None)  # Remove seats info if present]
        base_data.pop('third_ac_price', None)  # Remove seats info if present
        base_data.pop('dynamic_pricing_enabled', None)  # Remove seats info if present
        base_data.pop('arrival_time', None)  # Remove seats info if present
        base_data.pop('departure_time', None)  # Remove seats info if present
        base_data.pop('created_at', None)  # Remove seats info if present
        base_data.pop('updated_at', None)  # Remove seats info if present
        base_data.pop('from_station', None)  # Remove seats info if present
        base_data.pop('to_station', None)  # Remove seats info if present
        base_data.pop('stops', None)  # Remove seats info if present

        response_data = {  
            **base_data,
            "dynamic_pricing": class_prices,
            "availability": availability,
            "journey_time":journey_time,
            "arrival_time":arival_time,
            "departure_time":departure_time, 
            "source_station_id":str(from_station.station_id),
            "destination_station_id":str(to_station.station_id),
            "source_station_name": from_station.name,
            "destination_station_name": to_station.name,
        }

        return Response(response_data)


class BusServiceViewSet(viewsets.ModelViewSet):
    """
    Handles list, detail, create, update, and delete for BusService.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        base_queryset = BusService.objects.all().select_related('route', 'vehicle', 'policy')
        user = self.request.user

        # Authenticated user's own services
        if user.is_authenticated and self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy']:
            return base_queryset.filter(provider_user_id=user).prefetch_related('seats')

        # Anonymous or general list/retrieve
        if self.action in ['list', 'retrieve']:
            return base_queryset.prefetch_related('seats')

        # Fallback (should rarely hit)
        return base_queryset.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return BusServiceListSerializer
        if self.action == 'retrieve':
            return BusServiceDetailSerializer
        if self.action == 'create':
            return BusServiceCreateSerializer
        return BusServiceDetailSerializer

class FlightServiceViewSet(viewsets.ModelViewSet):
    """
    MODIFIED: Now uses List/Detail pattern.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        base_queryset = FlightService.objects.all()
        user = self.request.user
        if user.is_authenticated and self.action == 'list':
            return base_queryset.filter(provider_user_id=user).select_related('route', 'vehicle', 'policy')
        if user.is_authenticated and self.action == 'retrive':
            return base_queryset.filter(provider_user_id=user).select_related('route', 'vehicle', 'policy')

        if self.action == 'list':
            return base_queryset.select_related('route', 'vehicle', 'policy')

        if self.action == 'retrieve':
            # This is correct: prefetch 'flight_seats'
            return base_queryset.select_related('route', 'vehicle', 'policy').prefetch_related('flight_seats')


        
        return FlightService.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return FlightServiceListSerializer
        
        if self.action == 'retrieve':
            return FlightServiceDetailSerializer

        if self.action == 'create':
            return FlightServiceCreateSerializer
        
        return FlightServiceDetailSerializer # Default for update, etc.
from rest_framework.response import Response

class FlightCardViews(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet that returns simplified flight card data.
    """
    queryset = FlightService.objects.select_related(
        'route__source', 'route__destination', 'vehicle'
    ).all()
    serializer_class = FlightServiceCardSerializer

    @action(detail=False, methods=['get'], url_path='list')
    def get_flight_list(self, request):
        """
        Custom endpoint: GET /api/cards/list/
        Returns a simplified list of scheduled flight cards.
        """
        # You can filter or sort as needed
        user =  self.request.user
        if user.is_authenticated :
            self.queryset.filter(provider_user_id = user)

        flights = self.queryset.filter(status='Scheduled').order_by('departure_time')

        serializer = self.get_serializer(flights, many=True)
        return Response(serializer.data) 
class TrainCardViews(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet that returns simplified train card data.
    """
    queryset = TrainService.objects.select_related(
        'route__source', 'route__destination', 'vehicle'
    ).all()
    serializer_class = TrainServiceCardSerializer

    @action(detail=False, methods=['get'], url_path='list')
    def get_train_list(self, request):
        """
        GET /api/trains/list/
        Returns a simplified list of scheduled train cards.
        """
        user = request.user
        queryset = self.queryset

        if user.is_authenticated:
            queryset = queryset.filter(provider_user_id=user)

        trains = queryset.filter(status='Scheduled').order_by('departure_time')

        serializer = self.get_serializer(trains, many=True)
        return Response(serializer.data)

class BusCardViews(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet that returns simplified train card data.
    """
    queryset = BusService.objects.select_related(
        'route__source', 'route__destination', 'vehicle'
    ).all()
    serializer_class = BusServiceCardSerializer
    @action(detail=False, methods=['get'], url_path='list')
    def get_bus_list(self, request):
        """
        GET /api/trains/list/
        Returns a simplified list of scheduled train cards.
        """
        user = request.user
        queryset = self.queryset

        if user.is_authenticated:
            queryset = queryset.filter(provider_user_id=user)

        trains = queryset.filter(status='Scheduled').order_by('departure_time')

        serializer = self.get_serializer(trains, many=True)
        return Response(serializer.data)
# services/views/train_service_views.py


# class TrainServiceDetailView(generics.RetrieveAPIView):
#     """
#     Returns train service details + dynamic pricing + availability.
#     Supports ?from_station_id & ?to_station_id query params.
#     """
#     queryset = TrainService.objects.select_related('route', 'vehicle', 'policy')
#     serializer_class = TrainServiceDetailSerializer
#     lookup_field = 'service_id'

#     CLASS_MAP = {
#         "Sleeper": "available_count_sleeper",
#         "SecondAC": "available_count_second_ac",
#         "ThirdAC": "available_count_third_ac",
#     }

#     @swagger_auto_schema(
#         manual_parameters=[
#             openapi.Parameter(
#                 name="from_station_id",
#                 in_=openapi.IN_QUERY,
#                 description="UUID of the **source station** for price and availability",
#                 type=openapi.TYPE_STRING,
#                 required=False,
#                 example="7b843bd5-1206-4d07-834f-237bcfc032c7",
#             ),
#             openapi.Parameter(
#                 name="to_station_id",
#                 in_=openapi.IN_QUERY,
#                 description="UUID of the **destination station** for price and availability",
#                 type=openapi.TYPE_STRING,
#                 required=False,
#                 example="10f037d5-01d7-4910-a5d3-692e73c9cf94",
#             ),
#         ]
#     )
#     def retrieve(self, request, *args, **kwargs):
#         train_service = self.get_object()
#         from_station_id = request.query_params.get("from_station_id")
#         to_station_id = request.query_params.get("to_station_id")

#         # No from/to params → return base details only
#         if not from_station_id or not to_station_id:
#             serializer = self.get_serializer(train_service)
#             return Response(serializer.data)

#         # Validate stations
#         from_station = get_object_or_404(Station, station_id=from_station_id)
#         to_station = get_object_or_404(Station, station_id=to_station_id)

#         # Find index range
#         full_stops = train_service.get_full_stop_list()
#         start_index = next((order for order, st in full_stops if st == from_station), None)
#         end_index = next((order for order, st in full_stops if st == to_station), None)

#         if start_index is None or end_index is None or end_index <= start_index:
#             return Response({"error": "Invalid station sequence"}, status=status.HTTP_400_BAD_REQUEST)

#         segment_indices = list(range(start_index, end_index))
#         segments = train_service.segments.filter(segment_index__in=segment_indices)

#         # Calculate dynamic prices (fallbacks)
#         class_prices = {}
#         for class_type in self.CLASS_MAP.keys():
#             try:
#                 price = train_service.get_price_for_journey(from_station, to_station, class_type)
#                 class_prices[class_type] = str(price or Decimal("0.00"))
#             except Exception:
#                 class_prices[class_type] = "0.00"

#         # Aggregate availability (fallbacks)
#         availability = {}
#         for class_type, field_name in self.CLASS_MAP.items():
#             try:
#                 min_val = segments.aggregate(min_val=Min(field_name))["min_val"]
#                 availability[class_type] = int(min_val or 0)
#             except Exception:
#                 availability[class_type] = 0

#         # Combine base + computed data
#         base_data = self.get_serializer(train_service).data
#         response_data = {
#             **base_data,
#             "from_station": from_station.name,
#             "to_station": to_station.name,
#             "dynamic_pricing": class_prices,
#             "availability": availability,
#         }

#         return Response(response_data)
