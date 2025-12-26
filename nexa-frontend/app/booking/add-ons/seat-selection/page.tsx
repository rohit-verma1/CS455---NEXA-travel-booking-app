'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plane, ChevronRight, ChevronLeft, X, User } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { getAuthFromStorage } from '@/utils/authStorage';
import { useRouter } from 'next/navigation';
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

interface Seat {
  seat_id: string;
  seat_number: string;
  seat_type: string;
  is_booked: boolean;
  price: string;
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
  seats: Seat[];
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
  email: string;
  phone_number: string;
}

interface BookingResponse {
  booking: {
    booking_id: string;
    customer: string;
    service_details: {
      type: string;
      service_id: string;
      flight_number: string;
      airline_name: string;
      departure_time: string;
      arrival_time: string;
      status: string;
    };
    total_amount: string;
    status: string;
    payment_status: string;
    booking_date: string;
    created_at: string;
    passengers: Array<{
      passenger_id: string;
      name: string;
      age: number;
      gender: string;
      seat_no: string;
      document_id: string;
    }>;
    ticket: any;
    status_logs: Array<{
      status: string;
      timestamp: string;
      remarks: string;
    }>;
  };
  assigned_seats: string[];
  payment_next: string;
}

// --- Aircraft nose / tail ----------------------------------------------------

type NoseProps = { cols: number; cellH?: number }; // cols = number of letters (A..), cellH≈row height

// Shared painter (front=true shows nose on the right; front=false mirrors it)
function NoseSVGBase({ cols, cellH = 96, front = true, label }: NoseProps & { front?: boolean; label: 'FRONT' | 'BACK' }) {
  // dynamic height so the shape spans exactly from letter A down to last letter
  const H = Math.max(280, Math.round(cols * cellH));
  const W = 560;                          // generous width so the cone feels roomy
  const viewBox = `0 0 ${W} ${H}`;

  // Arc geometry (right-side inner wall). We place a big circle center well to the right,
  // so only its left arc is visible inside the viewBox.
  const cx = W + 140;                     // push center to the right (off-canvas)
  const cy = H / 2;
  const rInner = Math.max(420, H * 0.8);  // inner cabin wall radius
  const rOuter = rInner + 80;             // outer fuselage radius (fainter band)

  // Windows along the outer “band” following the arc
  const windows = Array.from({ length: 7 }).map((_, i) => {
    const t0 = -0.9;                       // top param (radians, relative) -> arc span
    const t1 =  0.9;                        // bottom param
    const t = t0 + (i / 6) * (t1 - t0);     // evenly spaced
    const rr = rInner + 40;                 // on the band
    const x = cx + rr * Math.cos(t);
    const y = cy + rr * Math.sin(t);

    // small tapered polygon oriented tangentially
    const tang = Math.atan2(Math.sin(t), Math.cos(t)) + Math.PI / 2; // tangent angle
    const w = 64, h = 42; // “window” nominal size
    // four points of a slanted trapezoid
    const dx = (w / 2) * Math.cos(tang), dy = (w / 2) * Math.sin(tang);
    const ex = (h / 2) * Math.cos(t),    ey = (h / 2) * Math.sin(t); // slight curve match

    const p1 = `${x - dx - ex},${y - dy - ey}`;
    const p2 = `${x + dx - ex},${y + dy - ey}`;
    const p3 = `${x + dx + ex},${y + dy + ey}`;
    const p4 = `${x - dx + ex},${y - dy + ey}`;

    return <polygon key={i} points={`${p1} ${p2} ${p3} ${p4}`} fill="#ffffff" opacity="1" />;
  });

  // Flip horizontally for BACK so the label stays readable (we flip the artwork group only)
  const flip = front ?  `translate(465) scale(-1 1)` : `translate(320)`;

  return (
    <svg viewBox={viewBox} width={W} height={H} className="block" aria-hidden>
      {/* subtle background tint so the cone blends with your gradient card */}
      <rect x="0" y="0" width={W} height={H} fill="none" />

      {/* Outer fuselage arc (faint, wide) */}
      <g transform={flip}>
        <path
          d={`M 0,0
              L ${W * 0.12},0
              A ${rOuter},${rOuter} 0 0 1 ${W * 0.12},${H}
              L 0,${H} Z`}
          fill="#EFF4FB"       /* very light blue-gray */
        />

        {/* “Windows” on the band */}
        <g opacity="0.45">{windows}</g>

        {/* Inner cabin wall (nose cone) – the big pale arc on the right */}
        <path
          d={`M ${W * 0.22},0
              A ${rInner},${rInner} 0 0 1 ${W * 0.22},${H}
              L ${W},${H}
              L ${W},0 Z`}
          fill="#F7FAFF"      /* slightly lighter so the cone is readable */
        />

        {/* faint rim line to hint the wall thickness */}
        <path
          d={`M ${W * 0.22 + 18},6
              A ${rInner - 18},${rInner - 18} 0 0 1 ${W * 0.22 + 18},${H - 6}`}
          fill="none"
          stroke="#E6ECF5"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>

      {/* Label stays unflipped and centered in the cone */}
      <text
        x={W * 0.60}
        y={cy}
        transform={`translate(55, 0)`}
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="700"
        fontSize={Math.max(22, Math.min(34, H * 0.045))}
        fill="#A3A6AE"
        style={{ letterSpacing: '0.04em' }}
      >
        {label}
      </text>
    </svg>
  );
}

