from rest_framework import serializers
from .models import BusService, BusSeat
from .models import Route, Station, RouteStop
from .models import Vehicle
from .models import Policy
from .models import TrainSeat,TrainService,TrainServiceSegment,FlightSeat,FlightService
from django.db import transaction
from user_management.models import ServiceProvider
from django.db.models import Prefetch
from datetime import timedelta
from django.utils import timezone
# -----------------------
# Station Serializer
# -----------------------
class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = ['station_id', 'name', 'code', 'city','BusStations','state']

class ProviderRatingMixin:
    """
    Common methods to get provider ratings.
    """
    def get_provider_rating(self, obj):
        try:
            # FIX 1: Use the correct related_name 'provider_profile'
            # FIX 2: Use the direct 'rating' field
            return obj.provider_user_id.provider_profile.ratings_dict
        except (AttributeError, ServiceProvider.DoesNotExist):
            return 0.0 # Default rating

    def get_provider_total_reviews(self, obj):
        try:
            # FIX 1: Use the correct related_name 'provider_profile'
            # FIX 2: Use the direct 'total_reviews' field
            return obj.provider_user_id.provider_profile.total_reviews
        except (AttributeError, ServiceProvider.DoesNotExist):
            return 0 # Default review count
# -----------------------
# RouteStop Serializer
# -----------------------
class RouteStopSerializer(serializers.ModelSerializer):
    station = StationSerializer()

    class Meta:
        model = RouteStop
        fields = ['stop_order', 'station', 'price_to_destination', 'duration_to_destination']


# -----------------------
# Route Create Serializer
# -----------------------


class RouteNestedSerializer(serializers.ModelSerializer):
    source = StationSerializer()
    destination = StationSerializer()
    stops = RouteStopSerializer(many=True, required=False)

    class Meta:
        model = Route
        fields = [
            'route_id',
            'source',
            'destination',
            'distance_km',
            'estimated_duration',
            'stops',
            'source_pickup_points',
            'destination_dropoff_points'
        ]
    def get_or_create_station(self,data):
        """Safely get or create a station — if duplicates exist, pick the first."""
        code = data.get("code")
        BusStations = data.get("BusStations", [])
        filters = {}
        if code:
            filters["code"] = code
        if BusStations != []:
            filters["BusStations"] = BusStations
        else:
            # fallback if no code provided
            filters["name"] = data.get("name")

        # Try to find any existing matching station
        existing = Station.objects.filter(**filters).first()
        if existing:
            return existing

        # Otherwise create a new one
        return Station.objects.create(
            name=data.get("name"),
            code=data.get("code"),
            city=data.get("city"),
            state=data.get("state"),
            BusStations=data.get("BusStations", []),
        )

    @transaction.atomic
    def create(self, validated_data):
        source_data = validated_data.pop('source')
        destination_data = validated_data.pop('destination')
        stops_data = validated_data.pop('stops', [])
        distance_km = validated_data.pop('distance_km', None)
        estimated_duration = validated_data.pop('estimated_duration', None)
        source_pickup_points = validated_data.pop('source_pickup_points', [])
        destination_dropoff_points = validated_data.pop('destination_dropoff_points', [])

        # --- Safe "get or create" for stations ---
        source = self.get_or_create_station(source_data)
        destination = self.get_or_create_station(destination_data)

        # --- Build intended stop sequence ---
        intended_stops = [source.code]
        for stop_data in stops_data:
            intended_stops.append(stop_data['station']['code'])
        intended_stops.append(destination.code)

        # --- Try to find identical existing route ---
        candidate_routes = (
            Route.objects.filter(
                source=source,
                destination=destination,
                distance_km=distance_km,
                estimated_duration=estimated_duration,
                source_pickup_points=source_pickup_points,
                destination_dropoff_points=destination_dropoff_points,
            )
            .prefetch_related('stops__station')
        )

        matched_route = None
        for route in candidate_routes:
            route_stop_codes = [s.station.code for s in route.stops.all().order_by('stop_order')]
            if route_stop_codes == intended_stops:
                matched_route = route
                break

        if matched_route:
            return matched_route

        # --- Create new route ---
        route = Route.objects.create(
            source=source,
            destination=destination,
            distance_km=distance_km,
            estimated_duration=estimated_duration,
            source_pickup_points=source_pickup_points,
            destination_dropoff_points=destination_dropoff_points,
            **validated_data,
        )
        if distance_km is None:
            route.update_distnace_randomly()

        # --- Add stops ---
        stop_order = 0
        RouteStop.objects.create(route=route, station=source, stop_order=stop_order,duration_to_destination=timedelta(seconds=0),price_to_destination=0)
        stop_order += 1

        for stop_data in stops_data:
            station_data = stop_data.pop('station')
            stop_data.pop('stop_order', None)
            station = self.get_or_create_station(station_data)

            RouteStop.objects.create(
                route=route,
                station=station,
                stop_order=stop_order,
                **{k: v for k, v in stop_data.items() if k in ['price_to_destination', 'duration_to_destination']}
            )
            stop_order += 1

        RouteStop.objects.create(route=route, station=destination, stop_order=stop_order,duration_to_destination=timedelta(seconds=0),price_to_destination=0)
        return route

