import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from .models import User, UserRole

logger = logging.getLogger(__name__)

def _send_html_email(subject, text_content, html_content, recipient_list):
    """Internal helper to dispatch multi-part HTML & text emails safely."""
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'TryWise <no-reply@trywise.com>')
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=recipient_list
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_list}: {e}")
        return False


def send_registration_otp_email(user, otp_code):
    """Sends 6-digit email verification OTP upon registration."""
    subject = f"TryWise - Verify Your Email (Code: {otp_code})"
    greeting_name = user.first_name or user.username
    text_content = (
        f"Hello {greeting_name},\n\n"
        f"Thank you for registering on TryWise! To complete your registration and activate your account, "
        f"please use the following 6-digit verification code:\n\n"
        f"{otp_code}\n\n"
        f"This code will expire in 10 minutes. If you did not register on TryWise, please ignore this email.\n\n"
        f"Best regards,\n"
        f"The TryWise Team"
    )
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #6366f1;">Wise</span></h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Smart In-Store Trial Queue</p>
        </div>
        <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">Verify Your Email Address</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{greeting_name}</strong>,<br>
            Welcome to TryWise! Please enter the 6-digit verification code below to activate your {user.get_role_display()} account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #4338ca; background-color: #eef2ff; border-radius: 8px; border: 1px dashed #6366f1;">
                {otp_code}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Valid for 10 minutes</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not initiate this registration, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            © {timezone.now().year} TryWise Inc. All rights reserved.
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [user.email])


def send_store_login_otp_email(user, otp_code):
    """Sends 6-digit two-factor authentication OTP for store owner login."""
    subject = f"TryWise Store Owner 2FA Code: {otp_code}"
    greeting_name = user.first_name or user.username
    text_content = (
        f"Hello {greeting_name},\n\n"
        f"A login attempt was made for your TryWise Store Owner account. "
        f"Use the following 6-digit OTP code to complete your login:\n\n"
        f"{otp_code}\n\n"
        f"This code will expire in 5 minutes. If this was not you, please secure your account immediately.\n\n"
        f"Best regards,\n"
        f"The TryWise Team"
    )
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #6366f1;">Wise</span></h1>
            <span style="display: inline-block; margin-top: 6px; padding: 3px 10px; font-size: 11px; font-weight: 700; color: #4338ca; background: #e0e7ff; border-radius: 12px; text-transform: uppercase;">
                Store Owner Portal 2FA
            </span>
        </div>
        <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">Store Owner Sign-In Verification</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{greeting_name}</strong>,<br>
            Please use the 6-digit security code below to authorize your sign-in to the Store Owner Dashboard:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; background-color: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1;">
                {otp_code}
            </div>
            <p style="color: #ef4444; font-size: 12px; font-weight: 600; margin-top: 8px;">Expires in 5 minutes</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            🔒 For security reasons, never share this OTP with anyone. If you did not attempt to sign in, change your password immediately.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            © {timezone.now().year} TryWise Security Center
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [user.email])


def send_password_reset_otp_email(user, otp_code):
    """Sends 6-digit OTP for self-service password reset."""
    subject = f"TryWise - Password Reset Code: {otp_code}"
    greeting_name = user.first_name or user.username
    text_content = (
        f"Hello {greeting_name},\n\n"
        f"We received a request to reset your TryWise account password. "
        f"Your 6-digit password reset code is:\n\n"
        f"{otp_code}\n\n"
        f"This code will expire in 10 minutes. If you did not request this, please ignore this email.\n\n"
        f"Best regards,\n"
        f"The TryWise Team"
    )
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #6366f1;">Wise</span></h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Account Recovery</p>
        </div>
        <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{greeting_name}</strong>,<br>
            Enter the 6-digit code below in the TryWise password reset window to choose a new password:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <div style="display: inline-block; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #b91c1c; background-color: #fef2f2; border-radius: 8px; border: 1px dashed #f87171;">
                {otp_code}
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Valid for 10 minutes</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not request a password reset, you can safely ignore this email. Your password remains unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            © {timezone.now().year} TryWise Security Center
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [user.email])


