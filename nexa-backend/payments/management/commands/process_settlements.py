# payments/management/commands/process_settlements.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from payments.models import Transaction, Settlement
from django.db.models import Sum

class Command(BaseCommand):
    help = "Process provider settlements for the previous day."

    def handle(self, *args, **options):
        end = timezone.now()
        start = end - timedelta(days=1)

        providers = Transaction.objects.filter(status='Success', transaction_date__gte=start, transaction_date__lte=end).values_list('provider_user', flat=True).distinct()

        for p in providers:
            txns = Transaction.objects.filter(provider_user=p, status='Success', transaction_date__gte=start, transaction_date__lte=end)
            total = txns.aggregate(total=Sum('amount'))['total'] or 0
            if float(total) <= 0:
                continue
            platform_fee = float(total) * 0.10
            payout = float(total) - platform_fee

            settlement = Settlement.objects.create(
                provider_user_id=p,
                period_start=start,
                period_end=end,
                amount=payout,
                currency='INR',
                status='Pending'
            )
            self.stdout.write(self.style.SUCCESS(f"Created settlement {settlement.settlement_id} for provider {p} amount {payout}"))
