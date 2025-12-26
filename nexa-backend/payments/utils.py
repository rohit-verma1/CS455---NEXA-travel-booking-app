
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import qrcode
from io import BytesIO

# Register Unicode fonts that support Rupee symbol
try:
    # Try to register DejaVu fonts (commonly available)
    pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', 'DejaVuSans-Bold.ttf'))
    UNICODE_FONT = 'DejaVuSans'
    UNICODE_FONT_BOLD = 'DejaVuSans-Bold'
except:
    # Fallback to default fonts with Rs. prefix
    UNICODE_FONT = 'Helvetica'
    UNICODE_FONT_BOLD = 'Helvetica-Bold'
    print("Warning: Unicode fonts not found. Using 'Rs.' instead of ₹ symbol.")


def generate_booking_pdf(booking_data, output_filename="booking_confirmation.pdf"):
    """
    Generate a professional booking confirmation PDF for any travel mode (Flight/Train/Bus).
    
    Args:
        booking_data (dict): Dictionary containing booking information
        output_filename (str): Name of the output PDF file
    
    Returns:
        str: Path to the generated PDF file
    """
    
    # Create the PDF document
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )
    
    # Container for PDF elements
    elements = []
    
    # Define custom styles
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#10b981') if booking_data['status'] == 'Confirmed' else colors.HexColor('#f59e0b'),
        spaceAfter=12,
        alignment=TA_CENTER,
        fontName=UNICODE_FONT_BOLD
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=8,
        spaceBefore=12,
        fontName=UNICODE_FONT_BOLD
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubHeading',
        parent=styles['Heading3'],
        fontSize=11,
        textColor=colors.HexColor('#475569'),
        spaceAfter=6,
        fontName=UNICODE_FONT_BOLD
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#334155'),
        fontName=UNICODE_FONT
    )
    
    # === HEADER SECTION ===
    status_symbol = "✓" if booking_data['status'] == 'Confirmed' else "⏳"
    status_text = f"{status_symbol} BOOKING {booking_data['status'].upper()}"
    elements.append(Paragraph(status_text, title_style))
    
    elements.append(Paragraph(
        f"<b>Booking ID:</b> {booking_data['booking_id']}", 
        normal_style
    ))
    elements.append(Paragraph(
        f"<b>Customer:</b> {booking_data['customer']}", 
        normal_style
    ))
    elements.append(Paragraph(
        f"<b>Booking Date:</b> {format_date(booking_data['booking_date'])}", 
        normal_style
    ))
    
    # Add contact information if available
    if booking_data.get('mobile_number'):
        elements.append(Paragraph(
            f"<b>Mobile:</b> {booking_data['mobile_number']}", 
            normal_style
        ))
    if booking_data.get('email_address'):
        elements.append(Paragraph(
            f"<b>Email:</b> {booking_data['email_address']}", 
            normal_style
        ))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # === SERVICE DETAILS (Dynamic based on travel mode) ===
    service = booking_data['service_details']
    service_type = service['type']
    
    # Determine service icon/title based on type
    service_titles = {
        'FlightService': 'Flight Details ✈️',
        'TrainService': 'Train Details 🚂',
        'BusService': 'Bus Details 🚌'
    }
    
    elements.append(Paragraph(service_titles.get(service_type, 'Journey Details'), heading_style))
    
    # Build service header based on type
    if service_type == 'FlightService':
        service_header_data = [
            ['Airline', 'Flight Number', 'Status', 'Class'],
            [
                service['airline_name'],
                service['flight_number'],
                service['status'],
                booking_data.get('class_type', 'Economy').title()
            ]
        ]
    elif service_type == 'TrainService':
        service_header_data = [
            ['Train Name', 'Train Number', 'Status', 'Class'],
            [
                service.get('train_name', service.get('Train_name', 'N/A')),
                service.get('train_number', service.get('Train_number', 'N/A')),
                service['status'],
                booking_data.get('class_type', 'Sleeper').title()
            ]
        ]
    elif service_type == 'BusService':
        service_header_data = [
            ['Travels', 'Bus Number', 'Status', 'Type'],
            [
                service.get('travels_name', 'N/A'),
                service.get('bus_number', 'N/A'),
                service['status'],
                booking_data.get('class_type', 'Standard').title()
            ]
        ]
    else:
        service_header_data = [
            ['Service ID', 'Status', 'Type'],
            [
                service.get('service_id', 'N/A'),
                service['status'],
                service_type
            ]
        ]
    
    service_header_table = Table(service_header_data, colWidths=[2*inch, 1.8*inch, 1.8*inch, 1.4*inch])
    service_header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('FONTNAME', (0, 1), (-1, -1), UNICODE_FONT_BOLD),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(service_header_table)
    elements.append(Spacer(1, 0.15*inch))
    
    # Route information (common for all types)
    duration = calculate_duration(service['departure_time'], service['arrival_time'])
    
    route_data = [
        ['Departure', 'Arrival'],
        [
            Paragraph(f"<b>{service['source']}</b><br/>"
                     f"{format_date(service['departure_time'])}<br/>"
                     f"<font color='#2563eb'><b>{format_time(service['departure_time'])}</b></font>",
                     normal_style),
            Paragraph(f"<b>{service['destination']}</b><br/>"
                     f"{format_date(service['arrival_time'])}<br/>"
                     f"<font color='#10b981'><b>{format_time(service['arrival_time'])}</b></font>",
                     normal_style)
        ],
        [
            Paragraph(f"<font color='#64748b'>Duration: {duration}</font>", normal_style),
            ''
        ]
    ]
    
    route_table = Table(route_data, colWidths=[3.5*inch, 3.5*inch])
    route_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0f2fe')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0c4a6e')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
    ]))
    elements.append(route_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # === PASSENGER DETAILS ===
    elements.append(Paragraph("Passenger Details", subheading_style))
    
    passenger_header = [['Name', 'Age', 'Gender', 'Seat No.', 'Document ID']]
    passenger_data = [[
        p['name'],
        str(p['age']),
        p['gender'],
        p.get('seat_no', p.get('seat', {}).get('seat_no', 'N/A')),
        p.get('document_id', 'N/A')
    ] for p in booking_data['passengers']]
    
    passenger_table = Table(
        passenger_header + passenger_data,
        colWidths=[2*inch, 0.8*inch, 1*inch, 1*inch, 2.2*inch]
    )
    passenger_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(passenger_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # === PAYMENT SUMMARY ===
    elements.append(Paragraph("Payment Summary", subheading_style))
    
    # Calculate breakdown (assuming taxes are part of total)
    total = float(booking_data['total_amount'])
    base_fare = total * 0.85  # Approximate 85% base fare
    taxes = total - base_fare
    
    payment_data = [
        ['Base Fare', format_currency(f"{base_fare:.2f}")],
        ['Taxes & Fees', format_currency(f"{taxes:.2f}")],
        ['', ''],
        ['Total Amount', format_currency(booking_data['total_amount'])],
        ['Payment Status', booking_data['payment_status']]
    ]
    
    payment_table = Table(payment_data, colWidths=[5*inch, 2*inch])
    
    # Color based on payment status
    status_bg = colors.HexColor('#d1fae5') if booking_data['payment_status'] == 'Paid' else colors.HexColor('#fef3c7')
    status_color = colors.HexColor('#059669') if booking_data['payment_status'] == 'Paid' else colors.HexColor('#d97706')
    
    payment_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 2), UNICODE_FONT),
        ('FONTNAME', (0, 3), (-1, 3), UNICODE_FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 2), 9),
        ('FONTSIZE', (0, 3), (0, 3), 12),
        ('FONTSIZE', (1, 3), (1, 3), 14),
        ('TEXTCOLOR', (1, 3), (1, 3), colors.HexColor('#7c3aed')),
        ('LINEABOVE', (0, 3), (-1, 3), 1, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 3), (-1, 3), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, 2), 5),
        ('BACKGROUND', (0, 4), (-1, 4), status_bg),
        ('TEXTCOLOR', (1, 4), (1, 4), status_color),
        ('FONTNAME', (1, 4), (1, 4), UNICODE_FONT_BOLD),
        ('LEFTPADDING', (0, 4), (-1, 4), 8),
        ('RIGHTPADDING', (0, 4), (-1, 4), 8),
        ('TOPPADDING', (0, 4), (-1, 4), 6),
        ('BOTTOMPADDING', (0, 4), (-1, 4), 6),
    ]))
    elements.append(payment_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # === POLICIES ===
    if booking_data.get('policy'):
        elements.append(Paragraph("Booking Policies", subheading_style))
        
        policy = booking_data['policy']
        policy_data = [
            ['Cancellation Policy', 'Reschedule Policy'],
            [
                Paragraph(f"Free cancellation up to {policy['cancellation_window']} hours before departure<br/>"
                         f"<font color='#92400e'>Cancellation fee: {format_currency(str(policy['cancellation_fee']))}</font><br/>"
                         f"<font color='#7f1d1d'>No-show penalty: {format_currency(str(policy['no_show_penalty']))}</font>",
                         normal_style),
                Paragraph(f"{'Rescheduling allowed' if policy['reschedule_allowed'] else 'Rescheduling not allowed'}<br/>"
                         f"<font color='#1e40af'>Reschedule fee: {format_currency(str(policy['reschedule_fee']))}</font>",
                         normal_style)
            ]
        ]
        
        policy_table = Table(policy_data, colWidths=[3.5*inch, 3.5*inch])
        policy_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#fef3c7')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#dbeafe')),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor('#92400e')),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#1e40af')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(policy_table)
        
        if policy.get('terms_conditions'):
            elements.append(Spacer(1, 0.1*inch))
            elements.append(Paragraph(
                f"<font size=8 color='#64748b'><i>Terms: {policy['terms_conditions']}</i></font>",
                normal_style
            ))
        
        elements.append(Spacer(1, 0.3*inch))
    
    # === TICKET QR CODE (only if ticket exists) ===
    if booking_data.get('ticket'):
        ticket = booking_data['ticket']
        qr_img = generate_qr_code(ticket['ticket_no'])
        if qr_img:
            elements.append(Paragraph("E-Ticket", subheading_style))
            
            # Different messaging based on service type
            boarding_messages = {
                'FlightService': 'Show this QR code at check-in counter',
                'TrainService': 'Show this QR code at platform entry',
                'BusService': 'Show this QR code at boarding point'
            }
            
            elements.append(Paragraph(
                boarding_messages.get(service_type, 'Show this QR code for verification'),
                normal_style
            ))
            elements.append(Spacer(1, 0.1*inch))
            elements.append(qr_img)
            elements.append(Paragraph(
                f"<font size=8>{ticket['ticket_no']}</font>",
                ParagraphStyle('center', parent=normal_style, alignment=TA_CENTER)
            ))
            elements.append(Paragraph(
                f"<font size=8 color='#64748b'>Issued: {format_datetime(ticket['issued_at'])}</font>",
                ParagraphStyle('center', parent=normal_style, alignment=TA_CENTER)
            ))
    else:
        elements.append(Paragraph(
            "<font color='#d97706'><b>Note:</b> E-ticket will be issued after payment confirmation</font>",
            normal_style
        ))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # === STATUS LOGS (if available) ===
    if booking_data.get('status_logs') and len(booking_data['status_logs']) > 0:
        elements.append(Paragraph("Booking History", subheading_style))
        
        log_data = [['Status', 'Timestamp', 'Remarks']]
        for log in booking_data['status_logs']:
            log_data.append([
                log['status'],
                format_datetime(log['timestamp']),
                log.get('remarks', 'N/A')
            ])
        
        log_table = Table(log_data, colWidths=[1.2*inch, 2*inch, 3.8*inch])
        log_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#334155')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), UNICODE_FONT_BOLD),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(log_table)
        elements.append(Spacer(1, 0.2*inch))
    
    # === TRAVEL TIPS ===
    elements.append(Paragraph("Important Travel Information", subheading_style))
    
    # Service-specific tips
    if service_type == 'FlightService':
        tips = [
            "Arrive at the airport at least 2 hours before departure for domestic flights",
            "Carry a valid government-issued photo ID and printed/digital boarding pass",
            "Check baggage allowance and restrictions before packing",
            "Complete web check-in 24 hours before departure to save time"
        ]
    elif service_type == 'TrainService':
        tips = [
            "Arrive at the station at least 30 minutes before departure",
            "Carry a valid ID proof that matches your booking details",
            "Keep your e-ticket handy for TTE verification during journey",
            "Check platform number on station display boards before boarding"
        ]
    elif service_type == 'BusService':
        tips = [
            "Arrive at the boarding point at least 15 minutes before departure",
            "Carry a valid ID proof for verification",
            "Keep your e-ticket ready for boarding",
            "Note down the bus operator's contact number for any queries"
        ]
    else:
        tips = [
            "Arrive early at the departure point",
            "Carry valid identification documents",
            "Keep your booking confirmation handy"
        ]
    
    tips_style = ParagraphStyle(
        'Tips',
        parent=normal_style,
        fontSize=9,
        leftIndent=15,
        bulletIndent=5,
        spaceAfter=4
    )
    
    for tip in tips:
        elements.append(Paragraph(f"• {tip}", tips_style))
    
    elements.append(Spacer(1, 0.3*inch))
    
    # === FOOTER ===
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#64748b'),
        alignment=TA_CENTER,
        fontName=UNICODE_FONT
    )
    
    elements.append(Spacer(1, 0.3*inch))
    elements.append(Paragraph(
        "Need help? Contact us at support@nexa.com or call +91 1800-123-4567",
        footer_style
    ))
    elements.append(Paragraph("© 2025 Nexa. All rights reserved.", footer_style))
    
    # Build PDF
    doc.build(elements)
    
    return output_filename


