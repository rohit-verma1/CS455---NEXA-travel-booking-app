import uuid
from django.db import models
from django.conf import settings
from datetime import datetime
from django.db.models import F,Min
from decimal import Decimal
from django.utils import timezone
from bookings.models import BookingPassenger
from datetime import timedelta
User = settings.AUTH_USER_MODEL



# ----------------------------
# Station / Route redesign
# ----------------------------
class Station(models.Model):
    """
    Represents a physical station (stop) used by routes and services.
    """
    station_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, blank=True, null=True, help_text="Optional short code")
    city = models.CharField(max_length=100, blank=True, null=True)
    BusStations =  models.JSONField(default= list, null = True, blank =  True)
    state =  models.CharField(max_length =100, blank = True, null =  True, default = "India")
    # --- New field ---
    # Links users who have "saved" or "favorited" this station.
    saved_by = models.ManyToManyField(
        User,
        related_name="saved_stations",  # This is the crucial part
        blank=True,
        help_text="Users who have saved this station as a favorite."
    )
    # -----------------

    def __str__(self):
        if self.code:
            return f"{self.name} ({self.code})"
        return self.name

class RouteStop(models.Model):
    """
    Intermediary model connecting a Route to its intermediate Stations.
    This model stores data specific to that stop *on that route*,
    such as its order, and the price/duration from this stop
    to the route's final destination.
    """
    # Link to the main route
    route = models.ForeignKey(
        'Route', 
        on_delete=models.CASCADE,
        related_name="stops"  # This allows you to do route.stops.all()
    )
    
    # Link to the station for this stop
    station = models.ForeignKey(
        Station, 
        on_delete=models.PROTECT  # Don't delete a station if it's part of a stop
    )
    
    # --- NEW FIELDS FOR YOUR REQUEST ---
    
    # Stores the order of this stop (e.g., 1, 2, 3...)
    stop_order = models.PositiveIntegerField()
    
    # Price from this specific stop to the route's final destination
    price_to_destination = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Estimated duration from this stop to the route's final destination
    duration_to_destination = models.DurationField(
        null=True, 
        blank=True
    )
    # ------------------------------------

    class Meta:
        # Enforce that a route can't have two stops with the same order number
        unique_together = ('route', 'stop_order')
        # Automatically sort the stops by their order when you query them
        ordering = ['stop_order']

    def __str__(self):
        return f"{self.route} - Stop {self.stop_order}: {self.station.name}"

# ---------- ROUTE ----------
class Route(models.Model):
    route_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # --- Updated Fields ---
    # Links directly to the Station model
    source = models.ForeignKey(
        Station, 
        on_delete=models.PROTECT,  # Prevents deleting a station if a route uses it
        related_name="routes_from" # Lets you find all routes from a station
    )
    # Links directly to the Station model
    destination = models.ForeignKey(
        Station,
        on_delete=models.PROTECT,
        related_name="routes_to"   # Lets you find all routes to a station
    )
    # ----------------------

    distance_km = models.FloatField()
    estimated_duration = models.DurationField(null=True, blank=True)
    
    # --- Note on these fields ---
    # These are still JSONFields. A future improvement would be
    # to link these to the Station model as well (e.g., ManyToManyField).
    source_pickup_points = models.JSONField(default=list, blank=True, null=True)
    destination_dropoff_points = models.JSONField(default=list, blank=True, null=True)
    intermediate_stops = models.ManyToManyField(
            Station,
            related_name="stops_on_routes",
            through= RouteStop,
            blank=True
        )
    def update_distnace_randomly(self):
        """A placeholder method to update distance. Replace with real logic."""
        import random
        self.distance_km = random.uniform(50.0, 1000.0)
        self.save()
    def __str__(self):
        # This method now automatically uses the __str__
        # from your Station model (e.g., "Station Name (CODE)")
        return f"{self.source} → {self.destination}"
    
