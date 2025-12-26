from datetime import timedelta
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser,AllowAny
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from bookings.models import Booking
from payments.models import Transaction
from user_management.models import ServiceProvider,Customer
from authapi.models import User


class AdminDashboardView(APIView):
    """
    Admin Dashboard Metrics:
    - Total Active Users
    - Bookings Today
    - Revenue Today
    (With Day-over-Day Growth)
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="Get Admin Dashboard Metrics (with Growth)",
        operation_description="Returns total active users, today's bookings, and today's revenue with growth compared to yesterday.",
        responses={
            200: openapi.Response(
                description="Dashboard metrics retrieved successfully",
                examples={
                    "application/json": {
                        "total_active_users": {
                            "value": 24583,
                            "label": "Total Active Users",
                            "growth": "+12.5%"
                        },
                        "bookings_today": {
                            "value": 1247,
                            "label": "Bookings Today",
                            "growth": "+8.2%"
                        },
                        "revenue_today": {
                            "value": 127450.0,
                            "label": "Revenue Today",
                            "growth": "+15.3%"
                        }
                    }
                }
            )
        }
    )
    def get(self, request):
        now = timezone.now()
        today = now.date()
        yesterday = today - timedelta(days=1)

        # --- Define time windows ---
        start_today = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )
        end_today = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.max.time())
        )
        start_yesterday = timezone.make_aware(
            timezone.datetime.combine(yesterday, timezone.datetime.min.time())
        )
        end_yesterday = timezone.make_aware(
            timezone.datetime.combine(yesterday, timezone.datetime.max.time())
        )

        # --- 1️⃣ Total Active Users ---
        total_active_users_today = User.objects.filter(is_active=True).count()

        user_growth = self.calculate_growth(
            total_active_users_today,total_active_users_today
        )

        # --- 2️⃣ Bookings Today ---
        bookings_today = Booking.objects.filter(
            booking_date__range=(start_today, end_today)
        ).count()

        bookings_yesterday = Booking.objects.filter(
            booking_date__range=(start_yesterday, end_yesterday)
        ).count()

        booking_growth = self.calculate_growth(bookings_today, bookings_yesterday)

        # --- 3️⃣ Revenue Today ---
        revenue_today = (
            Transaction.objects.filter(
                status="Success", transaction_date__range=(start_today, end_today)
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        revenue_yesterday = (
            Transaction.objects.filter(
                status="Success", transaction_date__range=(start_yesterday, end_yesterday)
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        revenue_growth = self.calculate_growth(revenue_today, revenue_yesterday)

        # --- Response ---
        data = {
            "total_active_users": {
                "value": total_active_users_today,
                "label": "Total Active Users",
                "growth": user_growth
            },
            "bookings_today": {
                "value": bookings_today,
                "label": "Bookings Today",
                "growth": booking_growth
            },
            "revenue_today": {
                "value": float(revenue_today),
                "label": "Revenue Today",
                "growth": revenue_growth
            },
        }

        return Response(data)

    def calculate_growth(self, today_value, yesterday_value):
        """Calculate percentage growth between today and yesterday"""
        if yesterday_value == 0:
            if today_value == 0:
                return "0%"
            else:
                return "+∞%"  # Infinite growth (no value yesterday)
        growth = ((today_value - yesterday_value) / yesterday_value) * 100
        sign = "+" if growth >= 0 else ""
        return f"{sign}{growth:.1f}%"
class AdminUserListView(APIView):
    """
    Returns a list of all users (Customers & Providers)
    with type, status, booking count, and join date.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        users = User.objects.all().select_related(
            "customer_profile", "provider_profile"
        )

        user_data = []
        for user in users:
            # --- Determine user type ---
            if hasattr(user, "customer_profile"):
                user_type = "Customer"
            elif hasattr(user, "provider_profile"):
                user_type = "Provider"
            else:
                user_type = "Admin"

            # --- Booking count ---
            bookings_count = Booking.objects.filter(customer=user).count()

            # --- Account status ---
            if not user.is_active:
                status = "Blocked"
            elif hasattr(user, "provider_profile") and user.provider_profile.status == "Pending":
                status = "Pending"
            elif hasattr(user, "provider_profile") and user.provider_profile.status == "Rejected":
                status = "Rejected"
            elif hasattr(user, "provider_profile") and user.provider_profile.status == "Approved":
                status = "Active"
            else:
                status = "Active"

            user_data.append({
                "id": user.user_id,
                "name": user.username,
                "email": user.email,
                "type": user.user_type,
                "status": status,
                "bookings": bookings_count,
                "joined_at": user.created_at,})

        return Response({
            "count": len(user_data),
            "results": user_data
        })
    
