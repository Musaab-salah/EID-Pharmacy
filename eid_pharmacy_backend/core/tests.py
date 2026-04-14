from django.test import TestCase
from django.urls import reverse


class HealthEndpointTests(TestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content.decode().strip(), "ok")


class ApiSmokeTests(TestCase):
    def test_token_obtain_requires_json_body(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {}, content_type="application/json")
        self.assertIn(response.status_code, (400, 401))
