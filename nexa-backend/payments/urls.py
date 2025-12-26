# payments/urls.py
from django.urls import path,include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, RefundViewSet, SettlementViewSet,TransactionHistoryViewSet,FinancialDashboardView,LoyaltyPointsView
router =  DefaultRouter()
router.register(r'transactions', TransactionHistoryViewSet, basename='transactions')

urlpatterns = [
    path('confirm/', PaymentViewSet.as_view({'post': 'confirm'}), name='confirm-payment'),
    path('wallet/', PaymentViewSet.as_view({'get': 'wallet'}), name='wallet'),

    path('refunds/process/', RefundViewSet.as_view({'post': 'process'}), name='process-refund'),
    path('refunds/my/', RefundViewSet.as_view({'get': 'my_refunds'}), name='my-refunds'),

    path('settlements/process/', SettlementViewSet.as_view({'post': 'process'}), name='process-settlement'),
    path('finances-provider/', FinancialDashboardView.as_view(), name =  'dashboard-finances'),
    path('loyalty/', LoyaltyPointsView.as_view(), name='loyalty-points'),
    path('', include(router.urls))
]
