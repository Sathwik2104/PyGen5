from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.profile_url = reverse('user-profile')

    def test_register_customer_success(self):
        payload = {
            'full_name': 'Alice Smith',
            'email': 'alice@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'role': 'customer'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('tokens', response.data)
        self.assertEqual(response.data['user']['email'], 'alice@example.com')
        self.assertEqual(response.data['user']['role'], 'customer')

    def test_register_store_owner_success(self):
        payload = {
            'full_name': 'Bob Store',
            'email': 'bob@store.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'role': 'store_owner'
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'store_owner')

    def test_login_success(self):
        # Register user first
        User.objects.create_user(
            username='alice@example.com',
            email='alice@example.com',
            password='Password123!',
            role='customer'
        )

        payload = {
            'email_or_username': 'alice@example.com',
            'password': 'Password123!'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', response.data)

    def test_login_invalid_credentials(self):
        payload = {
            'email_or_username': 'nonexistent@example.com',
            'password': 'WrongPassword'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
