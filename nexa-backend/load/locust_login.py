from locust import HttpUser, task, between
import json

class LoginUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def login(self):
        """Stress test login endpoint."""
        with open("load/login_payload.json") as f:
            data = json.load(f)
        self.client.post(
            "/auth/login/",
            json=data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            name="Login API"
        )