# ---------- VEHICLE ----------
class Vehicle(models.Model):
    vehicle_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    registration_no = models.CharField(max_length=50, unique=False)
    model = models.CharField(max_length=100)
    capacity = models.PositiveIntegerField()
    amenities = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=[('Active', 'Active'), ('Maintenance', 'Maintenance')])
    

    def __str__(self):
        return f"{self.model} ({self.registration_no})"


# ---------- POLICY ----------
class Policy(models.Model):
    policy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cancellation_window = models.PositiveIntegerField(help_text="Hours before departure")
    cancellation_fee = models.DecimalField(max_digits=10, decimal_places=2)
    reschedule_allowed = models.BooleanField(default=True)
    reschedule_fee = models.DecimalField(max_digits=10, decimal_places=2)
    no_show_penalty = models.DecimalField(max_digits=10, decimal_places=2)
    terms_conditions = models.TextField()
    no_cancellation_fee_markup =  models.DecimalField(max_digits=10, decimal_places=2 , blank= True, null= True)
    no_reschedule_fee_markup  = models.DecimalField(max_digits=10, decimal_places=2 , blank= True, null= True)
    def __str__(self):
        return f"Policy {self.policy_id}"

###################################
# ---------- BUS SERVICE ----------
###################################
class BusService(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Active', 'Active'),
        ('Cancelled', 'Cancelled'),
    ]

    SEAT_CLASSES = [
        ('Sleeper', 'Sleeper'),
        ('NonSleeper', 'Non Sleeper'),
    ]

    service_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name="bus_services")
    route = models.ForeignKey(Route, on_delete=models.CASCADE)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE)

    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')
    bus_number  =  models.IntegerField(default=0,blank=True,null=True)
    bus_travels_name =  models.CharField(max_length=100,default="Placeholder", blank=True,null= True)

    # ✳️ Seat Configuration
    num_rows_sleeper = models.PositiveIntegerField(default=0)
    num_columns_sleeper = models.PositiveIntegerField(default=0)
    num_rows_non_sleeper = models.PositiveIntegerField(default=0)
    num_columns_non_sleeper = models.PositiveIntegerField(default=0)

    # 💰 Base pricing
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    sleeper_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    non_sleeper_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    dynamic_pricing_enabled = models.BooleanField(default=False)
    dynamic_factor = models.FloatField(default=1.0)
    current_sleeper_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_non_sleeper_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    total_capacity = models.PositiveIntegerField(default=0)
    booked_seats = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.route.source} → {self.route.destination} ({self.status})"

    # 💡 Smart dynamic pricing
    def apply_dynamic_pricing(self, time_to_departure_hours=24):
        if not self.dynamic_pricing_enabled:
            self.current_sleeper_price = self.sleeper_price
            self.current_non_sleeper_price = self.non_sleeper_price
            return

        occupancy_rate = 0.0
        if self.total_capacity > 0:
            occupancy_rate = self.booked_seats / self.total_capacity

        occupancy_multiplier = 1 + (occupancy_rate * self.dynamic_factor * 0.5)
        time_factor = 1 + max(0, (24 - time_to_departure_hours) / 100)

        self.current_sleeper_price = round(float(self.sleeper_price) * occupancy_multiplier * time_factor, 2)
        self.current_non_sleeper_price = round(float(self.non_sleeper_price) * occupancy_multiplier * time_factor, 2)


# ---------- SEAT ----------
class BusSeat(models.Model):
    seat_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bus_service = models.ForeignKey(BusService, on_delete=models.CASCADE, related_name="seats")
    seat_number = models.CharField(max_length=10)
    seat_type = models.CharField(max_length=20, choices=[('Sleeper', 'Sleeper'), ('NonSleeper', 'NonSleeper')])
    is_booked = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    booking_passenger = models.ForeignKey(BookingPassenger, on_delete=models.SET_NULL, null=True, blank=True, related_name="bus_seat_bookings") 
    def __str__(self):
        return f"{self.bus_service.route.source} → {self.bus_service.route.destination} | {self.seat_number}"

#####################################
# ---------- TRAIN SERVICE ----------
#####################################

