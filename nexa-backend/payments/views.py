# payments/views.py
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from decimal import Decimal
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import decimal
from rest_framework.views import APIView

from .models import Transaction, Refund, Settlement, LoyaltyWallet
from .serializers import TransactionSerializer, RefundSerializer, SettlementSerializer, LoyaltyWalletSerializer,TransactionListSerializer
from bookings.models import Booking, Ticket, BookingStatus

class PaymentViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Confirm payment for a booking",
        operation_description=(
            "Confirm payment for a booking (booking must be in 'Pending' state). "
            "Creates a Transaction record, marks the Booking as Paid+Confirmed, issues a Ticket, "
            "and awards loyalty points to the customer."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['booking_id'],
            properties={
                'booking_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description='UUID of the booking to pay for'),
                'method': openapi.Schema(type=openapi.TYPE_STRING, description='Payment method (e.g. Card, UPI, Simulated Card)', default='Simulated Card')
            }
        ),
        responses={
            200: openapi.Response(
                description="Payment successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'transaction': openapi.Schema(type=openapi.TYPE_OBJECT),
                        'ticket_no': openapi.Schema(type=openapi.TYPE_STRING),
                        'points_earned': openapi.Schema(type=openapi.TYPE_NUMBER, format='float')
                    }
                )
            ),
            400: "Bad Request",
            404: "Booking not found"
        },
        examples={
            "application/json": {
                "message": "Payment successful",
                "transaction": {"txn_id": "uuid", "amount": 1200.00, "status": "Success"},
                "ticket_no": "NEXA-ABC12345",
                "points_earned": 60.0
            }
        }
    )
    @action(detail=False, methods=['post'], url_path='confirm')
    @db_transaction.atomic
    def confirm(self, request):
        """
        Confirm payment for a booking_id.
        Body: { "booking_id": "<uuid>", "method": "Card" }
        """
        booking_id = request.data.get('booking_id')
        method = request.data.get('method', 'Simulated Card')

        if not booking_id:
            return Response({"detail": "booking_id required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.select_for_update().get(booking_id=booking_id, customer=request.user)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.payment_status == 'Paid':
            return Response({"detail": "Booking already paid."}, status=status.HTTP_400_BAD_REQUEST)

        # create transaction
        txn = Transaction.objects.create(
            booking=booking,
            customer_user=request.user,
            provider_user=(
                booking.service_object.provider_user_id
                if hasattr(booking.service_object, 'provider_user_id')
                else None
            ),
            amount=booking.total_amount,
            method=method,
            status='Success'
        )

        # mark booking confirmed
        booking.status = 'Confirmed'
        booking.payment_status = 'Paid'
        booking.save(update_fields=['status', 'payment_status', 'updated_at'])

        # create ticket
        ticket = Ticket.objects.create(
            booking=booking,
            ticket_no=f"NEXA-{booking.booking_id.hex[:8].upper()}",
            is_valid=True
        )

        # loyalty award
        wallet, _ = LoyaltyWallet.objects.get_or_create(user=request.user)
        earned_points = float(booking.total_amount) * wallet.conversion_rate * 0.05
        wallet.balance_points += decimal.Decimal(earned_points)
        wallet.save()

        # booking status log
        BookingStatus.objects.create(booking=booking, status='Confirmed', remarks=f'Payment confirmed: txn {txn.txn_id}')

        return Response({
            "message": "Payment successful",
            "transaction": TransactionSerializer(txn).data,
            "ticket_no": ticket.ticket_no,
            "points_earned": earned_points
        }, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_summary="Get my loyalty wallet",
        operation_description="Retrieve current user's loyalty wallet (balance and conversion rate).",
        responses={200: LoyaltyWalletSerializer}
    )
    @action(detail=False, methods=['get'], url_path='wallet')
    def wallet(self, request):
        wallet, _ = LoyaltyWallet.objects.get_or_create(user=request.user)
        return Response(LoyaltyWalletSerializer(wallet).data)


class RefundViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Process a refund (Admin)",
        operation_description=(
            "Approve or reject a pending refund. Only admin (or payment-role) should call this.\n\n"
            "If approved, this will mark the refund Completed, update the Transaction to 'Refunded', "
            "mark the booking as Cancelled/Refunded, and attempt to reverse loyalty points."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['refund_id'],
            properties={
                'refund_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description='UUID of refund to process'),
                'action': openapi.Schema(type=openapi.TYPE_STRING, enum=['approve','reject'], description='approve or reject', default='approve')
            }
        ),
        responses={
            200: openapi.Response(description="Refund processed", schema=openapi.Schema(type=openapi.TYPE_OBJECT)),
            400: "Bad Request",
            404: "Refund not found"
        },
        examples={
            "application/json": {
                "detail": "Refund processed.",
                "refund": {"refund_id": "uuid", "amount": 1200.0, "status": "Completed"}
            }
        }
    )
    @action(detail=False, methods=['post'], url_path='process', permission_classes=[AllowAny])
    @db_transaction.atomic
    def process(self, request):
        refund_id = request.data.get('refund_id')
        action_ = request.data.get('action', 'approve')

        if not refund_id:
            return Response({"detail": "refund_id required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            refund = Refund.objects.select_for_update().get(refund_id=refund_id)
        except Refund.DoesNotExist:
            return Response({"detail": "Refund not found."}, status=status.HTTP_404_NOT_FOUND)

        if action_ == 'reject':
            refund.status = 'Failed'
            refund.completed_at = timezone.now()
            refund.save()
            return Response({"detail": "Refund rejected."}, status=status.HTTP_200_OK)

        # Approve: simulate external gateway refund success
        refund.status = 'Completed'
        refund.completed_at = timezone.now()
        refund.save()

        txn = refund.transaction
        txn.status = 'Refunded'
        txn.save()

        booking = txn.booking
        booking.payment_status = 'Refunded'
        booking.status = 'Cancelled'
        booking.save()

        # reverse loyalty (simple proportional reverse)
        wallet = LoyaltyWallet.objects.filter(user=booking.customer).first()
        if wallet:
            to_remove = float(refund.amount) * wallet.conversion_rate * 0.05
            wallet.balance_points = max(0, float(wallet.balance_points) - to_remove)
            wallet.save()

        BookingStatus.objects.create(booking=booking, status='Refunded', remarks=f'Refund completed: {refund.refund_id}')

        return Response({"detail": "Refund processed.", "refund": RefundSerializer(refund).data}, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_summary="Get my refunds",
        operation_description="Return list of refunds for the authenticated user.",
        responses={200: RefundSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='my', permission_classes=[IsAuthenticated])
    def my_refunds(self, request):
        qs = Refund.objects.filter(transaction__customer_user=request.user)
        return Response(RefundSerializer(qs, many=True).data)


class SettlementViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @swagger_auto_schema(
        operation_summary="Create settlement for provider (Admin)",
        operation_description=(
            "Create a settlement record for a provider for a given period.\n"
            "Calculates total successful transactions for the provider in period, applies platform fee (10%), "
            "and creates a Settlement with 'Pending' status for payout handling."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['provider_user_id', 'period_start', 'period_end'],
            properties={
                'provider_user_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description='UUID of provider user'),
                'period_start': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME, description='ISO datetime start of period'),
                'period_end': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_DATETIME, description='ISO datetime end of period')
            }
        ),
        responses={
            201: SettlementSerializer,
            400: "Bad Request"
        },
        examples={
            "application/json": {
                "message": "Settlement created.",
                "settlement": {
                    "settlement_id": "uuid",
                    "provider_username": "provider1",
                    "period_start": "2025-10-01T00:00:00Z",
                    "period_end": "2025-10-01T23:59:59Z",
                    "amount": 90000.00,
                    "currency": "INR",
                    "status": "Pending"
                }
            }
        }
    )
    @action(detail=False, methods=['post'], url_path='process')
    @db_transaction.atomic
    def process(self, request):
        provider_id = request.data.get('provider_user_id')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not (provider_id and period_start and period_end):
            return Response({"detail": "provider_user_id, period_start, period_end required."}, status=status.HTTP_400_BAD_REQUEST)

        start = timezone.datetime.fromisoformat(period_start)
        end = timezone.datetime.fromisoformat(period_end)

        txns = Transaction.objects.filter(provider_user_id=provider_id, status='Success', transaction_date__gte=start, transaction_date__lte=end)
        total = sum([float(t.amount) for t in txns]) if txns else 0.0

        platform_fee = total * 0.10
        payout = total - platform_fee

        settlement = Settlement.objects.create(
            provider_user_id=provider_id,
            period_start=start,
            period_end=end,
            amount=payout,
            currency='INR',
            status='Pending'
        )

        return Response({"message": "Settlement created.", "settlement": SettlementSerializer(settlement).data}, status=status.HTTP_201_CREATED)
class TransactionHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for provider's transaction history.
    """
    serializer_class = TransactionListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Transaction.objects.none()

        # ✅ Show only transactions where provider_user = logged-in user
        return (
            Transaction.objects.filter(provider_user=user)
            .select_related('booking')
            .order_by('-transaction_date')
        )

    @action(detail=False, methods=['get'], url_path='list')
    def list_transactions(self, request):
        """
        GET /api/transactions/list/
        Returns provider's transaction history.
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
class FinancialDashboardView(APIView):
    """
    Returns the complete financial dashboard summary for a provider:
    - Total Earnings
    - Pending Settlements
    - Refunds Issued
    - Platform Fees
    - Revenue Breakdown (Bus / Train / Flight / Miscellaneous)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # --- 1️⃣ TOTAL EARNINGS ---
        total_earnings = (
            Transaction.objects.filter(provider_user=user, status='Success')
            .aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )
        print("Total Earnings Query:", Transaction.objects.filter(provider_user=user, status='Success').query)

        # --- 2️⃣ PENDING SETTLEMENT ---
        pending_settlement = (
            Settlement.objects.filter(provider_user=user, status='Completed')
            .aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )

        # --- 3️⃣ REFUNDS ISSUED ---
        refunds_issued = (
            Refund.objects.filter(transaction__provider_user=user, status='Completed')
            .aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        )

        # --- 4️⃣ PLATFORM FEES ---
        platform_fees = (total_earnings * Decimal('0.00')).quantize(Decimal('0.01'))

        # --- 5️⃣ REVENUE BREAKDOWN ---
        transactions = (
            Transaction.objects.filter(provider_user=user, status='Success')
            .select_related('booking__content_type')
        )

        totals = {
            "Bus": Decimal('0.00'),
            "Train": Decimal('0.00'),
            "Flight": Decimal('0.00'),
            "Miscellaneous": Decimal('0.00'),
        }

        for txn in transactions:
            booking = txn.booking
            if not booking or not booking.content_type:
                totals["Miscellaneous"] += txn.amount
                continue

            model_name = booking.content_type.model.lower()
            if "bus" in model_name:
                totals["Bus"] += txn.amount
            elif "train" in model_name:
                totals["Train"] += txn.amount
            elif "flight" in model_name:
                totals["Flight"] += txn.amount
            else:
                totals["Miscellaneous"] += txn.amount

        total_revenue = sum(totals.values()) or Decimal('1.0')
        breakdown = [
            {
                "label": label,
                "value": totals[label],
                "percentage": round((totals[label] / total_revenue) * 100, 2)
            }
            for label in totals
        ]

        # --- 🧾 FINAL RESPONSE ---
        data = {
            "summary": {
                "total_earnings": total_earnings,
                "pending_settlement": total_earnings - pending_settlement,
                "refunds_issued": refunds_issued,
                "platform_fees": platform_fees,
            },
            "revenue_breakdown": breakdown
        }

        return Response(data)
    
class LoyaltyPointsView(APIView):
    """
    Returns the loyalty points summary for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        wallet, _ = LoyaltyWallet.objects.get_or_create(user=user)

        data = {
            "wallet_id": str(wallet.wallet_id),
            "balance_points": float(wallet.balance_points),
            "conversion_rate": float(wallet.conversion_rate),
            "last_updated": wallet.last_updated,
        }

        return Response(data)