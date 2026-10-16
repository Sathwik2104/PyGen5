from django.db import models
from django.contrib.auth.models import AbstractUser

class UserRole(models.TextChoices):
    CUSTOMER = 'customer', 'Customer'
    STORE_OWNER = 'store_owner', 'Store Owner'

class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER
    )
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class ProductCategory(models.TextChoices):
    MEN = 'Men', 'Men'
    WOMEN = 'Women', 'Women'


class Product(models.Model):
    """
    Product Model:
    Stores product details, image file path, and inventory counts per size as dedicated columns.
    """
    name = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20,
        choices=ProductCategory.choices,
        default=ProductCategory.MEN
    )
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='products/', null=True, blank=True)

    # Size inventory counts (Each size is a column as requested)
    size_s = models.PositiveIntegerField(default=0, help_text="Available stock for Size S")
    size_m = models.PositiveIntegerField(default=0, help_text="Available stock for Size M")
    size_l = models.PositiveIntegerField(default=0, help_text="Available stock for Size L")
    size_xl = models.PositiveIntegerField(default=0, help_text="Available stock for Size XL")

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.category}) - ₹{self.price}"

    @property
    def total_stock(self):
        """Calculates total remaining items across all sizes."""
        return self.size_s + self.size_m + self.size_l + self.size_xl


class OrderStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    ACCEPTED = 'Accepted', 'Accepted'
    READY = 'Ready for Pickup', 'Ready for Pickup'
    COMPLETED = 'Completed', 'Completed'
    CANCELLED = 'Cancelled', 'Cancelled'


class Order(models.Model):
    """
    Order Model (Customer Bag It Request):
    Tracks incoming requests from customers for store owners to review.
    """
    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='orders'
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id} by {self.customer.username} - {self.status}"


class OrderItem(models.Model):
    """
    OrderItem Model:
    Individual product line-items within a Bag It request.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items'
    )
    product_name = models.CharField(max_length=255, blank=True, default='')
    product_category = models.CharField(max_length=20, blank=True, default='')
    product_image_url = models.CharField(max_length=500, blank=True, default='', null=True)
    size = models.CharField(max_length=5)  # 'S', 'M', 'L', 'XL'
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        name = self.product.name if self.product else (self.product_name or "Deleted Product")
        return f"{name} (Size: {self.size}, Qty: {self.quantity})"

