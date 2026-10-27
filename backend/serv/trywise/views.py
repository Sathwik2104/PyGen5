import logging
import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Sum, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import (
    send_new_order_email_to_owners,
    send_order_accepted_email_to_customer,
    send_order_deadline_updated_email_to_customer,
    send_order_expired_email_to_customer,
    send_order_ready_email_to_customer,
    send_password_reset_otp_email,
    send_registration_otp_email,
    send_store_login_otp_email,
    send_welcome_login_email,
)
from .models import (
    EmailOTP,
    Order,
    OrderItem,
    OrderItemStatus,
    OrderStatus,
    OTPPurpose,
    Product,
    UserRole,
    StoreConfiguration,
    TrialDurationUnit,
)
from .serializers import (
    CreateOrderSerializer,
    ForgotPasswordRequestSerializer,
    LoginSerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    StoreConfigurationSerializer,
    UpdateOrderInputSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ==============================================================================
# TOKEN & OTP HELPERS
# ==============================================================================

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


def make_temp_token(user_id):
    """Generates a cryptographically signed temporary token containing user_id."""
    return signing.dumps({'user_id': user_id}, salt='trywise_otp_salt')


def read_temp_token(token, max_age=900):
    """Decodes user_id from temporary signed token (valid for 15 minutes)."""
    try:
        data = signing.loads(token, salt='trywise_otp_salt', max_age=max_age)
        return data.get('user_id')
    except Exception:
        return None


def generate_and_send_otp(user, purpose):
    """
    Generates a 6-digit numeric OTP, stores it with expiry,
    invalidates previous unused OTPs for the same purpose, and emails it.
    """
    code = f"{random.randint(100000, 999999)}"
    expiry_mins = 5 if purpose == OTPPurpose.STORE_LOGIN else 10
    expires_at = timezone.now() + timedelta(minutes=expiry_mins)

    # Invalidate previous unused OTPs for this user and purpose
    EmailOTP.objects.filter(user=user, purpose=purpose, is_used=False).update(is_used=True)

    EmailOTP.objects.create(
        user=user,
        code=code,
        purpose=purpose,
        expires_at=expires_at
    )

    print(f"\n>> [TRYWISE OTP CODE] For {user.username} ({user.email}) [{purpose}]: {code} <<\n")

    if purpose == OTPPurpose.EMAIL_VERIFICATION:
        send_registration_otp_email(user, code)
    elif purpose == OTPPurpose.STORE_LOGIN:
        send_store_login_otp_email(user, code)
    elif purpose == OTPPurpose.PASSWORD_RESET:
        send_password_reset_otp_email(user, code)

    return code


# ==============================================================================
# AUTHENTICATION & OTP VIEWS
# ==============================================================================

class RegisterView(APIView):
    """
    POST: Register a new Customer or Store Owner.
    Creates account in inactive state (is_active=False) and sends 6-digit Email OTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Deactivate until OTP is verified
            user.is_active = False
            user.save(update_fields=['is_active'])

            generate_and_send_otp(user, OTPPurpose.EMAIL_VERIFICATION)
            temp_token = make_temp_token(user.id)

            return Response({
                'verification_required': True,
                'message': f"A 6-digit verification code has been sent to {user.email}.",
                'email': user.email,
                'role': user.role,
                'temp_token': temp_token,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyRegistrationOTPView(APIView):
    """
    POST: Verifies 6-digit registration OTP, activates account, and issues tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        temp_token = serializer.validated_data['temp_token']
        otp = serializer.validated_data['otp']

        user_id = read_temp_token(temp_token)
        if not user_id:
            return Response(
                {'detail': 'Session expired or invalid. Please try registering again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User account not found.'}, status=status.HTTP_404_NOT_FOUND)

        otp_obj = EmailOTP.objects.filter(
            user=user,
            purpose=OTPPurpose.EMAIL_VERIFICATION,
            code=otp,
            is_used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_obj:
            return Response(
                {'detail': 'Invalid or expired verification code. Please check your email or resend code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP used and activate user
        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        user.is_active = True
        user.save(update_fields=['is_active'])

        # Send welcome email
        send_welcome_login_email(user)

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            'message': 'Account verified and activated successfully!',
            'user': user_data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class ResendRegistrationOTPView(APIView):
    """
    POST: Resends registration verification OTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        temp_token = request.data.get('temp_token')
        if not temp_token:
            return Response({'detail': 'temp_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = read_temp_token(temp_token)
        if not user_id:
            return Response({'detail': 'Session expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        generate_and_send_otp(user, OTPPurpose.EMAIL_VERIFICATION)
        return Response({
            'message': f"A new verification code has been sent to {user.email}."
        }, status=status.HTTP_200_OK)


class LoginView(APIView):
    """
    POST: Login for Customer and Store Owner.
    - Customers: Direct login with tokens (Welcome/login email sent).
    - Store Owners: Sends 6-digit 2FA login OTP to email and requires OTP verification.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email_or_username = serializer.validated_data['email_or_username'].strip()
        password = serializer.validated_data['password']

        user = None
        user_obj = None
        if '@' in email_or_username:
            try:
                user_obj = User.objects.get(email__iexact=email_or_username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        else:
            try:
                user_obj = User.objects.get(username__iexact=email_or_username)
                user = authenticate(username=email_or_username, password=password)
            except User.DoesNotExist:
                user = None

        # Check if password is valid but account is not active (pending registration OTP)
        if user_obj and user_obj.check_password(password) and not user_obj.is_active:
            generate_and_send_otp(user_obj, OTPPurpose.EMAIL_VERIFICATION)
            return Response({
                'detail': 'Your account is pending email verification. A new code has been sent to your email.',
                'verification_required': True,
                'email': user_obj.email,
                'role': user_obj.role,
                'temp_token': make_temp_token(user_obj.id),
            }, status=status.HTTP_403_FORBIDDEN)

        if not user:
            return Response({'detail': 'Invalid email/username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        # STORE OWNER: Require 2FA Email OTP
        if user.role == UserRole.STORE_OWNER:
            generate_and_send_otp(user, OTPPurpose.STORE_LOGIN)
            temp_token = make_temp_token(user.id)

            # Mask email for privacy (e.g. j***@example.com)
            parts = user.email.split('@')
            user_part = parts[0]
            masked_user = (user_part[:2] + '***') if len(user_part) > 2 else (user_part[:1] + '***')
            email_hint = f"{masked_user}@{parts[1]}" if len(parts) > 1 else user.email

            return Response({
                'otp_required': True,
                'message': f"Store owner sign-in requires 2FA. A 6-digit code has been sent to {user.email}.",
                'email_hint': email_hint,
                'temp_token': temp_token,
            }, status=status.HTTP_200_OK)

        # CUSTOMER: Direct Login
        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data

        return Response({
            'message': 'Login successful',
            'user': user_data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class VerifyLoginOTPView(APIView):
    """
    POST: Verifies Store Owner 2FA login OTP and issues JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        temp_token = serializer.validated_data['temp_token']
        otp = serializer.validated_data['otp']

        user_id = read_temp_token(temp_token)
        if not user_id:
            return Response({'detail': 'Login session expired. Please sign in again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        otp_obj = EmailOTP.objects.filter(
            user=user,
            purpose=OTPPurpose.STORE_LOGIN,
            code=otp,
            is_used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_obj:
            return Response(
                {'detail': 'Invalid or expired login code. Please check your email or resend code.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as used
        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        # Send welcome/login email
        send_welcome_login_email(user)

        tokens = get_tokens_for_user(user)
        user_data = UserSerializer(user).data
        return Response({
            'message': '2FA verification successful. Welcome back!',
            'user': user_data,
            'tokens': tokens,
        }, status=status.HTTP_200_OK)


class ResendLoginOTPView(APIView):
    """
    POST: Resends Store Owner 2FA login OTP.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        temp_token = request.data.get('temp_token')
        if not temp_token:
            return Response({'detail': 'temp_token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user_id = read_temp_token(temp_token)
        if not user_id:
            return Response({'detail': 'Session expired. Please log in again.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        generate_and_send_otp(user, OTPPurpose.STORE_LOGIN)
        return Response({
            'message': f"A fresh 6-digit login code has been sent to {user.email}."
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """
    POST: Initiates password reset by emailing a 6-digit reset code.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()

        if user:
            generate_and_send_otp(user, OTPPurpose.PASSWORD_RESET)

        # Generic response prevents account enumeration
        return Response({
            'message': f"If an account with {email} exists, a 6-digit password reset code has been sent.",
            'email': email,
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    POST: Verifies reset OTP and updates user's password.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'detail': 'Invalid email or reset code.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj = EmailOTP.objects.filter(
            user=user,
            purpose=OTPPurpose.PASSWORD_RESET,
            code=otp,
            is_used=False,
            expires_at__gte=timezone.now()
        ).first()

        if not otp_obj:
            return Response({'detail': 'Invalid or expired password reset code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update password and mark OTP used
        user.set_password(new_password)
        user.save()

        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        return Response({
            'message': 'Your password has been reset successfully. Please log in with your new password.'
        }, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ==============================================================================
# PERMISSION CLASSES
# ==============================================================================

class IsStoreOwner(permissions.BasePermission):
    """Allows access only to authenticated store owners."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.STORE_OWNER
        )


# ==============================================================================
# PRODUCT VIEWS
# ==============================================================================

class ProductListCreateView(APIView):
    """
    GET: List products (open to everyone; optional category filter).
    POST: Add new product with image and size stock (Store Owner only).
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsStoreOwner()]
        return [permissions.AllowAny()]

    def get(self, request):
        category = request.query_params.get('category', None)
        products = Product.objects.all()

        if category and category.lower() != 'all':
            products = products.filter(category__iexact=category)

        serializer = ProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ProductSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            product = serializer.save(created_by=request.user)
            return Response(
                ProductSerializer(product, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductDetailView(APIView):
    """
    GET: Retrieve single product.
    PATCH: Update product details, image, price, original_price, or stock (Store Owner only).
           When price is updated, all active customer requests (Pending, Accepted, Ready)
           are automatically synced with the new price and total.
    DELETE: Remove product (Store Owner only; blocked if active requests exist).
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [permissions.IsAuthenticated(), IsStoreOwner()]
        return [permissions.AllowAny()]

    def get_object(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return None

    def get(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProductSerializer(product, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        old_price = product.price

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            updated_product = serializer.save()
            new_price = updated_product.price

            # If the price changed, automatically propagate to active Bag It requests
            if new_price != old_price:
                active_orders = Order.objects.filter(
                    status__in=[OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.READY],
                    items__product=updated_product
                ).distinct()

                for order in active_orders:
                    # Update line-item price for this product
                    order.items.filter(product=updated_product).update(price=new_price)
                    # Recalculate order total price
                    new_order_total = sum(item.price * item.quantity for item in order.items.all())
                    order.total_price = new_order_total
                    order.save(update_fields=['total_price', 'updated_at'])

        return Response(ProductSerializer(updated_product, context={'request': request}).data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        product = self.get_object(pk)
        if not product:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if there are active (in-progress) requests containing this product
        active_items = OrderItem.objects.filter(
            product=product
        ).exclude(
            order__status__in=[OrderStatus.COMPLETED, OrderStatus.CANCELLED]
        )

        if active_items.exists():
            active_statuses = sorted(list(set(active_items.values_list('order__status', flat=True))))
            status_text = ", ".join(active_statuses)
            return Response(
                {
                    'detail': (
                        f"Cannot delete '{product.name}' because it has active Bag It request(s) "
                        f"with status: {status_text}. "
                        f"Please change the request status to 'Completed' or 'Cancelled' first."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            product.delete()
            return Response({'message': 'Product deleted successfully.'}, status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            return Response(
                {'detail': 'Cannot delete product because it is protected by existing records.'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ==============================================================================
# ORDER / BAG REQUEST VIEWS & AUTO-EXPIRATION
# ==============================================================================

def expire_overdue_orders():
    """
    Finds all orders in 'Ready for Pickup' whose 24-hour trial window (expires_at) has passed.
    Atomically:
      1. Restocks all unpurchased items back to product inventory per size.
      2. Updates order status to CANCELLED and final_price to 0.00.
      3. Dispatches expiration & cancellation notification to the customer.
    """
    now = timezone.now()
    overdue_orders = Order.objects.filter(
        status=OrderStatus.READY,
        expires_at__isnull=False,
        expires_at__lte=now
    )

    size_map = {
        'S': 'size_s',
        'M': 'size_m',
        'L': 'size_l',
        'XL': 'size_xl',
    }

    for overdue in overdue_orders:
        try:
            with transaction.atomic():
                ord_obj = Order.objects.select_for_update().get(id=overdue.id)
                if ord_obj.status != OrderStatus.READY:
                    continue

                for item in ord_obj.items.select_for_update().filter(is_restocked=False):
                    if item.product:
                        prod = Product.objects.select_for_update().get(id=item.product.id)
                        size_col = size_map.get(item.size.upper())
                        if size_col:
                            current_qty = getattr(prod, size_col, 0)
                            setattr(prod, size_col, current_qty + item.quantity)
                            prod.save(update_fields=[size_col, 'updated_at'])

                    item.is_restocked = True
                    item.status = OrderItemStatus.RESTOCKED
                    item.save(update_fields=['is_restocked', 'status'])

                ord_obj.status = OrderStatus.CANCELLED
                ord_obj.final_price = 0.00
                ord_obj.save(update_fields=['status', 'final_price', 'updated_at'])

            try:
                send_order_expired_email_to_customer(ord_obj)
            except Exception as mail_err:
                logger.error(f"Failed to send expiration email for order #{ord_obj.id}: {mail_err}")

        except Exception as e:
            logger.error(f"Error auto-expiring order #{overdue.id}: {e}")


class OrderListCreateView(APIView):
    """
    GET:
      - If Store Owner: Retrieves all incoming customer Bag It requests.
      - If Customer: Retrieves their own placed Bag It requests.
      Automatically runs auto-expiration on overdue orders first.
    POST:
      - Customer places a Bag It request.
      - Atomically decrements stock count per size, creates order,
        and alerts store owners via email notification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Auto-expire overdue trial orders before returning lists
        expire_overdue_orders()

        if request.user.role == UserRole.STORE_OWNER:
            orders = Order.objects.all().prefetch_related('items__product')
        else:
            orders = Order.objects.filter(customer=request.user).prefetch_related('items__product')

        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        items_data = serializer.validated_data['items']

        size_map = {
            'S': 'size_s',
            'M': 'size_m',
            'L': 'size_l',
            'XL': 'size_xl',
        }

        try:
            with transaction.atomic():
                total_price = 0
                prepared_items = []

                for item in items_data:
                    prod_id = item['product_id']
                    size_key = item['size'].upper()
                    qty = item.get('quantity', 1)

                    if size_key not in size_map:
                        return Response(
                            {'detail': f"Invalid size '{size_key}'. Must be S, M, L, or XL."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    size_field = size_map[size_key]

                    try:
                        product = Product.objects.select_for_update().get(id=prod_id)
                    except Product.DoesNotExist:
                        return Response(
                            {'detail': f"Product with ID {prod_id} does not exist."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    current_stock = getattr(product, size_field, 0)
                    if current_stock < qty:
                        return Response(
                            {
                                'detail': (
                                    f"Sorry, '{product.name}' only has {current_stock} item(s) "
                                    f"left in Size {size_key}."
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # Decrement stock count
                    new_stock = current_stock - qty
                    setattr(product, size_field, new_stock)
                    product.save(update_fields=[size_field, 'updated_at'])

                    line_total = product.price * qty
                    total_price += line_total
                    prepared_items.append({
                        'product': product,
                        'size': size_key,
                        'quantity': qty,
                        'price': product.price,
                    })

                # Create Order
                order = Order.objects.create(
                    customer=request.user,
                    total_price=total_price,
                    status=OrderStatus.PENDING
                )

                # Create OrderItems
                for prep in prepared_items:
                    prod = prep['product']
                    img_url = prod.image.url if prod.image and hasattr(prod.image, 'url') else ''
                    OrderItem.objects.create(
                        order=order,
                        product=prod,
                        product_name=prod.name,
                        product_category=prod.category,
                        product_image_url=img_url,
                        size=prep['size'],
                        quantity=prep['quantity'],
                        price=prep['price'],
                        status=OrderItemStatus.RESERVED,
                        is_restocked=False
                    )

            # Send email alert to store owners
            try:
                send_new_order_email_to_owners(order)
            except Exception as mail_err:
                logger.error(f"Failed to dispatch store owner order email: {mail_err}")

            output_serializer = OrderSerializer(order, context={'request': request})
            return Response(
                {
                    'message': 'Bag It request submitted successfully!',
                    'order': output_serializer.data,
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            logger.exception("Order placement error")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderDetailView(APIView):
    """
    PATCH: Store Owner updates the order status (e.g. Accepted, Ready for Pickup, Completed, Cancelled).
    Supports partial-purchase checkout via 'item_actions':
      - Marks purchased vs restocked items.
      - Restocks unpurchased items atomically back into product inventory.
      - Recalculates final_price based strictly on items purchased.
      - When an order is Cancelled, all unpurchased items are automatically restocked!
    """
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.status
        new_status = serializer.validated_data.get('status', order.status)
        item_actions = serializer.validated_data.get('item_actions', [])

        size_map = {
            'S': 'size_s',
            'M': 'size_m',
            'L': 'size_l',
            'XL': 'size_xl',
        }

        try:
            with transaction.atomic():
                # Process item actions (e.g. customer bought item 1, restocked item 2)
                if item_actions:
                    for act in item_actions:
                        item_id = act['item_id']
                        action = act['action']

                        try:
                            item = order.items.select_for_update().get(id=item_id)
                        except OrderItem.DoesNotExist:
                            continue

                        if action == 'restocked':
                            if not item.is_restocked and item.product:
                                prod = Product.objects.select_for_update().get(id=item.product.id)
                                size_col = size_map.get(item.size.upper())
                                if size_col:
                                    current_qty = getattr(prod, size_col, 0)
                                    setattr(prod, size_col, current_qty + item.quantity)
                                    prod.save(update_fields=[size_col, 'updated_at'])

                            item.is_restocked = True
                            item.status = OrderItemStatus.RESTOCKED
                            item.save(update_fields=['is_restocked', 'status'])

                        elif action == 'purchased':
                            # If previously restocked, deduct inventory back
                            if item.is_restocked and item.product:
                                prod = Product.objects.select_for_update().get(id=item.product.id)
                                size_col = size_map.get(item.size.upper())
                                if size_col:
                                    current_qty = getattr(prod, size_col, 0)
                                    setattr(prod, size_col, max(0, current_qty - item.quantity))
                                    prod.save(update_fields=[size_col, 'updated_at'])

                            item.is_restocked = False
                            item.status = OrderItemStatus.PURCHASED
                            item.save(update_fields=['is_restocked', 'status'])

                # If status changed to CANCELLED: restock all items that have not yet been restocked
                if new_status == OrderStatus.CANCELLED:
                    for item in order.items.select_for_update().filter(is_restocked=False):
                        if item.product:
                            prod = Product.objects.select_for_update().get(id=item.product.id)
                            size_col = size_map.get(item.size.upper())
                            if size_col:
                                current_qty = getattr(prod, size_col, 0)
                                setattr(prod, size_col, current_qty + item.quantity)
                                prod.save(update_fields=[size_col, 'updated_at'])

                        item.is_restocked = True
                        item.status = OrderItemStatus.RESTOCKED
                        item.save(update_fields=['is_restocked', 'status'])

                    order.final_price = 0.00

                # If status is COMPLETED: compute final_price from purchased items
                elif new_status == OrderStatus.COMPLETED:
                    purchased_items = order.items.filter(status=OrderItemStatus.PURCHASED)
                    if purchased_items.exists():
                        order.final_price = sum(it.price * it.quantity for it in purchased_items)
                    else:
                        # Fallback: if no explicit per-item actions were provided, all non-restocked items count as bought
                        unrestocked_items = order.items.filter(is_restocked=False)
                        order.final_price = sum(it.price * it.quantity for it in unrestocked_items)

                # If transitioning to Ready for Pickup: set configurable trial reservation window
                update_fields = ['status', 'final_price', 'updated_at']

                # Priority 1: Per-order override from store owner
                custom_val = request.data.get('hold_duration_value')
                custom_unit = request.data.get('hold_duration_unit')
                hold_delta = None

                if custom_val is not None and custom_unit in (TrialDurationUnit.MINUTES, TrialDurationUnit.HOURS):
                    try:
                        v = max(1, int(custom_val))
                        hold_delta = timedelta(minutes=v) if custom_unit == TrialDurationUnit.MINUTES else timedelta(hours=v)
                    except (ValueError, TypeError):
                        hold_delta = None

                # Priority 2: Store Owner's global StoreConfiguration
                if not hold_delta:
                    store_cfg = StoreConfiguration.objects.filter(owner=request.user).first() or StoreConfiguration.objects.first()
                    if store_cfg:
                        hold_delta = store_cfg.get_duration_delta()

                # Priority 3: Fallback to settings / env variables
                if not hold_delta:
                    trial_minutes = getattr(settings, 'TRIAL_RESERVATION_MINUTES', None)
                    if trial_minutes:
                        hold_delta = timedelta(minutes=float(trial_minutes))
                    else:
                        hold_hours = getattr(settings, 'TRIAL_RESERVATION_HOURS', 24)
                        hold_delta = timedelta(hours=float(hold_hours))

                old_expires_at = order.expires_at
                deadline_updated = False
                is_extended = True

                if new_status == OrderStatus.READY and (old_status != OrderStatus.READY or not order.expires_at or custom_val is not None):
                    order.ready_at = timezone.now()
                    order.expires_at = timezone.now() + hold_delta
                    update_fields.extend(['ready_at', 'expires_at'])

                    if old_status == OrderStatus.READY and old_expires_at:
                        diff_sec = (order.expires_at - old_expires_at).total_seconds()
                        if abs(diff_sec) > 5:
                            deadline_updated = True
                            is_extended = diff_sec > 0
                            order.is_deadline_updated = True
                            if 'is_deadline_updated' not in update_fields:
                                update_fields.append('is_deadline_updated')

                order.status = new_status
                order.save(update_fields=update_fields)

            # Customer notifications dispatched outside the transaction
            if old_status != OrderStatus.ACCEPTED and new_status == OrderStatus.ACCEPTED:
                try:
                    send_order_accepted_email_to_customer(order)
                except Exception as mail_err:
                    logger.error(f"Failed to send accepted email to customer for #{order.id}: {mail_err}")

            elif old_status != OrderStatus.READY and new_status == OrderStatus.READY:
                try:
                    send_order_ready_email_to_customer(order)
                except Exception as mail_err:
                    logger.error(f"Failed to send ready email to customer for #{order.id}: {mail_err}")

            elif deadline_updated:
                try:
                    send_order_deadline_updated_email_to_customer(
                        order,
                        old_expires_at=old_expires_at,
                        is_extended=is_extended
                    )
                except Exception as mail_err:
                    logger.error(f"Failed to send deadline updated email to customer for #{order.id}: {mail_err}")

            out_serializer = OrderSerializer(order, context={'request': request})
            return Response(out_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error updating order")
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    put = patch


# ==============================================================================
# STORE REVENUE & ANALYTICS VIEW
# ==============================================================================

class StoreRevenueView(APIView):
    """
    GET: Aggregate revenue, orders count, items sold, and items restocked for Store Owner.
    Supports period filters:
      - 'all': All time
      - 'this_week': Past 7 days
      - 'this_month': Current calendar month
      - 'custom': Specific month & year (e.g. ?period=custom&year=2026&month=10)
    """
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def get(self, request):
        period = request.query_params.get('period', 'all').lower()
        now = timezone.now()
        local_now = timezone.localtime(now)

        completed_orders = Order.objects.filter(status=OrderStatus.COMPLETED)
        restocked_items = OrderItem.objects.filter(
            Q(is_restocked=True) | Q(status=OrderItemStatus.RESTOCKED)
        )

        if period == 'this_week':
            week_start = now - timedelta(days=7)
            completed_orders = completed_orders.filter(created_at__gte=week_start)
            restocked_items = restocked_items.filter(order__created_at__gte=week_start)
        elif period == 'this_month':
            start_of_month = local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if local_now.month == 12:
                start_of_next_month = local_now.replace(year=local_now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                start_of_next_month = local_now.replace(month=local_now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

            completed_orders = completed_orders.filter(created_at__gte=start_of_month, created_at__lt=start_of_next_month)
            restocked_items = restocked_items.filter(order__created_at__gte=start_of_month, order__created_at__lt=start_of_next_month)
        elif period == 'custom':
            try:
                target_year = int(request.query_params.get('year', local_now.year))
                target_month = int(request.query_params.get('month', local_now.month))
                target_month = max(1, min(12, target_month))
                start_of_target = local_now.replace(year=target_year, month=target_month, day=1, hour=0, minute=0, second=0, microsecond=0)
                if target_month == 12:
                    start_of_next_target = local_now.replace(year=target_year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
                else:
                    start_of_next_target = local_now.replace(year=target_year, month=target_month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

                completed_orders = completed_orders.filter(created_at__gte=start_of_target, created_at__lt=start_of_next_target)
                restocked_items = restocked_items.filter(order__created_at__gte=start_of_target, order__created_at__lt=start_of_next_target)
            except (ValueError, TypeError):
                pass

        # Calculate total revenue using final_price (fallback to total_price)
        total_rev = 0
        for ord_obj in completed_orders:
            if ord_obj.final_price is not None:
                total_rev += float(ord_obj.final_price)
            else:
                total_rev += float(ord_obj.total_price)

        # Count purchased items in completed orders
        purchased_items = OrderItem.objects.filter(
            order__in=completed_orders
        ).filter(
            Q(status=OrderItemStatus.PURCHASED) | 
            (Q(is_restocked=False) & ~Q(status=OrderItemStatus.RESTOCKED))
        )
        items_sold_count = sum(it.quantity for it in purchased_items)

        items_restocked_count = sum(it.quantity for it in restocked_items)

        return Response({
            'period': period,
            'total_revenue': round(total_rev, 2),
            'completed_orders_count': completed_orders.count(),
            'items_sold_count': items_sold_count,
            'items_restocked_count': items_restocked_count,
        }, status=status.HTTP_200_OK)


# ==============================================================================
# STORE CONFIGURATION VIEW (DYNAMIC TRIAL HOLD POLICY)
# ==============================================================================

class StoreConfigurationView(APIView):
    """
    GET: Retrieve current dynamic trial reservation policy for the Store Owner.
    PUT/PATCH: Update hold duration value and unit ('minutes' or 'hours').
    """
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def get(self, request):
        config, _ = StoreConfiguration.objects.get_or_create(
            owner=request.user,
            defaults={
                'trial_duration_value': int(getattr(settings, 'TRIAL_RESERVATION_MINUTES', None) or getattr(settings, 'TRIAL_RESERVATION_HOURS', 24)),
                'trial_duration_unit': TrialDurationUnit.MINUTES if getattr(settings, 'TRIAL_RESERVATION_MINUTES', None) else TrialDurationUnit.HOURS
            }
        )
        serializer = StoreConfigurationSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        config, _ = StoreConfiguration.objects.get_or_create(
            owner=request.user,
            defaults={'trial_duration_value': 24, 'trial_duration_unit': TrialDurationUnit.HOURS}
        )
        serializer = StoreConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

