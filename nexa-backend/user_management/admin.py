# # your_app/admin.py

# from django.contrib import admin
# from django.utils.translation import gettext_lazy as _
# from .models import Customer, CoTraveller, ServiceProvider, AdminUser

# @admin.register(Customer)
# class CustomerAdmin(admin.ModelAdmin):
#     list_display = ('username', 'email', 'nationality', 'gender', 'date_of_birth')
#     search_fields = ('user__username', 'user__email', 'nationality')
#     list_filter = ('gender', 'marital_status', 'nationality')
#     ordering = ('user__username',)

#     # Make profile fields editable directly from the User change page (optional but nice)
#     # This requires defining an Inline class.
#     # class CustomerInline(admin.StackedInline):
#     #     model = Customer

# @admin.register(CoTraveller)
# class CoTravellerAdmin(admin.ModelAdmin):
#     list_display = ('first_name', 'last_name', 'customer_name', 'email', 'phone_number')
#     search_fields = ('first_name', 'last_name', 'customer__user__username', 'email')
#     list_filter = ('gender', 'marital_status')
#     ordering = ('customer__user__username', 'last_name', 'first_name')
#     # Make raw id fields easier to use
#     raw_id_fields = ('customer',)

# @admin.register(ServiceProvider)
# class ServiceProviderAdmin(admin.ModelAdmin):
#     list_display = ('company_name', 'username', 'status', 'verified', 'contact_number')
#     search_fields = ('company_name', 'user__username', 'user__email')
#     list_filter = ('status', 'verified')
#     ordering = ('company_name', 'user__username')
#     actions = ['approve_providers', 'reject_providers']

#     @admin.action(description=_('Approve selected service providers'))
#     def approve_providers(self, request, queryset):
#         for provider in queryset:
#             provider.approve()
#         self.message_user(request, f"{queryset.count()} providers approved successfully.")

#     @admin.action(description=_('Reject selected service providers'))
#     def reject_providers(self, request, queryset):
#         for provider in queryset:
#             provider.reject()
#         self.message_user(request, f"{queryset.count()} providers rejected successfully.")

# @admin.register(AdminUser)
# class AdminUserAdmin(admin.ModelAdmin):
#     list_display = ('username', 'email', 'mfa_enabled')
#     search_fields = ('user__username', 'user__email')
#     list_filter = ('mfa_enabled',)