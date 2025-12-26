from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import random, string, datetime
from .models import OTPVerification, Session
from django.contrib.auth.hashers import make_password
import requests 
from .utlis import send_otp_email
from django.conf import settings
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny

MICROSOFT_CLIENT_ID = "1e2cd3e9-8bb1-4651-aa16-c9af8fcec247"
MICROSOFT_CLIENT_SECRET = "c3d2fcd2-d87b-4604-a632-f9342d0d2d81"
MICROSOFT_REDIRECT_URI = "http://localhost:3000/auth/microsoft/callback"

GITHUB_CLIENT_ID = "Ov23liwnlUiV4INZuhgd"
GITHUB_CLIENT_SECRET = "39bdd28392cf8607b90a685640cab5944c09ff82"

User = get_user_model()

# ---------- Helpers ----------
def generate_otp():
    return str(random.randint(100000, 999999))

def generate_token(length=40):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def get_user_from_token(token):
    """Helper to get user from session token"""
    try:
        session = Session.objects.get(
            session_token=token, 
            is_active=True,
            expires_at__gt=timezone.now()
        )
        return session.user
    except Session.DoesNotExist:
        return None


# ---------- Swagger Schemas ----------
register_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'username': openapi.Schema(type=openapi.TYPE_STRING, description='Unique username'),
        'email': openapi.Schema(type=openapi.TYPE_STRING, description='User email'),
        'password': openapi.Schema(type=openapi.TYPE_STRING, description='User password'),
        'user_type': openapi.Schema(type=openapi.TYPE_STRING, description='customer / provider / admin'),
    },
    required=['username', 'email', 'password']
)

verify_otp_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'email': openapi.Schema(type=openapi.TYPE_STRING),
        'otp': openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=['email', 'otp']
)

resend_otp_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'email': openapi.Schema(type=openapi.TYPE_STRING),
        'otp_type': openapi.Schema(type=openapi.TYPE_STRING, description='registration / password_reset'),
    },
    required=['email', 'otp_type']
)

login_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'email': openapi.Schema(type=openapi.TYPE_STRING),
        'password': openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=['email', 'password']
)

logout_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'token': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['token']
)

logout_all_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'token': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['token']
)

check_username_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'username': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['username']
)

check_email_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'email': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['email']
)

forgot_password_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'email': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['email']
)

reset_password_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'email': openapi.Schema(type=openapi.TYPE_STRING),
        'otp': openapi.Schema(type=openapi.TYPE_STRING),
        'new_password': openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=['email', 'otp', 'new_password']
)

change_password_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'token': openapi.Schema(type=openapi.TYPE_STRING),
        'old_password': openapi.Schema(type=openapi.TYPE_STRING),
        'new_password': openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=['token', 'old_password', 'new_password']
)

check_sessions_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'token': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['token']
)

verify_token_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={'token': openapi.Schema(type=openapi.TYPE_STRING)},
    required=['token']
)

delete_session_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'token': openapi.Schema(type=openapi.TYPE_STRING, description='Current session token'),
        'session_token': openapi.Schema(type=openapi.TYPE_STRING, description='Token of session to delete'),
    },
    required=['token', 'session_token']
)

update_profile_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'token': openapi.Schema(type=openapi.TYPE_STRING),
        'username': openapi.Schema(type=openapi.TYPE_STRING),
        'email': openapi.Schema(type=openapi.TYPE_STRING),
    },
    required=['token']
)
delete_user_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'token': openapi.Schema(type=openapi.TYPE_STRING, description='Session token of the user to be deleted'),
    },
    required=['token']
)