class TrainService(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Active', 'Active'),
        ('Cancelled', 'Cancelled'),
    ]

    CLASS_CHOICES = [
        ('Sleeper', 'Sleeper'),
        ('SecondAC', 'Second AC'),
        ('ThirdAC', 'Third AC'),
    ]

    service_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name="train_services")
    route = models.ForeignKey('Route', on_delete=models.CASCADE)
    vehicle = models.ForeignKey('Vehicle', on_delete=models.CASCADE)
    policy = models.ForeignKey('Policy', on_delete=models.CASCADE)

    train_name = models.CharField(max_length=100)
    train_number = models.CharField(max_length=20, unique=False)
    bogies_config = models.JSONField(
        default=dict,
        help_text="JSON object describing bogie configuration. e.g., {'Sleeper': {'count': 10, 'seats_per_bogie': 72}}"
    )

    
    # These prices are for the *full route* (source to destination)
    # and are used to calculate scaling factors.
    base_price = models.DecimalField(max_digits=10, decimal_places=2, 
                                     help_text="Full route base price (e.g., Sleeper)")
    
    # We'll use these for scaling.
    sleeper_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                        help_text="Full route price for Sleeper")
    second_ac_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                          help_text="Full route price for Second AC")
    third_ac_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                         help_text="Full route price for Third AC")

    dynamic_pricing_enabled = models.BooleanField(default=False)
    dynamic_factor = models.FloatField(default=1.0) # e.g., 1.0 = 100% factor

    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')

    total_capacity = models.PositiveIntegerField(default=0)
    # booked_seats = models.PositiveIntegerField(default=0) # As noted, less useful now

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    @property
    def total_bogies(self):
        """Calculates the total number of bogies on the train."""
        if not self.bogies_config:
            return 0
        return sum(details.get('count', 0) for details in self.bogies_config.values())
    
    @property
    def total_seats(self):
        """Calculates the total number of seats on the train."""
        if not self.bogies_config:
            return 0
        total = 0
        for bogie_class, details in self.bogies_config.items():
            count = details.get('count', 0)
            seats = details.get('seats_per_bogie', 0)
            total += count * seats
        return total
    
    def __str__(self):
        return f"{self.train_name} ({self.train_number})"

    # --- 💡 NEW PRICING HELPER METHOD ---
    
    def _get_dynamic_multipliers(self, class_type, segment_indices):
        """
        Calculates dynamic multipliers based on segment occupancy and time.
        """
        if not self.dynamic_pricing_enabled:
            return Decimal('1.0'), Decimal('1.0') # No multipliers

        # 1. Calculate Occupancy Factor
        occupancy_rate = 0.0
        try:
            total_capacity_class = self.train_seats.filter(class_type=class_type).count()
            if total_capacity_class > 0:
                # Find the segments this journey covers
                segments = self.segments.filter(segment_index__in=segment_indices)
                
                # Find the *minimum* available seats (i.e., highest occupancy)
                # in this stretch of the journey.
                min_available = 0
                if class_type == 'Sleeper':
                    min_available = segments.aggregate(min_val=Min('available_count_sleeper'))['min_val']
                elif class_type == 'SecondAC':
                    min_available = segments.aggregate(min_val=Min('available_count_second_ac'))['min_val']
                elif class_type == 'ThirdAC':
                    min_available = segments.aggregate(min_val=Min('available_count_third_ac'))['min_val']

                if min_available is not None:
                    booked = total_capacity_class - min_available
                    occupancy_rate = booked / total_capacity_class
        except Exception:
            pass # Default to 0.0 occupancy rate on error

        occupancy_multiplier = Decimal(1 + (occupancy_rate * self.dynamic_factor * 0.5))

        # 2. Calculate Time Factor
        time_to_departure_hours = (self.departure_time - timezone.now()).total_seconds() / 3600
        time_factor = Decimal(1 + max(0, (24 - time_to_departure_hours) / 100))
        
        return occupancy_multiplier, time_factor

    def get_journey_times(self, from_station, to_station):
        """
        Calculate journey time, source time, and destination time for a route.
        If any duration_to_destination is missing, fall back to arrival/departure times.
        """
        def get_duration(station):
            stop = self.route.stops.filter(station=station).first()
            return stop.duration_to_destination if stop else None

        source_duration = get_duration(from_station)
        dest_duration = get_duration(to_station)
    

        # If any duration is None, use default departure/arrival times
        if source_duration is None or source_duration == timedelta(0):
            source_duration = self.route.estimated_duration
        if dest_duration is None:
            dest_duration = 0

        print(f"Source Duration: {source_duration}, Dest Duration: {dest_duration}, Arrival: {self.arrival_time}, Departure: {self.departure_time}, Estimated: {self.route.estimated_duration}")
        # Compute times based on durations
        base_duration = self.arrival_time - self.departure_time
        source_time = self.departure_time + base_duration - source_duration
        dest_time = self.arrival_time - dest_duration
        journey_time = dest_time - source_time
        return journey_time, source_time, dest_time



    def get_price_for_journey(self, from_station, to_station, class_type):
        """
        Calculates the final, scaled, and dynamically-adjusted price
        for a journey between any two stations on this service's route.
        
        This is the primary function to call when a user searches for a price.
        """
        
        # --- 1. Get Base Sleeper Price for the Journey ---
        
        price_from_start_to_dest = Decimal('0.0')
        price_from_end_to_dest = Decimal('0.0')
        
        full_stops = self.get_full_stop_list() # [(0, StationA), (1, StationB), ...]
        
        # Find the segment indices for occupancy calculation
        start_order = -1
        end_order = -1
        
        # Find `price_from_start_to_dest` (Price from A to Destination)
        if from_station == self.route.source:
            # If starting from the source, price is the full route's sleeper price
            price_from_start_to_dest = self.sleeper_price or self.base_price
            start_order = 0
        else:
            try:
                stop_data = self.route.stops.get(station=from_station)
                price_from_start_to_dest = stop_data.price_to_destination
                start_order = stop_data.stop_order
            except: # RouteStop.DoesNotExist or multiple found (should not happen)
                return None # Invalid from_station

        # Find `price_from_end_to_dest` (Price from B to Destination)
        if to_station == self.route.destination:
            # If ending at the destination, price from here-to-dest is 0
            price_from_end_to_dest = Decimal('0.0')
            # Find the last order index
            end_order = full_stops[-1][0]
        else:
            try:
                stop_data = self.route.stops.get(station=to_station)
                price_from_end_to_dest = stop_data.price_to_destination
                end_order = stop_data.stop_order
            except:
                return None # Invalid to_station

        if start_order == -1 or end_order == -1 or end_order <= start_order:
            return None # Invalid journey (e.g., B to A)
            
        # The base sleeper price for this segment (e.g., Price A->B)
        journey_base_sleeper_price = price_from_start_to_dest - price_from_end_to_dest
        if journey_base_sleeper_price < 0:
            journey_base_sleeper_price = Decimal('0.0') # Safety check

        # --- 2. Scale Price for Class ---
        
        # Use full-route sleeper price as the denominator, default to 1.0 to avoid ZeroDivision
        base_sleeper_full = self.sleeper_price 
        scale_2ac = (self.second_ac_price or base_sleeper_full) / base_sleeper_full
        scale_3ac = (self.third_ac_price or base_sleeper_full) / base_sleeper_full

        journey_base_price = Decimal('0.0')
        if class_type == 'Sleeper':
            journey_base_price = journey_base_sleeper_price
        elif class_type == 'SecondAC':
            journey_base_price = journey_base_sleeper_price * scale_2ac
        elif class_type == 'ThirdAC':
            journey_base_price = journey_base_sleeper_price * scale_3ac
        else:
            raise ValueError(f"Invalid class_type: {class_type}")

        # --- 3. Apply Dynamic Pricing ---
        
        # Get the list of segment indices for this journey (e.g., [0, 1, 2])
        segment_indices = list(range(start_order, end_order))
        
        occ_multiplier, time_multiplier = self._get_dynamic_multipliers(
            class_type, 
            segment_indices
        )

        final_price = journey_base_price * occ_multiplier * time_multiplier

        return round(final_price, 2)

    # --- (Existing get_full_stop_list and create_service_segments methods) ---

    def get_full_stop_list(self):
        """Helper to get an ordered list of all stations for this service's route."""
        # 1. Get the source station
        stops =[]
        
        # 2. Get all intermediate stations, using the order from RouteStop
        intermediate_stops = self.route.stops.order_by('stop_order')
        for stop in intermediate_stops:
            stops.append((stop.stop_order, stop.station))
    
        
        return stops # Returns list of tuples: [(0, Station), (1, Station), (2, Station), ...]
    def update_duration(self): 
        """Updates the estimated_duration field based on departure and arrival times."""
        if self.arrival_time and self.departure_time:
            self.route.estimated_duration = self.arrival_time - self.departure_time
            self.route.save()
    def create_service_segments(self):
        """
        Populates the TrainServiceSegment table for this service.
        This should be called *once* when the service is first created,
        *after* all TrainSeat objects have been created.
        """
        if self.segments.exists():
            return # Already created

        full_stops = self.get_full_stop_list()
        segments_to_create = []

        # Get total seat counts by class
        # MODIFIED: Force a fresh query to the database instead of using the
        # potentially stale related manager cache. This is crucial when seats
        # have just been added via bulk_create in the same operation.
        seats = TrainSeat.objects.filter(train_service=self).all()
        total_sleeper = seats.filter(class_type='sleeper').count()
        total_second_ac = seats.filter(class_type='second_ac').count()
        total_third_ac = seats.filter(class_type='third_ac').count()
        print(f"Creating segments with total seats - Sleeper: {total_sleeper}, 2AC: {total_second_ac}, 3AC: {total_third_ac}")

        for i in range(len(full_stops) - 1):
            from_order, from_station = full_stops[i]
            to_order, to_station = full_stops[i+1]
            
            segments_to_create.append(
                TrainServiceSegment(
                    train_service=self,
                    from_station=from_station,
                    to_station=to_station,
                    segment_index=i, # 0-based index
                    available_count_sleeper=total_sleeper,
                    available_count_second_ac=total_second_ac,
                    available_count_third_ac=total_third_ac
                )
            )
            print(f"Prepared segment {from_station.name} -> {to_station.name} with full availability.")
        
        if segments_to_create:
            TrainServiceSegment.objects.bulk_create(segments_to_create)

