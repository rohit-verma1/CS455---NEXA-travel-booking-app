# bookings/views.py
from datetime import datetime, timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status,exceptions
from django.db.models import F,Value,JSONField,IntegerField,OuterRef,Subquery
from decimal import Decimal
from django.contrib.contenttypes.models import ContentType
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from .permissions import IsAdmin, IsServiceProvider, IsCustomer
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from django.db.models import Q,Min
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from .serializers import BusServiceSeatAvailabilitySerializer,TrainSearchResultSerializer,FlightSearchResultSerializer,FlightServiceSeatAvailabilitySerializer
from .models import Booking, BookingPassenger, Ticket, BookingStatus
from .serializers import (
    BookingSerializer,
    BookingPassengerSerializer,
    TicketSerializer,
    BookingStatusSerializer,
    BookingCreateSerializer,
    BookingPassengerCreateSerializer, BookingCreateResponseSerializer, BookingListSerializer, BookingCancelSerializer
)
from drf_spectacular.utils import extend_schema, OpenApiResponse

from services.models import (
    BusService,
    BusSeat,
    TrainService,
    TrainSeat,
    FlightService,
    FlightSeat,
    Station,RouteStop,Route
)
from services.serializers import TrainServiceSerializer
from payments.models import Transaction, Refund, LoyaltyWallet
from user_management.models import ServiceProvider

SERVICE_MAP = {
    "Bus": (BusService, BusSeat, "seat_type", "bus_service"),
    "Train": (TrainService, TrainSeat, "class_type", "train_service"),
    "Flight": (FlightService, FlightSeat, "seat_class", "flight_service"),
}


SERVICE_MODEL_MAP = {
    'bus': BusService,
    'train': TrainService,
    'flight': FlightService,
}