export const PlaneFrontSVG: React.FC<NoseProps> = (p) => <NoseSVGBase {...p} front label="FRONT" />;
export const PlaneBackSVG:  React.FC<NoseProps> = (p) => <NoseSVGBase {...p} front={false} label="BACK" />;






// Premium Seat Component with exact styling from images
const PremiumSeatIcon: React.FC<{
  isBooked: boolean;
  isSelected: boolean;
  isCurrentPassenger: boolean;
  onClick: () => void;
  disabled: boolean;
  seatNumber: string;
}> = ({ isBooked, isSelected, isCurrentPassenger, onClick, disabled, seatNumber }) => {
  const getColors = () => {
    if (isBooked) return { seat: '#E5E7EB', back: '#D1D5DB', arm: '#D1D5DB' };
    if (isCurrentPassenger) return { seat: '#93C5FD', back: '#60A5FA', arm: '#60A5FA' };
    if (isSelected) return { seat: '#9CA3AF', back: '#6B7280', arm: '#6B7280' };
    return { seat: '#D4F4DD', back: '#BBF7D0', arm: '#BBF7D0' };
  };
  const colors = getColors();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative transition-all duration-200
        ${disabled && !isCurrentPassenger ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-105'}
      `}
      // swap size to keep natural footprint after rotation
      style={{ width: '72px', height: '64px' }}
    >
      {/* Rotate ONLY the svg so the overlay text remains upright */}
      <svg
        viewBox="0 0 64 72"
        className="w-full h-full drop-shadow-sm transform rotate-90"
    >
        {/* Main seat base */}
        <rect
          x="10" y="28" width="44" height="40" rx="6"
          fill={colors.seat}
          stroke={isCurrentPassenger ? '#3B82F6' : isBooked ? '#9CA3AF' : isSelected ? '#6B7280' : '#86EFAC'}
          strokeWidth="2"
        />
        {/* Seat back */}
        <rect
          x="12" y="12" width="40" height="24" rx="8"
          fill={colors.back}
          stroke={isCurrentPassenger ? '#2563EB' : isBooked ? '#6B7280' : isSelected ? '#4B5563' : '#4ADE80'}
          strokeWidth="2"
        />
        {/* Left armrest */}
        <rect
          x="4" y="30" width="8" height="28" rx="4"
          fill={colors.arm}
          stroke={isCurrentPassenger ? '#2563EB' : isBooked ? '#6B7280' : isSelected ? '#4B5563' : '#4ADE80'}
          strokeWidth="1.5"
        />
        {/* Right armrest */}
        <rect
          x="52" y="30" width="8" height="28" rx="4"
          fill={colors.arm}
          stroke={isCurrentPassenger ? '#2563EB' : isBooked ? '#6B7280' : isSelected ? '#4B5563' : '#4ADE80'}
          strokeWidth="1.5"
        />
      </svg>

      {/* keep seat label upright */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: "translateX(-12px)" }}
      >
        {isBooked ? (
          <X className="w-6 h-6 text-gray-500" strokeWidth={2.5} />
        ) : (
          <span
            className={`text-xs font-bold ${
              isCurrentPassenger ? 'text-blue-700' : isSelected ? 'text-gray-700' : 'text-green-800'
            }`}
          >
            {seatNumber}
          </span>
        )}
      </div>
    </button>
  );
};


const SeatSelectionPage: React.FC = () => {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [flightData, setFlightData] = useState<Record<string, FlightService>>({});
  const [selectedFlight, setSelectedFlight] = useState<string>('');
  const [selectedPassengerIndex, setSelectedPassengerIndex] = useState<number>(0);
  const [passengerSeats, setPassengerSeats] = useState<Record<string, Record<number, string>>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  // Load booking data from sessionStorage on mount
  useEffect(() => {
    const storedBookingData = sessionStorage.getItem('bookingData');
    if (storedBookingData) {
      const data = JSON.parse(storedBookingData) as BookingData;
      setBookingData(data);
      if (data.service_ids.length > 0) {
        setSelectedFlight(data.service_ids[0]);
      }
    } else {
      // Redirect back to review page if no booking data
      router.push('/booking/review');
    }
  }, [router]);

  // Fetch flight data when bookingData is available
  const fetchFlightData = useCallback(async () => {
    if (!bookingData) return;
    
    setLoading(true);
    try {
        const flightDataMap: Record<string, FlightService> = {};
        
        // Fetch data for each service_id
        for (const serviceId of bookingData.service_ids) {
        const response = await fetch(
            API.FLIGHT_SERVICE_DETAILS(serviceId),
            {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch flight ${serviceId}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform API response to match our FlightService interface
        flightDataMap[serviceId] = {
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
            seats: data.seats.map((seat: any) => ({
            seat_id: seat.seat_id,
            seat_number: seat.seat_number,
            seat_type: seat.seat_class, // API uses seat_class, we use seat_type
            is_booked: seat.is_booked,
            price: seat.price
            })),
            policy: {
            cancellation_fee: data.policy.cancellation_fee,
            reschedule_fee: data.policy.reschedule_fee,
            no_cancellation_fee_markup: data.policy.no_cancellation_fee_markup,
            no_reschedule_fee_markup: data.policy.no_reschedule_fee_markup
            }
        };
        }
        
        setFlightData(flightDataMap);
    } catch (error) {
        console.error('Error fetching flight data:', error);
        // Optionally show error to user
    } finally {
        setLoading(false);
    }
  }, [bookingData]);

  useEffect(() => {
    if (bookingData) {
      fetchFlightData();
    }
  }, [bookingData, fetchFlightData]);

    const handleContinue = async () => {
        if (!bookingData) return;
        
        try {
            setLoading(true);
            const auth = getAuthFromStorage();
            
            if (!auth?.token) {
            alert('Please login to continue');
            return;
            }

            // Validate all passengers have seats selected for all flights
            for (const serviceId of bookingData.service_ids) {
            for (let i = 0; i < bookingData.passengers.length; i++) {
                if (!passengerSeats[serviceId]?.[i]) {
                alert(`Please select seat for ${bookingData.passengers[i].name} on all flights`);
                return;
                }
            }
            }

            // Map class_type to API format
            const classTypeMap: Record<string, string> = {
            'Business': 'Business',
            'Premium': 'PremiumEconomy',
            'Economy': 'Economy'
            };

            // Array to store booking IDs and responses
            const bookingIds: string[] = [];
            const bookingResponses: BookingResponse[] = [];

            // Make booking API call for each service
            for (let idx = 0; idx < bookingData.service_ids.length; idx++) {
            const serviceId = bookingData.service_ids[idx];
            
            // Prepare passengers with seat numbers
            const passengersWithSeats = bookingData.passengers.map((passenger, i) => ({
                name: passenger.name,
                age: passenger.age,
                gender: passenger.gender,
                seat_no: passengerSeats[serviceId][i],
                document_id: passenger.nationality
            }));

            // For return flight, swap from and to stations
            const isReturnFlight = idx === 1 && bookingData.tripType === 'roundTrip';
            
            const bookingPayload = {
                service_model: 'flight',
                service_id: serviceId,
                passengers: passengersWithSeats,
                class_type: classTypeMap[bookingData.class_type],
                from_station_id: isReturnFlight 
                ? bookingData.to_station_id 
                : bookingData.from_station_id,
                to_station_id: isReturnFlight 
                ? bookingData.from_station_id 
                : bookingData.to_station_id,
                no_cancellation_free_markup: bookingData.no_cancellation_free_markup,
                no_reschedule_free_markup: bookingData.no_reschedule_free_markup,
                email: bookingData.email,
                phone_number: bookingData.phone_number
            };

            const response = await fetch(API.BOOKING_CREATE, {
                method: 'POST',
                headers: {
                'accept': 'application/json',
                'Authorization': `Token ${auth.token}`,
                'Content-Type': 'application/json'
                },
                body: JSON.stringify(bookingPayload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Booking failed: ${JSON.stringify(errorData)}`);
            }

            const bookingResult = await response.json();
            console.log(`Booking ${idx + 1} successful:`, bookingResult);
            
            // Store booking ID and full response
            bookingIds.push(bookingResult.booking.booking_id);
            bookingResponses.push(bookingResult);
            }

            // Calculate total amount from all booking responses
            const totalAmount = bookingResponses.reduce((sum, response) => {
                return sum + parseFloat(response.booking.total_amount || '0');
            }, 0);

            // Store booking data in sessionStorage for the payment page
            sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
            sessionStorage.setItem('bookingIds', JSON.stringify(bookingIds));
            sessionStorage.setItem('bookingResponses', JSON.stringify(bookingResponses));
            sessionStorage.setItem('totalAmount', totalAmount.toString());

            // Navigate to payment page
            router.push('/booking/payment');
            
        } catch (error) {
            console.error('Error creating booking:', error);
            alert('Booking failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };


  const currentFlight = flightData[selectedFlight];
  
    const getSeatLayout = () => {
        if (!currentFlight || !bookingData) return { rows: 0, cols: 0, seats: [] };
        
        const classType = bookingData.class_type.toLowerCase();
        const rows = currentFlight[`num_rows_${classType}` as keyof FlightService] as number;
        const cols = currentFlight[`num_columns_${classType}` as keyof FlightService] as number;
        
        // Map class type to seat_type value from API
        const seatTypeMap: Record<string, string> = {
            'business': 'Business',
            'premium': 'PremiumEconomy',
            'economy': 'Economy'
        };
        
        const classSeats = currentFlight.seats.filter(
            seat => seat.seat_type === seatTypeMap[classType]
        );
        
        return { rows, cols, seats: classSeats };
    };

  const handleSeatClick = (seatNumber: string, isBooked: boolean) => {
    if (isBooked) return;
    
    const currentSeat = passengerSeats[selectedFlight]?.[selectedPassengerIndex];
    
    if (currentSeat === seatNumber) {
      setPassengerSeats(prev => ({
        ...prev,
        [selectedFlight]: {
          ...prev[selectedFlight],
          [selectedPassengerIndex]: ''
        }
      }));
    } else {
      setPassengerSeats(prev => ({
        ...prev,
        [selectedFlight]: {
          ...prev[selectedFlight],
          [selectedPassengerIndex]: seatNumber
        }
      }));
    }
  };

  const isSeatSelected = (seatNumber: string): boolean => {
    return Object.values(passengerSeats[selectedFlight] || {}).includes(seatNumber);
  };

  const isSeatSelectedByCurrentPassenger = (seatNumber: string): boolean => {
    return passengerSeats[selectedFlight]?.[selectedPassengerIndex] === seatNumber;
  };

  const getSeatPosition = (seatNumber: string): string => {
    const letter = seatNumber.slice(-1);
    const { cols } = getSeatLayout();
    const letters = 'ABCDEFGHIJ';
    const index = letters.indexOf(letter);
    
    if (index < Math.floor(cols / 2)) {
      return 'Window';
    } else if (index === Math.floor(cols / 2) - 1 || index === Math.floor(cols / 2)) {
      return 'Aisle';
    } else {
      return 'Window';
    }
  };

  const renderHorizontalSeatMap = () => {
    const { rows, cols, seats } = getSeatLayout();
    const letters = 'ABCDEFGHIJ';
    const aislePosition = Math.floor(cols / 2);

    return (
      <div className="relative">
        <div className="overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
          <div className="inline-flex flex-col items-center gap-6 min-w-max px-8 py-6">
            {/* Row labels on left */}
            <div className="flex items-center gap-6">
              <div className="w-12 flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-400">FRONT</span>
              </div>
              {/* Column headers */}
              {Array.from({ length: cols }).map((_, colIndex) => (
                <React.Fragment key={`header-${colIndex}`}>
                  <div className="w-[72px] text-center">
                    <span className="text-base font-bold text-gray-500">{letters[colIndex]}</span>
                  </div>
                  {colIndex === aislePosition - 1 && <div className="w-12"></div>}
                </React.Fragment>
              ))}
              <div className="w-12 flex items-center justify-center">
                <span className="text-sm font-semibold text-gray-400">BACK</span>
              </div>
            </div>

            {/* Seat rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex items-center gap-6">
                {/* Row number (left) – keep or remove as you like */}
                <div className="w-12 text-center">
                <span className="text-base font-bold text-gray-500">
                    {rowIndex + 1}
                </span>
                </div>

                {/* Seats — insert row number between the two halves */}
                {Array.from({ length: cols }).map((_, colIndex) => {
                    const seatNumber = `${rowIndex + 1}${letters[colIndex]}`;
                    const seat = seats.find((s) => s.seat_number === seatNumber);
                    const isBooked = seat?.is_booked || false;
                    const isSelected = isSeatSelected(seatNumber);
                    const isCurrentPassenger = isSeatSelectedByCurrentPassenger(seatNumber);

                    return (
                        <React.Fragment key={seatNumber}>
                        {/* left or right seat */}
                        <div
                            className="relative w-[72px] flex items-center justify-center"
                            onMouseEnter={() => !isBooked && setHoveredSeat(seatNumber)}
                            onMouseLeave={() => setHoveredSeat(null)}
                        >
                            <PremiumSeatIcon
                            seatNumber={seatNumber}
                            isBooked={isBooked}
                            isSelected={isSelected}
                            isCurrentPassenger={isCurrentPassenger}
                            onClick={() => handleSeatClick(seatNumber, isBooked)}
                            disabled={isBooked || (isSelected && !isCurrentPassenger)}
                            />

                            {/* tooltip (unchanged) */}
                            {hoveredSeat === seatNumber && !isBooked && (
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="bg-white rounded-xl shadow-2xl border border-gray-100 px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900 mb-1">
                                    {seatNumber} • {getSeatPosition(seatNumber)}
                                </div>
                                <div className="text-xs text-gray-600">₹{seat?.price || '0'}</div>
                                </div>
                                <div className="w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                            </div>
                            )}
                        </div>

                        {/* AISLE NUMBER — appears exactly between C and D */}
                        {colIndex === aislePosition - 1 && (
                            <div
                            className="w-12 flex items-center justify-center pointer-events-none"
                            aria-hidden="true"
                            >
                            <span className="text-sm font-bold text-gray-500">
                                {rowIndex + 1}
                            </span>
                            </div>
                        )}
                        </React.Fragment>
                    );
                })}

                {/* Row number (right) – keep or remove as you like */}
                <div className="w-12 text-center">
                <span className="text-base font-bold text-gray-500">
                    {rowIndex + 1}
                </span>
                </div>
            </div>
            ))}


          </div>
        </div>
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    // Use UTC time to match the API response
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const calculateDuration = (departure: string, arrival: string) => {
    if (!departure || !arrival) return '--h --m';
    const dep = new Date(departure);
    const arr = new Date(arrival);
    const diff = arr.getTime() - dep.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Helper to get price for a specific class
  const getPriceForClass = (flight: FlightService, classType: string): number => {
    const classLower = classType.toLowerCase();
    if (classLower.includes('business')) {
      return parseFloat(flight.business_price);
    } else if (classLower.includes('premium') && flight.premium_price) {
      return parseFloat(flight.premium_price);
    } else {
      return parseFloat(flight.economy_price);
    }
  };

  // Calculate onward fare per person
  const calculateOnwardFare = () => {
    if (!bookingData || bookingData.service_ids.length === 0) return 0;
    const flight = flightData[bookingData.service_ids[0]];
    if (!flight) return 0;
    return getPriceForClass(flight, bookingData.class_type);
  };

  // Calculate return fare per person (if round trip)
  const calculateReturnFare = () => {
    if (!bookingData || bookingData.tripType !== 'roundTrip' || bookingData.service_ids.length < 2) return 0;
    const flight = flightData[bookingData.service_ids[1]];
    if (!flight) return 0;
    return getPriceForClass(flight, bookingData.class_type);
  };

  // Calculate protection fees - must match review page calculation exactly
  const calculateProtectionFees = () => {
    if (!bookingData) return { cancellation: 0, reschedule: 0, total: 0 };
    
    let cancellationFee = 0;
    let rescheduleFee = 0;

    // Only calculate if the boolean flags are true (set in review page)
    if (bookingData.no_cancellation_free_markup) {
      bookingData.service_ids.forEach(serviceId => {
        const flight = flightData[serviceId];
        if (flight) {
          cancellationFee += parseFloat(flight.policy.no_cancellation_fee_markup || '0');
        }
      });
      cancellationFee *= bookingData.passengers.length;
    }

    if (bookingData.no_reschedule_free_markup) {
      bookingData.service_ids.forEach(serviceId => {
        const flight = flightData[serviceId];
        if (flight) {
          rescheduleFee += parseFloat(flight.policy.no_reschedule_fee_markup || '0');
        }
      });
      rescheduleFee *= bookingData.passengers.length;
    }

    return {
      cancellation: cancellationFee,
      reschedule: rescheduleFee,
      total: cancellationFee + rescheduleFee
    };
  };

  const calculateTotal = () => {
    if (!bookingData) return 0;
    
    const onwardFare = calculateOnwardFare() * bookingData.passengers.length;
    const returnFare = calculateReturnFare() * bookingData.passengers.length;
    const protectionFees = calculateProtectionFees();
    
    return onwardFare + returnFare + protectionFees.total;
  };

  if (loading || !bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Plane className="w-16 h-16 text-blue-600 animate-bounce mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">
            {!bookingData ? 'Loading booking data...' : 'Loading Flight Seat Layout...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] pb-28">
        <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-[380px] flex-shrink-0 space-y-4">
            {/* Trip Details Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">Your Flight</h2>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                {bookingData.tripType === 'roundTrip' ? 'Round Trip' : 'One Way'}
                </span>
            </div>

            {bookingData.service_ids.map((serviceId, index) => {
                const flight = flightData[serviceId];
                if (!flight) return null;

                return (
                <div key={serviceId} className={index > 0 ? 'mt-5 pt-5 border-t border-gray-100' : ''}>
                    <div className="flex items-center justify-between mb-3">
                    <div className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="text-xs font-bold text-blue-700">
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
                        <div className="text-xl font-bold text-gray-900">{formatTime(flight.departure_time)}</div>
                        <div className="text-xs font-medium text-gray-600 mt-0.5">{flight.route.source.city}</div>
                        <div className="text-xs text-gray-400">{flight.route.source.code}</div>
                        </div>

                        <div className="flex-1 flex flex-col items-center">
                        <div className="text-xs font-semibold text-gray-500 mb-1">
                            {calculateDuration(flight.departure_time, flight.arrival_time)}
                        </div>
                        <div className="w-full h-px bg-gray-200 relative">
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border border-gray-300 rounded-full flex items-center justify-center">
                            <Plane className="w-2.5 h-2.5 text-gray-600" />
                            </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">Non-stop</div>
                        </div>

                        <div className="text-right">
                        <div className="text-xl font-bold text-gray-900">{formatTime(flight.arrival_time)}</div>
                        <div className="text-xs font-medium text-gray-600 mt-0.5">{flight.route.destination.city}</div>
                        <div className="text-xs text-gray-400">{flight.route.destination.code}</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
            </div>

            {/* Passengers Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-3">Travellers</h2>
            <div className="space-y-2.5">
                {bookingData.passengers.map((passenger, index) => {
                const outboundSeat = passengerSeats[bookingData.service_ids[0]]?.[index];
                const returnSeat = bookingData.tripType === 'roundTrip' 
                    ? passengerSeats[bookingData.service_ids[1]]?.[index]
                    : null;

                return (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {index + 1}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 text-sm">{passenger.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                            {passenger.age} yrs • {passenger.gender}
                            </div>
                        </div>
                        </div>
                        
                        {(outboundSeat || returnSeat) && (
                        <div className="flex gap-2">
                            {outboundSeat && (
                            <div className="group relative">
                                <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 shadow-sm hover:shadow-md transition-all">
                                <div className="text-xs font-bold text-blue-700">{outboundSeat}</div>
                                </div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"></div>
                            </div>
                            )}
                            {returnSeat && (
                            <div className="group relative">
                                <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-300 shadow-sm hover:shadow-md transition-all">
                                <div className="text-xs font-bold text-blue-700">{returnSeat}</div>
                                </div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full animate-pulse"></div>
                            </div>
                            )}
                        </div>
                        )}
                    </div>
                    </div>
                );
                })}
            </div>
            </div>

            {/* Fare Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100">
              <h2 className="text-base font-bold text-slate-900 mb-4">Fare Summary</h2>
              <div className="space-y-3">
                {/* Onward Fare */}
                {bookingData && bookingData.service_ids.length > 0 && (
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Onward Fare</span>
                      <span className="text-xs text-slate-500 mt-0.5">{bookingData.passengers.length} × ₹{calculateOnwardFare().toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      ₹{(calculateOnwardFare() * bookingData.passengers.length).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Return Fare (if round trip) */}
                {bookingData && bookingData.tripType === 'roundTrip' && bookingData.service_ids.length > 1 && (
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Return Fare</span>
                      <span className="text-xs text-slate-500 mt-0.5">{bookingData.passengers.length} × ₹{calculateReturnFare().toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      ₹{(calculateReturnFare() * bookingData.passengers.length).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Cancellation Protection (if selected) */}
                {bookingData && calculateProtectionFees().cancellation > 0 && (
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Cancellation Protection</span>
                      <span className="text-xs text-slate-500 mt-0.5">{bookingData.passengers.length} × ₹{(calculateProtectionFees().cancellation / bookingData.passengers.length).toFixed(0)}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      ₹{calculateProtectionFees().cancellation.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Reschedule Protection (if selected) */}
                {bookingData && calculateProtectionFees().reschedule > 0 && (
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Reschedule Protection</span>
                      <span className="text-xs text-slate-500 mt-0.5">{bookingData.passengers.length} × ₹{(calculateProtectionFees().reschedule / bookingData.passengers.length).toFixed(0)}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      ₹{calculateProtectionFees().reschedule.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="pt-4 mt-2 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-slate-900">Total Amount</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">₹{calculateTotal().toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Header Section */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="grid grid-cols-3 gap-4 items-start mb-6">
                    {/* Flight Toggle - Left */}
                    <div>
                      {bookingData.tripType === 'roundTrip' && (
                        <div className="inline-flex p-0.5 bg-gray-100 rounded-xl">
                          {bookingData.service_ids.map((serviceId) => {
                            const flight = flightData[serviceId];
                            return (
                              <button
                                key={serviceId}
                                onClick={() => setSelectedFlight(serviceId)}
                                className={`
                                  px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200
                                  ${selectedFlight === serviceId
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                  }
                                `}
                              >
                                {flight?.route.source.code} → {flight?.route.destination.code}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                
                    {/* Title - Center */}
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">SEAT MAP</h2>
                      <p className="text-sm text-gray-500">Select your preferred seat (s)</p>
                    </div>
                
                    {/* Empty div for grid balance */}
                    <div></div>
                  </div>
                
                  {/* Passenger Selection - Below */}
                  <div className="flex gap-3">
                    {bookingData.passengers.map((passenger, index) => {
                      const currentSeat = passengerSeats[selectedFlight]?.[index];
                      const isActive = selectedPassengerIndex === index;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedPassengerIndex(index)}
                          className={`
                            relative px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                            ${isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                            }
                          `}
                        >
                          <div className="flex flex-col items-start">
                            <span>{passenger.name}</span>
                            {currentSeat ? (
                              <span className={`text-xs font-bold mt-0.5 ${isActive ? 'text-blue-100' : 'text-blue-600'}`}>
                                {currentSeat} {getSeatPosition(currentSeat)} • ₹0
                              </span>
                            ) : (
                              <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>
                                Select Seat
                              </span>
                            )}
                          </div>
                          {currentSeat && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeatClick(currentSeat, false);
                              }}
                              className={`
                                absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
                                ${isActive ? 'bg-white text-blue-600' : 'bg-gray-200 text-gray-600'}
                                hover:scale-110 transition-transform
                              `}
                            >
                              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seat Map Section - Horizontally Scrollable with PROPERLY TRANSPOSED layout */}
                <div className="p-6 bg-gray-50">
                  <div className="bg-gradient-to-r from-blue-50/40 via-white to-blue-50/40 rounded-3xl p-6 border border-blue-100/50">
                    <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                      <div className="inline-flex gap-35 rounded-2xl px-6 py-8">
                        {/* FRONT Section */}
                        <div className="flex flex-col items-center justify-center w-32">
                            <PlaneFrontSVG cols={getSeatLayout().cols} />
                        </div>
                

                        {/* Main Seat Grid Container (TRANSPOSED) */}
                        <div className="flex flex-col gap-6">
                          {(() => {
                            const { rows, cols, seats } = getSeatLayout();
                            const lettersAll = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // safe if a wider jet appears
                            const letters = lettersAll.slice(0, cols);
                            const aislePosition = Math.floor(cols / 2);
                        
                            return (
                              <>
                                {/* LETTER lines: A.. (top→bottom). Each line renders seats for all numbers 1..rows */}
                                {Array.from({ length: cols }).map((_, c) => {
                                  const letter = letters[c];
                        
                                  return (
                                    <React.Fragment key={`letter-line-${letter}`}>
                                      <div className="flex items-center gap-6">
                                        {/* Left letter label */}
                                        <div className="w-12 text-center">
                                          <span className="text-base font-bold text-gray-500">{letter}</span>
                                        </div>
                        
                                        {/* Seats for this LETTER across all NUMBERS */}
                                        {Array.from({ length: rows }).map((_, r) => {
                                          const getPrefix = () => {
                                            const classType = bookingData.class_type.toLowerCase();
                                            if (classType === 'premium') return 'P';
                                            if (classType === 'economy') return 'E';
                                            return ''; // Business has no prefix
                                        };
                                            
                                          const prefix = getPrefix();
                                          const seatNumber = `${prefix}${r + 1}${letter}`;
                                          const seat = seats.find(s => s.seat_number === seatNumber);
                                          const isBooked = seat?.is_booked || false;
                                          const isSelected = isSeatSelected(seatNumber);
                                          const isCurrentPassenger = isSeatSelectedByCurrentPassenger(seatNumber);
                        
                                          return (
                                            <div
                                              key={seatNumber}
                                              className="relative w-20 flex items-center justify-center"
                                              onMouseEnter={() => !isBooked && setHoveredSeat(seatNumber)}
                                              onMouseLeave={() => setHoveredSeat(null)}
                                            >
                                              <PremiumSeatIcon
                                                seatNumber={seatNumber}
                                                isBooked={isBooked}
                                                isSelected={isSelected}
                                                isCurrentPassenger={isCurrentPassenger}
                                                onClick={() => handleSeatClick(seatNumber, isBooked)}
                                                disabled={isBooked || (isSelected && !isCurrentPassenger)}
                                              />
                        
                                              {/* Hover tooltip */}
                                              {hoveredSeat === seatNumber && !isBooked && (
                                                <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in duration-200">
                                                  <div className="bg-white rounded-xl shadow-2xl border border-gray-100 px-4 py-3 whitespace-nowrap">
                                                    <div className="font-bold text-gray-900 mb-1">
                                                      {bookingData.passengers[selectedPassengerIndex].name}
                                                    </div>
                                                    <div className="text-sm font-semibold text-gray-700">
                                                      {seatNumber} • {getSeatPosition(seatNumber)} Seat
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">₹0 • Free</div>
                                                  </div>
                                                  <div className="w-3 h-3 bg-white border-r border-b border-gray-100 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                        
                                      {/* HORIZONTAL GAP */}
                                      {c === aislePosition - 1 && (
                                        <div
                                            className="h-8 flex items-center gap-6 pl-12 pointer-events-none"
                                            aria-hidden="true"
                                        >
                                            {Array.from({ length: rows }).map((_, r) => (
                                            <div key={`num-aisle-${r}`} className="w-20 text-center">
                                                <span className="text-base font-bold text-gray-500">{r + 1}</span>
                                            </div>
                                            ))}
                                        </div>
                                    )}

                                    </React.Fragment>
                                  );
                                })}
                              </>
                            );
                          })()}
                        </div>


                        {/* BACK Section */}
                        <div className="flex flex-col items-center justify-center w-32 -ml-[14rem]">
                            <PlaneBackSVG cols={getSeatLayout().cols} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            </div>
        </div>
      </div>

{/* Fixed Footer - Positioned at bottom, aligned with main content */}
<div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
  <div className="max-w-[1400px] mx-auto px-6">
    {/* Offset to align with main content card */}
    <div className="ml-[404px] pointer-events-auto"> {/* 380px sidebar + 24px gap */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-t-2xl border border-blue-100 border-b-0 shadow-2xl px-8 py-5">
        <div className="flex items-center justify-between gap-8">
          {/* Flight Sections */}
          <div className="flex items-center gap-8">
            {bookingData.service_ids.map((serviceId, index) => {
              const flight = flightData[serviceId];
              if (!flight) return null;
              
              const label = bookingData.tripType === 'oneWay' 
                ? 'One Way' 
                : index === 0 ? 'Onward' : 'Return';
              
              return (
                <React.Fragment key={serviceId}>
                  {index > 0 && (
                    <div className="h-20 w-px bg-slate-200"></div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Plane className="w-5 h-5 text-slate-600" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs font-semibold text-slate-500 mb-0.5">{label}</div>
                      <div className="text-xs text-slate-600 mb-1">
                        {flight.airline_name} • {flight.aircraft_model}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg font-bold text-slate-900">
                          {formatTime(flight.departure_time)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <span className="text-lg font-bold text-slate-900">
                          {formatTime(flight.arrival_time)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {calculateDuration(flight.departure_time, flight.arrival_time)} • Non-stop
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-slate-200"></div>

          {/* Travellers Section */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-slate-900">
                  {bookingData.passengers.length}
                </div>
                <div className="text-lg font-bold text-slate-900">
                  Traveller{bookingData.passengers.length > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {bookingData.class_type}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-20 w-px bg-slate-200"></div>

          {/* Total & Continue Section - Horizontally Aligned */}
          <div className="flex flex-col gap-3 pr-12">
            <div className="flex items-center justify-center gap-3">
              <div className="text-sm text-slate-600 font-medium">
                Total Amount:
              </div>
              <div className="text-2xl font-bold text-slate-900 -translate-x-3">
                ₹{calculateTotal().toFixed(0)}
              </div>
            </div>
            <button 
                onClick={handleContinue}
                disabled={loading}
                className="group px-10 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-300 hover:shadow-xl hover:shadow-blue-400 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span>{loading ? 'Processing...' : 'Continue'}</span>
                {!loading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #93C5FD, #60A5FA);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #60A5FA, #3B82F6);
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-in-from-bottom-2 {
          from {
            transform: translateY(8px) translateX(-50%);
          }
          to {
            transform: translateY(0) translateX(-50%);
          }
        }

        .animate-in {
          animation: fade-in 0.2s ease-out, slide-in-from-bottom-2 0.2s ease-out;
        }

        .fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .slide-in-from-bottom-2 {
          animation: slide-in-from-bottom-2 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SeatSelectionPage;