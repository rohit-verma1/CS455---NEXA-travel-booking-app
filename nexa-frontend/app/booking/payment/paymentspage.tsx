"use client";

import React, { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronDown, ChevronRight, Plane, CreditCard, Wallet, Building2, Smartphone, Shield, Info, ArrowUpRight, Copy, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Navbar } from '@/components/shared/navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuthFromStorage } from '@/utils/authStorage';
import API from '@/app/api';

// Types
interface Passenger {
  name: string;
  age: number;
  gender: string;
  nationality: string;
  seat_no?: string;
}

interface Station {
  station_id: string;
  name: string;
  code: string;
  city: string;
  state: string;
}

interface FlightService {
  service_id: string;
  route: {
    source: Station;
    destination: Station;
  };
  flight_number: string;
  airline_name: string;
  aircraft_model: string;
  departure_time: string;
  arrival_time: string;
  num_rows_business: number;
  num_columns_business: number;
  num_rows_premium: number;
  num_columns_premium: number;
  num_rows_economy: number;
  num_columns_economy: number;
  base_price: string;
  business_price: string;
  premium_price: string | null;
  economy_price: string;
  seats: any[];
  policy: {
    cancellation_fee: string;
    reschedule_fee: string;
    no_cancellation_fee_markup: string | null;
    no_reschedule_fee_markup: string | null;
  };
}

interface BookingData {
  tripType: 'oneWay' | 'roundTrip';
  class_type: 'Economy' | 'Premium' | 'Business';
  from_station_id: string;
  to_station_id: string;
  no_cancellation_free_markup: boolean;
  no_reschedule_free_markup: boolean;
  passengers: Passenger[];
  service_ids: string[];
}

interface BookingResponse {
  booking: {
    booking_id: string;
    customer: string;
    service_details: any;
    total_amount: string;
    status: string;
    payment_status: string;
    booking_date: string;
    created_at: string;
    passengers: any[];
    ticket: any;
    status_logs: any[];
  };
  assigned_seats: string[];
  payment_next: string;
}

const PaymentPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // State for booking data from sessionStorage
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [bookingResponses, setBookingResponses] = useState<BookingResponse[]>([]);
  const [flightData, setFlightData] = useState<Record<string, FlightService>>({});
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
  const [selectedUpiOption, setSelectedUpiOption] = useState<'qr' | 'app'>('app');
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiQrValue, setUpiQrValue] = useState<string | null>(null);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrLinkCopied, setQrLinkCopied] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: '',
    saveCard: false
  });
  const [fareSummaryExpanded, setFareSummaryExpanded] = useState(true);

  // Load data from sessionStorage or URL params
  useEffect(() => {
    const loadBookingData = async () => {
      try {
        // Check if coming from bus booking (URL params)
        const serviceType = searchParams.get('service_type');
        const bookingId = searchParams.get('booking_id');
        
        console.log('Payment page params:', { serviceType, bookingId });
        
        if (serviceType === 'bus' && bookingId) {
          console.log('Loading bus booking details for ID:', bookingId);
          
          // Fetch bus booking details
          const auth = getAuthFromStorage();
          if (!auth || !auth.token) {
            console.error('No auth token found');
            alert('Please log in to continue.');
            router.push('/login');
            return;
          }
          
          try {
            const apiUrl = API.BOOKING_DETAILS(bookingId);
            console.log('Fetching from:', apiUrl);
            
            const response = await fetch(apiUrl, {
              headers: {
                accept: 'application/json',
                Authorization: `Token ${auth.token}`
              }
            });
            
            if (response.ok) {
              const busBookingData = await response.json();
              console.log('Bus booking data fetched:', busBookingData);
              
              // Set the total amount
              setTotalAmount(parseFloat(busBookingData.total_amount));
              
              // Store in state using existing bookingResponses format
              setBookingResponses([{
                booking: {
                  booking_id: busBookingData.booking_id,
                  customer: busBookingData.customer,
                  service_details: busBookingData.service_details,
                  total_amount: busBookingData.total_amount,
                  status: busBookingData.status,
                  payment_status: busBookingData.payment_status,
                  booking_date: busBookingData.booking_date,
                  created_at: busBookingData.created_at,
                  passengers: busBookingData.passengers,
                  ticket: busBookingData.ticket,
                  status_logs: busBookingData.status_logs
                },
                assigned_seats: busBookingData.passengers.map((p: { seat_no: string }) => p.seat_no),
                payment_next: ''
              }]);
              
              // Set booking IDs
              setBookingIds([busBookingData.booking_id]);
              
              // Create a synthetic bookingData for bus
              setBookingData({
                tripType: 'oneWay',
                class_type: busBookingData.class_type as 'Economy' | 'Premium' | 'Business',
                from_station_id: busBookingData.source_id,
                to_station_id: busBookingData.destination_id,
                no_cancellation_free_markup: false,
                no_reschedule_free_markup: false,
                passengers: busBookingData.passengers.map((p: { name: string; age: number; gender: string; document_id: string; seat_no: string }) => ({
                  name: p.name,
                  age: p.age,
                  gender: p.gender,
                  nationality: p.document_id,
                  seat_no: p.seat_no
                })),
                service_ids: [busBookingData.service_details.service_id]
              });
              
              setLoading(false);
              return;
            } else {
              throw new Error('Failed to fetch bus booking details');
            }
          } catch (error) {
            console.error('Error fetching bus booking:', error);
            alert('Failed to load booking details.');
            setLoading(false);
            return;
          }
        }
                // 🚆 Train booking flow
        if (serviceType === 'train' && bookingId) {
          console.log('Loading train booking details for ID:', bookingId);

          const auth = getAuthFromStorage();
          if (!auth || !auth.token) {
            console.error('No auth token found');
            alert('Please log in to continue.');
            router.push('/login');
            return;
          }

          try {
            const apiUrl = API.BOOKING_DETAILS(bookingId);
            console.log('Fetching Train booking from:', apiUrl);

            const response = await fetch(apiUrl, {
              headers: {
                accept: 'application/json',
                Authorization: `Token ${auth.token}`,
              },
            });

            if (response.ok) {
              const trainBookingData = await response.json();
              console.log('Train booking data fetched:', trainBookingData);

              // 🧮 Set total amount
              setTotalAmount(parseFloat(trainBookingData.total_amount));

              // 🧩 Store in state using existing bookingResponses format
              setBookingResponses([
                {
                  booking: {
                    booking_id: trainBookingData.booking_id,
                    customer: trainBookingData.customer,
                    service_details: trainBookingData.service_details,
                    total_amount: trainBookingData.total_amount,
                    status: trainBookingData.status,
                    payment_status: trainBookingData.payment_status,
                    booking_date: trainBookingData.booking_date,
                    created_at: trainBookingData.created_at,
                    passengers: trainBookingData.passengers,
                    ticket: trainBookingData.ticket,
                    status_logs: trainBookingData.status_logs,
                  },
                  assigned_seats: trainBookingData.passengers.map((p: { seat_no: string }) => p.seat_no),
                  payment_next: '',
                },
              ]);

              // 🪪 Set booking IDs
              setBookingIds([trainBookingData.booking_id]);

              // 🎯 Create synthetic bookingData for train service
              setBookingData({
                tripType: 'oneWay',
                class_type: trainBookingData.class_type || 'Sleeper',
                from_station_id: trainBookingData.source_id,
                to_station_id: trainBookingData.destination_id,
                no_cancellation_free_markup: false,
                no_reschedule_free_markup: false,
                passengers: trainBookingData.passengers.map(
                  (p: { name: string; age: number; gender: string; document_id: string; seat_no: string }) => ({
                    name: p.name,
                    age: p.age,
                    gender: p.gender,
                    nationality: p.document_id,
                    seat_no: p.seat_no,
                  })
                ),
                service_ids: [trainBookingData.service_details.service_id],
              });

              setLoading(false);
              return;
            } else {
              throw new Error('Failed to fetch train booking details');
            }
          } catch (error) {
            console.error('Error fetching train booking:', error);
            alert('Failed to load train booking details.');
            setLoading(false);
            return;
          }
        }

        
        // Original flight booking flow from sessionStorage
        const storedBookingData = sessionStorage.getItem('bookingData');
        const storedBookingIds = sessionStorage.getItem('bookingIds');
        const storedBookingResponses = sessionStorage.getItem('bookingResponses');
        const storedTotalAmount = sessionStorage.getItem('totalAmount');
        
        // Set total amount from session storage
        if (storedTotalAmount) {
          setTotalAmount(parseFloat(storedTotalAmount));
        }
        
        if (storedBookingData) {
          const parsedBookingData = JSON.parse(storedBookingData);
          setBookingData(parsedBookingData);
          
          // Fetch flight data for each service
          parsedBookingData.service_ids.forEach(async (serviceId: string) => {
            try {
              const response = await fetch(
                API.FLIGHT_SERVICE_DETAILS(serviceId),
                {
                  method: 'GET',
                  headers: {
                    'accept': 'application/json'
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                setFlightData(prev => ({
                  ...prev,
                  [serviceId]: {
                    service_id: data.service_id,
                    route: {
                      source: data.route.source,
                      destination: data.route.destination
                    },
                    flight_number: data.flight_number,
                    airline_name: data.airline_name,
                    aircraft_model: data.aircraft_model,
                    departure_time: data.departure_time,
                    arrival_time: data.arrival_time,
                    num_rows_business: data.num_rows_business,
                    num_columns_business: data.num_columns_business,
                    num_rows_premium: data.num_rows_premium,
                    num_columns_premium: data.num_columns_premium,
                    num_rows_economy: data.num_rows_economy,
                    num_columns_economy: data.num_columns_economy,
                    base_price: data.base_price,
                    business_price: data.business_price,
                    premium_price: data.premium_price,
                    economy_price: data.economy_price,
                    seats: data.seats,
                    policy: {
                      cancellation_fee: data.policy.cancellation_fee,
                      reschedule_fee: data.policy.reschedule_fee,
                      no_cancellation_fee_markup: data.policy.no_cancellation_fee_markup,
                      no_reschedule_fee_markup: data.policy.no_reschedule_fee_markup
                    }
                  }
                }));
              }
            } catch (error) {
              console.error(`Error fetching flight ${serviceId}:`, error);
            }
          });
        }
        
        if (storedBookingIds) {
          setBookingIds(JSON.parse(storedBookingIds));
        }
        
        if (storedBookingResponses) {
          setBookingResponses(JSON.parse(storedBookingResponses));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading booking data:', error);
        setLoading(false);
      }
    };
    
    loadBookingData();
  }, [searchParams, router]);

  // Helper functions
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const calculateDuration = (departure: string, arrival: string) => {
    const diff = new Date(arrival).getTime() - new Date(departure).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Payment confirmation handler
  const handlePayment = async (paymentMethod: string) => {
    try {
      const auth = getAuthFromStorage();
      const token = auth?.token || '';

      if (!token) {
        alert('Please login to continue');
        return;
      }

      if (bookingIds.length === 0) {
        alert('No booking found');
        return;
      }

      console.log('Starting payment confirmation for bookings:', bookingIds);
      console.log('Payment method:', paymentMethod);

      // Make payment confirmation API call for each booking
      for (const bookingId of bookingIds) {
        console.log(`Confirming payment for booking ${bookingId}...`);
        
        const requestBody = {
          booking_id: bookingId,
          method: paymentMethod
        };
        
        console.log('Request body:', requestBody);

        const response = await fetch(API.PAYMENT_CONFIRM, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { detail: errorText };
          }
          throw new Error(`Payment confirmation failed for booking ${bookingId}: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log(`Payment confirmed for booking ${bookingId}:`, result);
      }

      // Navigate to confirmation page
      router.push('/userDetails/confirm?bookingId=' + bookingIds[0]);
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const banks = [
    { id: 'sbi', name: 'State Bank of India', initials: 'SBI', colors: 'from-[#0a74cf] to-[#1182e8]', tagline: 'Instant settlement' },
    { id: 'hdfc', name: 'HDFC Bank', initials: 'HDFC', colors: 'from-[#023f88] to-[#0357b5]', tagline: 'Smart collect' },
    { id: 'icici', name: 'ICICI Bank', initials: 'ICICI', colors: 'from-[#f27421] to-[#ce3f0c]', tagline: 'Priority banking' },
    { id: 'axis', name: 'Axis Bank', initials: 'AXIS', colors: 'from-[#7c2452] to-[#a2316b]', tagline: 'Net secure' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', initials: 'KOTAK', colors: 'from-[#d71920] to-[#b11217]', tagline: 'Real-time posting' }
  ];

  const upiApps = [
    { id: 'phonepe', name: 'PhonePe', initials: 'Pe', colors: 'from-[#5f259f] to-[#7c4dff]' },
    { id: 'googlepay', name: 'Google Pay', initials: 'G', colors: 'from-[#1a73e8] to-[#4285f4]' },
    { id: 'paytm', name: 'Paytm', initials: 'P', colors: 'from-[#01baf2] to-[#0066ff]' },
    { id: 'bhim', name: 'BHIM', initials: 'BH', colors: 'from-[#f7941d] to-[#f05a28]' },
    { id: 'amazonpay', name: 'Amazon Pay', initials: 'A', colors: 'from-[#ff9900] to-[#f06500]' }
  ];

  const walletPartners = [
    { id: 'amazon', name: 'Amazon Pay', perk: '5% instant reward', initials: 'A', colors: 'from-[#ff9900] to-[#f06500]' },
    { id: 'phonepe', name: 'PhonePe Wallet', perk: 'UPI Lite supported', initials: 'Pe', colors: 'from-[#5f259f] to-[#7c4dff]' },
    { id: 'paytm', name: 'Paytm Wallet', perk: 'Cashback enabled', initials: 'P', colors: 'from-[#01baf2] to-[#0066ff]' },
    { id: 'mobikwik', name: 'MobiKwik', perk: 'Zip EMI eligible', initials: 'Mk', colors: 'from-[#005bea] to-[#00c6fb]' }
  ];

  const paymentMethods: Array<{
    id: string;
    label: string;
    subtitle: string;
    icon: LucideIcon;
    badge?: string;
  }> = [
    {
      id: 'upi',
      label: 'Scan & Pay (UPI)',
      subtitle: 'Zero convenience fee • Instant confirmation',
      icon: Smartphone,
      badge: 'Recommended'
    },
    {
      id: 'card',
      label: 'Credit / Debit Cards',
      subtitle: 'Visa · Mastercard · Amex · RuPay',
      icon: CreditCard,
      badge: 'Global'
    },
    {
      id: 'wallets',
      label: 'Digital Wallets',
      subtitle: 'Amazon Pay · PhonePe · Paytm · MobiKwik',
      icon: Wallet
    },
    {
      id: 'netbanking',
      label: 'Net Banking',
      subtitle: '50+ banks with advanced 3DS',
      icon: Building2
    }
  ];

  const youtubeRedirectUrl = 'https://youtu.be/Acjf66Qdj2U?si=IYK4JRIUnBaE3e8N&t=9';

  const handleGenerateUpiQr = () => {
    setQrError(null);
    setQrLinkCopied(false);

    const auth = getAuthFromStorage();
    const token = auth?.token;

    if (!token) {
      setQrError('Please login to generate a QR code.');
      return;
    }

    if (!bookingIds.length) {
      setQrError('No active booking found.');
      return;
    }

    if (typeof window === 'undefined') {
      setQrError('QR generation is only available in the browser.');
      return;
    }

    setQrGenerating(true);

    try {
      const payload = {
        bookingIds,
        token,
        redirect: youtubeRedirectUrl,
        method: 'upi',
        channel: 'qr',
        issuedAt: Date.now()
      };

      const encodedPayload = btoa(JSON.stringify(payload));
      const qrUrl = `${window.location.origin}/booking/payment/upi/scan?payload=${encodeURIComponent(encodedPayload)}`;

      setTimeout(() => {
        setUpiQrValue(qrUrl);
        setQrGenerating(false);
      }, 500);
    } catch (error) {
      console.error('QR generation error:', error);
      setQrGenerating(false);
      setQrError('Unable to create a QR session. Please try again.');
    }
  };

  const handleCopyQrLink = async () => {
    if (!upiQrValue || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(upiQrValue);
      setQrLinkCopied(true);
      setTimeout(() => setQrLinkCopied(false), 2000);
    } catch (error) {
      console.error('Unable to copy QR link:', error);
    }
  };

  const handlePreviewQrLink = () => {
    if (!upiQrValue || typeof window === 'undefined') {
      return;
    }

    window.open(upiQrValue, '_blank', 'noopener,noreferrer');
    router.push('/');
  };

  const renderPaymentContent = () => {
    switch (selectedPaymentMethod) {
      case 'upi':
        return (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-semibold">Unified Payments</p>
                <h3 className="text-2xl font-semibold text-slate-900 mt-1">Pay using UPI</h3>
                <p className="text-sm text-slate-500 mt-1">Trigger a secure QR session or enter your VPA for instant confirmation.</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
                <Shield className="w-4 h-4" />
                RBI compliant
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
              <div
                onClick={() => setSelectedUpiOption('qr')}
                className={`relative flex flex-col h-full rounded-[32px] border-2 p-6 transition-all cursor-pointer ${
                  selectedUpiOption === 'qr'
                    ? 'border-blue-400 bg-white shadow-[0_25px_60px_rgba(30,64,175,0.25)]'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Scan & Pay</p>
                    <p className="text-xs text-slate-500 mt-0.5">Ideal for any UPI app</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedUpiOption === 'qr' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {selectedUpiOption === 'qr' && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>

                <div className="mt-6 flex-1 rounded-[26px] border border-blue-100 bg-blue-50/60 p-5 text-center flex flex-col items-center justify-center">
                  {upiQrValue ? (
                    <>
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 inline-flex">
                        <QRCode value={upiQrValue} size={180} style={{ height: '180px', width: '180px' }} />
                      </div>
                      <p className="mt-4 text-xs text-slate-500">Scan using any UPI camera. On successful validation you will be redirected to our verification clip.</p>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedUpiOption('qr');
                        handleGenerateUpiQr();
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-600 hover:to-indigo-600 flex items-center justify-center gap-2"
                    >
                      {qrGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                      {qrGenerating ? 'Generating secure QR…' : 'Generate QR session'}
                    </button>
                  )}
                </div>

                {upiQrValue && (
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCopyQrLink();
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
                    >
                      <Copy className="w-4 h-4" />
                      {qrLinkCopied ? 'Link copied' : 'Copy QR link'}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePreviewQrLink();
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Preview Flow
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {qrError && (
                  <p className="mt-3 text-xs text-center text-red-500">{qrError}</p>
                )}

                <div className="mt-5 space-y-1 text-xs text-slate-500">
                  <p>• Works seamlessly with PhonePe, Google Pay, Paytm & BHIM</p>
                  <p>• Auto triggers Nexa payment confirmation</p>
                </div>
              </div>

              <div
                onClick={() => setSelectedUpiOption('app')}
                className={`relative flex flex-col h-full rounded-[32px] border-2 p-6 transition-all cursor-pointer ${
                  selectedUpiOption === 'app'
                    ? 'border-blue-400 bg-white shadow-[0_25px_60px_rgba(30,64,175,0.25)]'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <span className="font-semibold text-slate-900">Enter UPI ID</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedUpiOption === 'app'
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300'
                  }`}>
                    {selectedUpiOption === 'app' && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>

                <div className="space-y-5 flex-1 flex flex-col">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="name@bank"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-3 space-y-2">
                    {upiApps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${app.colors} text-white text-xs font-semibold flex items-center justify-center uppercase`}>
                            {app.initials}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{app.name}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">UPI</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedUpiOption('app');
                        handlePayment('upi');
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700"
                    >
                      Pay ₹{totalAmount.toFixed(2)}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">Zero convenience fee on UPI</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4" />
              Payments are reconciled instantly and receipts are emailed within seconds.
            </div>
          </div>
        );

      case 'card':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-semibold">Enterprise Cards</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">Add a new card</h3>
              <p className="text-sm text-slate-500 mt-1">We tokenise cards with PCI-DSS compliant encryption.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Card Number</label>
                <input
                  type="text"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Expiry Date (MM/YY)</label>
                  <input
                    type="text"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    placeholder="MM/YY"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">CVV</label>
                  <input
                    type="password"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                    placeholder="123"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={cardDetails.saveCard}
                  onChange={(e) => setCardDetails({ ...cardDetails, saveCard: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Save this card for faster checkouts
              </label>

              <button
                type="button"
                onClick={() => handlePayment('card')}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700"
              >
                Securely pay ₹{totalAmount.toFixed(2)}
              </button>
            </div>
          </div>
        );

      case 'netbanking':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-semibold">Net Banking</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">Choose your bank</h3>
              <p className="text-sm text-slate-500 mt-1">We support 50+ banks with enhanced 3DS authentication.</p>
            </div>

            <div className="space-y-3">
              {banks.map((bank) => (
                <button
                  type="button"
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full rounded-[28px] border px-5 py-4 text-left transition-all flex items-center justify-between ${
                    selectedBank === bank.id ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10' : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${bank.colors} text-[11px] font-semibold uppercase tracking-wide text-white flex items-center justify-center`}>
                      {bank.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{bank.name}</p>
                      <p className="text-xs text-slate-500">{bank.tagline}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedBank === bank.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {selectedBank === bank.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={!selectedBank}
                onClick={() => handlePayment('netbanking')}
                className={`w-full py-4 rounded-2xl font-semibold text-white shadow-lg ${
                  selectedBank
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                {selectedBank ? `Pay securely with ${banks.find((bank) => bank.id === selectedBank)?.name}` : 'Select a bank to continue'}
              </button>
              <button type="button" className="w-full text-sm font-semibold text-blue-600 flex items-center justify-center gap-1">
                View all banks
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'wallets':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-semibold">Digital Wallets</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">Choose a partner wallet</h3>
              <p className="text-sm text-slate-500 mt-1">Use your favourite wallet balance with zero additional fee.</p>
            </div>

            <div className="space-y-3">
              {walletPartners.map((wallet) => (
                <button
                  type="button"
                  key={wallet.id}
                  onClick={() => setSelectedWallet(wallet.id)}
                  className={`w-full rounded-[28px] border px-5 py-4 text-left transition-all flex items-center justify-between ${
                    selectedWallet === wallet.id ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10' : 'border-slate-200 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${wallet.colors} text-white text-xs font-semibold uppercase tracking-wide flex items-center justify-center`}>
                      {wallet.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{wallet.name}</p>
                      <p className="text-xs text-slate-500">{wallet.perk}</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    selectedWallet === wallet.id ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}>
                    {selectedWallet === wallet.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!selectedWallet}
              onClick={() => handlePayment('wallets')}
              className={`w-full py-4 rounded-2xl font-semibold text-white shadow-lg ${
                selectedWallet
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              {selectedWallet ? `Pay with ${walletPartners.find((wallet) => wallet.id === selectedWallet)?.name}` : 'Select a wallet to continue'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Plane className="w-16 h-16 text-blue-600 animate-bounce mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Loading Payment Details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <Navbar />
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-2 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left Sidebar - Booking Summary */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden sticky top-24">
              <div 
                className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 flex items-center justify-between cursor-pointer"
                onClick={() => setFareSummaryExpanded(!fareSummaryExpanded)}
              >
                <div>
                  <h3 className="text-lg font-bold text-white">Booking Summary</h3>
                  <p className="text-slate-300 text-sm">{bookingData.passengers.length} Traveller{bookingData.passengers.length > 1 ? 's' : ''}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-white transition-transform ${fareSummaryExpanded ? 'rotate-180' : ''}`} />
              </div>

              <div className="p-5">
                {/* Section 1: Amount To Be Paid */}
                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount To Be Paid</span>
                    <span className="text-2xl font-bold text-gray-900">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500">({bookingData.passengers.length} Traveller{bookingData.passengers.length > 1 ? 's' : ''})</p>
                </div>

                {fareSummaryExpanded && (
                  <>
                    {/* Section 2: Trip Details */}
                    <div className="border-t border-gray-200 pt-5 mb-5">
                  {/* Check if this is a bus booking */}
                  {bookingResponses.length > 0 && bookingResponses[0].booking.service_details?.type === 'TrainService' ? (
  // 🚆 Train Booking Display
  <>
    

    {bookingResponses.map((booking, index) => {
      const s = booking.booking.service_details;
      return (

        <div key={index}>
          <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">{s.train_name}</h2>
          <span className="px-2.5 py-1 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-300">
            One Way
          </span>
        </div>
          <div className="flex items-center justify-between mb-3">
            <div className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-gray-100 rounded-lg border border-slate-300 shadow-sm">
              <span className="text-xs font-bold text-slate-700">
                {formatDate(s.departure_time)}
              </span>
            </div>
            <div className="text-xs font-semibold text-gray-500">
              {s.train_number}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-gray-900">{formatTime(s.departure_time)}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{s.source}</div>
              </div>

              <div className="flex-1 flex flex-col items-center">
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  {calculateDuration(s.departure_time, s.arrival_time)}
                </div>
                <div className="w-full h-px bg-gray-300 relative">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full flex items-center justify-center shadow-sm">
                    <svg className="w-2.5 h-2.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                      <circle cx="7" cy="19" r="1" fill="currentColor"/>
                      <circle cx="17" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.status}</div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{formatTime(s.arrival_time)}</div>
                <div className="text-xs font-medium text-gray-600 mt-0.5">{s.destination}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6" width="18" height="12" rx="2"/>
                    <circle cx="7" cy="19" r="1" fill="currentColor"/>
                    <circle cx="17" cy="19" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{s.train_name}</div>
                  <div className="text-xs text-gray-500">{bookingData.class_type}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </>
) : bookingResponses.length > 0 && bookingResponses[0].booking.service_details?.type === 'BusService' ? (

                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-900">Your Bus</h2>
                        <span className="px-2.5 py-1 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-300">
                          One Way
                        </span>
                      </div>

                      {bookingResponses.map((booking, index) => {
                        const serviceDetails = booking.booking.service_details;
                        
                        return (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-gray-100 rounded-lg border border-slate-300 shadow-sm">
                                <span className="text-xs font-bold text-slate-700">
                                  {formatDate(serviceDetails.departure_time)}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-gray-500">
                                {serviceDetails.service_id.substring(0, 8).toUpperCase()}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-lg font-bold text-gray-900">{formatTime(serviceDetails.departure_time)}</div>
                                  <div className="text-xs font-medium text-gray-600 mt-0.5">{serviceDetails.source}</div>
                                  <div className="text-xs text-gray-400">{serviceDetails.route.split(' → ')[0].match(/\(([^)]+)\)/)?.[1] || ''}</div>
                                </div>

                                <div className="flex-1 flex flex-col items-center">
                                  <div className="text-xs font-semibold text-gray-500 mb-1">
                                    {calculateDuration(serviceDetails.departure_time, serviceDetails.arrival_time)}
                                  </div>
                                  <div className="w-full h-px bg-gray-300 relative">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full flex items-center justify-center shadow-sm">
                                      <svg className="w-2.5 h-2.5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="3" y="6" width="18" height="12" rx="2" strokeWidth="2"/>
                                        <circle cx="7" cy="19" r="1" fill="currentColor"/>
                                        <circle cx="17" cy="19" r="1" fill="currentColor"/>
                                      </svg>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">{serviceDetails.status}</div>
                                </div>

                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{formatTime(serviceDetails.arrival_time)}</div>
                                  <div className="text-xs font-medium text-gray-600 mt-0.5">{serviceDetails.destination}</div>
                                  <div className="text-xs text-gray-400">{serviceDetails.route.split(' → ')[1].match(/\(([^)]+)\)/)?.[1] || ''}</div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="6" width="18" height="12" rx="2"/>
                                      <circle cx="7" cy="19" r="1" fill="currentColor"/>
                                      <circle cx="17" cy="19" r="1" fill="currentColor"/>
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">Bus Service</div>
                                    <div className="text-xs text-gray-500">{bookingData.class_type}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    // Flight Booking Display (original)
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-gray-900">Your Flight</h2>
                        <span className="px-2.5 py-1 bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-300">
                          {bookingData.tripType === 'roundTrip' ? 'Round Trip' : 'One Way'}
                        </span>
                      </div>

                      {bookingData.service_ids.map((serviceId, index) => {
                        const flight = flightData[serviceId];
                        if (!flight) return null;

                        return (
                          <div key={serviceId} className={index > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-gray-100 rounded-lg border border-slate-300 shadow-sm">
                                <span className="text-xs font-bold text-slate-700">
                                  {formatDate(flight.departure_time)}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-gray-500">
                                {flight.flight_number}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-lg font-bold text-gray-900">{formatTime(flight.departure_time)}</div>
                                  <div className="text-xs font-medium text-gray-600 mt-0.5">{flight.route.source.city}</div>
                                  <div className="text-xs text-gray-400">{flight.route.source.code}</div>
                                </div>

                                <div className="flex-1 flex flex-col items-center">
                                  <div className="text-xs font-semibold text-gray-500 mb-1">
                                    {calculateDuration(flight.departure_time, flight.arrival_time)}
                                  </div>
                                  <div className="w-full h-px bg-gray-300 relative">
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-400 rounded-full flex items-center justify-center shadow-sm">
                                      <Plane className="w-2.5 h-2.5 text-slate-600" />
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1">Non-stop</div>
                                </div>

                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{formatTime(flight.arrival_time)}</div>
                                  <div className="text-xs font-medium text-gray-600 mt-0.5">{flight.route.destination.city}</div>
                                  <div className="text-xs text-gray-400">{flight.route.destination.code}</div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                                    <Plane className="w-4 h-4 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900">{flight.airline_name}</div>
                                    <div className="text-xs text-gray-500">{flight.aircraft_model}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Section 3: Travellers */}
                <div className="border-t border-gray-200 pt-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Travellers</h2>
                  <div className="space-y-2.5">
                    {bookingData.passengers.map((passenger, index) => {
                      // Get seat numbers from booking responses
                      const seats = bookingResponses.map(response => 
                        response.assigned_seats[index]
                      ).filter(Boolean);

                      return (
                        <div key={index} className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">{passenger.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {passenger.age} yrs • {passenger.gender}
                                </div>
                              </div>
                            </div>
                            
                            {seats.length > 0 && (
                              <div className="flex gap-2">
                                {seats.map((seat, seatIdx) => (
                                  <div key={seatIdx} className="group relative">
                                    <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 shadow-sm">
                                      <div className="text-xs font-bold text-blue-700">{seat}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Payment Options */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="rounded-[36px] border border-slate-100 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-6 px-6 py-8">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Checkout</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Payment Methods</h2>
                  <p className="text-sm text-slate-500">Select a payment rail crafted for enterprise-grade reliability.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <Shield className="w-4 h-4" />
                  100% Safe Payment Process
                </div>
              </div>

              <div className="border-t border-slate-100 px-6 pb-6 pt-8 lg:px-10">
                <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="space-y-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const isActive = selectedPaymentMethod === method.id;

                      return (
                        <button
                          type="button"
                          key={method.id}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`w-full text-left rounded-[26px] border-2 px-5 py-4 transition-all ${
                            isActive
                              ? 'border-transparent bg-gradient-to-br from-[#111c34] via-[#172447] to-[#11182b] text-white shadow-[0_25px_45px_rgba(15,23,42,0.35)]'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                              isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                            </div>
                            <div>
                              <p className={`font-semibold ${isActive ? 'text-white' : 'text-slate-900'}`}>{method.label}</p>
                              <p className={`text-sm mt-1 ${isActive ? 'text-white/60' : 'text-slate-500'}`}>{method.subtitle}</p>
                              {method.badge && (
                                <span className={`inline-flex mt-2 text-[11px] uppercase tracking-wide font-semibold px-2.5 py-0.5 rounded-full ${
                                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {method.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-6 shadow-inner lg:p-10">
                    {renderPaymentContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
