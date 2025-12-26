from django.urls import reverse, resolve

def test_all_payment_urls_resolve():
    paths = [
        ("/payments/confirm/", "confirm-payment"),
        ("/payments/wallet/", "wallet"),
        ("/payments/refunds/process/", "process-refund"),
        ("/payments/refunds/my/", "my-refunds"),
        ("/payments/settlements/process/", "process-settlement"),
        ("/payments/finances-provider/", "dashboard-finances"),
    ]
    for path, name in paths:
        match = resolve(path)
        assert match
