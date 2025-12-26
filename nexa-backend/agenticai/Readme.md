## AgentQuery API

This API endpoint allows authenticated users to submit natural language queries to an AI agent, which returns booking options by executing a plan.

### Endpoint

`POST /agenticai/query`

### Request

- **Authentication:** Required (Token)
- **Body:**  
    ```json
    {
        "query": "Book a Flight from Bangalore to Delhi on 10th November 2025"
    }
    ```

### Response

- **Success (200):**
    ```json
    {
        "results": {
            {
  "results": {
    "step_1_flights_Delhi_to_Bangalore": {
      "mode": "flight",
      "count": 1,
      "results": [
        {
          "service_id": "2cb026ef-9728-4eb9-b647-c7c0fa4c0474",
          "provider_user_id": "8276c113-302f-4a88-aa94-7e41995aa3e0",
          "route": {
            "route_id": "2d1bd7da-64c4-4837-830b-b3e33f968c1d",
            "source": "Delhi",
            "destination": "Bangalore",
            "distance_km": 1750,
            "estimated_duration": "02:30:00",
            "via_points": []
          },
          "vehicle": {
            "vehicle_id": "a5f89451-6a19-4c73-9def-0a73d653d76f",
            "registration_no": "VT-AIX",
            "model": "Airbus A320",
            "capacity": 180,
            "amenities": [
              "In-flight entertainment",
              "WiFi",
              "Meals"
            ],
            "status": "Active"
          },
          "policy": {
            "policy_id": "d9539e8f-6d8d-4edb-a682-df844f99317a",
            "cancellation_window": 24,
            "cancellation_fee": "2500.00",
            "reschedule_allowed": true,
            "reschedule_fee": "1000.00",
            "no_show_penalty": "3500.00",
            "terms_conditions": "Standard airline cancellation and rescheduling policies apply."
          },
          "flight_number": "AI-302",
          "airline_name": "Air India",
          "aircraft_model": "Airbus A320",
          "num_rows_business": 3,
          "num_columns_business": 4,
          "num_rows_premium": 6,
          "num_columns_premium": 6,
          "num_rows_economy": 15,
          "num_columns_economy": 6,
          "base_price": "3500.00",
          "business_price": "11375.00",
          "premium_price": "7525.00",
          "economy_price": "4550.00",
          "dynamic_pricing_enabled": true,
          "dynamic_factor": 1.5,
          "departure_time": "2025-11-08T01:00:00-06:00",
          "arrival_time": "2025-11-08T03:30:00-06:00",
          "status": "Scheduled",
          "total_capacity": 138,
          "booked_seats": 0,
        }]
        ...
    }
    }
   }
   } 
    }
    ```
- **Error (400):**
    ```json
    {
        "error": "Description of the error"
    }
    ```
- **Error (500):**
    ```json
    {
        "error": "An unexpected server error occurred."
    }
    ```

### Description

- Accepts a natural language query and returns booking options.
- Handles validation and error responses.
- Requires authentication.

### Example Usage

You can use the Swagger UI for checking the Calls