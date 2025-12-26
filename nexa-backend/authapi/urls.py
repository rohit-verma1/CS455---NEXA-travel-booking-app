from django.urls import path
from . import views

urlpatterns = [
    # Registration & Verification
    path('register/', views.register, name='register'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('resend-otp/', views.resend_otp, name='resend_otp'),
    
    # Login & Logout
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),
    path('logout-all/', views.logout_all_sessions, name='logout_all'),
    
    # Google Login
    path('google-login/', views.login_with_google, name='google_login'),

    path('github-login/', views.github_login, name='github_login'),
    
    # Password Management
    path('forgot-password/', views.forgot_password, name='forgot_password'),
    path('reset-password/', views.reset_password, name='reset_password'),
    path('change-password/', views.change_password, name='change_password'),
    
    # Validation
    path('check-username/', views.check_username, name='check_username'),
    path('check-email/', views.check_email, name='check_email'),
    path('verify-token/', views.verify_token, name='verify_token'),
    
    # Session Management
    path('active-sessions/', views.check_active_sessions, name='active_sessions'),
    path('delete-session/', views.delete_session, name='delete_session'),
    
    # Profile
    path('profile/', views.get_profile, name='get_profile'),
    path('update-profile/', views.update_profile, name='update_profile'),

    path('delete-profile/', views.delete_user, name =  'Delete User')
]
