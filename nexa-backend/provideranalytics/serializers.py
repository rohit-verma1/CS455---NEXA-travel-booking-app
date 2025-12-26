from rest_framework import serializers
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from decimal import Decimal
from .models import RouteAnalytics
from bookings.models import Booking
from services.models import BusService, TrainService, FlightService, Route


class RoutePerformanceSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source='source.code', read_only=True)
    destination_name = serializers.CharField(source='destination.code', read_only=True)

    class Meta:
        model = RouteAnalytics
        fields = [
            'source_name',
            'destination_name',
            'total_bookings',
            'total_revenue',
            'avg_occupancy',
            'bus_revenue',
            'train_revenue',
            'flight_revenue'
        ]


class RevenueTrendSerializer(serializers.Serializer):
    month = serializers.CharField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_bookings = serializers.IntegerField()
    bus_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    train_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    flight_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)


class DashboardSummarySerializer(serializers.Serializer):
    total_bookings = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    avg_occupancy = serializers.FloatField()
    active_routes = serializers.IntegerField()

    active_services = serializers.DictField()
    growth_rates = serializers.DictField()

    # 🆕 New field
    booking_distribution = serializers.DictField()

    route_performance = RoutePerformanceSerializer(many=True)
    revenue_trends = RevenueTrendSerializer(many=True)

    @staticmethod
    def _calculate_growth(prev_value, curr_value):
        """Utility to compute % growth safely."""
        if prev_value and prev_value != 0:
            return round(((curr_value - prev_value) / prev_value) * 100, 2)
        return 0.0

    @staticmethod
    def get_dashboard_data(provider=None):
        """
        Builds the full dashboard analytics view for providers.
        Includes growth rates, mode distribution, and service stats.
        """
        # 1️⃣ Base bookings
        qs = Booking.objects.filter(status='Confirmed', payment_status='Paid')
        if provider:
            qs = qs.filter(provider=provider)
        print(qs.query)
        total_bookings = qs.count()
        total_revenue = qs.aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.0')

        # 2️⃣ Route analytics
        route_qs = RouteAnalytics.objects.all()
        avg_occupancy = route_qs.aggregate(avg=Sum('avg_occupancy'))['avg'] or 0.0
        active_routes = route_qs.count()

        # 3️⃣ Active service counts from services app
        bus_qs = BusService.objects.filter(status='Scheduled')
        train_qs = TrainService.objects.filter(status='Scheduled')
        flight_qs = FlightService.objects.filter(status='Scheduled')

        if provider:
            bus_qs = bus_qs.filter(provider_user_id=provider)
            train_qs = train_qs.filter(provider_user_id=provider)
            flight_qs = flight_qs.filter(provider_user_id=provider)

        active_services = {
            "bus_services": bus_qs.count(),
            "train_services": train_qs.count(),
            "flight_services": flight_qs.count(),
            "total": bus_qs.count() + train_qs.count() + flight_qs.count(),
        }

        # 4️⃣ Booking distribution by mode
        bus_bookings = qs.filter(content_type__model='busservice').count()
        train_bookings = qs.filter(content_type__model='trainservice').count()
        flight_bookings = qs.filter(content_type__model='flightservice').count()

        total = bus_bookings + train_bookings + flight_bookings or 1  # prevent div/0
        booking_distribution = {
            "bus": round(bus_bookings / total * 100, 2),
            "train": round(train_bookings / total * 100, 2),
            "flight": round(flight_bookings / total * 100, 2),
        }

        # 5️⃣ Monthly revenue trends
        monthly_data = (
            qs.annotate(month=TruncMonth('booking_date'))
              .values('month')
              .annotate(
                  total_revenue=Sum('total_amount'),
                  total_bookings=Count('booking_id'),
                  bus_revenue=Sum('total_amount', filter=Q(content_type__model='busservice')),
                  train_revenue=Sum('total_amount', filter=Q(content_type__model='trainservice')),
                  flight_revenue=Sum('total_amount', filter=Q(content_type__model='flightservice')),
              )
              .order_by('month')
        )

        revenue_trends = [
            {
                'month': item['month'].strftime('%b'),
                'total_revenue': item['total_revenue'] or Decimal('0.0'),
                'total_bookings': item['total_bookings'] or 0,
                'bus_revenue': item['bus_revenue'] or Decimal('0.0'),
                'train_revenue': item['train_revenue'] or Decimal('0.0'),
                'flight_revenue': item['flight_revenue'] or Decimal('0.0'),
            }
            for item in monthly_data
        ]

        # 6️⃣ Growth rates (month-over-month)
        if len(revenue_trends) >= 2:
            prev = revenue_trends[-2]
            curr = revenue_trends[-1]
            growth_rates = {
                "bookings_growth": DashboardSummarySerializer._calculate_growth(prev['total_bookings'], curr['total_bookings']),
                "total_revenue_growth": DashboardSummarySerializer._calculate_growth(prev['total_revenue'], curr['total_revenue']),
                "bus_revenue_growth": DashboardSummarySerializer._calculate_growth(prev['bus_revenue'], curr['bus_revenue']),
                "train_revenue_growth": DashboardSummarySerializer._calculate_growth(prev['train_revenue'], curr['train_revenue']),
                "flight_revenue_growth": DashboardSummarySerializer._calculate_growth(prev['flight_revenue'], curr['flight_revenue']),
                "avg_occupancy_growth": 0.0
            }
        else:
            growth_rates = {
                "bookings_growth": 0.0,
                "total_revenue_growth": 0.0,
                "bus_revenue_growth": 0.0,
                "train_revenue_growth": 0.0,
                "flight_revenue_growth": 0.0,
                "avg_occupancy_growth": 0.0
            }

        # 7️⃣ Route performance
        top_routes = RouteAnalytics.objects.order_by('-total_revenue')[:5]
        route_performance = RoutePerformanceSerializer(top_routes, many=True).data

        # ✅ Final data
        return {
            'total_bookings': total_bookings,
            'total_revenue': total_revenue,
            'avg_occupancy': round(avg_occupancy, 2),
            'active_routes': active_routes,
            'active_services': active_services,
            'booking_distribution': booking_distribution,
            'growth_rates': growth_rates,
            'route_performance': route_performance,
            'revenue_trends': revenue_trends
        }
