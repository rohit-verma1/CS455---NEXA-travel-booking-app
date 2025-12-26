# settings.py
import dj_database_url
import os
from pathlib import Path
import drf_yasg

DATABASES = {
    'default': dj_database_url.parse(os.getenv('DATABASE_URL', 'postgresql://neondb_owner:npg_T5Hsiky3RFoY@ep-patient-violet-a1i3d548-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require')),
}
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'silk.middleware.SilkyMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'corsheaders.middleware.CorsMiddleware',
]
BASE_DIR = Path(__file__).resolve().parent.parent



INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_yasg',
    'authapi',
    'corsheaders',
    'services',
    'bookings',
    'payments',
    'drf_spectacular', 
    'agenticai',
    'analytics',
    'Notifications',
    'provideranalytics',
    "django_celery_beat",
    "adminanalytics",
    'forums',
    'silk',
    'user_management.apps.UserManagementConfig',
]
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ALLOWED_HOSTS = ["127.0.0.1", "localhost","172.24.194.148","172.26.122.63", "0.0.0.0"]

ROOT_URLCONF = 'backend.urls'  
CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:3000",
    "http://localhost:3000",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    "content-type",
    "authorization",
]

DEBUG = True
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')  # for production
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),  # optional: for your own static assets
]

SECRET_KEY = '*2zd@8oee*m$(ps3(fzqtl)wy8qgdl^09ym+(*ugp(dwy0e@&2'
AUTH_USER_MODEL = 'authapi.User'  

# Email configuration
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "jonnalikithsai@gmail.com")          # replace with sender email
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "jshh cnbb bfvd ydsn")    # not your Gmail password
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'authapi.authentication.CustomTokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_RATES': {
                'anon': '50/m',
                'user': '100/m'
            },
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle', 
        'rest_framework.throttling.UserRateThrottle'  
    ],
     "DEFAULT_FIELD_MAPPING": {
        "DateTimeField": "common.fields.UTCDateTimeField"
    },

}


SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Token': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Paste your DRF Token here with the prefix "Token". Example: Token 123abc456xyz',
        }
    },
    'USE_SESSION_AUTH': False,
}

GEMINI_API_KEY = "AIzaSyA0thm94p0s1KtXc0n4FSL58QeIBNZm9Io"
API_BASE_URL =  "http://127.0.0.1:8000/"
USE_TZ = True
TIME_ZONE = "UTC"
# Celery + Redis Configuration
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")   # Redis broker
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