class AdminProviderPerformanceOverviewView(APIView):
    """
    Provides overview of service providers:
    - Provider Name
    - Total Bookings
    - Average Rating
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="Get Provider Performance Overview",
        operation_description="Returns list of service providers with booking count and average rating.",
        responses={
            200: openapi.Response(
                description="Provider performance overview",
                examples={
                    "application/json": [
                        {
                            "name": "SkyJet Airlines",
                            "bookings": 1250,
                            "rating": 4.8
                        },
                        {
                            "name": "FastTrack Railways",
                            "bookings": 890,
                            "rating": 4.6
                        },
                        {
                            "name": "ComfortBus Services",
                            "bookings": 660,
                            "rating": 4.5
                        }
                    ]
                }
            )
        }
    )
    def get(self, request):
        # Fetch all approved providers
        providers = ServiceProvider.objects.filter()

        provider_data = []
        for provider in providers:
            # Count total bookings for this provider
            booking_count = Booking.objects.filter(provider=provider.user).count()

            # Use rating field from ServiceProvider model
            avg_rating = round(provider.rating, 1) if provider.rating else 0.0

            provider_data.append({
                "name": provider.company_name or provider.user.username,
                "bookings": booking_count,
                "rating": avg_rating
            })

        # Sort by booking count descending
        provider_data.sort(key=lambda x: x["bookings"], reverse=True)

        return Response(provider_data)

from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from payments.models import Transaction, Settlement, Refund


class FinancialCenterOverviewView(APIView):
    """
    Admin Financial Center Overview:
    - Today's, This Week's, This Month's Revenue
    - Pending Settlements
    - Recent Transaction History
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="Get Financial Center Overview",
        operation_description=(
            "Returns current revenue statistics, pending settlements, "
            "and latest transactions for admin analytics dashboard."
        ),
        responses={
            200: openapi.Response(
                description="Financial dashboard overview",
                examples={
                    "application/json": {
                        "summary": {
                            "today_revenue": 127450,
                            "week_revenue": 645280,
                            "month_revenue": 2800000,
                            "pending_settlements": {
                                "amount": 45820,
                                "count": 12
                            }
                        },
                        "transactions": [
                            {
                                "txn_id": "TXN-B9012",
                                "type": "Booking",
                                "customer": "John Smith",
                                "amount": 850,
                                "status": "Success",
                                "method": "Credit Card",
                                "date": "2025-11-10T10:30:00Z"
                            }
                        ]
                    }
                },
            )
        },
    )
    def get(self, request):
        now = timezone.now()

        # --- Define time frames ---
        today_start = timezone.make_aware(timezone.datetime.combine(now.date(), timezone.datetime.min.time()))
        week_start = today_start - timedelta(days=now.weekday())  # Monday
        month_start = timezone.make_aware(timezone.datetime(now.year, now.month, 1))

        # --- Revenue Aggregation ---
        today_revenue = (
            Transaction.objects.filter(status="Success", transaction_date__gte=today_start)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        week_revenue = (
            Transaction.objects.filter(status="Success", transaction_date__gte=week_start)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )
        month_revenue = (
            Transaction.objects.filter(status="Success", transaction_date__gte=month_start)
            .aggregate(total=Sum("amount"))["total"]
            or 0
        )

        # --- Pending Settlements ---
        pending_settlements_qs = Settlement.objects.filter(status="Pending")
        pending_amount = pending_settlements_qs.aggregate(total=Sum("amount"))["total"] or 0
        pending_count = pending_settlements_qs.count()

        # --- Recent Transactions ---
        recent_txns = (
            Transaction.objects.select_related("customer_user")
            .order_by("-transaction_date")[:10]
        )

        txn_list = []
        for txn in recent_txns:
            txn_type = "Booking"
            if Refund.objects.filter(transaction=txn).exists():
                txn_type = "Refund"

            txn_list.append({
                "txn_id": f"TXN-{str(txn.txn_id)[:8].upper()}",
                "type": txn_type,
                "customer": txn.customer_user.username,
                "amount": float(txn.amount),
                "status": txn.status,
                "method": txn.method,
                "date": txn.transaction_date,
            })

        # --- Build Response ---
        data = {
            "summary": {
                "today_revenue": float(today_revenue),
                "week_revenue": float(week_revenue),
                "month_revenue": float(month_revenue),
                "pending_settlements": {
                    "amount": float(pending_amount),
                    "count": pending_count
                }
            },
            "transactions": txn_list
        }

        return Response(data)
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import time


class FullAccessQueryRunnerView(APIView):
    """
    Full SQL Query Runner for Admins:
    Executes any SQL (SELECT, INSERT, UPDATE, DELETE, CREATE, etc.).
    Returns rows for SELECT queries, affected row count for others.
    """
    permission_classes = [AllowAny]

    @swagger_auto_schema(
        operation_summary="Execute any SQL query (Full Access)",
        operation_description=(
            "Allows admins to execute **any valid SQL query** — including SELECT, INSERT, UPDATE, DELETE, "
            "and DDL statements. Returns results or affected row counts."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "query": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    example="UPDATE bookings_booking SET status='Confirmed' WHERE id=1;"
                )
            },
            required=["query"],
        ),
        responses={
            200: openapi.Response(
                description="SQL executed successfully",
                examples={
                    "application/json": {
                        "query_type": "UPDATE",
                        "affected_rows": 1,
                        "execution_time_ms": 15,
                        "message": "Query executed successfully"
                    }
                },
            ),
            400: "SQL syntax error or execution failed"
        },
    )
    def post(self, request):
        query = request.data.get("query", "").strip()

        if not query:
            return Response({"error": "No query provided."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with connection.cursor() as cursor:
                start_time = time.time()
                cursor.execute(query)

                query_type = query.split()[0].upper()
                elapsed_ms = int((time.time() - start_time) * 1000)

                # Handle SELECT separately to return results
                if query_type == "SELECT":
                    rows = cursor.fetchall()
                    columns = [col[0] for col in cursor.description]
                    return Response({
                        "query_type": query_type,
                        "execution_time_ms": elapsed_ms,
                        "rows_returned": len(rows),
                        "columns": columns,
                        "data": rows
                    })

                # For non-SELECT queries, return affected row count
                affected_rows = cursor.rowcount
                connection.commit()

                return Response({
                    "query_type": query_type,
                    "execution_time_ms": elapsed_ms,
                    "affected_rows": affected_rows,
                    "message": "Query executed successfully"
                })

        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