# -----------------------
# Vehicle Serializer (Nested Create)
# -----------------------
class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['vehicle_id', 'registration_no','model', 'capacity', 'amenities', 'status']


# -----------------------
# Policy Serializer (Nested Create)
# -----------------------
class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = '__all__'
# -----------------------
# Seat Serializers (FOR READ)
# -----------------------
class BusSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusSeat
        # Assumes your BusSeat model has an 'is_booked' field
        fields = ['seat_id', 'seat_number', 'seat_type', 'price', 'is_booked']


class TrainSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainSeat
        # availability_mask is used to show booking status per segment
        fields = ['seat_id', 'bogie_number', 'seat_number', 'seat_type', 'class_type', 'availability_mask']


class FlightSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightSeat
        # Assumes your FlightSeat model has an 'is_booked' field
        fields = ['seat_id', 'seat_number', 'seat_class', 'price', 'is_booked']
# -----------------------
# BusService Serializer (Read)
# -----------------------
class BusServiceSerializer(serializers.ModelSerializer):
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)

    class Meta:
        model = BusService
        fields = '__all__'

class BusServiceListSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'list' view, does NOT include seats.
    """
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    # 'seats' field omitted
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()
    class Meta:
        model = BusService
        fields = '__all__'


class BusServiceDetailSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'retrieve' view, INCLUDES seats.
    """
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    
    # This is correct: field name 'seats' matches related_name='seats'
    seats = BusSeatSerializer(many=True, read_only=True)
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = BusService
        fields = '__all__'

# -----------------------
# BusService Create Serializer (Nested)
# -----------------------
class BusServiceCreateSerializer(serializers.ModelSerializer):
    route = RouteNestedSerializer()
    vehicle = VehicleSerializer()
    policy = PolicySerializer()

    class Meta:
        model = BusService
        exclude = ['provider_user_id', 'booked_seats', 'total_capacity', 'current_sleeper_price', 'current_non_sleeper_price']

    def create(self, validated_data):
        # Nested route creation
        route_data = validated_data.pop('route')
        vehicle_data = validated_data.pop('vehicle')
        policy_data = validated_data.pop('policy')
        request = self.context['request']

        route_serializer = RouteNestedSerializer(data=route_data, context=self.context)
        route_serializer.is_valid(raise_exception=True)
        route = route_serializer.save()
        vehicle = Vehicle.objects.create(**vehicle_data)
        policy = Policy.objects.create(**policy_data)

        bus_service = BusService.objects.create(
            provider_user_id=request.user,
            route=route,
            vehicle=vehicle,
            policy=policy,
            **validated_data
        )

        # ---- Auto-generate seats ----
        sleeper_total = bus_service.num_rows_sleeper * bus_service.num_columns_sleeper
        nonsleeper_total = bus_service.num_rows_non_sleeper * bus_service.num_columns_non_sleeper
        total_capacity = sleeper_total + nonsleeper_total
        bus_service.total_capacity = total_capacity
        bus_service.save()

        seats = []
        # Sleeper seats
        for r in range(bus_service.num_rows_sleeper):
            for c in range(bus_service.num_columns_sleeper):
                seat_number = f"S{r+1}{chr(65+c)}"
                seats.append(BusSeat(
                    bus_service=bus_service,
                    seat_number=seat_number,
                    seat_type='Sleeper',
                    price=bus_service.sleeper_price or bus_service.base_price
                ))
        # Non-sleeper seats
        for r in range(bus_service.num_rows_non_sleeper):
            for c in range(bus_service.num_columns_non_sleeper):
                seat_number = f"N{r+1}{chr(65+c)}"
                seats.append(BusSeat(
                    bus_service=bus_service,
                    seat_number=seat_number,
                    seat_type='NonSleeper',
                    price=bus_service.non_sleeper_price or bus_service.base_price
                ))

        BusSeat.objects.bulk_create(seats)
        bus_service.apply_dynamic_pricing()
        bus_service.save()
        return bus_service
