# your_app/serializers.py

from rest_framework import serializers
from .models import Customer, CoTraveller, ServiceProvider, AdminUser


# ---------------------------
# CUSTOMER SERIALIZER
# ---------------------------
class CustomerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Customer
        fields = [
         'user', 'username', 'email',
            'first_name', 'last_name', 'nationality', 'gender',
            'marital_status', 'date_of_birth', 'secondary_email',
            'address', 'preferences', 'mobile_number',
        ]
        read_only_fields = ['user', 'username', 'email']


# ---------------------------
# CO-TRAVELLER SERIALIZER
# ---------------------------
class CoTravellerSerializer(serializers.ModelSerializer):
    customer_id = serializers.UUIDField(source='customer.user.id', read_only=True)
    customer_name = serializers.CharField(source='customer.user.username', read_only=True)

    class Meta:
        model = CoTraveller
        fields = [
             'traveller_id', 'customer_id', 'customer_name',
            'first_name', 'last_name', 'gender', 'marital_status',
            'date_of_birth', 'email', 'phone_number', 'address',
        ]
        read_only_fields = ['customer_id', 'customer_name']
        

# ---------------------------
# SERVICE PROVIDER SERIALIZER
# ---------------------------
class ServiceProviderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ServiceProvider
        fields = [
            'user', 'username', 'email',
            'company_name', 'license_info', 'contact_number',
            'status', 'verified', 'verified_at','rating','total_reviews','ratings_dict','comments'
        ]
        read_only_fields = ['user', 'username', 'email']
class ServiceProviderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProvider
        fields = [
            'company_name', 'license_info', 'contact_number',
            'status', 'verified', 'verified_at'
        ]
        read_only_fields = ['user', 'username', 'email']

class ServiceProviderCommentsSerializer(serializers.ModelSerializer):
    

    class Meta:
        model = ServiceProvider
        fields = [
            'rating','total_reviews','ratings_dict','comments'
        ]
        read_only_fields = ['rating','total_reviews','ratings_dict','comments']

# ---------------------------
# ADMIN SERIALIZER
# ---------------------------
class AdminUserSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = AdminUser
        fields = [ 'user', 'username', 'email', 'mfa_enabled']
        read_only_fields = ['user', 'username', 'email']

class ServiceProviderRatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProvider
        fields = ['rating', 'total_reviews', 'ratings_dict', 'comments']
        read_only_fields = ['total_reviews', 'ratings_dict']