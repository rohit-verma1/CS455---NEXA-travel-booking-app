# Django Services Management Backend Schema

This document outlines the database schema, API endpoints, and business logic for the multi-modal (Bus, Train, Flight) services management system.

## 1. Core Models (`models.py`)

These are the foundational models shared across different service types.

### `Route`
Stores travel route information from a source to a destination.
- `route_id` (UUID, PK): Unique identifier for the route.
- `source` (CharField): Starting point of the route.
- `destination` (CharField): Ending point of the route.
- `distance_km` (FloatField): The total distance of the route in kilometers.
- `estimated_duration` (DurationField): The expected time to complete the travel.
- `via_points` (JSONField): A list of intermediate stops or locations.

### `Vehicle`
Represents a vehicle used for a service (e.g., a specific bus, train, or airplane).
- `vehicle_id` (UUID, PK): Unique identifier for the vehicle.
- `registration_no` (CharField): The vehicle's registration number.
- `model` (CharField): The model of the vehicle (e.g., "Volvo B9R", "Boeing 737").
- `capacity` (PositiveIntegerField): The total passenger capacity.
- `amenities` (JSONField): A list of amenities available (e.g., "WiFi", "AC").
- `status` (CharField): The current status (`Active` or `Maintenance`).

### `Policy`
Defines the terms and conditions for a service, including cancellation and rescheduling rules.
- `policy_id` (UUID, PK): Unique identifier for the policy.
- `cancellation_window` (PositiveIntegerField): Hours before departure within which cancellation rules apply.
- `cancellation_fee` (DecimalField): The fee charged for cancellation.
- `reschedule_allowed` (BooleanField): Whether rescheduling is permitted.
- `reschedule_fee` (DecimalField): The fee for rescheduling.
- `no_show_penalty` (DecimalField): Penalty if a passenger does not show up.
- `terms_conditions` (TextField): Full text of the terms and conditions.

---

## 2. Service-Specific Models (`models.py`)

These models define the specific details for each type of transportation service.

### Bus Service
#### `BusService`
Represents a single bus journey.
- **Relations**: Links to `Route`, `Vehicle`, `Policy`, and the `User` (provider).
- **Scheduling**: `departure_time`, `arrival_time`, `status` (`Scheduled`, `Active`, `Cancelled`).
- **Seat Layout**:
    - `num_rows_sleeper`, `num_columns_sleeper`
    - `num_rows_non_sleeper`, `num_columns_non_sleeper`
- **Pricing**:
    - `base_price`
    - `sleeper_price`, `non_sleeper_price`
    - `dynamic_pricing_enabled` (BooleanField) and `dynamic_factor` (FloatField).
    - `current_sleeper_price`, `current_non_sleeper_price` (updated by `apply_dynamic_pricing` method).
- **Capacity**: `total_capacity`, `booked_seats`.

#### `BusSeat`
Represents an individual seat in a `BusService`.
- **Relations**: Links to a `BusService`.
- **Details**: `seat_number`, `seat_type` (`Sleeper`, `NonSleeper`).
- **State**: `is_booked` (BooleanField).
- **Pricing**: `price` (DecimalField).

### Train Service
#### `TrainService`
Represents a single train journey.
- **Relations**: Links to `Route`, `Vehicle`, `Policy`, and `User` (provider).
- **Details**: `train_name`, `train_number`, `num_bogies`.
- **Pricing**: `base_price`, `sleeper_price`, `second_ac_price`, `third_ac_price`.
- **Dynamic Pricing**: Logic similar to `BusService`.
- **Capacity**: `total_capacity`, `booked_seats`.

#### `TrainSeat`
Represents an individual seat in a `TrainService`.
- **Relations**: Links to a `TrainService`.
- **Details**: `bogie_number`, `seat_number`, `seat_type` (`Lower`, `Upper`, etc.), `class_type` (`Sleeper`, `SecondAC`, etc.).
- **State**: `is_booked` (BooleanField).
- **Pricing**: `price`.

