from django.urls import path
from .views import AdminDashboardView,AdminUserListView,AdminProviderPerformanceOverviewView,FinancialCenterOverviewView,FullAccessQueryRunnerView

urlpatterns = [
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('user-stats/', AdminUserListView.as_view(), name='admin-user-stats'),
    path('provider-performance/', AdminProviderPerformanceOverviewView.as_view(), name='admin-provider-performance'),
    path('financial-overview/', FinancialCenterOverviewView.as_view(), name='financial-overview'),
    path('execute-sql/', FullAccessQueryRunnerView.as_view(), name='execute-sql'),
]