def send_welcome_login_email(user):
    """Sends a friendly welcome/login notification upon successful sign-in."""
    subject = "TryWise - Successful Login Notification"
    greeting_name = user.first_name or user.username
    local_now = timezone.localtime(timezone.now())
    now_str = local_now.strftime("%B %d, %Y at %I:%M %p")
    text_content = (
        f"Hello {greeting_name},\n\n"
        f"You have successfully logged in to your TryWise account on {now_str}.\n"
        f"Role: {user.get_role_display()}\n\n"
        f"If this was not you, please reset your password immediately.\n\n"
        f"Happy shopping & trials,\n"
        f"The TryWise Team"
    )
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #6366f1;">Wise</span></h1>
        </div>
        <h2 style="font-size: 20px; color: #1e293b; margin-top: 0;">Successful Sign-In</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{greeting_name}</strong>,<br>
            You have successfully logged in to your TryWise account.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Account:</strong> {user.email}</p>
            <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Role:</strong> {user.get_role_display()}</p>
            <p style="margin: 4px 0; color: #475569; font-size: 14px;"><strong>Timestamp:</strong> {now_str}</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not sign in recently, please protect your account by resetting your password immediately.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            © {timezone.now().year} TryWise Security Center
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [user.email])


def send_new_order_email_to_owners(order):
    """Sends notification email to all registered store owners when a customer places a Bag It request."""
    owners = User.objects.filter(role=UserRole.STORE_OWNER, is_active=True)
    owner_emails = [o.email for o in owners if o.email]
    if not owner_emails:
        logger.info("No active store owners found with email to notify.")
        return False

    customer = order.customer
    customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
    subject = f"🚨 New Bag It Request #{order.id} from {customer_name} - TryWise"

    # Build items rows
    items_html_rows = ""
    items_text_list = ""
    for item in order.items.all():
        name = item.product.name if item.product else (item.product_name or "Product")
        line_val = float(item.price) * item.quantity
        items_text_list += f"• {name} | Size: {item.size} | Qty: {item.quantity} | ₹{line_val:,.2f}\n"
        items_html_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">{name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.size}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">₹{line_val:,.2f}</td>
        </tr>
        """

    text_content = (
        f"Hello Store Owner,\n\n"
        f"A new Bag It trial request has been submitted by customer {customer_name}!\n\n"
        f"Order ID: #{order.id}\n"
        f"Customer Contact: {customer.email} (Phone: {customer.phone_number or 'N/A'})\n"
        f"Total Request Value: ₹{float(order.total_price):,.2f}\n\n"
        f"Requested Items:\n{items_text_list}\n"
        f"Please open your Store Owner Portal to accept the request and prepare sizes for customer trial.\n\n"
        f"Best regards,\n"
        f"TryWise Store System"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #6366f1;">Wise</span></h1>
            <span style="background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">NEW REQUEST #{order.id}</span>
        </div>
        <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">Customer Bag It In-Store Trial</h2>
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Customer:</strong> {customer_name} ({customer.email})</p>
            {f'<p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Phone:</strong> {customer.phone_number}</p>' if customer.phone_number else ''}
            <p style="margin: 4px 0; color: #334155; font-size: 14px;"><strong>Status:</strong> {order.status}</p>
        </div>
        <h3 style="font-size: 15px; color: #475569; margin: 16px 0 8px;">Reserved Items to Prepare:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f1f5f9;">
                    <th style="padding: 8px 10px; text-align: left; font-size: 12px; color: #475569;">PRODUCT</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">SIZE</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">QTY</th>
                    <th style="padding: 8px 10px; text-align: right; font-size: 12px; color: #475569;">PRICE</th>
                </tr>
            </thead>
            <tbody>
                {items_html_rows}
            </tbody>
        </table>
        <div style="text-align: right; margin-bottom: 24px;">
            <span style="font-size: 15px; color: #64748b;">Estimated Order Total: </span>
            <strong style="font-size: 20px; color: #0f172a;">₹{float(order.total_price):,.2f}</strong>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Please log in to your Store Owner Dashboard to mark this order as <em>Accepted</em> and set aside the items on your fitting rack.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            TryWise Store Operations Notification
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, owner_emails)


def send_order_accepted_email_to_customer(order):
    """Notifies customer that their Bag It request has been accepted by the store."""
    customer = order.customer
    if not customer.email:
        return False

    customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
    subject = f"Your TryWise Bag It Request #{order.id} has been Accepted! 🎉"

    # Build items rows
    items_html_rows = ""
    items_text_list = ""
    for item in order.items.all():
        name = item.product.name if item.product else (item.product_name or "Product")
        line_val = float(item.price) * item.quantity
        items_text_list += f"• {name} | Size: {item.size} | Qty: {item.quantity} | ₹{line_val:,.2f}\n"
        items_html_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">{name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.size}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">₹{line_val:,.2f}</td>
        </tr>
        """

    text_content = (
        f"Hello {customer_name},\n\n"
        f"Great news! Your TryWise Bag It request #{order.id} has been accepted by the store.\n\n"
        f"Our store associates are currently setting aside your requested pieces on the fitting room trial rack:\n"
        f"{items_text_list}\n"
        f"Estimated Total: ₹{float(order.total_price):,.2f}\n\n"
        f"We will notify you the moment your trial rack is completely ready for your visit!\n\n"
        f"Best regards,\n"
        f"The TryWise Team"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #8b5cf6; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #8b5cf6;">Wise</span></h1>
            <span style="background: #ede9fe; color: #6d28d9; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">REQUEST ACCEPTED</span>
        </div>
        <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">Your Bag It Request #{order.id} is Accepted!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{customer_name}</strong>,<br>
            The store has accepted your trial request. Our team is now gathering your requested sizes and preparing your dedicated fitting rack.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="padding: 8px 10px; text-align: left; font-size: 12px; color: #475569;">PRODUCT</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">SIZE</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">QTY</th>
                    <th style="padding: 8px 10px; text-align: right; font-size: 12px; color: #475569;">PRICE</th>
                </tr>
            </thead>
            <tbody>
                {items_html_rows}
            </tbody>
        </table>
        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <p style="margin: 0; color: #5b21b6; font-size: 14px; font-weight: 600;">
                ⏳ What's next? You will receive another notification as soon as the pieces are placed in the fitting room and ready to try on!
            </p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            TryWise Smart In-Store Shopping
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [customer.email])


