from locust import HttpUser, task, between
import json

class BookingUser(HttpUser):
    wait_time = between(1, 3)

    token = "ui1yQSrNjHBEIRNs9Rs27qzg4R7WhnptVdyf9WWh"  # Fixed token

    @task
    def create_booking(self):
        """Simulate creating bookings using the fixed token."""
        with open("load/booking_payload.json") as f:
            data = json.load(f)

        headers = {
            "Authorization": f"Token {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        self.client.post(
            "/bookings/bookings/",
            json=data,
            headers=headers,
            name="Booking API"
        )
