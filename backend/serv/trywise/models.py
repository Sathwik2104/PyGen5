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