def format_order_expiration(order):
    """
    Returns (duration_label, expires_str) formatted dynamically from order.expires_at and order.ready_at
    in the localized timezone (e.g. IST).
    """
    if not order.expires_at:
        return "24 hours", "the designated reservation deadline"

    # Convert UTC datetime to local time (Asia/Kolkata / configured TIME_ZONE)
    local_expires = timezone.localtime(order.expires_at)
    expires_str = local_expires.strftime("%B %d, %Y by %I:%M %p")

    # Determine hold duration strictly between expires_at and ready_at (or settings fallback)
    if order.ready_at and order.expires_at:
        diff = order.expires_at - order.ready_at
        total_seconds = max(0, diff.total_seconds())
        if total_seconds < 3600:
            mins = max(1, int(round(total_seconds / 60)))
            duration_label = f"{mins} minute" if mins == 1 else f"{mins} minutes"
        else:
            hrs = max(1, int(round(total_seconds / 3600)))
            duration_label = f"{hrs} hour" if hrs == 1 else f"{hrs} hours"
    else:
        trial_minutes = getattr(settings, 'TRIAL_RESERVATION_MINUTES', None)
        if trial_minutes:
            mins = int(trial_minutes)
            duration_label = f"{mins} minute" if mins == 1 else f"{mins} minutes"
        else:
            hrs = int(getattr(settings, 'TRIAL_RESERVATION_HOURS', 24))
            duration_label = f"{hrs} hour" if hrs == 1 else f"{hrs} hours"

    return duration_label, expires_str


