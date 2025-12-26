from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BusServiceViewSet,TrainServiceViewSet,FlightServiceViewSet,FlightCardViews,TrainCardViews,BusCardViews

router = DefaultRouter()
router.register(r'bus-services', BusServiceViewSet, basename='bus-service')
router.register(r'train-services', TrainServiceViewSet, basename='train-service')
router.register(r'flight-services', FlightServiceViewSet, basename='flight-service')
router.register(r'flight-card',FlightCardViews, basename =  'flight-card')
router.register(r'train-card',TrainCardViews, basename = 'train-card')
router.register(r'bus-card', BusCardViews, basename =  'bus-card')
urlpatterns = [
    path('', include(router.urls)),

]