class DateOccupancySerializer(serializers.Serializer):
    date = serializers.DateField()
    occupancy = serializers.FloatField()


class DateOccupancyHeatmapSerializer(serializers.Serializer):
    """
    Occupancy heatmap on actual service dates (Bus, Train, Flight combined).
    """
    date_occupancy_heatmap = DateOccupancySerializer(many=True)

    @staticmethod
    def get_date_occupancy_data(provider=None, start_date=None, end_date=None):
        """
        Generates a date-wise occupancy percentage based on all scheduled services.
        Filters optionally by provider and date range.
        """
        from datetime import timedelta

        heatmap_data = {}

        def add_occupancy(date_key, total_cap, booked):
            """Accumulate totals for each date."""
            if date_key not in heatmap_data:
                heatmap_data[date_key] = {"total_capacity": 0, "booked": 0}
            heatmap_data[date_key]["total_capacity"] += total_cap
            heatmap_data[date_key]["booked"] += booked

        # --- BUS SERVICES ---
        bus_qs = BusService.objects.filter(status="Scheduled")
        if provider:
            bus_qs = bus_qs.filter(provider_user_id=provider)
        if start_date and end_date:
            bus_qs = bus_qs.filter(departure_time__date__range=[start_date, end_date])

        for b in bus_qs:
            date_key = b.departure_time.date()
            add_occupancy(date_key, b.total_capacity or 0, b.booked_seats or 0)

        # --- FLIGHT SERVICES ---
        flight_qs = FlightService.objects.filter(status="Scheduled")
        if provider:
            flight_qs = flight_qs.filter(provider_user_id=provider)
        if start_date and end_date:
            flight_qs = flight_qs.filter(departure_time__date__range=[start_date, end_date])

        for f in flight_qs:
            date_key = f.departure_time.date()
            add_occupancy(date_key, f.total_capacity or 0, f.booked_seats or 0)

        # --- TRAIN SERVICES ---
        train_qs = TrainService.objects.filter(status="Scheduled")
        if provider:
            train_qs = train_qs.filter(provider_user_id=provider)
        if start_date and end_date:
            train_qs = train_qs.filter(departure_time__date__range=[start_date, end_date])

        for t in train_qs:
            date_key = t.departure_time.date()
            total_seats = t.total_seats*(len(t.segments.all()))
            booked_train = 0
            try:
                total_available = 0
                for seg in t.segments.all():
                    total_available += (
                        seg.available_count_sleeper +
                        seg.available_count_second_ac +
                        seg.available_count_third_ac
                    )
                booked_train = max(0, total_seats - total_available)
            except Exception:
                booked_train = 0
            add_occupancy(date_key, total_seats or 0, booked_train)

        # --- Compute occupancy per date ---
        date_occupancy_heatmap = []
        for date_key, vals in sorted(heatmap_data.items()):
            if vals["total_capacity"] > 0:
                occ_percent = (vals["booked"] / vals["total_capacity"]) * 100
            else:
                occ_percent = 0.0
            date_occupancy_heatmap.append({
                "date": date_key,
                "occupancy": round(occ_percent, 2)
            })

        return {"date_occupancy_heatmap": date_occupancy_heatmap}

