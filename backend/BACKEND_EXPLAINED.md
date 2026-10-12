# TryWise Backend: Comprehensive File-by-File Guide & Code Explanation

This guide explains how every file in the Django REST Framework (DRF) backend works, how data flows through the system, and what each line of code accomplishes.

---

## 🗺️ 1. The Big Picture: Request & Response Lifecycle

When a user clicks "Register" or "Login" in React, here is the journey the request takes through the Django backend:

```text
React Frontend (Fetch Request: http://127.0.0.1:8000/api/auth/login/)
                             │
                             ▼
 1. manage.py              ──▶ Initializes the Python environment & Django settings
                             │
                             ▼
 2. serv/settings.py       ──▶ Checks CORS headers, middlewares, database & JWT rules
                             │
                             ▼
 3. serv/urls.py           ──▶ Routes any URL starting with "/api/" to the trywise app
                             │
                             ▼
 4. trywise/urls.py        ──▶ Routes "auth/login/" to LoginView
                             │
                             ▼
 5. trywise/views.py       ──▶ Receives the request data; calls Serializers & Auth methods
                             │
                             ▼
 6. trywise/serializers.py ──▶ Validates fields (format, matching passwords, required inputs)
                             │
                             ▼
 7. trywise/models.py      ──▶ Interacts with the database (SQLite: queries/saves users)
                             │
                             ▼
 8. JWT Token Generator    ──▶ Generates Access & Refresh JWT tokens
                             │
                             ▼
React Frontend (JSON Response: { message: "...", user: {...}, tokens: {...} })
```

---

## 📄 2. `serv/settings.py` — The Project Brain

This file configures all settings, apps, databases, and security parameters.

### Key Blocks Explained:

#### A. Registered Apps (`INSTALLED_APPS`)
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'corsheaders',             # Allows React (port 5173) to talk to Django (port 8000)
    'rest_framework',          # Enables Django REST Framework toolkit
    'rest_framework_simplejwt', # Enables JSON Web Token (JWT) authentication

    # Local application
    'trywise',                 # Our custom app containing auth models, views, and routes
]
```

#### B. CORS Middleware (`MIDDLEWARE`)
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # MUST be at the top!
    'django.middleware.security.SecurityMiddleware',
    ...
]
```
- **Why at the top?** Every incoming request must have its HTTP headers inspected first to see if it comes from an allowed origin (e.g. `http://localhost:5173`). If `CorsMiddleware` is not at the top, CORS headers might not be added to error responses.

#### C. Custom User Model Setting
```python
AUTH_USER_MODEL = 'trywise.User'
```
- By default, Django uses `django.contrib.auth.models.User`.
- This setting instructs Django's internal authentication system to replace the default model with our custom `User` model in `trywise/models.py`.

#### D. REST Framework & SimpleJWT Configuration
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),   # Token stays valid for 24 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),  # Refresh token valid for 7 days
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),             # Header format: Authorization: Bearer <token>
}

CORS_ALLOW_ALL_ORIGINS = True                     # Permits React development server requests
CORS_ALLOW_CREDENTIALS = True
```

---

## 📄 3. `trywise/models.py` — The Database Blueprint

This file defines the database tables.

```python
from django.db import models
from django.contrib.auth.models import AbstractUser

# 1. ENUM FOR ROLES
class UserRole(models.TextChoices):
    CUSTOMER = 'customer', 'Customer'
    STORE_OWNER = 'store_owner', 'Store Owner'

# 2. CUSTOM USER TABLE
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
```

### Deep-Dive:
1. **`models.TextChoices`**: Defines a clean, strictly controlled set of options. In the database, the stored values will be `'customer'` or `'store_owner'`.
2. **`AbstractUser`**: Rather than creating a user model from scratch, we inherit all standard Django authentication fields:
   - `username`, `password` (auto-hashed), `first_name`, `last_name`, `is_active`, `is_staff`, `date_joined`.
3. **`email = models.EmailField(unique=True)`**: Ensures that no two users can register with the same email address.
4. **`__str__(self)`**: Controls how the user appears in the Django Admin portal or when printed in logs.

---

## 📄 4. `trywise/serializers.py` — Data Translation & Validation

Serializers act as the **bridge** between raw JSON data from React and Python database objects in Django.
- **Deserialization**: JSON from frontend ➡️ Python dict ➡️ Validation ➡️ Database Model.
- **Serialization**: Database Model ➡️ Python dict ➡️ JSON to frontend.

### A. `UserSerializer`
```python
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone_number')
        read_only_fields = ('id',)