class BookingViewSet(viewsets.ModelViewSet):
    """
    Booking endpoints for creating and managing bookings.
    Handles Bus, Train, and Flight bookings through a unified interface.
    """
    queryset = Booking.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == 'create':
            return BookingCreateSerializer
        if self.action == 'cancel':
            return BookingCancelSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user

        if not user.is_authenticated:
            return self.queryset.none()

        # Admins see everything
        if user.user_type == 'admin':
            return self.queryset.all()

        # Service Providers see only their assigned records (if applicable)
        if user.user_type == 'provider':
            return self.queryset.filter(service_provider=user)
        qs = self.queryset.filter(customer=user)
        # Customers see only their own records
        return qs.select_related('content_type', 'ticket').prefetch_related('passengers', 'status_logs')

    @swagger_auto_schema(
        operation_summary="Create a new booking (Pending Payment)",
        responses={
            status.HTTP_201_CREATED: BookingCreateResponseSerializer, 
            status.HTTP_400_BAD_REQUEST: openapi.Response("Validation Error / Bad Request"),
            status.HTTP_404_NOT_FOUND: openapi.Response("Service not found"),
            status.HTTP_409_CONFLICT: openapi.Response("Conflict (e.g., seats not available)"),
        }
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create a new booking (Pending Payment).

        This endpoint locks the required seats/segments, calculates the price,
        and creates the Booking and BookingPassenger records.
        """
        user = request.user
        
        # 1. Validate input
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        # 2. Get and validate common data
        service_model_name = validated_data.get("service_model")
        service_id = validated_data.get("service_id")
        passengers_data = validated_data.get("passengers", [])
        class_type = validated_data.get('class_type')
        num_passengers = len(passengers_data)
        no_cancellation_free_markup = validated_data.get('no_cancellation_free_markup', False)
        no_reschedule_free_markup = validated_data.get('no_reschedule_free_markup', False)
        email = validated_data.get('email')
        phone_number = validated_data.get('phone_number')
        # Train-specific data
        from_station_id = validated_data.get('from_station_id')
        to_station_id = validated_data.get('to_station_id')
        from_station = None
        to_station = None

        # 3. Get Service Model and ContentType
        ServiceModel = SERVICE_MODEL_MAP[service_model_name]
        try:
            content_type = ContentType.objects.get_for_model(ServiceModel)
            if service_model_name == 'train':
                if not from_station_id or not to_station_id:
                    raise exceptions.ValidationError("from_station_id and to_station_id are required for train bookings.")
                from_station = Station.objects.get(station_id=from_station_id)
                to_station = Station.objects.get(station_id=to_station_id)

        except ContentType.DoesNotExist:
            return Response({"detail": "Service model configuration error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Station.DoesNotExist:
             return Response({"detail": "Invalid from_station_id or to_station_id."}, status=status.HTTP_404_NOT_FOUND)

        # 4. Lock service and create Booking object FIRST
        try:
            # Lock the service row
            service = ServiceModel.objects.select_for_update().get(service_id=service_id)
            
            # --- REFACTORED LOGIC ---
            # 5. Create Booking object FIRST
            # We create it with a temporary total, then update it after
            # the helper function calculates the real price.
            booking = Booking.objects.create(
                customer=user,
                provider=service.provider_user_id, # Assuming service has a provider
                content_type=content_type,
                object_id=service.service_id,
                total_amount=Decimal('0.0'), # Will be updated
                status="Pending",
                payment_status="Pending",
                no_cancellation_free_markup=no_cancellation_free_markup,
                no_reschedule_free_markup=no_reschedule_free_markup,
                source_id_id = from_station_id,
                destination_id_id=to_station_id, 
                class_type=class_type,
                email=email,
                phone_number=phone_number,

            )

            # 6. Delegate to helper, passing the new booking
            booking_details = {}

            if service_model_name == 'bus':
                booking_details = self._handle_bus_booking(
                    booking, service, passengers_data, class_type,
                    no_cancellation_free_markup, no_reschedule_free_markup
                )
                service.booked_seats = F('booked_seats') + num_passengers
                service.save(update_fields=["booked_seats", "updated_at"])
            
            elif service_model_name == 'flight':
                booking_details = self._handle_flight_booking(
                    booking, service, passengers_data, class_type
                )
                service.booked_seats = F('booked_seats') + num_passengers
                service.save(update_fields=["booked_seats", "updated_at"])

            elif service_model_name == 'train':
                booking_details = self._handle_train_booking(
                    booking, service, passengers_data, class_type, 
                    from_station_id, to_station_id
                )
                # Note: Train helper updates segment counts internally

            # 7. Update Booking with final amount
            booking.total_amount = booking_details['total_amount']
            booking.save(update_fields=['total_amount', 'updated_at'])
            # --- END REFACTORED LOGIC ---

        except ServiceModel.DoesNotExist:
            return Response({"detail": f"{service_model_name.capitalize()} service not found."}, status=status.HTTP_404_NOT_FOUND)
        except (ValueError, exceptions.ValidationError) as e:
            # transaction.atomic() will roll back the booking creation
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except exceptions.PermissionDenied as e:
            # transaction.atomic() will roll back
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        except Exception as e:
            # transaction.atomic() will roll back
            return Response({"detail": f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 8. Log status and return response
        BookingStatus.objects.create(
            booking=booking, 
            status="Pending", 
            remarks="Booking created; awaiting payment."
        )

        # 9. Prepare the response
        response_data = {
            "booking": BookingSerializer(booking).data, # Use BookingSerializer here
            "assigned_seats": booking_details['assigned_seats'],
            "payment_next": "/api/payments/confirm/ (POST booking_id)",
        }
        
        return Response(
            response_data,
            status=status.HTTP_201_CREATED,
        )

    # --- Helper Functions (Now accept 'booking' object) ---

    def _handle_bus_booking(self, booking: Booking, service: BusService, passengers_data: list, class_type: str, no_cancellation_free_markup: bool, no_reschedule_free_markup: bool):
        """
        Handles seat locking, passenger creation, and price calculation for a BusService.
        """
        total_amount = Decimal('0.0')
        passenger_db_data = []  # Data for bulk_create
        assigned_seats = []
        seats_to_update = []  # BusSeat objects

        passenger_map = {p['seat_no']: p for p in passengers_data if p.get('seat_no')}
        passengers_auto_assign = [p for p in passengers_data if not p.get('seat_no')]
        
        price_markup_multiplier = Decimal('1.0')
        if no_cancellation_free_markup:
            price_markup_multiplier += service.policy.no_cancellation_fee_markup
        if no_reschedule_free_markup:
            price_markup_multiplier += service.policy.no_reschedule_fee_markup

        # 1. Process requested seats
        if passenger_map:
            requested_seats = list(
                BusSeat.objects.select_for_update().filter(
                    bus_service=service, 
                    seat_number__in=passenger_map.keys()
                )
            )
            if len(requested_seats) != len(passenger_map):
                raise ValueError("One or more requested seats not found.")

            for seat in requested_seats:
                if seat.is_booked:
                    raise exceptions.PermissionDenied(f"Requested seat {seat.seat_number} is already booked.")
                seat.is_booked = True
                seats_to_update.append(seat)
                total_amount += seat.price
                p_data = passenger_map[seat.seat_number]
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # 2. Process auto-assigned seats
        if passengers_auto_assign:
            filter_q = Q(bus_service=service, is_booked=False)
            if class_type:
                filter_q &= Q(seat_type=class_type)
            else:
                raise ValueError("class_type is required for auto-assigning bus seats.")
            
            available_seats = list(
                BusSeat.objects.select_for_update()
                .filter(filter_q)
                .exclude(seat_number__in=passenger_map.keys())
                .order_by('seat_number')
                [:len(passengers_auto_assign)]
            )
            if len(available_seats) < len(passengers_auto_assign):
                raise exceptions.PermissionDenied(f"Not enough available seats of type {class_type}.")

            for i, p_data in enumerate(passengers_auto_assign):
                seat = available_seats[i]
                seat.is_booked = True
                seats_to_update.append(seat)
                total_amount += seat.price
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # --- MODIFIED LOGIC ---
        # 3. Create Passenger objects in bulk, now with the booking
        passengers_to_create = [
            BookingPassenger(booking=booking, **p_data) 
            for p_data in passenger_db_data
        ]
        created_passengers = BookingPassenger.objects.bulk_create(passengers_to_create)

        # 4. Map created passengers back to their seats
        passenger_map_by_seat = {p.seat_no: p for p in created_passengers}
        
        for seat in seats_to_update:
            passenger = passenger_map_by_seat.get(seat.seat_number)
            if passenger:
                seat.booking_passenger = passenger
            else:
                raise ValueError(f"Failed to find created passenger for seat {seat.seat_number}")
        # --- END MODIFIED LOGIC ---

        # 5. Save all seat updates at once
        BusSeat.objects.bulk_update(seats_to_update, ['is_booked', 'booking_passenger'])

        return {
            'total_amount': total_amount * price_markup_multiplier,
            'assigned_seats': assigned_seats
            # No need to return passengers, they are linked to the booking
        }

    def _handle_flight_booking(self, booking: Booking, service: FlightService, passengers_data: list, class_type: str):
        """
        Handles seat locking, passenger creation, and price calculation for a FlightService.
        """
        total_amount = Decimal('0.0')
        passenger_db_data = []
        assigned_seats = []
        seats_to_update = []

        passenger_map = {p['seat_no']: p for p in passengers_data if p.get('seat_no')}
        passengers_auto_assign = [p for p in passengers_data if not p.get('seat_no')]

        # 1. Process requested seats
        if passenger_map:
            requested_seats = list(
                FlightSeat.objects.select_for_update().filter(
                    flight_service=service, 
                    seat_number__in=passenger_map.keys()
                )
            )
            if len(requested_seats) != len(passenger_map):
                raise ValueError("One or more requested seats not found.")

            for seat in requested_seats:
                if seat.is_booked:
                    raise exceptions.PermissionDenied(f"Requested seat {seat.seat_number} is already booked.")
                seat.is_booked = True
                seats_to_update.append(seat)
                total_amount += seat.price
                p_data = passenger_map[seat.seat_number]
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # 2. Process auto-assigned seats
        if passengers_auto_assign:
            if not class_type:
                raise ValueError("class_type is required for auto-assigning flight seats.")
                
            available_seats = list(
                FlightSeat.objects.select_for_update()
                .filter(flight_service=service, is_booked=False, seat_class=class_type)
                .exclude(seat_number__in=passenger_map.keys())
                .order_by('seat_number')
                [:len(passengers_auto_assign)]
            )
            if len(available_seats) < len(passengers_auto_assign):
                raise exceptions.PermissionDenied(f"Not enough available seats for class {class_type}.")

            for i, p_data in enumerate(passengers_auto_assign):
                seat = available_seats[i]
                seat.is_booked = True
                seats_to_update.append(seat)
                total_amount += seat.price
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # --- ADDED PASSENGER LOGIC ---
        # 3. Create Passenger objects
        passengers_to_create = [
            BookingPassenger(booking=booking, **p_data) 
            for p_data in passenger_db_data
        ]
        created_passengers = BookingPassenger.objects.bulk_create(passengers_to_create)

        # 4. Map passengers to seats
        passenger_map_by_seat = {p.seat_no: p for p in created_passengers}
        for seat in seats_to_update:
            passenger = passenger_map_by_seat.get(seat.seat_number)
            if passenger:
                # Assuming FlightSeat has this field, just like BusSeat
                seat.booking_passenger = passenger 
            else:
                raise ValueError(f"Failed to find created passenger for seat {seat.seat_number}")
        # --- END ADDED LOGIC ---

        # 5. Bulk update seats
        FlightSeat.objects.bulk_update(seats_to_update, ['is_booked', 'booking_passenger'])

        return {
            'total_amount': total_amount, # No markup for flights in this logic
            'assigned_seats': assigned_seats
        }

    def _handle_train_booking(self, booking: Booking, service: TrainService, passengers_data: list, class_type: str, from_station_id: str, to_station_id: str):
        """
        Handles segment-based locking and price calculation for a TrainService.
        """
        num_passengers = len(passengers_data)
        
        # Stations are already validated in create()
        from_station = booking.source_id
        to_station = booking.destination_id
        # 1. Get segment indices
        all_stops = service.get_full_stop_list()
        start_order = next((order for order, station in all_stops if station.station_id == from_station.station_id), None)
        end_order = next((order for order, station in all_stops if station.station_id == to_station.station_id), None)
        if start_order is None or end_order is None or start_order >= end_order:
            raise ValueError("Invalid station route. 'from_station' must be before 'to_station'.")
        segment_indices_to_book = list(range(start_order, end_order))
        num_segments_total = service.segments.count()
        if num_segments_total == 0:
            raise exceptions.ValidationError("This train service has not been configured correctly (no segments found).")

        # 2. Calculate Price
        price_per_passenger = service.get_price_for_journey(from_station, to_station, class_type)
        if price_per_passenger is None:
            raise ValueError("Could not calculate price for this journey.")
        total_amount = price_per_passenger * num_passengers
        # 3. Check aggregate availability
        class_field_map = {'Sleeper': 'sleeper', 'SecondAC': 'second_ac', 'ThirdAC': 'third_ac'}
        if class_type not in class_field_map:
            raise ValueError(f"Invalid class_type for train: {class_type}")
            
        field_name = f'available_count_{class_field_map[class_type]}'
        segments = service.segments.select_for_update().filter(segment_index__in=segment_indices_to_book)
        min_available = segments.aggregate(min_seats=Min(field_name))['min_seats']

        if min_available is None or min_available < num_passengers:
            raise exceptions.PermissionDenied("Not enough seats available for this journey.")

        # 4. Find and Lock specific seats
        passenger_db_data = []
        assigned_seats = []
        seats_to_update = []
        
        booking_mask_list = ['0'] * num_segments_total
        for i in segment_indices_to_book:
            booking_mask_list[i] = '1'
        booking_mask_int = int("".join(booking_mask_list), 2)

        passenger_map = {p['seat_no']: p for p in passengers_data if p.get('seat_no')}
        passengers_auto_assign = [p for p in passengers_data if not p.get('seat_no')]

        # 4a. Process requested seats
        if passenger_map:
            requested_seats = list(
                TrainSeat.objects.select_for_update().filter(
                    train_service=service, 
                    class_type=class_field_map[class_type],
                    seat_number__in=passenger_map.keys()
                )
            )
            if len(requested_seats) != len(passenger_map):
                raise ValueError("One or more requested train seats not found.")
            
            for seat in requested_seats:
                mask_str = seat.availability_mask or ('0' * num_segments_total)
                if len(mask_str) != num_segments_total: mask_str = '0' * num_segments_total
                current_mask_int = int(mask_str, 2)

                if (current_mask_int & booking_mask_int) != 0:
                    raise exceptions.PermissionDenied(f"Requested seat {seat.seat_number} is not available for this journey.")
                
                new_mask_int = current_mask_int | booking_mask_int
                seat.availability_mask = f"{new_mask_int:0{num_segments_total}b}"
                seats_to_update.append(seat)
                p_data = passenger_map[seat.seat_number]
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # 4b. Process auto-assigned seats
        if passengers_auto_assign:
            needed = len(passengers_auto_assign)
            potential_seats = TrainSeat.objects.select_for_update().filter(
                train_service=service, class_type=class_field_map[class_type]
            ).exclude(seat_number__in=passenger_map.keys())
            print(f"Auto-assigning {needed} seats from {potential_seats.count()} potential seats.")
            available_seats = []
            for seat in potential_seats:
                mask_str = seat.availability_mask or ('0' * num_segments_total)
                if len(mask_str) != num_segments_total: mask_str = '0' * num_segments_total
                current_mask_int = int(mask_str, 2)
                
                if (current_mask_int & booking_mask_int) == 0:
                    available_seats.append(seat)
                    if len(available_seats) == needed: break
            
            if len(available_seats) < needed:
                raise exceptions.PermissionDenied("Could not find enough contiguous seats.")

            for i, p_data in enumerate(passengers_auto_assign):
                seat = available_seats[i]
                mask_str = seat.availability_mask or ('0' * num_segments_total)
                if len(mask_str) != num_segments_total: mask_str = '0' * num_segments_total
                current_mask_int = int(mask_str, 2)
                new_mask_int = current_mask_int | booking_mask_int
                seat.availability_mask = f"{new_mask_int:0{num_segments_total}b}"
                seats_to_update.append(seat)
                passenger_db_data.append({
                    "name": p_data.get('name'), "age": p_data.get('age'),
                    "gender": p_data.get('gender'), "seat_no": seat.seat_number,
                    "document_id": p_data.get('document_id'),
                })
                assigned_seats.append(seat.seat_number)

        # --- ADDED PASSENGER LOGIC ---
        # 4c. Create Passengers
        passengers_to_create = [
            BookingPassenger(booking=booking, **p_data) 
            for p_data in passenger_db_data
        ]
        created_passengers = BookingPassenger.objects.bulk_create(passengers_to_create)

        # 4d. Map passengers to seats
        # passenger_map_by_seat = {p.seat_no: p for p in created_passengers}
        # for seat in seats_to_update:
        #     passenger = passenger_map_by_seat.get(seat.seat_number)
        #     if passenger:
        #         # Assuming TrainSeat has this field, just like BusSeat
        #         seat.booking_passenger = passenger
        #     else:
        #         raise ValueError(f"Failed to find created passenger for seat {seat.seat_number}")
        # --- END ADDED LOGIC ---

        # 5. Commit updates to seats and segments
        TrainSeat.objects.bulk_update(seats_to_update, ['availability_mask'])
        segments.update(**{field_name: F(field_name) - num_passengers})

        return {
            'total_amount': total_amount,
            'assigned_seats': assigned_seats
        }

    # --- Cancellation and Ticket Methods ---
    @extend_schema(
        request=BookingCancelSerializer,
        responses={
            status.HTTP_200_OK: OpenApiResponse(
                response=BookingCancelSerializer,
                description="Booking cancelled successfully."
            )
        },
    )
    @action(detail=True, methods=["post"], url_path="cancel")
    @transaction.atomic
    def cancel(self, request, pk=None):
        """
        Cancel a booking. This releases the seats/segments.
        """
        booking = self.get_object()
        serializer = BookingCancelSerializer(data=request.data, context={"booking": booking})
        serializer.is_valid(raise_exception=True)

        # Perform cancellation
        booking, refund = serializer.perform_cancellation()

        # Now proceed to release seats
        service = booking.service_object
        if not service:
            BookingStatus.objects.create(
                booking=booking, status="Cancelled", remarks="Cancelled; Service not found."
            )
            return Response(serializer.to_representation((booking, refund)), status=status.HTTP_200_OK)

        # Get model class
        model_class = booking.content_type.model_class()
        passenger_seat_nums = list(booking.passengers.values_list("seat_no", flat=True))
        num_passengers = len(passenger_seat_nums)

        # Release seats (your original seat logic goes here)
        try:
            if model_class == BusService:
                BusSeat.objects.filter(
                    bus_service=service, seat_number__in=passenger_seat_nums
                ).update(is_booked=False, booking_passenger=None) # <-- Unlink passenger
                service.booked_seats = F('booked_seats') - num_passengers
                service.save(update_fields=["booked_seats", "updated_at"])

            elif model_class == FlightService:
                seat = FlightSeat.objects.filter(
                    flight_service=service, seat_number__in=passenger_seat_nums
                )
                seat.update(is_booked=False, booking_passenger=None) # <-- Unlink passenger
                service.booked_seats = F('booked_seats') - num_passengers
                service.save(update_fields=["booked_seats", "updated_at"])
            
            elif model_class == TrainService:
                # --- FIXED: Implemented Train Cancellation Logic ---
                if not booking.from_station or not booking.to_station or not booking.class_type:
                    raise ValueError("Cannot cancel train booking: missing from_station, to_station, or class_type on booking.")
                
                # 1. Get segment indices to free
                all_stops = service.get_full_stop_list()
                start_order = next((order for order, station in all_stops if station.station_id == booking.from_station.station_id), None)
                end_order = next((order for order, station in all_stops if station.station_id == booking.to_station.station_id), None)
                
                if start_order is None or end_order is None or start_order >= end_order:
                     raise ValueError("Invalid station route on booking.")
                
                segment_indices_to_free = list(range(start_order, end_order))
                num_segments_total = service.segments.count()

                # 2. Create masks
                booking_mask_list = ['0'] * num_segments_total
                for i in segment_indices_to_free:
                    booking_mask_list[i] = '1'
                booking_mask_int = int("".join(booking_mask_list), 2)
                # This creates a mask like 111...11000111...
                free_mask_int = ~booking_mask_int 

                # 3. Get field name
                class_field_map = {'Sleeper': 'sleeper', 'SecondAC': 'second_ac', 'ThirdAC': 'third_ac'}
                field_name = f'available_count_{class_field_map[booking.class_type]}'

                # 4. Lock and update seats
                seats_to_update = list(
                    TrainSeat.objects.select_for_update().filter(
                        train_service=service, seat_number__in=passenger_seat_nums
                    )
                )

                for seat in seats_to_update:
                    mask_str = seat.availability_mask or ('0' * num_segments_total)
                    if len(mask_str) != num_segments_total: mask_str = '0' * num_segments_total
                    
                    current_mask_int = int(mask_str, 2)
                    # Bitwise AND with the NOT mask zeroes out the booked segments
                    new_mask_int = current_mask_int & free_mask_int
                    seat.availability_mask = f"{new_mask_int:0{num_segments_total}b}"
                    seat.booking_passenger = None # Unlink passenger

                TrainSeat.objects.bulk_update(seats_to_update, ['availability_mask', 'booking_passenger'])
                
                # 5. Lock and update segments
                segments = service.segments.select_for_update().filter(segment_index__in=segment_indices_to_free)
                segments.update(**{field_name: F(field_name) + num_passengers})
                # --- END FIXED LOGIC ---


        except Exception as e:
            BookingStatus.objects.create(
                booking=booking, status="Cancelled",
                remarks=f"Error releasing seats: {str(e)}"
            )

        # Return the serializer response
        return Response(serializer.to_representation((booking, refund)), status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="ticket")
    def ticket(self, request, pk=None):
        """
            Retrieve the digital ticket for a confirmed booking.
        """
        booking = self.get_object()
        try:
            ticket = booking.ticket
        except Ticket.DoesNotExist:
            return Response({"detail": "Ticket not found for this booking. It may not be issued yet."}, status=status.HTTP_404_NOT_FOUND)
            
        return Response(TicketSerializer(ticket).data)
# # ---------- Helper ----------
def _parse_date(date_str):
    """Parse date string safely."""
    try:
        return parse_date(date_str)
    except Exception:
        return None


# ---------- Swagger parameters ----------
source_param = openapi.Parameter(
    "source", openapi.IN_QUERY, description="Source station name or code", type=openapi.TYPE_STRING, required=True
)
dest_param = openapi.Parameter(
    "destination", openapi.IN_QUERY, description="Destination station name or code", type=openapi.TYPE_STRING, required=True
)
date_param = openapi.Parameter(
    "date", openapi.IN_QUERY, description="Optional journey date (YYYY-MM-DD)", type=openapi.TYPE_STRING
)
class_param = openapi.Parameter(
    "class_type",
    openapi.IN_QUERY,
    description="Class type (Sleeper / SecondAC / ThirdAC)",
    type=openapi.TYPE_STRING,
)


# ---------- Search API ----------
@swagger_auto_schema(
    method="get",
    operation_summary="Search Train Services (bookings/search/trains/)",
    operation_description=(
        "Search available trains between two stations. "
        "Supports intermediate stops and class-based pricing."
    ),
    manual_parameters=[source_param, dest_param, date_param, class_param],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def search_trains(request):
    from django.db.models import Min, Q
    from rest_framework import status
    from rest_framework.response import Response

    source_query = request.query_params.get("source")
    dest_query = request.query_params.get("destination")
    date_str = request.query_params.get("date")
    class_type = request.query_params.get("class_type", "Sleeper").strip()

    # --- 1. Validate Inputs ---
    if not source_query or not dest_query:
        return Response(
            {"detail": "Both 'source' and 'destination' are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Early validate class_type
    valid_classes = {"Sleeper", "SecondAC", "ThirdAC"}
    if class_type not in valid_classes:
        return Response(
            {"detail": f"Invalid class_type '{class_type}'. Must be one of {', '.join(valid_classes)}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Date validation helper
    date_filter = _parse_date(date_str)
    if date_str and not date_filter:
        return Response(
            {"detail": "Invalid date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --- 2. Resolve Station Objects ---
    source_stations = list(Station.objects.filter(
        Q(name__icontains=source_query) | Q(code__iexact=source_query)
    ))
    dest_stations = list(Station.objects.filter(
        Q(name__icontains=dest_query) | Q(code__iexact=dest_query)
    ))

    if not source_stations or not dest_stations:
        return Response(
            {"detail": "Invalid source or destination station."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # For JSON response (returning IDs)
    from_station_id = source_stations[0].station_id
    to_station_id = dest_stations[0].station_id

    # --- 3. Candidate Train Services ---
    query_filters = (
        Q(route__source__in=source_stations) |
        Q(route__stops__station__in=source_stations)
    )
    if date_filter:
        query_filters &= Q(departure_time__date=date_filter)

    candidate_services = (
        TrainService.objects
        .select_related("route", "route__source", "route__destination", "vehicle")
        .prefetch_related("segments", "segments__from_station", "segments__to_station")
        .filter(query_filters)
        .distinct()
    )

    # --- 4. Validate Routes and Calculate Availability ---
    results = []
    for svc in candidate_services:
        full_stop_list = svc.get_full_stop_list()  # [(order, Station)]
        stop_order_map = {station.station_id: order for order, station in full_stop_list}

        try:
            start_station_id = next(sid for sid in stop_order_map if sid in {s.station_id for s in source_stations})
            end_station_id = next(sid for sid in stop_order_map if sid in {s.station_id for s in dest_stations})
        except StopIteration:
            continue  # Skip trains that don’t contain both stops

        start_order = stop_order_map.get(start_station_id)
        end_order = stop_order_map.get(end_station_id)

        if start_order is None or end_order is None or start_order >= end_order:
            continue

        start_station_obj = next(s for _, s in full_stop_list if s.station_id == start_station_id)
        end_station_obj = next(s for _, s in full_stop_list if s.station_id == end_station_id)

        # --- 5. Check Seat Availability ---
        journey_segment_indices = range(start_order, end_order)
        field_map = {
            "Sleeper": "available_count_sleeper",
            "SecondAC": "available_count_second_ac",
            "ThirdAC": "available_count_third_ac",
        }
        field_name = field_map[class_type]

        min_available = svc.segments.filter(
            segment_index__in=journey_segment_indices
        ).aggregate(min_seats=Min(field_name))["min_seats"] or 0

        # --- 6. Compute Price ---
        price = svc.get_price_for_journey(start_station_obj, end_station_obj, class_type)
        if price is None:
            continue  # skip if pricing not configured
        journey_time ,source_time, dest_time = svc.get_journey_times(
            start_station_obj, end_station_obj)
        # --- 7. Serialize ---
        serializer = TrainSearchResultSerializer(
            svc,
            context={
                "from_station": start_station_obj.station_id,
                "to_station": end_station_obj.station_id,
                "class_type": class_type,
            },
        )

        data = serializer.data
        data.pop("stops", None)
        data.pop("departure_time", None)
        data.pop("arrival_time", None)
        data.update({
            "class_type": class_type,
            "price": float(price or 0.0),
            "available_seats": int(min_available),
            "bookable": min_available > 0 and price is not None,
            "departure_time": source_time,
            "arrival_time": dest_time,
            "journey_time": journey_time,
        })
        results.append(data)

    # --- 8. Return Response ---
    return Response(
        {
            "mode": "train",
            "count": len(results),
            "source_id": str(from_station_id),
            "destination_id": str(to_station_id),
            "results": results,
        },
        status=status.HTTP_200_OK,
    )

@permission_classes([AllowAny])
class BusSeatAvailabilityView(APIView):
    """
    Search available seats in a bus service between any two stops using station codes.
    """

    @swagger_auto_schema(
        operation_summary="Search Bus Seat Availability (by Stop Code or Name)",
        operation_description="Find available bus services between any two stops on a route.",
        manual_parameters=[
            openapi.Parameter(
                'source', openapi.IN_QUERY,
                description="Source stop (station code, name, city, or state)",
                type=openapi.TYPE_STRING, required=True
            ),
            openapi.Parameter(
                'destination', openapi.IN_QUERY,
                description="Destination stop (station code, name, city, or state)",
                type=openapi.TYPE_STRING, required=True
            ),
            openapi.Parameter(
                'date', openapi.IN_QUERY,
                description="Date of travel (YYYY-MM-DD)",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_DATE, required=False
            ),
        ],
        responses={200: BusServiceSeatAvailabilitySerializer(many=True)}
    )
    def get(self, request):
        source = request.query_params.get('source')
        destination = request.query_params.get('destination')
        date = request.query_params.get('date')

        if not source or not destination:
            return Response({"error": "Both source and destination are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # --- Flexible filter function for source/destination matching ---
        def build_station_filter(value: str):
            value = value.strip()
            return (
                Q(station__code__iexact=value)
                | Q(station__name__icontains=value)
                | Q(station__city__icontains=value)
                | Q(station__state__icontains=value)
            )

        source_filter = build_station_filter(source)
        destination_filter = build_station_filter(destination)

        # --- Find all stops matching either query ---
        source_stops = RouteStop.objects.filter(source_filter).select_related('station', 'route')
        destination_stops = RouteStop.objects.filter(destination_filter).select_related('station', 'route')
        source_id = set(source_stops.values_list('station_id', flat=True))
        destination_id = set(destination_stops.values_list('station_id', flat=True))
        if not source_stops.exists() or not destination_stops.exists():
            return Response({"error": "No matching stops found."}, status=404)

        # --- Match source/destination within same route ---
        valid_routes = set()
        for s_stop in source_stops:
            for d_stop in destination_stops:
                if s_stop.route_id == d_stop.route_id and s_stop.stop_order < d_stop.stop_order:
                    valid_routes.add(s_stop.route_id)

        final_source_id = set()
        final_destination_id = set()
        for route in valid_routes:
            for id in source_id:
                for id2 in destination_id:
                    if RouteStop.objects.filter(route_id=route, station_id=id).exists() and RouteStop.objects.filter(route_id=route, station_id=id2).exists():
                        print(id,id2)
                        final_source_id.add(id)
                        final_destination_id.add(id2)

        if not valid_routes:
            return Response({"error": "No valid route found connecting these stops in correct direction."},
                            status=404)

        # --- Filter bus services on valid routes ---
        bus_services = BusService.objects.filter(
            route_id__in=valid_routes,
            status="Scheduled"
        )

        if date:
            bus_services = bus_services.filter(departure_time__date=date)

        # --- Annotate with provider details ---
        provider_query = ServiceProvider.objects.filter(user=OuterRef('provider_user_id'))
        bus_services = bus_services.annotate(
            rating=Subquery(provider_query.values('ratings_dict')[:1], output_field=JSONField()),
            no_of_reviews=Subquery(provider_query.values('total_reviews')[:1], output_field=IntegerField()),
            comments=Subquery(provider_query.values('comments')[:1], output_field=JSONField())
        )

        # --- Serialize ---
        serializer = BusServiceSeatAvailabilitySerializer(bus_services, many=True, context={'request': request})

        # Optional: remove seat data for lightweight response
        data = serializer.data
        for service in data:
            service.pop('available_seats', None)

        return Response({"source_id": final_source_id , "destination_id": final_destination_id , "data":data}, status=status.HTTP_200_OK)

    
     
class FlightSeatAvailabilityView(APIView):
    """
    Search available flight seats between two airports.
    """

    @swagger_auto_schema(
        operation_summary="Search Flight Seat Availability",
        operation_description="Search for available flights and seat availability between two airports.",
        manual_parameters=[
            openapi.Parameter('source', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
                              description="Source airport code (e.g., BLR)"),
            openapi.Parameter('destination', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
                              description="Destination airport code (e.g., DEL)"),
            openapi.Parameter('date', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False,
                              description="Optional flight departure date (YYYY-MM-DD)")
        ],
        responses={200: FlightServiceSeatAvailabilitySerializer(many=True)}
    )
    def get(self, request):
        source = request.query_params.get('source')
        destination = request.query_params.get('destination')
        date = request.query_params.get('date')

        if not source or not destination:
            return Response(
                {"error": "Both 'source' and 'destination' parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Find all routes containing both airports
        print(source,destination)
        source_routes = RouteStop.objects.filter(station__code=source).values_list('route_id', flat=True)
        destination_routes = RouteStop.objects.filter(station__code=destination).values_list('route_id', flat=True)
        valid_routes = Route.objects.filter(
                source__code=source,
                destination__code=destination
            ).values_list('route_id', flat=True)

        if not valid_routes:
            return Response({"error": "No route contains both airports."}, status=status.HTTP_404_NOT_FOUND)

        # ✅ Filter scheduled flight services for those routes
        flights = FlightService.objects.filter(route_id__in=valid_routes, status="Scheduled")

        if date:
            flights = flights.filter(departure_time__date=date)

        serializer = FlightServiceSeatAvailabilitySerializer(flights, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class BookingListViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only endpoint to list only Confirmed bookings
    belonging to the logged-in provider.
    """
    serializer_class = BookingListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Booking.objects.none()
        if user.user_type == 'admin':
            return Booking.objects.order_by('-booking_date')[:10]
        # ✅ Only confirmed bookings for this provider
        # status_param = self.request.query_params.get('status', 'Confirmed')
        # use /api/bookings/list/?status=Pending  → only Pending
        return (
            Booking.objects.filter(provider=user)
            .select_related('source_id', 'destination_id')
            .prefetch_related('passengers')
            .order_by('-booking_date')
        )

    @action(detail=False, methods=['get'], url_path='list')
    def list_bookings(self, request):
        """
        GET /api/bookings/list/
        Returns only confirmed bookings for the provider.
        """
        bookings = self.get_queryset()
        serializer = self.get_serializer(bookings, many=True)
        return Response(serializer.data)
from .serializers import CheapestFareSerializer

class CheapestFaresFromView(APIView):
    """
    Get cheapest fares from one source city to a list of destinations.
    """

    permission_classes = [AllowAny]  # ✅ Allow unauthenticated access

    @swagger_auto_schema(
        operation_summary="Get Cheapest Fares From a City to Given Destinations",
        operation_description=(
            "Returns the cheapest available fares from a single source airport/city "
            "to a list of given destination airport codes."
        ),
        manual_parameters=[
            openapi.Parameter(
                'source', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
                description="Source airport/city code (e.g., DEL)"
            ),
            openapi.Parameter(
                'destinations', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True,
                description="Comma-separated destination airport/city codes (e.g., BOM,BLR,HYD)"
            ),
            openapi.Parameter(
                'service_type', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=False,
                description="Type of service to filter (e.g., 'Flight', 'Bus' , 'Train'). Currently only 'Flight' is supported."
            ),
        ],
        responses={200: CheapestFareSerializer(many=True)}
    )
    def get(self, request):
        source_code = request.query_params.get('source')
        destination_param = request.query_params.get('destinations')
        service_type = request.query_params.get('service_type', 'Flight')

        if not source_code or not destination_param:
            return Response(
                {"error": "Parameters 'source' and 'destinations' are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        source_code = source_code.strip().upper()
        destination_codes = [code.strip().upper() for code in destination_param.split(',') if code.strip()]

        if not destination_codes:
            return Response(
                {"error": "No valid destination codes provided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ✅ Find all routes matching source and any of the given destinations
        source_filter = (
            Q(source__code__iexact=source_code) |
            Q(source__city__icontains=source_code) |
            Q(source__name__icontains=source_code)
        )

        destination_filter = (
            Q(destination__code__in=destination_codes) |
            Q(destination__city__in=destination_codes) |
            Q(destination__name__in=destination_codes)
        )

        routes = Route.objects.filter(
            source_filter & destination_filter
        )

        # if not routes.exists():
        #     return Response(
        #         {"error": f"No routes found from {source_code} to given destinations."},
        #         status=status.HTTP_404_NOT_FOUND
        #     )

        # ✅ Aggregate the cheapest fares per destination
        if service_type == 'Flight':
            cheapest_fares = (
                FlightService.objects.filter(route__in=routes, status="Scheduled")
                .values(
                    "route__destination__code",
                    "departure_time__date"
                )
                .annotate(min_price=Min("economy_price"))
                .order_by("min_price")
            )
        elif service_type == 'Bus':
            cheapest_fares = (
                BusService.objects.filter(route__in=routes, status="Scheduled")
                .values(
                    "route__destination__code",
                    "departure_time__date"
                )
                .annotate(min_price=Min("non_sleeper_price"))
                .order_by("min_price")
            )
        elif service_type == 'Train':
            cheapest_fares = (
                TrainService.objects.filter(route__in=routes, status="Scheduled")
                .values(
                    "route__destination__code",
                    "departure_time__date"
                )
                .annotate(min_price=Min("sleeper_price"))
                .order_by("min_price")
            )
        serializer = CheapestFareSerializer(cheapest_fares, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