def send_order_ready_email_to_customer(order):
    """Notifies customer that their Bag It items are set aside in store fitting room with dynamic reservation window."""
    customer = order.customer
    if not customer.email:
        return False

    customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
    subject = f"✨ Your Items are Ready to Try On! - TryWise Request #{order.id}"

    duration_label, expires_str = format_order_expiration(order)

    # Build items rows
    items_html_rows = ""
    items_text_list = ""
    for item in order.items.all():
        name = item.product.name if item.product else (item.product_name or "Product")
        line_val = float(item.price) * item.quantity
        items_text_list += f"• {name} | Size: {item.size} | Qty: {item.quantity}\n"
        items_html_rows += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1e293b;">{name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.size}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #475569; text-align: center;">{item.quantity}</td>
        </tr>
        """

    text_content = (
        f"Hello {customer_name},\n\n"
        f"Your Bag It items are READY to try on at the store!\n\n"
        f"Order ID: #{order.id}\n"
        f"Reserved Items:\n{items_text_list}\n"
        f"⏰ RESERVATION TIMING & STORE HOURS:\n"
        f"• Hold Period: Reserved for {duration_label} (Valid until {expires_str})\n"
        f"• Store Hours: 10:00 AM – 9:00 PM\n\n"
        f"Please visit our store and mention Order #{order.id} at the fitting desk. "
        f"Try on your reserved sizes and pay only for what you love.\n\n"
        f"Note: If you are unable to visit within the reservation window, the items will be automatically restocked so other shoppers can purchase them.\n\n"
        f"See you soon,\n"
        f"The TryWise Team"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #10b981;">Wise</span></h1>
            <span style="background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">READY FOR TRIAL</span>
        </div>
        <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">✨ Your Reserved Pieces are Ready!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{customer_name}</strong>,<br>
            Your in-store trial rack has been prepared with your requested items and sizes:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0 20px;">
            <thead>
                <tr style="background-color: #f8fafc;">
                    <th style="padding: 8px 10px; text-align: left; font-size: 12px; color: #475569;">PRODUCT</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">SIZE</th>
                    <th style="padding: 8px 10px; text-align: center; font-size: 12px; color: #475569;">QTY</th>
                </tr>
            </thead>
            <tbody>
                {items_html_rows}
            </tbody>
        </table>
        <div style="background-color: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 10px; padding: 16px 18px; margin: 20px 0;">
            <h3 style="margin: 0 0 8px; font-size: 15px; color: #065f46;">⏰ Trial Timing & Store Hours</h3>
            <p style="margin: 4px 0; color: #047857; font-size: 14px;"><strong>Hold Window:</strong> Reserved for {duration_label} (Valid until {expires_str})</p>
            <p style="margin: 4px 0; color: #047857; font-size: 14px;"><strong>Store Hours:</strong> Open daily 10:00 AM – 9:00 PM</p>
            <p style="margin: 6px 0 0; color: #065f46; font-size: 13px;">📍 Visit the store fitting desk, show Order <strong>#{order.id}</strong>, try on your picks, and buy only what fits you best!</p>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
            ⚠️ If you are unable to visit before your deadline, the items will be automatically restocked to store inventory.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            TryWise Smart In-Store Shopping
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [customer.email])


def send_order_expired_email_to_customer(order):
    """Notifies customer that their trial reservation expired and items were restocked."""
    customer = order.customer
    if not customer.email:
        return False

    customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
    subject = f"TryWise - Your Bag It Request #{order.id} Has Expired & Been Cancelled"

    duration_label, expires_str = format_order_expiration(order)

    text_content = (
        f"Hello {customer_name},\n\n"
        f"Your in-store trial reservation window for Request #{order.id} (reserved until {expires_str}) has ended.\n\n"
        f"Because the {duration_label} reservation window elapsed without an in-store fitting, "
        f"the reserved pieces have been automatically returned to store inventory so other customers can purchase or try them.\n\n"
        f"You can explore our collection and place a new Bag It request whenever you are ready to visit!\n\n"
        f"Warm regards,\n"
        f"The TryWise Team"
    )

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
            <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0;">Try<span style="color: #ef4444;">Wise</span></h1>
            <span style="background: #fef2f2; color: #b91c1c; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px;">EXPIRED & CANCELLED</span>
        </div>
        <h2 style="font-size: 18px; color: #1e293b; margin-top: 0;">Trial Window Ended for Request #{order.id}</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
            Hello <strong>{customer_name}</strong>,<br>
            Your in-store trial reservation window for Request <strong>#{order.id}</strong> (valid until {expires_str}) has elapsed.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; border-radius: 6px; padding: 14px 16px; margin: 20px 0;">
            <p style="margin: 0; color: #475569; font-size: 14px;">
                The {duration_label} hold duration has completed, and all reserved pieces have been automatically returned to store inventory. No charges were incurred.
            </p>
        </div>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Planning another store visit soon? Feel free to browse our latest collection and Bag It anytime!
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            TryWise Smart In-Store Shopping
        </p>
    </div>
    """
    return _send_html_email(subject, text_content, html_content, [customer.email])

