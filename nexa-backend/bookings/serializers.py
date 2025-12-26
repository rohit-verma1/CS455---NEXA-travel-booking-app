# bookings/serializers.py
from rest_framework import serializers
from .models import Booking, BookingPassenger, Ticket, BookingStatus
from services.models import BusService, TrainService, FlightService,BusSeat,FlightSeat, Station,Policy
from services.serializers import RouteNestedSerializer
from user_management.models import Customer,ServiceProvider
import uuid
from django.utils import timezone
from payments.models import Transaction,Refund

# --- Main Booking Serializers ---

class BookingPassengerSerializer(serializers.ModelSerializer):
    """
    Serializes passenger data. Used for both read and write.
    When writing, 'booking' and 'passenger_id' are ignored.
    """
    class Meta:
        model = BookingPassenger
        fields = [
            'passenger_id', 'name', 'age', 'gender', 'seat_no', 'document_id'
        ]
        read_only_fields = ['passenger_id']


class TicketSerializer(serializers.ModelSerializer):
    """
    Serializes the generated ticket.
    """
    class Meta:
        model = Ticket
        fields = ['ticket_id', 'ticket_no', 'qr_code', 'issued_at', 'is_valid']


class BookingStatusSerializer(serializers.ModelSerializer):
    """
    Serializes booking status logs.
    """
    class Meta:
        model = BookingStatus
        fields = ['status', 'timestamp', 'remarks']


class BookingSerializer(serializers.ModelSerializer):
    """
    Main serializer for retrieving Booking details.
    """
    passengers = BookingPassengerSerializer(many=True, read_only=True)
    ticket = TicketSerializer(read_only=True)
    status_logs = BookingStatusSerializer(many=True, read_only=True)
    service_details = serializers.SerializerMethodField()
    customer = serializers.StringRelatedField() # Shows username
    policy  = serializers.SerializerMethodField()
    mobile_number = serializers.CharField(source='phone_number', read_only=True)
    email_address = serializers.EmailField(source='email', read_only=True)
    class Meta:
        model = Booking
        fields = [
            'booking_id',
            'customer',
            'service_details',
            'total_amount',
            'status',
            'payment_status',
            'booking_date',
            'created_at',
            'passengers',
            'ticket',
            'status_logs',
            'source_id',
            'destination_id',
            'class_type',
            'policy',
            'mobile_number',
            'email_address',
        ]

    def get_service_details(self, obj):
        """
        Dynamically serialize the linked service (Bus, Train, or Flight).
        """
        service = obj.service_object
        if not service:
            return None


        source  = obj.source_id.city if hasattr(obj.source_id, 'city') else obj.source_id
        destination  = obj.destination_id.city if hasattr(obj.destination_id, 'city') else obj.destination_id
        if isinstance(service, BusService):
            return {
                "type": "BusService",
                "service_id": str(service.service_id),
                "route": str(service.route),
                "departure_time": service.departure_time,
                "arrival_time": service.arrival_time,
                "status": service.status,
                "source": source,
                "destination": destination,
                "travels_name": service.bus_travels_name,
                "bus_number": service.bus_number,
            }
        elif isinstance(service, TrainService):
            source = Station.objects.filter(station_id=obj.source_id_id).first().name
            destination = Station.objects.filter(station_id=obj.destination_id_id).first().name
            return {
                "type": "TrainService",
                "service_id": str(service.service_id),
                "train_name": service.train_name,
                "train_number": service.train_number,
                "departure_time": service.departure_time,
                "arrival_time": service.arrival_time,
                "status": service.status,
                "source": source,
                "destination": destination,
                "Train_name": service.train_name,
                "Train_number": service.train_number,
            }
        elif isinstance(service, FlightService):
            return {
                "type": "FlightService",
                "service_id": str(service.service_id),
                "flight_number": service.flight_number,
                "airline_name": service.airline_name,
                "departure_time": service.departure_time,
                "arrival_time": service.arrival_time,
                "status": service.status,
                "source": source,
                "destination": destination,
            }
        return None
    def get_policy(self, obj):
        """
        Retrieve policy details associated with the booking's service.
        """
        service = obj.service_object
        if not service or not hasattr(service, 'policy'):
            return None
        policy = service.policy
        return {
            "cancellation_window": policy.cancellation_window,
            "cancellation_fee": float(policy.cancellation_fee),
            "reschedule_allowed": policy.reschedule_allowed,
            "reschedule_fee": float(policy.reschedule_fee),
            "no_show_penalty": float(policy.no_show_penalty),
            "terms_conditions": policy.terms_conditions,
            "no_cancellation_fee_markup": float(policy.no_cancellation_fee_markup) if policy.no_cancellation_fee_markup else None,
            "no_reschedule_fee_markup": float(policy.no_reschedule_fee_markup) if policy.no_reschedule_fee_markup else None,
            
        }
class BusSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusSeat
        fields = ['seat_id', 'seat_number', 'seat_type', 'is_booked', 'price']


class BusServiceSeatAvailabilitySerializer(serializers.ModelSerializer):
    # ✅ CORRECT: Use the same nested serializer from your other read-only views
    route = RouteNestedSerializer(read_only=True) 
    
    available_seats = serializers.SerializerMethodField()
    total_available = serializers.SerializerMethodField()
    rating = serializers.JSONField()
    no_of_reviews = serializers.IntegerField()
    comments = serializers.JSONField()
    class Meta:
        model = BusService
        fields = [
            'service_id',
            'route',  # This field contains the source and destination
            'departure_time',
            'arrival_time',
            'status',
            'current_sleeper_price',
            'current_non_sleeper_price',
            'available_seats',
            'total_available',
            'rating',
            'no_of_reviews',
            'comments',
            'bus_number',
            'bus_travels_name'
            # ❌ REMOVED: 'source' and 'destination' (they are inside 'route')
        ]

    def get_available_seats(self, obj):
        """
        Return all unbooked seats.
        NOTE: This is simple logic and does not check segment availability.
        """
        request = self.context.get('request')
        
        # ✅ CORRECT: Read the _id parameters
        source_id = request.query_params.get('source_id')
        destination_id = request.query_params.get('destination_id')

        # ❗️ WARNING: This logic is still simple. 
        # It ignores source_id/destination_id because the BusSeat model
        # only has 'is_booked', not an availability_mask.
        available = obj.seats.filter(is_booked=False)
        
        # We pass the full seat data
        return BusSeatSerializer(available, many=True).data

    def get_total_available(self, obj):
        # This is correct for the simple model
        return obj.seats.filter(is_booked=False).count()
    def get_rating(self, obj):
        """
        Placeholder static rating — you can connect to reviews later.
        """
        reviews_dict =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().ratings_dict
        if reviews_dict != None:
            return reviews_dict    
        return {"5": 80, "4": 15, "3": 3, "2": 1, "1": 1}

    def get_no_of_reviews(self, obj):
        no_of_reviews =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().total_reviews
        if no_of_reviews != None:
            return no_of_reviews
        return 100 
class FlightSearchResultSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider_user_id.username", read_only=True)
    airline_name = serializers.CharField(read_only=True)
    aircraft_model = serializers.CharField(read_only=True)
    source = serializers.CharField(source="route.source", read_only=True)
    destination = serializers.CharField(source="route.destination", read_only=True)
    stops = serializers.ListField(source="route.via_points", read_only=True)
    amenities = serializers.ListField(source="vehicle.amenities", read_only=True)

    class_type = serializers.CharField(read_only=True)
    price = serializers.FloatField(read_only=True)
    available_seats = serializers.IntegerField(read_only=True)
    bookable = serializers.BooleanField(read_only=True)
    rating = serializers.SerializerMethodField()
    no_of_reviews = serializers.SerializerMethodField()

    class Meta:
        model = FlightService
        fields = [
            "service_id",
            "provider_name",
            "airline_name",
            "aircraft_model",
            "source",
            "destination",
            "departure_time",
            "arrival_time",
            "class_type",
            "price",
            "available_seats",
            "bookable",
            "amenities",
            "stops",
            "rating",
            "no_of_reviews",
        ]

    def get_rating(self, obj):
        """
        Placeholder static rating — you can connect to reviews later.
        """
        reviews_dict =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().ratings_dict
        if reviews_dict != None:
            return reviews_dict    
        return {"5": 80, "4": 15, "3": 3, "2": 1, "1": 1}

    def get_no_of_reviews(self, obj):
        no_of_reviews =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().total_reviews
        if no_of_reviews != None:
            return no_of_reviews
        return 100







class TrainSearchResultSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider_user_id.username", read_only=True)
    source = serializers.CharField(source="route.source.station_id", read_only=True)
    destination = serializers.CharField(source="route.destination.station_id", read_only=True)
    stops = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()

    train_name = serializers.CharField(read_only=True)
    train_number = serializers.CharField(read_only=True)

    class_type = serializers.CharField(read_only=True)
    price = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    bookable = serializers.SerializerMethodField()

    rating = serializers.SerializerMethodField()
    no_of_reviews = serializers.SerializerMethodField()

    class Meta:
        model = TrainService
        fields = [
            "service_id",
            "provider_name",
            "train_name",
            "train_number",
            "source",
            "destination",
            "departure_time",
            "arrival_time",
            "class_type",
            "price",
            "available_seats",
            "bookable",
            "amenities",
            "stops",
            "rating",
            "no_of_reviews",
        ]

    # ---------------------------
    # Custom computed fields
    # ---------------------------

    def get_stops(self, obj):
        """
        Returns all stops on this route, including source/destination.
        """
        try:
            vstops = []
            final_dest_arrival_time = obj.arrival_time
            
            for stops in obj.route.stops.all():
                if stops.duration_to_destination:
                    print( final_dest_arrival_time - stops.duration_to_destination)
                    vstops.append({
                        "station_id": stops.station.station_id,
                        "name": stops.station.name,
                        "code": stops.station.code,
                        "duration_to_destination": stops.duration_to_destination,
                        "departure_time": final_dest_arrival_time - stops.duration_to_destination,
                    })
                else: 
                    vstops.append({
                        "station_id": stops.station.station_id,
                        "name": stops.station.name,
                        "code": stops.station.code,
                        "duration_to_destination": None,
                        "departure_time": None,
                    })
            return vstops
        except Exception as e:
            print(f"Error in get_stops: {e}")
            return []

    def get_amenities(self, obj):
        """
        Get amenities from linked vehicle (if JSON).
        """
        return obj.vehicle.amenities if obj.vehicle and obj.vehicle.amenities else []

    def get_price(self, obj):
        """
        Estimate price dynamically for the given class type if available in context.
        """
        context = self.context or {}
        class_type = context.get("class_type", "Sleeper")
        from_station = context.get("from_station")
        to_station = context.get("to_station")

        # If we have station context, calculate journey price
        if from_station and to_station:
            try:
                price = obj.get_price_for_journey(from_station, to_station, class_type)
                return float(price)
            except Exception:
                pass

        # Fallback — show full-route price for that class
        mapping = {
            "Sleeper": obj.sleeper_price,
            "SecondAC": obj.second_ac_price,
            "ThirdAC": obj.third_ac_price,
        }
        return float(mapping.get(class_type) or obj.base_price or 0.0)

    def get_available_seats(self, obj):
        """
        Return total available seats for a given class_type.
        """
        class_type = self.context.get("class_type", "Sleeper")
        total = obj.train_seats.filter(class_type=class_type).count()
        booked = sum(seg.available_count_sleeper for seg in obj.segments.all()) if obj.segments.exists() else 0
        available = total if total > 0 else 0
        return available

    def get_bookable(self, obj):
        """
        Returns True if service is scheduled and seats are available.
        """
        return obj.status == "Scheduled"

    def get_rating(self, obj):
        """
        Placeholder static rating — you can connect to reviews later.
        """
        reviews_dict =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().ratings_dict
        if reviews_dict != None:
            return reviews_dict    
        return {"5": 80, "4": 15, "3": 3, "2": 1, "1": 1}

    def get_no_of_reviews(self, obj):
        no_of_reviews =  ServiceProvider.objects.filter(user=obj.provider_user_id).first().total_reviews
        if no_of_reviews != None:
            return no_of_reviews
        return 100

class FlightSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlightSeat
        fields = ['seat_id', 'seat_number', 'seat_class', 'is_booked', 'price']


class FlightServiceSeatAvailabilitySerializer(serializers.ModelSerializer):
    available_seats = serializers.SerializerMethodField()

    class Meta:
        model = FlightService
        fields = [
            'service_id', 'flight_number', 'airline_name', 'aircraft_model',
            'route', 'vehicle', 'policy',
            'departure_time', 'arrival_time', 'status',
            'base_price', 'business_price', 'premium_price', 'economy_price',
            'available_seats'
        ]

    def get_available_seats(self, obj):
        # ✅ Only return seats that are not booked
        seats = obj.flight_seats.filter(is_booked=False)
        return FlightSeatSerializer(seats, many=True).data
    
class BookingPassengerCreateSerializer(serializers.Serializer):
    """
    Validates the passenger data provided during booking creation.
    This is NOT a ModelSerializer.
    """
    name = serializers.CharField(max_length=200)
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True)
    seat_no = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    document_id = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)



class BookingCreateSerializer(serializers.Serializer):
    """
    Validates the main request body for the BookingViewSet's 'create' action.
    This is NOT a ModelSerializer.
    """
    service_model = serializers.ChoiceField(choices=['bus', 'train', 'flight'])
    service_id = serializers.UUIDField()
    passengers = BookingPassengerCreateSerializer(many=True, min_length=1)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # Optional fields (but conditionally required by logic)
    class_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    from_station_id = serializers.UUIDField(required=False, allow_null=True)
    to_station_id = serializers.UUIDField(required=False, allow_null=True)
    no_cancellation_free_markup = serializers.BooleanField(default=False)
    no_reschedule_free_markup = serializers.BooleanField(default=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    def validate(self, data):
        """
        Add cross-field validation for conditional requirements.
        """
        service_model = data.get('service_model')
        passengers = data.get('passengers', [])
        class_type = data.get('class_type')

        # 1. Train Validation
        if service_model == 'train':
            if not class_type:
                raise serializers.ValidationError({"class_type": "This field is required for train bookings."})
            if not data.get('from_station_id'):
                raise serializers.ValidationError({"from_station_id": "This field is required for train bookings."})
            if not data.get('to_station_id'):
                raise serializers.ValidationError({"to_station_id": "This field is required for train bookings."})

        # 2. Flight Validation (if auto-assigning)
        if service_model == 'flight':
            needs_auto_assign = any(not p.get('seat_no') for p in passengers)
            if needs_auto_assign and not class_type:
                raise serializers.ValidationError({"class_type": "This field is required for flight bookings when auto-assigning seats."})
        
        # 3. Bus Validation (if auto-assigning)
        if service_model == 'bus':
            needs_auto_assign = any(not p.get('seat_no') for p in passengers)
            if needs_auto_assign and not class_type:
                raise serializers.ValidationError({"class_type": "This field is required for bus bookings when auto-assigning seats (e.g., 'Sleeper' or 'NonSleeper')."})

        return data
class BookingCreateResponseSerializer(serializers.Serializer):
    """
    Defines the *output* schema for a successful booking creation.
    This serializer is used only for Swagger documentation.
    """
    booking = BookingSerializer()
    assigned_seats = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of seat numbers assigned to the passengers."
    )
    payment_next = serializers.CharField(
        help_text="Informational URL for the next payment step."
    )
