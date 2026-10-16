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


class ProductAndOrderAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.products_url = reverse('product-list-create')
        self.orders_url = reverse('order-list-create')

        # Create Store Owner
        self.store_owner = User.objects.create_user(
            username='storeowner',
            email='owner@trywise.com',
            password='Password123!',
            role='store_owner'
        )

        # Create Customer
        self.customer = User.objects.create_user(
            username='customer1',
            email='customer@trywise.com',
            password='Password123!',
            role='customer'
        )

    def test_store_owner_can_create_product(self):
        self.client.force_authenticate(user=self.store_owner)
        payload = {
            'name': 'Linen Summer Shirt',
            'category': 'Men',
            'price': 1499.00,
            'size_s': 5,
            'size_m': 10,
            'size_l': 8,
            'size_xl': 2,
        }
        response = self.client.post(self.products_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Linen Summer Shirt')
        self.assertEqual(response.data['size_m'], 10)
        self.assertEqual(response.data['total_stock'], 25)

    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(user=self.customer)
        payload = {
            'name': 'Hacker Dress',
            'category': 'Women',
            'price': 999.00,
            'size_s': 1,
        }
        response = self.client.post(self.products_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_order_decrements_stock_atomically(self):
        # 1. Store Owner creates product
        self.client.force_authenticate(user=self.store_owner)
        prod_res = self.client.post(self.products_url, {
            'name': 'Silk Evening Gown',
            'category': 'Women',
            'price': 2500.00,
            'size_s': 4,
            'size_m': 6,
            'size_l': 0,
            'size_xl': 0,
        }, format='json')
        prod_id = prod_res.data['id']

        # 2. Customer orders 2 of size M
        self.client.force_authenticate(user=self.customer)
        order_payload = {
            'items': [
                {'product_id': prod_id, 'size': 'M', 'quantity': 2}
            ]
        }
        order_res = self.client.post(self.orders_url, order_payload, format='json')
        self.assertEqual(order_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(float(order_res.data['order']['total_price']), 5000.00)

        # 3. Check that size_m decreased from 6 to 4
        detail_url = reverse('product-detail', kwargs={'pk': prod_id})
        detail_res = self.client.get(detail_url)
        self.assertEqual(detail_res.data['size_m'], 4)

    def test_order_fails_when_exceeding_stock(self):
        # Create product with 1 in size S
        self.client.force_authenticate(user=self.store_owner)
        prod_res = self.client.post(self.products_url, {
            'name': 'Limited Edition Jacket',
            'category': 'Men',
            'price': 3000.00,
            'size_s': 1,
            'size_m': 0,
            'size_l': 0,
            'size_xl': 0,
        }, format='json')
        prod_id = prod_res.data['id']

        # Customer tries to order 2 of size S
        self.client.force_authenticate(user=self.customer)
        order_res = self.client.post(self.orders_url, {
            'items': [{'product_id': prod_id, 'size': 'S', 'quantity': 2}]
        }, format='json')
        self.assertEqual(order_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('only has 1 item', order_res.data['detail'])

