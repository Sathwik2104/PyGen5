from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'message': 'User registered successfully',
                'user': user_data,
                'tokens': tokens
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email_or_username = serializer.validated_data['email_or_username']
        password = serializer.validated_data['password']

        user = None
        if '@' in email_or_username:
            try:
                user_obj = User.objects.get(email__iexact=email_or_username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None
        else:
            user = authenticate(username=email_or_username, password=password)

        if user:
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            return Response({
                'message': 'Login successful',
                'user': user_data,
                'tokens': tokens
            }, status=status.HTTP_200_OK)
        
        return Response({'detail': 'Invalid email/username or password'}, status=status.HTTP_401_UNAUTHORIZED)


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
            request.user.role == 'store_owner'
        )


# ==============================================================================
# PRODUCT VIEWS
# ==============================================================================

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models.deletion import ProtectedError
from .models import Product, Order, OrderItem, OrderStatus
from .serializers import (
    ProductSerializer,
    OrderSerializer,
    CreateOrderSerializer,
)


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
    PATCH: Update stock counts or details (Store Owner only).
    DELETE: Remove product (Store Owner only).
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

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
# ORDER / BAG REQUEST VIEWS
# ==============================================================================

class OrderListCreateView(APIView):
    """
    GET:
      - If Store Owner: Retrieves all incoming customer Bag It requests.
      - If Customer: Retrieves their own placed Bag It requests.
    POST:
      - Customer places a Bag It request.
      - Validates stock for each size atomically, decrements stock count,
        and creates the order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role == 'store_owner':
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

        # Size field mapping
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

                    # select_for_update locks the database row until this transaction finishes,
                    # preventing multiple customers from overbooking the last item simultaneously!
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
                        price=prep['price']
                    )

            output_serializer = OrderSerializer(order, context={'request': request})
            return Response(
                {
                    'message': 'Bag It request submitted successfully!',
                    'order': output_serializer.data,
                },
                status=status.HTTP_201_CREATED
            )

        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderDetailView(APIView):
    """
    PATCH: Store Owner updates the order status (e.g. Accepted, Ready for Pickup, Completed).
    """
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if not new_status or new_status not in OrderStatus.values:
            return Response(
                {'detail': f"Invalid status. Choose from: {list(OrderStatus.values)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        order.save(update_fields=['status', 'updated_at'])

        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

