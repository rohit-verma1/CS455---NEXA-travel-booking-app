from datetime import timedelta
from django.db.models import Sum, Count, Avg, Q
from django.utils import timezone
from rest_framework import viewsets, status, serializers
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Review
from .serializers import ReviewSerializer, ProviderSummarySerializer
from bookings.models import Booking, BookingPassenger
from payments.models import Transaction, Refund
from services.models import BusService, TrainService, FlightService


# ----------------------------
# Provider analytics endpoints
# ----------------------------
class ProviderAnalyticsSummary(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Provider analytics summary",
        operation_description="Returns provider KPIs: total income, total bookings, occupancy, ratings, etc.",
        responses={200: ProviderSummarySerializer()}
    )
    def get(self, request):
        user = request.user
        if getattr(user, 'user_type', '').lower() not in ('provider', 'admin'):
            return Response({"detail": "Only providers or admins can access this endpoint."}, status=403)

        svc_models = [BusService, TrainService, FlightService]

        # total income
        total_income = Transaction.objects.filter(
            provider_user_id=user.pk, status__in=['Success', 'Completed', 'Succeeded']
        ).aggregate(total=Sum('amount'))['total'] or 0

        # provider services
        provider_service_ids = []
        for M in svc_models:
            provider_service_ids += list(
                M.objects.filter(Q(provider_user_id=user.pk) | Q(provider=user.pk)).values_list('service_id', flat=True)
            )

        total_bookings = Booking.objects.filter(service_id__in=provider_service_ids).count()
        total_services = len(provider_service_ids)

        # occupancy
        total_capacity, total_booked = 0, 0
        for M in svc_models:
            for s in M.objects.filter(Q(provider_user_id=user.pk) | Q(provider=user.pk)):
                cap = getattr(s, 'total_capacity', 0) or getattr(s, 'capacity', 0)
                booked = getattr(s, 'booked_seats', None)
                if booked is None:
                    booked = BookingPassenger.objects.filter(booking__service_id=s.service_id).count()
                total_capacity += cap or 0
                total_booked += booked or 0

        avg_occupancy = (total_booked / total_capacity * 100) if total_capacity else 0

        # ratings & refunds
        avg_rating = Review.objects.filter(provider_user=user, is_public=True).aggregate(avg=Avg('rating'))['avg']
        refund_total = Refund.objects.filter(transaction__provider_user_id=user.pk).aggregate(total=Sum('amount'))['total'] or 0

        cancelled = Booking.objects.filter(service_id__in=provider_service_ids, status__iexact='Cancelled').count()
        cancellation_rate = (cancelled / total_bookings * 100) if total_bookings else 0

        payload = {
            "provider_user_id": str(user.pk),
            "total_income": total_income,
            "total_bookings": total_bookings,
            "avg_occupancy": round(avg_occupancy, 2),
            "avg_rating": round(avg_rating, 2) if avg_rating else None,
            "total_services": total_services,
            "active_services": total_services,  # adjust if you track is_active
            "cancellation_rate": round(cancellation_rate, 2),
            "refund_amount": refund_total,
        }
        return Response(payload, status=200)


class ProviderTimeSeries(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Provider revenue/bookings timeseries",
        manual_parameters=[
            openapi.Parameter('days', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, description='Days back', default=30)
        ],
        responses={200: "Revenue and booking counts per day"}
    )
    def get(self, request):
        user = request.user
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        txns = Transaction.objects.filter(
            provider_user_id=user.pk, status__in=['Success', 'Completed'], transaction_date__gte=since
        ).extra({'day': "date(transaction_date)"}).values('day').annotate(total=Sum('amount')).order_by('day')

        svc_ids = []
        for M in (BusService, TrainService, FlightService):
            svc_ids += list(M.objects.filter(Q(provider_user_id=user.pk) | Q(provider=user.pk))
                            .values_list('service_id', flat=True))
        bookings = Booking.objects.filter(service_id__in=svc_ids, created_at__gte=since)
        bookings_by_day = bookings.extra({'day': "date(created_at)"}).values('day').annotate(count=Count('pk')).order_by('day')

        return Response({
            "revenue_by_day": list(txns),
            "bookings_by_day": list(bookings_by_day)
        })


