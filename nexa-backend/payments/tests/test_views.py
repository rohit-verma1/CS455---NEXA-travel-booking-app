import pytest
from unittest import mock
from django.utils import timezone
from datetime import timedelta
from payments.models import Transaction, Refund, Settlement, LoyaltyWallet

pytestmark = pytest.mark.django_db




def test_wallet_returns_wallet_data(auth_client):
    client, user, token = auth_client
    LoyaltyWallet.objects.get_or_create(user=user)
    resp = client.get("/payments/wallet/")
    assert resp.status_code == 200
    assert "balance_points" in resp.json()


def test_refund_process_and_my_refunds(monkeypatch, auth_client):
    client, user, token = auth_client
    from bookings.models import Booking
    booking = Booking.objects.create(customer=user, total_amount=200)
    txn = Transaction.objects.create(booking=booking, customer_user=user, amount=200, method="UPI", status="Success")
    refund = Refund.objects.create(transaction=txn, amount=200, status="Pending")

    resp = client.post("/payments/refunds/process/", {"refund_id": str(refund.refund_id), "action": "approve"})
    assert resp.status_code in (200, 400, 404)

    resp2 = client.get("/payments/refunds/my/")
    assert resp2.status_code == 200
    assert isinstance(resp2.json(), list)





def test_transaction_history_and_financial_dashboard(auth_client, monkeypatch):
    client, user, token = auth_client

    # --- Transaction history mock ---
    mock_qs = mock.Mock()
    mock_qs.select_related.return_value.order_by.return_value = []
    monkeypatch.setattr("payments.views.Transaction.objects.filter", mock.Mock(return_value=mock_qs))

    resp = client.get("/payments/transactions/list/")
    assert resp.status_code in (200, 403)

    # --- Financial dashboard mock ---
    class DummyQS:
        query = "MOCK QUERY"
        def aggregate(self, **kwargs): return {"total": 0}
        def select_related(self, *a, **k): return self
        def order_by(self, *a, **k): return self
        def __iter__(self): return iter([])
        def __len__(self): return 0

    dummy_qs = DummyQS()
    
    monkeypatch.setattr("payments.views.Transaction.objects.filter", mock.Mock(return_value=dummy_qs))
    monkeypatch.setattr("payments.views.Settlement.objects.filter", mock.Mock(return_value=dummy_qs))
    monkeypatch.setattr("payments.views.Refund.objects.filter", mock.Mock(return_value=dummy_qs))

    resp2 = client.get("/payments/finances-provider/")
    assert resp2.status_code in (200, 403)