# --------------------------
# TrainService Serializer (Read)
# --------------------------
class TrainServiceSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = TrainService
        fields = '__all__'

    
class TrainServiceListSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'list' view, does NOT include seats.
    """
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    # 'seats' field omitted
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = TrainService
        fields = '__all__'


class TrainServiceDetailSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'retrieve' view, INCLUDES seats.
    """
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    route = RouteNestedSerializer(read_only=True)
    # --- THIS IS THE FIX ---
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()
    
    # --- END FIX ---

    class Meta:
        model = TrainService
        fields = '__all__'
# --------------------------
# TrainService Create Serializer (Nested)
# --------------------------
class TrainServiceCreateSerializer(serializers.ModelSerializer):
    route = RouteNestedSerializer()
    vehicle = VehicleSerializer()
    policy = PolicySerializer()

    class Meta:
        model = TrainService
        exclude = [
            'provider_user_id',
            'total_capacity',
            'created_at',
            'updated_at'
        ]

# In your TrainServiceSerializer's create method

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']

        route_data = validated_data.pop('route')
        vehicle_data = validated_data.pop('vehicle')
        policy_data = validated_data.pop('policy')

        # 1️⃣ Create Route, Vehicle, and Policy
        route = RouteNestedSerializer().create(route_data)
        vehicle = Vehicle.objects.create(**vehicle_data)
        policy = Policy.objects.create(**policy_data)

        # 2️⃣ Create the TrainService instance
        arrival_time = validated_data.pop('arrival_time', None)
        departure_time = validated_data.pop('departure_time', None)
    
        
        train_service = TrainService.objects.create(
            provider_user_id=request.user,
            route=route,
            vehicle=vehicle,
            policy=policy,
            arrival_time=arrival_time,
            departure_time=departure_time,
            **validated_data
        )
        # 3️⃣ Determine the number of segments for the mask
        # We do this BEFORE creating seats.
        num_segments = len(train_service.get_full_stop_list()) - 1
        print(f"Number of segments for availability mask: {num_segments}")
        # CORRECT MASK: '0' means available.
        default_availability_mask = '0' * num_segments

        # 4️⃣ Generate Seats IN MEMORY (don't save yet)
        seats_to_create = []
        bogie_counter = 0

        if 'bogies_config' in validated_data:
            for class_type, details in validated_data['bogies_config'].items():
                bogie_count_for_class = details.get('count', 0)
                seats_per_bogie = details.get('seats_per_bogie', 0)

                for i in range(1, bogie_count_for_class + 1):
                    bogie_counter += 1
                    bogie_code = f"{class_type[0:2].upper()}{i}" 

                    for seat_num in range(1, seats_per_bogie + 1):
                        # (Your seat type logic here)
                        seat_type = 'Lower' # Simplified for example
                        
                        seats_to_create.append(
                            TrainSeat(
                                train_service=train_service,
                                bogie_number=bogie_counter,
                                seat_number=f"{bogie_code}-{seat_num}",
                                seat_type=seat_type,
                                class_type=class_type,
                                # Use the CORRECT mask
                                availability_mask=default_availability_mask
                            )
                        )
        
        # 5️⃣ Bulk create all seats in a single, efficient query
        if seats_to_create:
            TrainSeat.objects.bulk_create(seats_to_create)
         # optional if in same transaction but good in tests
        train_service.refresh_from_db()  # ensures fresh instance

        # ✅ Force a true DB requery
        seat_count = TrainSeat.objects.filter(train_service=train_service).count()
        if seat_count == 0 : 
            return None
        print(f"Seats visible in DB before segment creation: {seat_count}")
        # 6️⃣ NOW that seats exist, create the segments.
        # This call will now correctly count the seats you just created.
        train_service.create_service_segments()

        # 7️⃣ Update capacity and save
        train_service.total_capacity = len(seats_to_create)
        train_service.save()
        train_service.update_duration()
        return train_service
    