class ProviderServiceMetrics(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(operation_summary="Per-service metrics for provider")
    def get(self, request):
        user = request.user
        svc_models = [BusService, TrainService, FlightService]
        results = []

        for M in svc_models:
            services = M.objects.filter(Q(provider_user_id=user.pk) | Q(provider=user.pk))
            for s in services:
                svc_id = getattr(s, 'service_id', None)
                cap = getattr(s, 'total_capacity', getattr(s, 'capacity', 0)) or 0
                booked = getattr(s, 'booked_seats', None)
                if booked is None:
                    booked = BookingPassenger.objects.filter(booking__service_id=svc_id).count()

                occupancy = (booked / cap * 100) if cap else 0
                revenue = Transaction.objects.filter(
                    provider_user_id=user.pk, booking__service_id=svc_id, status__in=['Success', 'Completed']
                ).aggregate(total=Sum('amount'))['total'] or 0

                results.append({
                    "service_mode": M.__name__,
                    "service_id": str(svc_id),
                    "service_name": getattr(s, 'name', None),
                    "capacity": cap,
                    "booked": booked,
                    "occupancy_pct": round(occupancy, 2),
                    "revenue": revenue,
                    "total_bookings": Booking.objects.filter(service_id=svc_id).count(),
                })

        return Response({"services": results})


# ----------------------------
# Reviews (auto-linked by service)
# ----------------------------
class ReviewViewSet(viewsets.ModelViewSet):
    """
    Customer reviews (auto-linked via service_id).
    Frontend only sends: service_id, rating, title, comment, is_public.
    """
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="Create a review (auto detects provider & mode)",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['service_id', 'rating'],
            properties={
                'service_id': openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
                'rating': openapi.Schema(type=openapi.TYPE_INTEGER, minimum=1, maximum=5),
                'title': openapi.Schema(type=openapi.TYPE_STRING),
                'comment': openapi.Schema(type=openapi.TYPE_STRING),
                'is_public': openapi.Schema(type=openapi.TYPE_BOOLEAN),
            },
            example={
                "service_id": "63ab9b41-8a41-4cc9-a6d7-6c8b70b26b8f",
                "rating": 5,
                "title": "Comfortable and clean",
                "comment": "Great experience!",
                "is_public": True
            }
        ),
        responses={201: ReviewSerializer}
    )
    def perform_create(self, serializer):
        user = self.request.user
        service_id = self.request.data.get('service_id')
        if not service_id:
            raise serializers.ValidationError({"detail": "service_id is required."})

        provider_user = None
        service_mode = None
        train_number = None

        # detect service type and provider
        svc = BusService.objects.filter(service_id=service_id).first()
        if svc:
            service_mode = 'Bus'
            provider_user = getattr(svc, 'provider_user', None) or getattr(svc, 'provider', None)
        else:
            svc = TrainService.objects.filter(service_id=service_id).first()
            if svc:
                service_mode = 'Train'
                provider_user = getattr(svc, 'provider_user', None) or getattr(svc, 'provider', None)
                train_number = getattr(svc, 'train_number', None)
            else:
                svc = FlightService.objects.filter(service_id=service_id).first()
                if svc:
                    service_mode = 'Flight'
                    provider_user = getattr(svc, 'provider_user', None) or getattr(svc, 'provider', None)

        if not svc:
            raise serializers.ValidationError({"detail": "Invalid service_id — no matching service found."})

        serializer.save(
            customer=user,
            provider_user=provider_user,
            service_mode=service_mode,
            train_number=train_number,
        )

    @swagger_auto_schema(operation_summary="My reviews")
    @action(detail=False, methods=['get'], url_path='my')
    def my_reviews(self, request):
        qs = Review.objects.filter(customer=request.user).order_by('-created_at')
        return Response(ReviewSerializer(qs, many=True).data)

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'user_type', '').lower() == 'customer':
            return Review.objects.filter(customer=user)
        return Review.objects.all().order_by('-created_at')


# ----------------------------
# Provider and Train review listings
# ----------------------------
class ProviderReviews(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="List reviews for a provider",
        manual_parameters=[
            openapi.Parameter('provider_user_id', openapi.IN_QUERY, type=openapi.TYPE_STRING, description='Optional provider ID (defaults to current user)'),
        ],
        responses={200: ReviewSerializer(many=True)}
    )
    def get(self, request):
        provider_id = request.query_params.get('provider_user_id') or request.user.pk
        qs = Review.objects.filter(provider_user_id=provider_id, is_public=True)
        return Response(ReviewSerializer(qs, many=True).data)


class TrainNumberReviews(APIView):
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_summary="List reviews for a train number",
        manual_parameters=[
            openapi.Parameter('train_number', openapi.IN_QUERY, type=openapi.TYPE_STRING, required=True)
        ],
        responses={200: ReviewSerializer(many=True)}
    )
    def get(self, request):
        train_number = request.query_params.get('train_number')
        if not train_number:
            return Response({"detail": "train_number is required."}, status=400)
        qs = Review.objects.filter(train_number__iexact=train_number, is_public=True)
        return Response(ReviewSerializer(qs, many=True).data)
