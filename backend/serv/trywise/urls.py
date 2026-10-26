from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    VerifyRegistrationOTPView,
    ResendRegistrationOTPView,
    LoginView,
    VerifyLoginOTPView,
    ResendLoginOTPView,
    ForgotPasswordView,
    ResetPasswordView,
    UserProfileView,
    ProductListCreateView,
    ProductDetailView,
    OrderListCreateView,
    OrderDetailView,
    StoreRevenueView,
)

urlpatterns = [
    # Auth Endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/verify-registration-otp/', VerifyRegistrationOTPView.as_view(), name='verify-registration-otp'),
    path('auth/resend-registration-otp/', ResendRegistrationOTPView.as_view(), name='resend-registration-otp'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/verify-login-otp/', VerifyLoginOTPView.as_view(), name='verify-login-otp'),
    path('auth/resend-login-otp/', ResendLoginOTPView.as_view(), name='resend-login-otp'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/me/', UserProfileView.as_view(), name='user-profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),

    # Product Endpoints
    path('products/', ProductListCreateView.as_view(), name='product-list-create'),
    path('products/<int:pk>/', ProductDetailView.as_view(), name='product-detail'),

    # Bag It / Order Endpoints
    path('orders/', OrderListCreateView.as_view(), name='order-list-create'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),

    # Store Owner Revenue & Analytics
    path('store/revenue/', StoreRevenueView.as_view(), name='store-revenue'),
]