# -----------------------
# Flight Service Read Serializer
# -----------------------
class FlightServiceListSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'list' view, does NOT include seats.
    """
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    # 'seats' field omitted
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = FlightService
        fields = '__all__'


class FlightServiceDetailSerializer(serializers.ModelSerializer,ProviderRatingMixin):
    """
    Serializer for the 'retrieve' view, INCLUDES seats.
    """
    route = RouteNestedSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    policy = PolicySerializer(read_only=True)
    provider_rating = serializers.SerializerMethodField()
    provider_total_reviews = serializers.SerializerMethodField()

    # --- THIS IS THE FIX ---
    # The field is named 'seats', but it gets data from 'flight_seats'
    seats = FlightSeatSerializer(
        many=True, 
        read_only=True, 
        source='flight_seats'  # <-- ADDED
    )
    # --- END FIX ---

    class Meta:
        model = FlightService
        fields = '__all__'

# -----------------------
# Flight Service Create Serializer (Nested)
# -----------------------
class FlightServiceCreateSerializer(serializers.ModelSerializer):
    route = RouteNestedSerializer()
    vehicle = VehicleSerializer()
    policy = PolicySerializer()

    class Meta:
        model = FlightService
        exclude = ['provider_user_id', 'booked_seats', 'total_capacity']

    def create(self, validated_data):
        request = self.context['request']
        route_data = validated_data.pop('route')
        vehicle_data = validated_data.pop('vehicle')
        policy_data = validated_data.pop('policy')

        # Create nested route, vehicle, and policy
        route = RouteNestedSerializer().create(route_data)
        vehicle = Vehicle.objects.create(**vehicle_data)
        policy = Policy.objects.create(**policy_data)

        # Create FlightService
        flight_service = FlightService.objects.create(
            provider_user_id=request.user,
            route=route,
            vehicle=vehicle,
            policy=policy,
            **validated_data
        )

        # ---- Auto-generate Seats ----
        seats_to_create = []

        # Helper to generate seat codes like 1A, 1B, etc.
        def seat_code(row, col):
            return f"{row + 1}{chr(65 + col)}"

        # Business class
        for r in range(flight_service.num_rows_business):
            for c in range(flight_service.num_columns_business):
                seats_to_create.append(FlightSeat(
                    flight_service=flight_service,
                    seat_number=seat_code(r, c),
                    seat_class='Business',
                    price=flight_service.business_price or flight_service.base_price
                ))

        # Premium Economy
        for r in range(flight_service.num_rows_premium):
            for c in range(flight_service.num_columns_premium):
                seats_to_create.append(FlightSeat(
                    flight_service=flight_service,
                    seat_number=f"P{seat_code(r, c)}",
                    seat_class='PremiumEconomy',
                    price=flight_service.premium_price or flight_service.base_price
                ))

        # Economy class
        for r in range(flight_service.num_rows_economy):
            for c in range(flight_service.num_columns_economy):
                seats_to_create.append(FlightSeat(
                    flight_service=flight_service,
                    seat_number=f"E{seat_code(r, c)}",
                    seat_class='Economy',
                    price=flight_service.economy_price or flight_service.base_price
                ))

        # Bulk create seats
        FlightSeat.objects.bulk_create(seats_to_create)

        # Update capacity
        flight_service.total_capacity = len(seats_to_create)
        flight_service.save()

        return flight_service
class FlightServiceCardSerializer(serializers.ModelSerializer):
    source = serializers.CharField(source='route.source.code', read_only=True)
    destination = serializers.CharField(source='route.destination.code', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    registration_no = serializers.CharField(source='vehicle.registration_no', read_only=True)
    distance_km = serializers.IntegerField(source='route.distance_km', read_only=True)
    occupancy = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    service_id = serializers.UUIDField(read_only =  True)

    class Meta:
        model = FlightService
        fields = [
            'service_id',
            'airline_name',
            'flight_number',
            'status',
            'source',
            'destination',
            'departure_time',
            'arrival_time',
            'vehicle_model',
            'registration_no',
            'price_range',
            'distance_km',
            'occupancy',
        ]

    def get_occupancy(self, obj):
        if obj.total_capacity:
            return f"{obj.booked_seats}/{obj.total_capacity}"
        return None

    def get_price_range(self, obj):
        prices = [
            obj.base_price,
            obj.business_price,
            obj.premium_price,
            obj.economy_price,
        ]
        valid_prices = [float(p) for p in prices if p is not None]
        if not valid_prices:
            return None
        return f"₹{min(valid_prices):.0f} - ₹{max(valid_prices):.0f}"

class TrainServiceCardSerializer(serializers.ModelSerializer):
    source = serializers.CharField(source='route.source.code', read_only=True)
    destination = serializers.CharField(source='route.destination.code', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    registration_no = serializers.CharField(source='vehicle.registration_no', read_only=True)
    distance_km = serializers.IntegerField(source='route.distance_km', read_only=True)
    occupancy = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    service_id = serializers.UUIDField(read_only =  True)

    class Meta:
        model = TrainService
        fields = [
            'service_id',
            'train_name',
            'train_number',
            'status',
            'source',
            'destination',
            'departure_time',
            'arrival_time',
            'vehicle_model',
            'registration_no',
            'price_range',
            'distance_km',
            'occupancy',
        ]

    def get_price_range(self, obj):
        """Get the min–max full-route price range across all classes."""
        prices = [
            obj.base_price,
            obj.sleeper_price,
            obj.second_ac_price,
            obj.third_ac_price,
        ]
        valid_prices = [float(p) for p in prices if p is not None]
        if not valid_prices:
            return None
        return f"₹{min(valid_prices):.0f} - ₹{max(valid_prices):.0f}"

    def get_occupancy(self, obj):
        """
        Compute total occupancy percentage based on TrainServiceSegment availability.
        """
        segments = obj.segments.all()
        total_capacity = obj.total_seats or 0
        if total_capacity == 0 or not segments.exists():
            return "0%"

        # Compute the *average* available seats across all segments
        total_available = 0
        for seg in segments:
            total_available += (
                seg.available_count_sleeper
                + seg.available_count_second_ac
                + seg.available_count_third_ac
            )
        avg_available = total_available / segments.count()

        booked = total_capacity - avg_available
        occupancy_percent = (booked / total_capacity) * 100
        return f"{booked:.0f}/{total_capacity} ({occupancy_percent:.0f}%)"

class BusServiceCardSerializer(serializers.ModelSerializer):
    source = serializers.CharField(source='route.source.code', read_only=True)
    destination = serializers.CharField(source='route.destination.code', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle.model', read_only=True)
    registration_no = serializers.CharField(source='vehicle.registration_no', read_only=True)
    distance_km = serializers.IntegerField(source='route.distance_km', read_only=True)
    occupancy = serializers.SerializerMethodField()
    price_range = serializers.SerializerMethodField()
    service_id =  serializers.UUIDField(read_only =  True)
    class Meta:
        model = BusService
        fields = [
            'service_id',
            'bus_travels_name',
            'bus_number',
            'status',
            'source',
            'destination',
            'departure_time',
            'arrival_time',
            'vehicle_model',
            'registration_no',
            'price_range',
            'distance_km',
            'occupancy',
        ]

    def get_occupancy(self, obj):
        if obj.total_capacity:
            return f"{obj.booked_seats}/{obj.total_capacity}"
        return None

    def get_price_range(self, obj):
        prices = [
            obj.base_price,
            obj.current_non_sleeper_price,
            obj.current_sleeper_price
        ]
        valid_prices = [float(p) for p in prices if p is not None]
        if not valid_prices:
            return None
        return f"₹{min(valid_prices):.0f} - ₹{max(valid_prices):.0f}"