```
- Converts a `User` database object into safe JSON to return to the frontend.
- `password` is intentionally excluded so sensitive password hashes are never leaked in API responses.

### B. `RegisterSerializer`
```python
class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'confirm_password', 'full_name', 'role', 'phone_number')
```
- **`write_only=True`**: Fields like `password` and `confirm_password` can only be sent *to* the backend; they will never be returned in API output.
- **`validators=[validate_password]`**: Automatically enforces Django's standard password rules (length, common passwords, complexity).

#### Validation Logic (`validate` method):
```python
    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs
```
- Checks if the user made a typo between password and confirmation before touching the database.

#### Creation Logic (`create` method):
```python
    def create(self, validated_data):
        validated_data.pop('confirm_password', None) # Remove helper field
        full_name = validated_data.pop('full_name', '')
        
        # Split full name into first and last name
        first_name = ''
        last_name = ''
        if full_name:
            name_parts = full_name.strip().split(' ', 1)
            first_name = name_parts[0]
            if len(name_parts) > 1:
                last_name = name_parts[1]

        email = validated_data['email']
        username = validated_data.get('username') or email.split('@')[0]

        # Ensure unique username if autogenerated
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # create_user hashes the password securely using PBKDF2/Argon2
        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
            role=validated_data.get('role', 'customer'),
            phone_number=validated_data.get('phone_number', '')
        )
        return user
```
- **Crucial point**: `User.objects.create_user()` is used instead of `User.objects.create()`. `create_user()` ensures the plain-text password is encrypted and hashed with a secure salt before being saved in the database.

### C. `LoginSerializer`
```python
class LoginSerializer(serializers.Serializer):
    email_or_username = serializers.CharField()
    password = serializers.CharField(write_only=True)
```
- Validates that the login request contains both an identifier (`email_or_username`) and a `password`.

---

## 📄 5. `trywise/views.py` — The Controllers / Request Handlers

Views contain the business logic executed when an endpoint receives an HTTP request.

### A. JWT Token Helper
```python
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }
```
- **`access` token**: Short-lived credential attached to future requests (`Authorization: Bearer <token>`).
- **`refresh` token**: Used to obtain a new access token when the current access token expires, without requiring the user to type their password again.

### B. `RegisterView` (`POST /api/auth/register/`)
```python
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
```
1. Feeds incoming JSON data into `RegisterSerializer`.
2. Calls `serializer.is_valid()`. If validation fails, it immediately sends back a `400 Bad Request` with exact error messages (e.g., `"Passwords do not match"`).
3. If valid, saves the user to the database, generates JWT tokens, and returns `201 Created`.

### C. `LoginView` (`POST /api/auth/login/`)
```python
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email_or_username = serializer.validated_data['email_or_username']
        password = serializer.validated_data['password']

        user = None
        # Support both email and username login
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
```
1. Inspects whether the user provided an email (checks for `@`) or a username.
2. Calls Django's built-in `authenticate()` function to check the hashed password.
3. If credentials match, generates and sends tokens + user profile.
4. If credentials don't match, responds with `401 Unauthorized`.

### D. `UserProfileView` (`GET /api/auth/me/`)
```python
class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
```
- **`permissions.IsAuthenticated`**: Guarantees that only requests with a valid Bearer token can access this endpoint.
- `request.user`: Automatically populated by SimpleJWT middleware with the authenticated `User` record.

---

## 📄 6. Route Files: `serv/urls.py` and `trywise/urls.py`

### Project-level: `serv/urls.py`
```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('trywise.urls')), # Forwards all /api/... URLs to trywise.urls
]
```

### App-level: `trywise/urls.py`
```python
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, UserProfileView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/me/', UserProfileView.as_view(), name='user-profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
```

When joined together:
- `http://127.0.0.1:8000/api/auth/register/` ➡️ `RegisterView`
- `http://127.0.0.1:8000/api/auth/login/` ➡️ `LoginView`
- `http://127.0.0.1:8000/api/auth/me/` ➡️ `UserProfileView`
- `http://127.0.0.1:8000/api/auth/token/refresh/` ➡️ `TokenRefreshView`

---

## 📄 7. `trywise/tests.py` — Automated Test Suite

Automated tests allow you to verify the entire system in seconds without manual clicking:

```python
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

    def test_login_invalid_credentials(self):
        payload = {
            'email_or_username': 'nonexistent@example.com',
            'password': 'WrongPassword'
        }
        response = self.client.post(self.login_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```
To run tests anytime:
```bash
python manage.py test trywise
```

---

## 🚀 Quick Reference Commands

| Goal | Command |
| :--- | :--- |
| **Run local server** | `python manage.py runserver` |
| **Create new migrations** | `python manage.py makemigrations` |
| **Apply migrations to DB** | `python manage.py migrate` |
| **Run automated tests** | `python manage.py test trywise` |
| **Create superuser admin** | `python manage.py createsuperuser` |
