# Bookings App

## Overview

The **Bookings App** is a comprehensive Django app for managing travel bookings across multiple modes of transport, including buses, trains, and flights. It provides a complete booking lifecycle from creation and seat locking to cancellation and ticket retrieval. The app is designed to integrate seamlessly with other core apps like `services`, `payments`, and a custom `users` app.

It also features a set of public, unauthenticated search endpoints that allow users to query available services based on route, date, and class type, with an awareness of dynamic pricing.

---

## ✨ Core Features

* **Multi-Modal Booking**: Natively supports `Bus`, `Train`, and `Flight` bookings through a unified model structure.
* **Atomic Booking Creation**: Implements a robust, transaction-atomic booking process that locks service and seat rows to prevent race conditions and ensure data integrity.
* **Dynamic Seat Locking**: Automatically assigns available seats or allows users to request specific seats, locking them upon booking creation.
* **Booking Lifecycle Management**: Provides endpoints for customers to create, list, retrieve, and cancel their bookings.
* **Passenger & Ticket Management**: Stores detailed passenger information for each booking and handles the generation and retrieval of digital tickets.
* **Status Auditing**: Keeps a timestamped log of all status changes for a booking (e.g., `Pending`, `Confirmed`, `Cancelled`).
* **Public Search APIs**: Offers powerful, class-aware search endpoints for buses, trains, and flights.
* **Dynamic Pricing Integration**: The search functionality is built to accommodate and display dynamically calculated prices from the `services` app.

---

## 📦 App Dependencies

### Internal Dependencies
This app is tightly coupled with other apps in the project and will not function standalone. It requires:
* **`services` app**: For `BusService`, `TrainService`, `FlightService` models and their corresponding `Seat` models.
* **`payments` app**: For `Transaction` and `Refund` models to handle payment confirmation and cancellation refunds.
* **Custom User Model**: Relies on `settings.AUTH_USER_MODEL` for linking bookings to customers.

### External Libraries
* `django`
* `djangorestframework`
* `drf-yasg` (for Swagger/OpenAPI schema generation)

---

##  M️odels

The app uses the following models to structure its data:

### `Booking`
The central model that represents a single booking transaction.
* `booking_id` (PK): A unique UUID for the booking.
* `customer`: A `ForeignKey` to the `User` model.
* `mode`: The type of transport (`Bus`, `Train`, `Flight`).
* `service_id`: A generic `UUIDField` that stores the primary key of the related service (e.g., a `BusService` ID).
* `total_amount`: The calculated total cost of the booking.
* `status`: The booking's current status (e.g., `Pending`, `Confirmed`, `Cancelled`).
* `payment_status`: The payment's status (e.g., `Pending`, `Paid`, `Refunded`).
* `get_service()`: A helper method to dynamically fetch the actual service instance (`BusService`, `TrainService`, etc.) based on the `mode`.

### `BookingPassenger`
Stores information for each passenger associated with a `Booking`.
* `passenger_id` (PK): A unique UUID.
* `booking`: A `ForeignKey` linking the passenger to a `Booking`.
* `name`, `age`, `gender`: Personal details.
* `seat_no`: The assigned seat number.

### `Ticket`
Represents the final, issued ticket for a confirmed booking.
* `ticket_id` (PK): A unique UUID.
* `booking`: A `OneToOneField` relationship to the `Booking`.
* `ticket_no`: A unique ticket identifier string.
* `qr_code`: Stores data for a QR code representation of the ticket.

### `BookingStatus`
Acts as an audit log for a booking's lifecycle.
* `status_id` (PK): A unique UUID.
* `booking`: A `ForeignKey` to the `Booking`.
* `status`: The status being logged (e.g., "Awaiting Payment").
* `timestamp`: When the status change occurred.
* `remarks`: Optional notes about the status change.

---

## 🌐 API Endpoints

All endpoints are prefixed with `/api/`.

### Public Search Endpoints

These endpoints are open to all users (`AllowAny`) and are used to find available travel services.

| Method | Endpoint                             | Description                                                                 | Query Parameters                                           |
| :----- | :----------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `GET`  | `/bookings/search/buses/`            | Searches for available bus services.                                        | `source` (req), `destination` (req), `date`, `class_type`  |
| `GET`  | `/bookings/search/trains/`           | Searches for available train services.                                      | `source` (req), `destination` (req), `date`, `class_type`  |
| `GET`  | `/bookings/search/flights/`          | Searches for available flight services.                                     | `source` (req), `destination` (req), `date`, `class_type`  |

### Booking Management Endpoints

These endpoints require authentication (`IsAuthenticated`) and are scoped to the logged-in customer.

| Method | Endpoint                        | Description                                                                                                                                     |
| :----- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/bookings/`                    | **Create a new booking.** Locks seats and creates a `Pending` booking. The response includes the next step for payment confirmation.              |
| `GET`  | `/bookings/`                    | **List bookings** for the authenticated customer.                                                                                                 |
| `GET`  | `/bookings/{booking_id}/`       | **Retrieve a specific booking** by its UUID.                                                                                                    |
| `POST` | `/bookings/{booking_id}/cancel/`| **Cancel a booking.** This releases the seats and, if payment was made, initiates a `Refund` process via the `payments` app.                    |
| `GET`  | `/bookings/{booking_id}/ticket/`| **Retrieve the ticket** for a confirmed booking. Returns a 404 if the ticket has not yet been issued (i.e., booking is not confirmed).            |

#### Create Booking Request Body (`POST /bookings/`)
```json
{
    "mode": "Bus",
    "service_id": "a1b2c3d4-e5f6-...",
    "class_type": "Sleeper", // Optional, used for price calculation and seat filtering
    "passengers": [
        {
            "name": "John Doe",
            "age": 30,
            "gender": "Male",
            "seat_no": "U5" // Optional: request a specific seat
        },
        {
            "name": "Jane Smith",
            "age": 28,
            "gender": "Female" // If seat_no is omitted, it will be auto-assigned
        }
    ]
}