class BookingListSerializer(serializers.ModelSerializer):
    booking_id = serializers.UUIDField(read_only=True)
    passenger_name = serializers.SerializerMethodField()
    route = serializers.SerializerMethodField()
    seats = serializers.SerializerMethodField()
    amount = serializers.DecimalField(source='total_amount', max_digits=12, decimal_places=2)
    date = serializers.DateTimeField(source='booking_date', read_only=True)
    service_type = serializers.SerializerMethodField()
    service_id = serializers.SerializerMethodField()  # ✅ Added field
    service_provider = serializers.CharField(source='service_object.provider_user_id.username', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'booking_id',
            'service_id',
            'passenger_name',
            'route',
            'date',
            'seats',
            'amount',
            'status',
            'service_type',
            'service_provider',

        ]
    def get_service_id(self, obj):
        """
        Safely fetch UUID of the related service (Bus/Train/Flight)
        from GenericForeignKey without altering model.
        """
        if obj.service_object:
            # For BusService / TrainService / FlightService models
            return getattr(obj.service_object, 'service_id', None)
        return None
    def get_passenger_name(self, obj):
        """Return customer's username (or first passenger name if missing)."""
        if obj.customer:
            return obj.customer.username
        passenger = obj.passengers.first() if hasattr(obj, 'passengers') else None
        return passenger.name if passenger else "—"


    def get_route(self, obj):
        """Return route as 'Source → Destination'."""
        source = getattr(obj.source_id, 'city', None) or getattr(obj.source_id, 'name', None)
        destination = getattr(obj.destination_id, 'city', None) or getattr(obj.destination_id, 'name', None)
        return f"{source} → {destination}" if source and destination else "—"

    def get_seats(self, obj):
        """Return all booked seat numbers as comma-separated string."""
        if hasattr(obj, 'passengers'):
            seats = obj.passengers.values_list('seat_no', flat=True)
            return ", ".join(seats) if seats else "—"
        return "—"

    def get_service_type(self, obj):
        """Return the type of service (Train/Bus/Flight)."""
        if obj.service_object:
            return obj.service_object.__class__.__name__.replace("Service", "")
        return "—"

class CheapestFareSerializer(serializers.Serializer):
    route__destination__code = serializers.CharField()
    departure_time__date = serializers.DateField()
    min_price = serializers.DecimalField(max_digits=10, decimal_places=2)

class BookingCancelSerializer(serializers.Serializer):
    """
    Serializer for handling booking cancellations.
    Uses booking_id from the URL to perform cancellation
    and returns a structured booking representation.
    """
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for cancellation (optional)."
    )

    def validate(self, attrs):
        booking = self.context.get("booking")
        if not booking:
            raise serializers.ValidationError("Booking not provided in context.")
        if booking.status == "Cancelled":
            raise serializers.ValidationError("Booking is already cancelled.")
        return attrs

    def perform_cancellation(self):
        booking = self.context["booking"]
        reason = self.validated_data.get("reason", "Booking cancelled by user")

        # --- Update Booking Status ---
        original_payment_status = booking.payment_status
        booking.status = "Cancelled"
        booking.payment_status = (
            "Refunded" if original_payment_status == "Paid" else original_payment_status
        )
        booking.updated_at = timezone.now()
        booking.save(update_fields=["status", "payment_status", "updated_at"])

        # --- Record Status Log ---
        BookingStatus.objects.create(
            booking=booking,
            status="Cancelled",
            remarks=reason,
        )

        # --- Refund Handling ---
        transaction = Transaction.objects.filter(booking=booking, status="Success").first()
        refund = None
        if transaction:
            refund = Refund.objects.create(
                transaction=transaction,
                amount=booking.total_amount,
                status="Pending",
                reason="Booking Cancellation by User",
                initiated_at=timezone.now(),
            )

        return booking, refund

    def to_representation(self, instance):
        booking, refund = instance

        # --- Ticket serialization if available ---
        ticket_data = None
        if hasattr(booking, "ticket") and booking.ticket:
            ticket_data = TicketSerializer(booking.ticket).data

        return {
            "message": "Booking cancelled successfully.",
            "booking": {
                "total_amount": str(booking.total_amount),
                "status": booking.status,
                "payment_status": booking.payment_status,
                "ticket": ticket_data,
                "source_id": str(booking.source_id) if booking.source_id else None,
                "destination_id": str(booking.destination_id) if booking.destination_id else None,
                "class_type": booking.class_type,
            },
            "refund_id": getattr(refund, "refund_id", None),
            "refund_status": getattr(refund, "status", None),
        }
