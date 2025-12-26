import pytest
from unittest import mock
from payments.utils import (
    generate_booking_pdf,
    generate_qr_code,
    format_date,
    format_time,
    format_datetime,
    calculate_duration,
    format_currency,
)


def test_format_helpers_and_duration():
    iso_dt = "2025-01-01T10:30:00Z"
    assert isinstance(format_date(iso_dt), str)
    assert isinstance(format_time(iso_dt), str)
    assert isinstance(format_datetime(iso_dt), str)
    assert calculate_duration("2025-01-01T10:00:00Z", "2025-01-01T12:30:00Z") == "2h 30m"
    # invalid durations
    assert calculate_duration("bad", "bad2") == "N/A"
    # currency formatting returns string
    assert isinstance(format_currency("100.00"), str)


def test_generate_qr_code_and_pdf_mock(monkeypatch, tmp_path):
    # QR generation should return a ReportLab Image when successful.
    # We'll monkeypatch qrcode to a simple object with expected interface.
    class DummyImg:
        def save(self, buf, format="PNG"):
            buf.write(b"PNGDATA")
        def __call__(self, *a, **k):
            return self

    dummy_qr = mock.Mock()
    dummy_qr.make_image.return_value = DummyImg()

    monkeypatch.setattr("payments.utils.qrcode", mock.Mock(QRCode=lambda **k: dummy_qr))
    # monkeypatch SimpleDocTemplate.build to avoid file creation during test
    monkeypatch.setattr("payments.utils.SimpleDocTemplate", mock.Mock())
    # run generate_booking_pdf with minimal booking_data
    booking_data = {
        "booking_id": "b123",
        "customer": "C",
        "status": "Confirmed",
        "payment_status": "Paid",
        "booking_date": "2025-01-01T10:00:00Z",
        "service_details": {"type": "BusService", "departure_time": "2025-01-02T08:00:00Z", "arrival_time": "2025-01-02T11:00:00Z", "source": "A", "destination": "B", "status": "Scheduled"},
        "passengers": [{"name": "X", "age": 30, "gender": "M"}],
        "total_amount": "1000.00",
        "ticket": {"ticket_no": "T1", "issued_at": "2025-01-01T11:00:00Z"}
    }
    out = generate_booking_pdf(booking_data, str(tmp_path / "out.pdf"))
    assert out.endswith(".pdf")