def generate_qr_code(data):
    """Generate QR code image from data"""
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to ReportLab Image
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return Image(buffer, width=1.5*inch, height=1.5*inch)
    except Exception as e:
        print(f"Error generating QR code: {e}")
        return None


def format_date(date_string):
    """Format date string to readable format"""
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return dt.strftime('%a, %b %d, %Y')
    except:
        return date_string


def format_time(date_string):
    """Format time string to readable format"""
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return dt.strftime('%I:%M %p')
    except:
        return date_string


def format_datetime(date_string):
    """Format datetime string to readable format"""
    try:
        dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        return dt.strftime('%b %d, %Y %I:%M %p')
    except:
        return date_string


def calculate_duration(departure, arrival):
    """Calculate journey duration"""
    try:
        dep = datetime.fromisoformat(departure.replace('Z', '+00:00'))
        arr = datetime.fromisoformat(arrival.replace('Z', '+00:00'))
        duration = arr - dep
        
        total_seconds = duration.total_seconds()
        hours = int(total_seconds // 3600)
        minutes = int((total_seconds % 3600) // 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except:
        return "N/A"


def format_currency(amount):
    """Format currency with proper Rupee symbol or Rs. prefix"""
    try:
        # Try to use Unicode Rupee symbol if font supports it
        if UNICODE_FONT != 'Helvetica':
            return f"₹{amount}"
        else:
            return f"Rs. {amount}"
    except:
        return f"Rs. {amount}"


# === EXAMPLE USAGE ===
if __name__ == "__main__":
    # Example 1: Flight Booking
    flight_booking = {
        "booking_id": "b58d10c0-4635-447d-ac6b-2ba2f4d634a2",
        "customer": "Likith (customer)",
        "mobile_number": "+91 9876543210",
        "email_address": "likith@example.com",
        "service_details": {
            "type": "FlightService",
            "service_id": "6fbdf024-3d6a-4916-9dbd-fd0b7289401f",
            "flight_number": "HYD-202",
            "airline_name": "Ruksana Air",
            "departure_time": "2025-12-20T15:30:00Z",
            "arrival_time": "2025-12-20T16:45:00Z",
            "status": "Scheduled",
            "source": "Bengaluru",
            "destination": "Hyderabad"
        },
        "total_amount": "3700.00",
        "status": "Confirmed",
        "payment_status": "Paid",
        "booking_date": "2025-10-28T13:31:53.845671Z",
        "passengers": [
            {
                "name": "Likith",
                "age": 30,
                "gender": "Male",
                "seat_no": "E5A",
                "document_id": "ABCD1234E"
            }
        ],
        "ticket": {
            "ticket_no": "NEXA-B58D10C0",
            "issued_at": "2025-10-29T18:25:24.522480Z",
        },
        "status_logs": [
            {
                "status": "Confirmed",
                "timestamp": "2025-10-29T18:25:24.962209Z",
                "remarks": "Payment confirmed"
            }
        ],
        "class_type": "business",
        "policy": {
            "cancellation_window": 48,
            "cancellation_fee": 600,
            "reschedule_allowed": True,
            "reschedule_fee": 350,
            "no_show_penalty": 800,
            "terms_conditions": "Standard return policy."
        }
    }
    generate_booking_pdf(flight_booking, "flight_booking_confirmation.pdf")