class MonthlyRevenueTrendSerializer(serializers.Serializer):
    """
    Returns monthly revenue trend data (for line chart / trends graph).
    """
    revenue_trends = RevenueTrendSerializer(many=True)

    @staticmethod
    def get_monthly_revenue_data(provider=None, start_date=None, end_date=None):
        """
        Aggregates confirmed + paid bookings month-wise.
        Optional filters:
          - provider: restricts to provider-owned bookings
          - start_date, end_date: restricts date range
        """
        qs = Booking.objects.filter(status="Confirmed", payment_status="Paid")
        if provider:
            qs = qs.filter(provider=provider)
        if start_date and end_date:
            qs = qs.filter(booking_date__date__range=[start_date, end_date])

        monthly_data = (
            qs.annotate(month=TruncMonth("booking_date"))
              .values("month")
              .annotate(
                  total_revenue=Sum("total_amount"),
                  total_bookings=Count("booking_id"),
                  bus_revenue=Sum("total_amount", filter=Q(content_type__model="busservice")),
                  train_revenue=Sum("total_amount", filter=Q(content_type__model="trainservice")),
                  flight_revenue=Sum("total_amount", filter=Q(content_type__model="flightservice")),
              )
              .order_by("month")
        )

        revenue_trends = [
            {
                "month": item["month"].strftime("%b"),
                "total_revenue": item["total_revenue"] or Decimal("0.0"),
                "total_bookings": item["total_bookings"] or 0,
                "bus_revenue": item["bus_revenue"] or Decimal("0.0"),
                "train_revenue": item["train_revenue"] or Decimal("0.0"),
                "flight_revenue": item["flight_revenue"] or Decimal("0.0"),
            }
            for item in monthly_data
        ]

        return {"revenue_trends": revenue_trends}

class RouteComparisonSerializer(serializers.Serializer):
    """
    Serializer for route comparison table data.
    """
    route_name = serializers.CharField()
    bookings = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    occupancy = serializers.FloatField()
    performance = serializers.CharField()

    @staticmethod
    def get_route_comparison_data(provider=None):
        """
        Builds a list of route performance entries combining
        bookings, revenue, occupancy, and qualitative performance.
        """
        data = []
        routes = Route.objects.all()

        if provider:
            # Include only routes with services from this provider
            bus_routes = BusService.objects.filter(provider_user_id=provider).values_list('route_id', flat=True)
            train_routes = TrainService.objects.filter(provider_user_id=provider).values_list('route_id', flat=True)
            flight_routes = FlightService.objects.filter(provider_user_id=provider).values_list('route_id', flat=True)
            route_ids = set(bus_routes) | set(train_routes) | set(flight_routes)
            routes = routes.filter(route_id__in=route_ids)

        for route in routes:
            # --- BOOKINGS ---
            bookings_qs = Booking.objects.filter(
                status='Confirmed',
                payment_status='Paid',
                source_id=route.source,
                destination_id=route.destination
            )
            if provider:
                bookings_qs = bookings_qs.filter(provider=provider)

            total_bookings = bookings_qs.count()
            total_revenue = bookings_qs.aggregate(sum=Sum('total_amount'))['sum'] or Decimal('0.0')

            # --- OCCUPANCY CALCULATION ---
            total_capacity = 0
            total_booked = 0

            # BUS
            bus_services = BusService.objects.filter(route=route)
            if provider:
                bus_services = bus_services.filter(provider_user_id=provider)
            for b in bus_services:
                total_capacity += b.total_capacity or 0
                total_booked += b.booked_seats or 0

            # TRAIN
            train_services = TrainService.objects.filter(route=route)
            if provider:
                train_services = train_services.filter(provider_user_id=provider)
            for t in train_services:
                total_capacity += t.total_seats or 0
                booked_train = 0
                try:
                    total_available = 0
                    for seg in t.segments.all():
                        total_available += (
                            seg.available_count_sleeper +
                            seg.available_count_second_ac +
                            seg.available_count_third_ac
                        )
                    booked_train = max(0, t.total_seats - total_available)
                except Exception:
                    booked_train = 0
                total_booked += booked_train

            # FLIGHT
            flight_services = FlightService.objects.filter(route=route)
            if provider:
                flight_services = flight_services.filter(provider_user_id=provider)
            for f in flight_services:
                total_capacity += f.total_capacity or 0
                total_booked += f.booked_seats or 0

            occupancy = (total_booked / total_capacity * 100) if total_capacity > 0 else 0

            # --- PERFORMANCE LABEL ---
            if occupancy >= 85:
                performance = "Excellent"
            elif occupancy >= 70:
                performance = "Good"
            elif occupancy >= 50:
                performance = "Average"
            else:
                performance = "Poor"

            data.append({
                "route_name": f"{route.source.code} → {route.destination.code}",
                "bookings": total_bookings,
                "revenue": round(total_revenue, 2),
                "occupancy": round(occupancy, 2),
                "performance": performance
            })

        # Sort by revenue (descending)
        data = sorted(data, key=lambda x: x["occupancy"], reverse=True)

        return data