### Flight Service
#### `FlightService`
Represents a single flight.
- **Relations**: Links to `Route`, `Vehicle`, `Policy`, and `User` (provider).
- **Details**: `flight_number`, `airline_name`, `aircraft_model`.
- **Seat Layout**:
    - `num_rows_business`, `num_columns_business`
    - `num_rows_premium`, `num_columns_premium`
    - `num_rows_economy`, `num_columns_economy`
- **Pricing**: `base_price`, `business_price`, `premium_price`, `economy_price`.
- **Dynamic Pricing**: Logic similar to other services.
- **Capacity**: `total_capacity`, `booked_seats`.

#### `FlightSeat`
Represents an individual seat on a `FlightService`.
- **Relations**: Links to a `FlightService`.
- **Details**: `seat_number`, `seat_class` (`Business`, `PremiumEconomy`, `Economy`).
- **State**: `is_booked`.
- **Pricing**: `price`.

---

## 3. API Endpoints (`urls.py` & `views.py`)

The system exposes RESTful APIs for managing these services using `DefaultRouter`.

### Base URLs
- `/api/bus-services/`
- `/api/train-services/`
- `/api/flight-services/`

### Standard CRUD Operations
Each base URL supports the following standard `ModelViewSet` actions:
- `GET /`: List all services of that type.
- `POST /`: Create a new service.
- `GET /{id}/`: Retrieve a specific service by its UUID.
- `PUT /{id}/`: Update a specific service.
- `PATCH /{id}/`: Partially update a specific service.
- `DELETE /{id}/`: Delete a service.

### Custom Actions
- `GET /{service_id}/seats/`:
  - **Description**: Retrieves the complete seat map for a specific service.
  - **Example**: `GET /api/bus-services/a1b2c3d4/seats/`
- `GET /provider/`:
  - **Description**: Retrieves all services created by the currently authenticated provider.
  - **Example**: `GET /api/train-services/provider/` (Requires authentication).

---

## 4. Data Serialization (`serializers.py`)

Serializers control the JSON representation of the models for API input and output.

### Key Features:
- **Nested Creation**: When creating a new service (`BusService`, `TrainService`, etc.), the `Route`, `Vehicle`, and `Policy` data can be provided as nested JSON objects. The `create` method in the service serializer handles the creation of these related objects.
- **Nested Reading**: When a service is retrieved, the `Route`, `Vehicle`, `Policy`, and associated `Seats` are included as nested objects in the JSON response.
- **Read-Only Fields**: Fields like `service_id`, `provider_user_id`, `created_at`, `updated_at`, `total_capacity`, and `booked_seats` are automatically managed by the backend and are not required in `POST` or `PUT` requests.

---

## 5. Business Logic & Automation (`views.py`)

The `ViewSet` classes contain crucial business logic that automates service setup.

### On Service Creation (`perform_create`):
1.  **Provider Association**: The `provider_user_id` is automatically set to the authenticated user making the request.
2.  **Smart Pricing Calculation**: After a service is created, the backend calculates class-specific prices (e.g., `sleeper_price`, `business_price`) based on the `base_price` and the route's `distance_km`.
3.  **Automatic Seat Generation**: The system automatically generates all the `BusSeat`, `TrainSeat`, or `FlightSeat` instances based on the row and column configurations provided. Each seat is created with its calculated price.
4.  **Total Capacity Calculation**: The `total_capacity` field is populated by counting the number of seats generated.

### On Service Retrieval (`retrieve`):
- **Live Dynamic Pricing**: When a single service is fetched, the `apply_dynamic_pricing` model method is called. This calculates the *current* seat prices based on seat occupancy and how close the departure time is, ensuring the API always returns live, up-to-date pricing.

---

## 6. Permissions & Authorization (`permissions.py`)

Access to the API is controlled by a custom permission system.

- **`IsAuthenticated`**: The primary permission class applied to all ViewSets, ensuring that only logged-in users can access the API.
- **User-Type Permissions** (Not yet applied in views but available):
    - `IsAdmin`: Allows access only to users with `user_type = 'admin'`.
    - `IsServiceProvider`: Allows access only to users with `user_type = 'provider'`.
    - `IsCustomer`: Allows access only to users with `user_type = 'customer'`.