# ---------- TRAIN SERVICE SEGMENT (New Model) ----------
# This model tracks the *aggregate* availability for each segment of a service.
# This is your "track of available seats between every two consecutive stations."

class TrainServiceSegment(models.Model):
    """
    Represents one "leg" of a TrainService (e.g., Station A to Station B).
    It stores the *total* number of available seats of each class for this leg.
    """
    segment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    train_service = models.ForeignKey(
        TrainService, 
        on_delete=models.CASCADE, 
        related_name="segments"
    )
    from_station = models.ForeignKey(
        'Station', 
        on_delete=models.CASCADE, 
        related_name="departing_segments"
    )
    to_station = models.ForeignKey(
        'Station', 
        on_delete=models.CASCADE, 
        related_name="arriving_segments"
    )
    
    # 0-based index of the segment (e.g., 0 = Source->Stop1, 1 = Stop1->Stop2)
    segment_index = models.PositiveIntegerField()

    # Aggregate counts
    available_count_sleeper = models.PositiveIntegerField(default=0)
    available_count_second_ac = models.PositiveIntegerField(default=0)
    available_count_third_ac = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('train_service', 'segment_index')
        ordering = ['segment_index']

    def __str__(self):
        return f"{self.train_service.train_number}: {self.from_station.name} -> {self.to_station.name}"


