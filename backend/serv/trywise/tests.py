from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core import mail
from trywise.models import Product, Order, OrderItem, OrderItemStatus, OrderStatus, EmailOTP, OTPPurpose, UserRole

User = get_user_model()


class AuthAndOTPAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.verify_reg_otp_url = reverse('verify-registration-otp')
        self.login_url = reverse('login')
        self.verify_login_otp_url = reverse('verify-login-otp')
        self.forgot_pwd_url = reverse('forgot-password')
        self.reset_pwd_url = reverse('reset-password')

    def test_customer_register_requires_otp_and_activates(self):
        # 1. Initiate registration
        reg_payload = {
            'full_name': 'Alice Smith',
            'email': 'alice@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'role': 'customer'
        }
        res = self.client.post(self.register_url, reg_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get('verification_required'))
        temp_token = res.data['temp_token']

        # User is created but inactive
        user = User.objects.get(email='alice@example.com')
        self.assertFalse(user.is_active)

        # OTP was created and emailed
        otp_record = EmailOTP.objects.get(user=user, purpose=OTPPurpose.EMAIL_VERIFICATION, is_used=False)
        self.assertEqual(len(otp_record.code), 6)
        self.assertTrue(len(mail.outbox) > 0)

        # 2. Verify with wrong OTP
        wrong_res = self.client.post(self.verify_reg_otp_url, {
            'temp_token': temp_token,
            'otp': '000000'
        }, format='json')
        self.assertEqual(wrong_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Verify with correct OTP
        valid_res = self.client.post(self.verify_reg_otp_url, {
            'temp_token': temp_token,
            'otp': otp_record.code
        }, format='json')
        self.assertEqual(valid_res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', valid_res.data)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

    def test_store_owner_login_requires_2fa_otp(self):
        # Create active store owner
        owner = User.objects.create_user(
            username='storeowner1',
            email='owner@trywise.com',
            password='Password123!',
            role=UserRole.STORE_OWNER,
            is_active=True
        )

        # 1. Login attempt
        res = self.client.post(self.login_url, {
            'email_or_username': 'owner@trywise.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('otp_required'))
        temp_token = res.data['temp_token']

        # 2. Check OTP generated
        otp_record = EmailOTP.objects.get(user=owner, purpose=OTPPurpose.STORE_LOGIN, is_used=False)

        # 3. Verify OTP
        otp_res = self.client.post(self.verify_login_otp_url, {
            'temp_token': temp_token,
            'otp': otp_record.code
        }, format='json')
        self.assertEqual(otp_res.status_code, status.HTTP_200_OK)
        self.assertIn('tokens', otp_res.data)
        self.assertEqual(otp_res.data['user']['email'], 'owner@trywise.com')

    def test_customer_login_no_otp_required(self):
        User.objects.create_user(
            username='cust1',
            email='cust@trywise.com',
            password='Password123!',
            role=UserRole.CUSTOMER,
            is_active=True
        )

        res = self.client.post(self.login_url, {
            'email_or_username': 'cust@trywise.com',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.data.get('otp_required', False))
        self.assertIn('tokens', res.data)

    def test_forgot_and_reset_password_flow(self):
        user = User.objects.create_user(
            username='resetuser',
            email='reset@example.com',
            password='OldPassword123!',
            role=UserRole.CUSTOMER,
            is_active=True
        )

        # 1. Request reset
        req_res = self.client.post(self.forgot_pwd_url, {'email': 'reset@example.com'}, format='json')
        self.assertEqual(req_res.status_code, status.HTTP_200_OK)

        otp_record = EmailOTP.objects.get(user=user, purpose=OTPPurpose.PASSWORD_RESET, is_used=False)

        # 2. Submit new password with OTP
        reset_res = self.client.post(self.reset_pwd_url, {
            'email': 'reset@example.com',
            'otp': otp_record.code,
            'new_password': 'NewPassword123!',
            'confirm_password': 'NewPassword123!'
        }, format='json')
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)

        # 3. Verify login with new password
        login_res = self.client.post(self.login_url, {
            'email_or_username': 'reset@example.com',
            'password': 'NewPassword123!'
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)


class ProductOrderAndRevenueAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.products_url = reverse('product-list-create')
        self.orders_url = reverse('order-list-create')
        self.revenue_url = reverse('store-revenue')

        self.store_owner = User.objects.create_user(
            username='owner_biz',
            email='owner@store.com',
            password='Password123!',
            role=UserRole.STORE_OWNER,
            is_active=True
        )

        self.customer = User.objects.create_user(
            username='customer_jane',
            email='jane@customer.com',
            password='Password123!',
            role=UserRole.CUSTOMER,
            is_active=True
        )

    def test_product_update_propagates_price_to_active_orders(self):
        # 1. Create product at price 2000
        self.client.force_authenticate(user=self.store_owner)
        prod_res = self.client.post(self.products_url, {
            'name': 'Cashmere Sweater',
            'category': 'Women',
            'price': 2000.00,
            'size_s': 10,
            'size_m': 10,
            'size_l': 10,
            'size_xl': 10,
        }, format='json')
        prod_id = prod_res.data['id']

        # 2. Customer places order for 2 of Size M (Total = 4000)
        self.client.force_authenticate(user=self.customer)
        ord_res = self.client.post(self.orders_url, {
            'items': [{'product_id': prod_id, 'size': 'M', 'quantity': 2}]
        }, format='json')
        order_id = ord_res.data['order']['id']
        self.assertEqual(float(ord_res.data['order']['total_price']), 4000.00)

        # 3. Store owner runs a flash sale, updating price to 1500 with original_price 2000
        self.client.force_authenticate(user=self.store_owner)
        patch_res = self.client.patch(reverse('product-detail', kwargs={'pk': prod_id}), {
            'name': 'Cashmere Sweater Sale Edition',
            'price': 1500.00,
            'original_price': 2000.00,
        }, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertTrue(patch_res.data['is_on_sale'])
        self.assertEqual(patch_res.data['discount_percent'], 25)

        # 4. Check that the active pending order automatically updated to 3000!
        order = Order.objects.get(id=order_id)
        self.assertEqual(float(order.total_price), 3000.00)
        item = order.items.first()
        self.assertEqual(float(item.price), 1500.00)

    def test_partial_purchase_and_restocking(self):
        # Product 1: Initial stock 5
        self.client.force_authenticate(user=self.store_owner)
        p1 = Product.objects.create(name='P1', category='Men', price=1000, size_m=5, created_by=self.store_owner)
        # Product 2: Initial stock 5
        p2 = Product.objects.create(name='P2', category='Men', price=2000, size_l=5, created_by=self.store_owner)

        # Customer bags both (Stock becomes 4 and 4)
        self.client.force_authenticate(user=self.customer)
        ord_res = self.client.post(self.orders_url, {
            'items': [
                {'product_id': p1.id, 'size': 'M', 'quantity': 1},
                {'product_id': p2.id, 'size': 'L', 'quantity': 1},
            ]
        }, format='json')
        order_id = ord_res.data['order']['id']
        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.size_m, 4)
        self.assertEqual(p2.size_l, 4)

        order = Order.objects.get(id=order_id)
        item1 = order.items.get(product=p1)
        item2 = order.items.get(product=p2)

        # Store owner completes trial: customer purchases item 1 (P1), returns/restocks item 2 (P2)
        self.client.force_authenticate(user=self.store_owner)
        comp_res = self.client.patch(reverse('order-detail', kwargs={'pk': order_id}), {
            'status': OrderStatus.COMPLETED,
            'item_actions': [
                {'item_id': item1.id, 'action': 'purchased'},
                {'item_id': item2.id, 'action': 'restocked'},
            ]
        }, format='json')
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)

        # Verify restocked inventory: P1 stays 4, P2 goes back to 5!
        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.size_m, 4)
        self.assertEqual(p2.size_l, 5)

        # Verify final price is 1000 (only purchased item 1)
        order.refresh_from_db()
        self.assertEqual(float(order.final_price), 1000.00)

    def test_order_cancelled_restocks_all_items(self):
        self.client.force_authenticate(user=self.store_owner)
        p = Product.objects.create(name='T-Shirt', category='Men', price=500, size_s=10, created_by=self.store_owner)

        # Order 3 items (stock becomes 7)
        self.client.force_authenticate(user=self.customer)
        ord_res = self.client.post(self.orders_url, {
            'items': [{'product_id': p.id, 'size': 'S', 'quantity': 3}]
        }, format='json')
        order_id = ord_res.data['order']['id']
        p.refresh_from_db()
        self.assertEqual(p.size_s, 7)

        # Store owner cancels order
        self.client.force_authenticate(user=self.store_owner)
        cancel_res = self.client.patch(reverse('order-detail', kwargs={'pk': order_id}), {
            'status': OrderStatus.CANCELLED
        }, format='json')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        # Stock is fully restored to 10!
        p.refresh_from_db()
        self.assertEqual(p.size_s, 10)

    def test_store_revenue_endpoint(self):
        # Create a completed order
        order = Order.objects.create(
            customer=self.customer,
            total_price=3000.00,
            final_price=2500.00,
            status=OrderStatus.COMPLETED
        )
        OrderItem.objects.create(
            order=order,
            product=None,
            product_name='Blazer',
            size='M',
            quantity=1,
            price=2500.00,
            status=OrderItemStatus.PURCHASED
        )

        self.client.force_authenticate(user=self.store_owner)
        res = self.client.get(self.revenue_url, {'period': 'all'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total_revenue'], 2500.00)
        self.assertEqual(res.data['completed_orders_count'], 1)
        self.assertEqual(res.data['items_sold_count'], 1)

    def test_single_store_owner_registration_prevented(self):
        # A store owner already exists in setUp (self.store_owner)
        payload = {
            'full_name': 'Second Owner',
            'email': 'second_owner@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!',
            'role': 'store_owner'
        }
        res = self.client.post(reverse('register'), payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role', res.data)
        self.assertIn('single authorized store owner', str(res.data['role']))

    def test_status_change_to_ready_sets_deadline_and_emails_customer(self):
        self.client.force_authenticate(user=self.customer)
        p = Product.objects.create(name='Polo', category='Men', price=999, size_m=5, created_by=self.store_owner)
        ord_res = self.client.post(self.orders_url, {
            'items': [{'product_id': p.id, 'size': 'M', 'quantity': 1}]
        }, format='json')
        order_id = ord_res.data['order']['id']

        # Store owner marks order as Ready for Pickup
        mail.outbox = []
        self.client.force_authenticate(user=self.store_owner)
        res = self.client.patch(reverse('order-detail', kwargs={'pk': order_id}), {
            'status': OrderStatus.READY
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(res.data['ready_at'])
        self.assertIsNotNone(res.data['expires_at'])

        # Customer received the trial ready notification email
        self.assertTrue(len(mail.outbox) > 0)
        customer_email = mail.outbox[-1]
        self.assertIn(self.customer.email, customer_email.to)
        self.assertIn('Ready to Try On', customer_email.subject)

    def test_overdue_trial_order_auto_expired_and_restocked(self):
        from django.utils import timezone
        from datetime import timedelta
        from trywise.views import expire_overdue_orders

        # Create order already in Ready status but expired 1 hour ago
        p = Product.objects.create(name='Jacket', category='Men', price=3999, size_l=2, created_by=self.store_owner)
        order = Order.objects.create(
            customer=self.customer,
            total_price=3999.00,
            status=OrderStatus.READY,
            ready_at=timezone.now() - timedelta(hours=25),
            expires_at=timezone.now() - timedelta(hours=1)
        )
        OrderItem.objects.create(
            order=order,
            product=p,
            product_name=p.name,
            size='L',
            quantity=1,
            price=3999.00,
            status=OrderItemStatus.RESERVED,
            is_restocked=False
        )

        mail.outbox = []
        # Run auto expiration
        expire_overdue_orders()

        order.refresh_from_db()
        p.refresh_from_db()

        # Order is cancelled, price is 0, item is restocked back to product!
        self.assertEqual(order.status, OrderStatus.CANCELLED)
        self.assertEqual(order.final_price, 0.00)
        self.assertEqual(p.size_l, 3)

        # Customer received cancellation notification email
        self.assertTrue(len(mail.outbox) > 0)
        cancellation_email = mail.outbox[-1]
        self.assertIn('Expired', cancellation_email.subject)

    def test_store_revenue_view_periods_including_this_month_and_custom(self):
        from django.utils import timezone
        revenue_url = reverse('store-revenue')

        # Create a completed order with 1 sold and 1 restocked item
        p1 = Product.objects.create(name='Shirt', category='Men', price=1000, size_m=5, created_by=self.store_owner)
        order = Order.objects.create(
            customer=self.customer,
            total_price=2000.00,
            final_price=1000.00,
            status=OrderStatus.COMPLETED
        )
        OrderItem.objects.create(
            order=order, product=p1, size='M', quantity=1, price=1000, status=OrderItemStatus.PURCHASED, is_restocked=False
        )
        OrderItem.objects.create(
            order=order, product=p1, size='M', quantity=1, price=1000, status=OrderItemStatus.RESTOCKED, is_restocked=True
        )

        self.client.force_authenticate(user=self.store_owner)

        # Test 'this_month'
        res_month = self.client.get(revenue_url, {'period': 'this_month'})
        self.assertEqual(res_month.status_code, status.HTTP_200_OK)
        self.assertEqual(res_month.data['completed_orders_count'], 1)
        self.assertEqual(res_month.data['items_sold_count'], 1)
        self.assertEqual(res_month.data['items_restocked_count'], 1)

        # Test 'custom'
        now = timezone.now()
        res_custom = self.client.get(revenue_url, {'period': 'custom', 'year': now.year, 'month': now.month})
        self.assertEqual(res_custom.status_code, status.HTTP_200_OK)
        self.assertEqual(res_custom.data['completed_orders_count'], 1)
        self.assertEqual(res_custom.data['items_sold_count'], 1)
        self.assertEqual(res_custom.data['items_restocked_count'], 1)