# ---------- Register ----------
@swagger_auto_schema(method='post', request_body=register_schema, responses={200: 'User registered successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    user_type = data.get("user_type", "customer")

    if not all([username, email, password]):
        return Response({"error": "Missing required fields"}, status=400)
    
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)
    
    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already exists"}, status=400)

    # Validate password strength
    if len(password) < 8:
        return Response({"error": "Password must be at least 8 characters"}, status=400)

    user = User.objects.create_user(
        username=username, 
        email=email, 
        password=password, 
        user_type=user_type
    )
    
    otp = generate_otp()
    OTPVerification.objects.create(
        user=user,
        otp_code=otp,
        otp_type='registration',
        expires_at=timezone.now() + datetime.timedelta(minutes=10)
    )
    sent = send_otp_email(email, otp, otp_type="registration")
    # if not sent:
    #     return Response({"error": "Failed to send OTP email. Please check the email address."}, status=400)
    print(f"OTP for {email}: {otp}")
    
    return Response({
        "message": "User registered. Verify OTP sent to email.",
        "email": email, 
        "status": sent
    })


# ---------- Verify OTP ----------
@swagger_auto_schema(method='post', request_body=verify_otp_schema, responses={200: 'OTP verified successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    data = request.data
    email = data.get("email")
    otp_code = data.get("otp")

    if not all([email, otp_code]):
        return Response({"error": "Missing required fields"}, status=400)

    try:
        user = User.objects.get(email=email)
        otp = OTPVerification.objects.filter(
            user=user, 
            otp_code=otp_code, 
            is_used=False
        ).latest('created_at')
        otp_type = otp.otp_type
        if otp.expires_at < timezone.now():
            return Response({"error": "OTP expired"}, status=400)
        
        otp.is_used = True
        otp.save()
        if user.user_type == 'admin' and otp_type == 'login_2fa':
            token = generate_token()
            device = request.META.get('HTTP_USER_AGENT', 'Unknown Device')
            Session.objects.create(
                user=user,
                session_token=token,
                device=device,
                expires_at=timezone.now() + datetime.timedelta(days=7)
            )
            
            return Response({
                "message": "OTP verified successfully. Login completed.",
                "email": email,
                "token": token, 
                "user_type": user.user_type,
                "username": user.username,
                "user_id": user.user_id
                
            })
        user.is_verified = True
        user.save()
        
        return Response({
            "message": "OTP verified successfully",
            "email": email
        })
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except OTPVerification.DoesNotExist:
        return Response({"error": "Invalid OTP"}, status=400)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


# ---------- Resend OTP ----------
@swagger_auto_schema(method='post', request_body=resend_otp_schema, responses={200: 'OTP resent successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    data = request.data
    email = data.get("email")
    otp_type = data.get("otp_type", "registration")

    if not email:
        return Response({"error": "Email is required"}, status=400)

    try:
        user = User.objects.get(email=email)
        
        # Mark all previous OTPs as used
        OTPVerification.objects.filter(
            user=user, 
            otp_type=otp_type, 
            is_used=False
        ).update(is_used=True)
        
        # Generate new OTP
        otp = generate_otp()
        OTPVerification.objects.create(
            user=user,
            otp_code=otp,
            otp_type=otp_type,
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )
        sent = send_otp_email(email, otp, otp_type="registration")
        # if not sent:
        #     return Response({"error": "Failed to send OTP email. Please check the email address."}, status=400)
        # print(f"New OTP for {email}: {otp}")
        return Response({"status": sent})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# ---------- Login ----------
@swagger_auto_schema(method='post', request_body=login_schema, responses={200: 'Login successful'})
@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    data = request.data
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return Response({"error": "Missing required fields"}, status=400)

    try:
        user = User.objects.get(email=email)
        
        if not user.check_password(password):
            return Response({"error": "Invalid credentials"}, status=401)
        
        if not user.is_verified:
            return Response({"error": "User not verified. Please verify your email."}, status=401)
        
    except User.DoesNotExist:
        return Response({"error": "Invalid credentials"}, status=401)
    if user.user_type == 'admin': 
        OTPVerification.objects.filter(
            user=user,
            otp_type='login_2fa',
            is_used=False
        ).update(is_used=True)
        otp = generate_otp()
        OTPVerification.objects.create(
            user=user,
            otp_code=otp,
            otp_type='login_2fa',
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )
        sent = send_otp_email(email, otp, otp_type="login_2fa")
        print(f"Login 2FA OTP for {email}: {otp}")
        return Response({"message": "2FA OTP sent to email. Please verify to complete login."})
    token = generate_token()

    # Extract device info from headers
    device = request.META.get('HTTP_USER_AGENT', 'Unknown Device')

    # Create session with device info
    Session.objects.create(
        user=user,
        session_token=token,
        expires_at=timezone.now() + datetime.timedelta(days=7),
        device=device
    )
    
    return Response({
        "token": token,
        "user_type": user.user_type,
        "username": user.username,
        "email": user.email, 
        "user_id": user.user_id,
        "device": device
    })

# ---------- Logout ----------
@swagger_auto_schema(method='post', request_body=logout_schema, responses={200: 'Logged out successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_user(request):
    data = request.data
    token = data.get("token")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    try:
        session = Session.objects.get(session_token=token, is_active=True)
        session.is_active = False
        session.save()
        return Response({"message": "Logged out successfully"})
    except Session.DoesNotExist:
        return Response({"error": "Invalid session"}, status=400)


# ---------- Logout All Sessions ----------
@swagger_auto_schema(method='post', request_body=logout_all_schema, responses={200: 'All sessions logged out'})
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_all_sessions(request):
    data = request.data
    token = data.get("token")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)
    
    # Deactivate all sessions for this user
    count = Session.objects.filter(user=user, is_active=True).update(is_active=False)
    
    return Response({
        "message": "All sessions logged out successfully",
        "sessions_closed": count
    })


# ---------- Forgot Password ----------
@swagger_auto_schema(method='post', request_body=forgot_password_schema, responses={200: 'Password reset OTP sent'})
@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")
    
    if not email:
        return Response({"error": "Email is required"}, status=400)
    
    try:
        user = User.objects.get(email=email)
        
        # Mark all previous password reset OTPs as used
        OTPVerification.objects.filter(
            user=user, 
            otp_type='password_reset', 
            is_used=False
        ).update(is_used=True)
        
        # Generate new OTP
        otp = generate_otp()
        OTPVerification.objects.create(
            user=user,
            otp_code=otp,
            otp_type='password_reset',
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )
        
        print(f"Password Reset OTP for {email}: {otp}")
        sent = send_otp_email(email, otp, otp_type="password_reset")
        # Note: for security we still return generic message even if email invalid
        # if not sent:
        #     # you can still return generic success to avoid revealing existing emails:
        #     return Response({"message": "If the email exists, a password reset OTP has been sent"})
        return Response({"status": sent})

    except User.DoesNotExist:
        # Don't reveal if email exists
        return Response({"message": "If the email exists, a password reset OTP has been sent"})


# ---------- Reset Password ----------
@swagger_auto_schema(method='post', request_body=reset_password_schema, responses={200: 'Password reset successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    data = request.data
    email = data.get("email")
    otp_code = data.get("otp")
    new_password = data.get("new_password")

    if not all([email, otp_code, new_password]):
        return Response({"error": "Missing required fields"}, status=400)

    if len(new_password) < 8:
        return Response({"error": "Password must be at least 8 characters"}, status=400)

    try:
        user = User.objects.get(email=email)
        otp = OTPVerification.objects.filter(
            user=user, 
            otp_code=otp_code, 
            otp_type='password_reset',
            is_used=False
        ).latest('created_at')
        
        if otp.expires_at < timezone.now():
            return Response({"error": "OTP expired"}, status=400)
        
        otp.is_used = True
        otp.save()
        
        user.set_password(new_password)
        user.save()
        
        # Invalidate all existing sessions for security
        Session.objects.filter(user=user, is_active=True).update(is_active=False)
        
        return Response({"message": "Password reset successfully. Please login again."})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except OTPVerification.DoesNotExist:
        return Response({"error": "Invalid OTP"}, status=400)


# ---------- Change Password ----------
@swagger_auto_schema(method='post', request_body=change_password_schema, responses={200: 'Password changed successfully'})
@api_view(['POST'])
@permission_classes([AllowAny])
def change_password(request):
    data = request.data
    token = data.get("token")
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not all([token, old_password, new_password]):
        return Response({"error": "Missing required fields"}, status=400)

    if len(new_password) < 8:
        return Response({"error": "Password must be at least 8 characters"}, status=400)

    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)

    if not user.check_password(old_password):
        return Response({"error": "Old password incorrect"}, status=401)
    
    if old_password == new_password:
        return Response({"error": "New password must be different from old password"}, status=400)

    user.set_password(new_password)
    user.save()
    
    # Invalidate all other sessions except current one
    Session.objects.filter(user=user, is_active=True).exclude(session_token=token).update(is_active=False)
    
    return Response({"message": "Password changed successfully"})


# ---------- Check Username ----------
@swagger_auto_schema(method='post', request_body=check_username_schema, responses={200: 'Username check'})
@api_view(['POST'])
@permission_classes([AllowAny])
def check_username(request):
    username = request.data.get("username")
    
    if not username:
        return Response({"error": "Username is required"}, status=400)
    
    exists = User.objects.filter(username=username).exists()
    return Response({"exists": exists, "available": not exists})


# ---------- Check Email ----------
@swagger_auto_schema(method='post', request_body=check_email_schema, responses={200: 'Email check'})
@api_view(['POST'])
@permission_classes([AllowAny])
def check_email(request):
    email = request.data.get("email")
    
    if not email:
        return Response({"error": "Email is required"}, status=400)
    
    exists = User.objects.filter(email=email).exists()
    return Response({"exists": exists, "available": not exists})


# ---------- Verify Token ----------
@swagger_auto_schema(method='post', request_body=verify_token_schema, responses={200: 'Token valid'})
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_token(request):
    token = request.data.get("token")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"valid": False, "error": "Invalid or expired token"}, status=401)
    
    return Response({
        "valid": True,
        "user": {
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
            "is_verified": user.is_verified
        }
    })


# ---------- Check Active Sessions ----------
@swagger_auto_schema(method='post', request_body=check_sessions_schema, responses={200: 'Active sessions listed'})
@api_view(['POST'])
@permission_classes([AllowAny])
def check_active_sessions(request):
    token = request.data.get("token")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)
    
    sessions = Session.objects.filter(
        user=user, 
        is_active=True,
        expires_at__gt=timezone.now()
    ).order_by('-created_at')
    
    data = [
        {
            "session_token": s.session_token, 
            "is_current": s.session_token == token,
            "created_at": s.created_at,
            "expires_at": s.expires_at, \
            "device" : s.device
        } for s in sessions
    ]
    
    return Response({
        "active_sessions": data,
        "total_count": len(data)
    })


# ---------- Delete Specific Session ----------
@swagger_auto_schema(method='post', request_body=delete_session_schema, responses={200: 'Session deleted'})
@api_view(['POST'])
@permission_classes([AllowAny])
def delete_session(request):
    data = request.data
    token = data.get("token")
    session_token = data.get("session_token")
    
    if not all([token, session_token]):
        return Response({"error": "Missing required fields"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)
    
    try:
        session = Session.objects.get(
            user=user,
            session_token=session_token,
            is_active=True
        )
        session.is_active = False
        session.save()
        return Response({"message": "Session deleted successfully"})
    except Session.DoesNotExist:
        return Response({"error": "Session not found"}, status=404)


# ---------- Get User Profile ----------
@swagger_auto_schema(
    method='post', 
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={'token': openapi.Schema(type=openapi.TYPE_STRING)},
        required=['token']
    ),
    responses={200: 'User profile retrieved'}
)
@api_view(['POST'])
@permission_classes([AllowAny])
def get_profile(request):
    token = request.data.get("token")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)
    
    return Response({
        "username": user.username,
        "email": user.email,
        "user_type": user.user_type,
        "is_verified": user.is_verified
    })


# ---------- Update Profile ----------
@swagger_auto_schema(method='post', request_body=update_profile_schema, responses={200: 'Profile updated'})
@api_view(['POST'])
@permission_classes([AllowAny])
def update_profile(request):
    data = request.data
    token = data.get("token")
    username = data.get("username")
    email = data.get("email")
    
    if not token:
        return Response({"error": "Token is required"}, status=400)
    
    user = get_user_from_token(token)
    if not user:
        return Response({"error": "Invalid or expired token"}, status=401)
    
    # Update username if provided and different
    if username and username != user.username:
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists"}, status=400)
        user.username = username
    
    # Update email if provided and different
    if email and email != user.email:
        if User.objects.filter(email=email).exists():
            return Response({"error": "Email already exists"}, status=400)
        user.email = email
        user.is_verified = False  # Require re-verification
        
        # Send verification OTP
        otp = generate_otp()
        OTPVerification.objects.create(
            user=user,
            otp_code=otp,
            otp_type='registration',
            expires_at=timezone.now() + datetime.timedelta(minutes=10)
        )
        sent = send_otp_email(email, otp, otp_type="email_change")
        if not sent:
            return Response({"error": "Invalid or unreachable new email address."}, status=status.HTTP_400_BAD_REQUEST)
        print(f"Email Change OTP for {email}: {otp}")
    user.save()
    
    response_data = {
        "message": "Profile updated successfully",
        "username": user.username,
        "email": user.email
    }
    
    if email and email != user.email:
        response_data["verification_required"] = True
        response_data["message"] = "Profile updated. Please verify your new email."
    
    return Response(response_data)

def generate_random_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(random.choice(chars) for _ in range(length))

# ---------- Google Login ----------
google_login_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        "token": openapi.Schema(type=openapi.TYPE_STRING, description="Google OAuth ID token")
    },
    required=["token"]
)

@swagger_auto_schema(method='post', request_body=google_login_schema, responses={200: 'Login successful via Google'})
@api_view(['POST'])
@permission_classes([AllowAny])
def login_with_google(request):
    data = request.data
    token = data.get("token")

    if not token:
        return Response({"error": "Google token is required"}, status=400)

    # Verify Google token
    google_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"
    try:
        resp = requests.get(google_url)
        if resp.status_code != 200:
            return Response({"error": "Invalid Google token"}, status=401)

        google_data = resp.json()
        email = google_data.get("email")
        if not email:
            return Response({"error": "Google token missing email"}, status=400)

        # Check if user exists, else create
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email.split("@")[0] + "".join(random.choices(string.digits, k=4)),
                "user_type": "customer",
                "is_verified": True
            }
        )

        # Create session token
        session_token = generate_token()
        Session.objects.create(
            user=user,
            session_token=session_token,
            expires_at=timezone.now() + datetime.timedelta(days=7)
        )

        return Response({
            "token": session_token,
            "user_type": user.user_type,
            "username": user.username,
            "email": user.email,
            "created": created
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(['POST'])
def microsoft_login(request):
    code = request.data.get("code")  # code sent from frontend
    if not code:
        return Response({"detail": "Missing code"}, status=400)

    # Exchange code for access token
    token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    data = {
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": MICROSOFT_REDIRECT_URI,
    }
    r = requests.post(token_url, data=data)
    token_data = r.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return Response({"detail": "Failed to get access token"}, status=400)

    # Fetch user info
    user_resp = requests.get(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    user_data = user_resp.json()
    email = user_data.get("mail") or user_data.get("userPrincipalName")
    username = user_data.get("displayName")

    # TODO: create or fetch user in your database
    # return token for your app (JWT or your auth token)
    return Response({
        "token": "your-app-token",
        "user_type": "customer",
        "username": username,
        "email": email,
        "created": True
    })

@swagger_auto_schema(
    method='post',
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={'code': openapi.Schema(type=openapi.TYPE_STRING, description='GitHub OAuth code')},
        required=['code']
    ),
    responses={200: 'GitHub login successful'}
)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def github_login(request):
    """
    Handles GitHub OAuth login using the authorization code.
    """
    code = request.data.get("code")
    if not code:
        return Response({"error": "Missing code"}, status=status.HTTP_400_BAD_REQUEST)

    # Step 1: Exchange code for access token
    token_url = "https://github.com/login/oauth/access_token"
    payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }

    headers = {"Accept": "application/json"}
    token_response = requests.post(token_url, data=payload, headers=headers)
    token_data = token_response.json()

    if "error" in token_data or "access_token" not in token_data:
        return Response({"error": "Failed to exchange code", "details": token_data}, status=status.HTTP_400_BAD_REQUEST)

    access_token = token_data["access_token"]

    # Step 2: Get user info
    user_response = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}", "Accept": "application/json"}
    )
    email_response = requests.get(
        "https://api.github.com/user/emails",
        headers={"Authorization": f"token {access_token}", "Accept": "application/json"}
    )

    user_json = user_response.json()
    emails_json = email_response.json()
    primary_email = None

    # Choose primary email
    if isinstance(emails_json, list):
        for e in emails_json:
            if e.get("primary"):
                primary_email = e.get("email")
                break
        if not primary_email and emails_json:
            primary_email = emails_json[0].get("email")

    if not primary_email:
        return Response({"error": "No email found from GitHub"}, status=status.HTTP_400_BAD_REQUEST)

    # Step 3: Find or create user
    user, created = User.objects.get_or_create(
        email=primary_email,
        defaults={
            "username": user_json.get("login"),
            "user_type": "customer",
            "is_verified": True,
        }
    )

    # Step 4: Create session token
    session_token = generate_token()
    Session.objects.create(
        user=user,
        session_token=session_token,
        expires_at=timezone.now() + datetime.timedelta(days=7)
    )

    return Response({
    "token": session_token,
    "email": user.email,
    "username": user.username,
    "user_type": user.user_type,
    "user_id": user.user_id,  # ✅ added
    "created": created,
})

# ---------- Delete User ----------
@swagger_auto_schema(
    method='post', 
    request_body=delete_user_schema, 
    responses={
        200: 'User account deleted successfully',
        400: 'Token is required',
        401: 'Invalid or expired token'
    }
)
@api_view(['POST'])
@permission_classes([AllowAny])
def delete_user(request):
    """
    Deletes a user's account based on their session token.
    This action is irreversible and will also remove all associated data.
    """
    token = request.data.get("token")

    if not token:
        return Response(
            {"error": "Token is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    user = get_user_from_token(token)
    if not user:
        return Response(
            {"error": "Invalid or expired token. User not found."}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        # Deleting the user object. Django's ORM will handle cascading
        # deletions for related models like Session and OTPVerification,
        # provided the foreign keys are set up with `on_delete=models.CASCADE`.
        user.delete()
        
        return Response(
            {"message": "User account has been successfully deleted."}, 
            status=status.HTTP_200_OK
        )
    except Exception as e:
        # Optional: Log the error for debugging purposes
        # logger.error(f"Error deleting user {user.email}: {e}")
        return Response(
            {"error": "An unexpected error occurred while deleting the account."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )