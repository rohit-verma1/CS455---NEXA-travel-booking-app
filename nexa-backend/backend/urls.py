from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from rest_framework.authtoken import views as drf_auth_views
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework.authentication import SessionAuthentication, BasicAuthentication
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf.urls.static import static
from django.conf import settings

schema_view = get_schema_view(
    openapi.Info(
        title="Nexa Auth API",
        default_version='v1',
        description="API documentation for Authentication module",
        terms_of_service="https://www.google.com/policies/terms/",
        contact=openapi.Contact(email="support@nexa.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    authentication_classes  =  [SessionAuthentication,BasicAuthentication]
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # App URLs
    path('auth/', include('authapi.urls')),
    path('services/', include('services.urls')),
    path('payments/', include('payments.urls')),
    path('bookings/', include('bookings.urls')),
    path('user_management/', include('user_management.urls')),
    path("agenticai/", include(("agenticai.urls", "agenticai"), namespace="agenticai")),
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('analytics/', include('analytics.urls')),
    path('notifications/', include('Notifications.urls')),
    path('provideranalytics/', include('provideranalytics.urls')),
    path('adminanalytics/', include('adminanalytics.urls')),
    path('silk/', include('silk.urls', namespace='silk')),
    path('forums/', include('forums.urls')),
    # Token Authentication endpoint
    # path('api-token-auth/', drf_auth_views.obtain_auth_token, name='api_token_auth'),

    # Swagger and ReDoc documentation
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)