# ---------- TRAIN SEAT (Modified) ----------
# This model is your "lookup for every seat."

class TrainSeat(models.Model):
    SEAT_TYPES = [
        ('Lower', 'Lower'),
        ('Middle', 'Middle'),
        ('Upper', 'Upper'),
        ('SideLower', 'Side Lower'),
        ('SideUpper', 'Side Upper'),
    ]

    seat_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    train_service = models.ForeignKey(TrainService, on_delete=models.CASCADE, related_name="train_seats")
    bogie_number = models.PositiveIntegerField()
    seat_number = models.CharField(max_length=10)
    seat_type = models.CharField(max_length=20, choices=SEAT_TYPES)
    class_type = models.CharField(max_length=20, choices=TrainService.CLASS_CHOICES)
    
    # --- MODIFIED FIELDS ---
    availability_mask = models.CharField(
        max_length=100,  # Max 100 segments per route
        blank=True,
        help_text="A string of '0's (free) and '1's (booked) for each segment."
    )
    # -----------------------

    # ⛔️ The custom save() method that was here has been removed.
    # This is the primary fix for your issue.

    def __str__(self):
        return f"Bogie {self.bogie_number} - {self.seat_number} ({self.class_type})"
    

######################################
# ---------- FLIGHT SERVICE ----------
######################################
class FlightService(models.Model):
    STATUS_CHOICES = [
        ('Scheduled', 'Scheduled'),
        ('Active', 'Active'),
        ('Cancelled', 'Cancelled'),
    ]

    CLASS_CHOICES = [
        ('Business', 'Business'),
        ('PremiumEconomy', 'Premium Economy'),
        ('Economy', 'Economy'),
    ]

    service_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider_user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name="flight_services")
    route = models.ForeignKey('Route', on_delete=models.CASCADE)
    vehicle = models.ForeignKey('Vehicle', on_delete=models.CASCADE)
    policy = models.ForeignKey('Policy', on_delete=models.CASCADE)

    flight_number = models.CharField(max_length=20)
    airline_name = models.CharField(max_length=100)
    aircraft_model = models.CharField(max_length=100, default="Boeing 737")

    # ✈️ Seat configuration per class
    num_rows_business = models.PositiveIntegerField(default=0)
    num_columns_business = models.PositiveIntegerField(default=0)

    num_rows_premium = models.PositiveIntegerField(default=0)
    num_columns_premium = models.PositiveIntegerField(default=0)

    num_rows_economy = models.PositiveIntegerField(default=0)
    num_columns_economy = models.PositiveIntegerField(default=0)

    # 💰 Base pricing for each class
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    business_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    premium_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    economy_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    dynamic_pricing_enabled = models.BooleanField(default=False)
    dynamic_factor = models.FloatField(default=1.0)

    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Scheduled')

    total_capacity = models.PositiveIntegerField(default=0)
    booked_seats = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.airline_name} ({self.flight_number}) {self.route.source} → {self.route.destination}"

    # ✈️ Smart dynamic pricing (in-memory calculation)
    def apply_dynamic_pricing(self, occupancy_rate=0.0, time_to_departure_hours=24):
        if not self.dynamic_pricing_enabled:
            return

        occupancy_multiplier = 1 + (occupancy_rate * self.dynamic_factor * 0.4)
        time_factor = 1 + max(0, (24 - time_to_departure_hours) / 100)

        # Adjust prices on the fly (without saving)
        if self.business_price:
            self.business_price = round(float(self.business_price) * occupancy_multiplier * time_factor, 2)
        if self.premium_price:
            self.premium_price = round(float(self.premium_price) * occupancy_multiplier * time_factor, 2)
        if self.economy_price:
            self.economy_price = round(float(self.economy_price) * occupancy_multiplier * time_factor, 2)


# ---------- FLIGHT SEAT ----------
class FlightSeat(models.Model):
    seat_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flight_service = models.ForeignKey(FlightService, on_delete=models.CASCADE, related_name="flight_seats")
    seat_number = models.CharField(max_length=10)
    seat_class = models.CharField(max_length=20, choices=FlightService.CLASS_CHOICES)
    is_booked = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    booking_passenger = models.ForeignKey(BookingPassenger, on_delete=models.SET_NULL, null=True, blank=True, related_name="flight_seat_bookings")

    def __str__(self):
        return f"{self.flight_service.airline_name} - {self.seat_class} Seat {self.seat_number}"

