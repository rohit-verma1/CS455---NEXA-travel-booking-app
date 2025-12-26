"use client";   

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Train, MapPin, Clock, Users, Shield, Star, Plus, Trash2, Edit3, Check, Tag, Sparkles, Info, ArrowRight, UserPlus, Phone, Wifi, Droplet, Lightbulb, Wind, Bed, Plug, Monitor, Utensils, AirVent, Bath } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuthFromStorage } from '@/utils/authStorage';
import API from '@/app/api';
const defaultTrainService = {
  train_name: "Rajdhani Express",
  train_number: "12301",
  route: {
    source: "New Delhi",
    destination: "Mumbai Central",
    distance_km: 1384,
    estimated_duration: "16h 35m",
  },
  departure_time: "2025-10-25T16:30:00",
  arrival_time: "2025-10-26T09:05:00",
  vehicle: {
    amenities: ["WiFi", "Charging Points", "AC", "Meals", "Entertainment", "Blankets"],
  },
  policy: {
    cancellation_window: 24,
    cancellation_fee: "200.00",
    reschedule_allowed: true,
    reschedule_fee: "150.00",
    no_show_penalty: "500.00",
    terms_conditions:
      "Tickets once booked cannot be transferred. Cancellations allowed up to 24 hours before departure.",
    no_cancellation_fee_markup: "20.00",
    no_reschedule_fee_markup: "15.00",
  },
  base_price: "1500.00",
  sleeper_price: "800.00",
  third_ac_price: "1500.00",
  second_ac_price: "2200.00",

  // 🆕 Added fields for backend compatibility
  availability: {
    Sleeper: 0,
    SecondAC: 0,
    ThirdAC: 0,
  },
  rating: "0.0",
  reviews: 0,
};


const offers = [
  { code: "FIRST50", discount: "50% off up to ₹500", description: "For first time users" },
  { code: "TRAIN20", discount: "20% off up to ₹300", description: "Valid on all train bookings" },
  { code: "WEEKEND", discount: "15% off up to ₹250", description: "Weekend special offer" }
];

const countries = ["India", "United States", "United Kingdom", "Canada", "Australia", "Singapore", "UAE", "Other"];

const Card: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 ${className}`}>
    {children}
  </div>
);

const CollapsibleCard: React.FC<{ title: string; icon: React.ComponentType<any>; children?: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <Card className="mb-5 overflow-hidden transition-all duration-300 hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-7 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center">
            <Icon className="w-5 h-5 text-gray-900" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 tracking-tight">{title}</h3>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </button>
      <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-7 pb-6">{children}</div>
      </div>
    </Card>
  );
};

const Alert: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Info className="w-6 h-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Incomplete Information</h3>
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
      >
        Got it
      </button>
    </div>
  </div>
);

export default function TrainBookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = searchParams.get('service_id');
  const fromStationId = searchParams.get('from_station_id') || '';
  const toStationId = searchParams.get('to_station_id') || '';
  const initialClassType = searchParams.get('class_type') || 'third_ac';
  
  const [trainService, setTrainService] = useState(defaultTrainService);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  interface TravellerForm {
    firstName: string;
    lastName: string;
    age: string;
    gender: string;
    nationality: string;
    saved: boolean;
  }

  const [travellers, setTravellers] = useState<TravellerForm[]>([{
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    nationality: 'India',
    saved: false
  }]);
  const [selectedClass, setSelectedClass] = useState<'sleeper'|'third_ac'|'second_ac'|'first_ac'>(() => {
    // Map class types to internal format
    const classTypeMap: Record<string, 'sleeper'|'first_ac'|'second_ac'|'third_ac'> = {
      'Sleeper': 'sleeper',
      '1st Class AC': 'first_ac',
      '2nd Class AC': 'second_ac',
      '3rd Class AC': 'third_ac',
    };
    const mapped = classTypeMap[initialClassType];
    return (mapped ?? 'sleeper') as 'sleeper'|'third_ac'|'second_ac'|'first_ac';
  });
  const [contactDetails, setContactDetails] = useState<{ mobile: string; email: string }>({ mobile: '', email: '' });
  const [promoCode, setPromoCode] = useState('');
  interface Promo { code: string; discount: string; description: string }
  const [appliedPromo, setAppliedPromo] = useState<Promo | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [showPresets, setShowPresets] = useState({});
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [freeReschedule, setFreeReschedule] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  
  // Track which profile is applied to which traveller index
  const [profileToTravellerMap, setProfileToTravellerMap] = useState<Map<number, number>>(new Map());
  
  // Co-traveller profiles from backend
  const [coTravellerProfiles, setCoTravellerProfiles] = useState<TravellerForm[]>([]);

  // Fetch train service data and co-traveller profiles
  useEffect(() => {
  if (!serviceId || !fromStationId || !toStationId) {
    setLoading(false);
    setError("Missing station or service ID parameters.");
    return;
  }

  const fetchData = async () => {
    try {
      const auth = getAuthFromStorage();
      if (!auth || !auth.token) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const url = `${API.BASE_URL}/services/train-services/${serviceId}/detail/?from_station_id=${fromStationId}&to_station_id=${toStationId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Token ${auth.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch service data (${response.status})`);
      }

      const data = await response.json();

      // Compute amenities list from object (convert keys with true values)
      const amenities =
        typeof data.vehicle?.amenities === "object"
          ? Object.keys(data.vehicle.amenities).filter(
              (key) => data.vehicle.amenities[key] === true
            )
          : [];

      // Compute average rating
      const ratings = data.provider_rating || {};
      const totalReviews = data.provider_total_reviews || 0;
      let averageRating = 0;
      if (totalReviews > 0) {
        const weighted =
          (ratings["5"] || 0) * 5 +
          (ratings["4"] || 0) * 4 +
          (ratings["3"] || 0) * 3 +
          (ratings["2"] || 0) * 2 +
          (ratings["1"] || 0) * 1;
        averageRating = weighted / totalReviews;
      }

      // Set train service structure for UI
      setTrainService({
        train_name: data.train_name || "Train Service",
        train_number: data.train_number || "N/A",
        route: {
          source: data.route?.source?.name || data.source_station_name || "N/A",
          destination:
            data.route?.destination?.name ||
            data.destination_station_name ||
            "N/A",
          distance_km: data.route?.distance_km || 0,
          estimated_duration:
            data.route?.estimated_duration ||
            `${Math.floor(data.journey_time / 3600)}h ${Math.floor(
              (data.journey_time % 3600) / 60
            )}m`,
        },
        departure_time: data.departure_time || new Date().toISOString(),
        arrival_time: data.arrival_time || new Date().toISOString(),
        vehicle: { amenities },
        policy: {
          cancellation_window: data.policy?.cancellation_window || 24,
          cancellation_fee: data.policy?.cancellation_fee || "0.00",
          reschedule_allowed: data.policy?.reschedule_allowed || false,
          reschedule_fee: data.policy?.reschedule_fee || "0.00",
          no_show_penalty: data.policy?.no_show_penalty || "0.00",
          terms_conditions: data.policy?.terms_conditions || "",
          no_cancellation_fee_markup:
            data.policy?.no_cancellation_fee_markup || "0.00",
          no_reschedule_fee_markup:
            data.policy?.no_reschedule_fee_markup || "0.00",
        },
        base_price: data.dynamic_pricing?.SecondAC || "0.00",
        sleeper_price: data.dynamic_pricing?.Sleeper || "0.00",
        third_ac_price: data.dynamic_pricing?.ThirdAC || "0.00",
        second_ac_price: data.dynamic_pricing?.SecondAC || "0.00",
        availability: data.availability || {},
        rating: averageRating.toFixed(1),
        reviews: totalReviews,
      });

      setLoading(false);
    } catch (err: any) {
      console.error("Error fetching service details:", err);
      setError(err.message || "Error loading train service.");
      setLoading(false);
    }
  };

  fetchData();
}, [serviceId, fromStationId, toStationId]);


  const addTraveller = () => {
    if (travellers.length < 6) {
      setTravellers([...travellers, { firstName: '', lastName: '', age: '', gender: '', nationality: 'India', saved: false }]);
    }
  };
  const removeTraveller = (index: number) => {
    if (travellers.length > 1) {
      setTravellers(travellers.filter((_, i) => i !== index));
    }
  };

  const updateTraveller = (index: number, field: keyof TravellerForm, value: string) => {
    const updated = [...travellers];
    updated[index] = { ...updated[index], [field]: value } as TravellerForm;
    updated[index].saved = false;
    setTravellers(updated);
  };

  const applyPreset = (index: number, preset: TravellerForm) => {
    const updated = [...travellers];
    updated[index] = { ...preset, saved: true } as TravellerForm;
    setTravellers(updated);
    setShowPresets({ ...showPresets, [index]: false });
  };

  const saveTraveller = (index: number) => {
    const t = travellers[index];
    if (t.firstName && t.lastName && t.age && t.gender && t.nationality) {
      const updated = [...travellers];
      updated[index].saved = true;
      setTravellers(updated);
    }
  };

  const clearTraveller = (index: number) => {
    const updated = [...travellers];
    updated[index] = { firstName: '', lastName: '', age: '', gender: '', nationality: 'India', saved: false };
    setTravellers(updated);
    
    // Remove any profile mapping for this traveller index
    setProfileToTravellerMap(prev => {
      const newMap = new Map(prev);
      // Find and remove the profile that was mapped to this index
      for (const [profileIdx, travellerIdx] of newMap.entries()) {
        if (travellerIdx === index) {
          newMap.delete(profileIdx);
          break;
        }
      }
      return newMap;
    });
  };

  const editTraveller = (index: number) => {
    const updated = [...travellers];
    updated[index].saved = false;
    setTravellers(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, index: number, field: keyof TravellerForm) => {
    if ((e as React.KeyboardEvent).key === 'Enter') {
      e.preventDefault();
      const t = travellers[index];
      const fieldOrder: (keyof TravellerForm)[] = ['firstName', 'lastName', 'age', 'gender', 'nationality'];
      const currentIndex = fieldOrder.indexOf(field);
      
      const isValid = !!t[field] && t[field].toString().trim() !== '';
      
      if (isValid && currentIndex < fieldOrder.length - 1) {
        const nextField = fieldOrder[currentIndex + 1];
        const nextInput = inputRefs.current[`${index}-${String(nextField)}`];
        if (nextInput) {
          (nextInput as HTMLElement).focus();
        }
      } else if (isValid && currentIndex === fieldOrder.length - 1) {
        (e.target as HTMLElement).blur();
      }
    }
  };

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      setContactDetails({...contactDetails, mobile: digits});
    }
  };

  const getClassPrice = () => {
    const prices = {
      sleeper: parseFloat(trainService.sleeper_price),
      third_ac: parseFloat(trainService.third_ac_price),
      second_ac: parseFloat(trainService.second_ac_price),
      first_ac: parseFloat(trainService.base_price)
    };
    return prices[selectedClass] || 0;
  };

  const calculateTotal = () => {
    let baseTotal = getClassPrice() * travellers.length;
    
    // Add protection fees
    if (freeCancellation && trainService.policy.no_cancellation_fee_markup) {
      const cancellationFee = parseFloat(trainService.policy.no_cancellation_fee_markup);
      if (!isNaN(cancellationFee)) {
        baseTotal += cancellationFee * travellers.length;
      }
    }
    if (freeReschedule && trainService.policy.no_reschedule_fee_markup) {
      const rescheduleFee = parseFloat(trainService.policy.no_reschedule_fee_markup);
      if (!isNaN(rescheduleFee)) {
        baseTotal += rescheduleFee * travellers.length;
      }
    }
    
    // Apply promo discount
    if (appliedPromo) {
      const discount = baseTotal * 0.2;
      return baseTotal - Math.min(discount, 300);
    }
    return baseTotal;
  };

  const applyPromo = (code: string) => {
    const promo = offers.find(o => o.code === code);
    if (promo) {
      setAppliedPromo(promo as Promo);
      setPromoCode('');
    }
  };

  const validateAndProceed = async () => {
    // Validation checks
    for (let i = 0; i < travellers.length; i++) {
      const t = travellers[i];
      if (!t.firstName || !t.lastName) {
        setAlertMessage(`Please complete all details for Traveller ${i + 1}. Name fields are required.`);
        return;
      }
      if (!t.age || parseInt(t.age) < 1 || parseInt(t.age) > 120) {
        setAlertMessage(`Please enter a valid age for Traveller ${i + 1}.`);
        return;
      }
      if (!t.gender) {
        setAlertMessage(`Please select gender for Traveller ${i + 1}.`);
        return;
      }
      if (!t.nationality) {
        setAlertMessage(`Please select nationality for Traveller ${i + 1}.`);
        return;
      }
    }
    
    if (!contactDetails.mobile || contactDetails.mobile.length !== 10) {
      setAlertMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactDetails.email || !emailRegex.test(contactDetails.email)) {
      setAlertMessage('Please enter a valid email address.');
      return;
    }

    // Check for required IDs
    if (!fromStationId || !toStationId) {
      setAlertMessage('Station information is missing. Please search again.');
      return;
    }
    
    // Get auth token
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setAlertMessage('Please log in to continue with booking.');
      return;
    }

    try {
      // Map selectedClass to API format
      const classTypeMap: Record<string, string> = {
        'sleeper': 'Sleeper',
        'third_ac': '3rd Class AC',
        'second_ac': '2nd Class AC',
        'first_ac': '1st Class AC',
      };
      const apiClassType = classTypeMap[selectedClass] || '3rd Class AC';

      // Build passengers array
      const passengers = travellers.map((t) => ({
        name: `${t.firstName} ${t.lastName}`.trim(),
        age: parseInt(t.age),
        gender: t.gender.charAt(0).toUpperCase() + t.gender.slice(1), // Capitalize
        document_id: t.nationality, // Using nationality as document_id as per requirement
      }));

      // Prepare booking payload
      const bookingPayload = {
        service_model: 'train',
        service_id: serviceId,
        passengers,
        class_type: apiClassType,
        from_station_id: fromStationId,
        to_station_id: toStationId,
        no_cancellation_free_markup: freeCancellation,
        no_reschedule_free_markup: freeReschedule,
        email: contactDetails.email,
        phone_number: contactDetails.mobile,
      };

      console.log('Submitting train booking:', bookingPayload);

      // Make booking API call
      const response = await fetch(API.BOOKING_CREATE, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          Authorization: `Token ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingPayload),
      });

      console.log('Booking API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Booking API error:', errorText);
        
        // Try to parse error message
        try {
          const errorData = JSON.parse(errorText);
          setAlertMessage(errorData.detail || errorData.error || 'Failed to create booking. Please try again.');
        } catch {
          setAlertMessage(`Failed to create booking (${response.status}). Please try again.`);
        }
        return;
      }

      const bookingData = await response.json();
      console.log('Booking created successfully:', bookingData);

      // Extract booking_id - handle both direct and nested structures
      const bookingId = bookingData.booking_id || bookingData.booking?.booking_id;
      console.log('Booking ID:', bookingId);

      if (!bookingId) {
        console.error('No booking_id in response:', bookingData);
        setAlertMessage('Booking created but no booking ID returned. Please check your bookings.');
        return;
      }

      // Redirect to payment page with booking_id and service_id
  router.push(
    `/booking/payment?service_type=train&booking_id=${bookingData.booking_id}`
  );    } catch (error) {
      console.error('Error creating booking:', error);
      setAlertMessage('Failed to create booking. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50">
      <Navbar />
      
      {loading && (
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-gray-600">Loading service details...</div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-red-600">Error: {error}</div>
          </div>
        </div>
      )}
      
      {!loading && !error && (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Journey Details */}
              <Card className="p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-slate-100/50 to-transparent rounded-full -mr-32 -mt-32"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center shadow-lg">
                        <Train className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{trainService.train_name}</h2>
                        <p className="text-gray-500 text-sm mt-1">#{trainService.train_number}</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-700">{trainService.route.estimated_duration}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                          <MapPin className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Departure</p>
                          <p className="font-bold text-gray-900 text-xl mb-1">{trainService.route.source}</p>
                          <p className="text-gray-600 text-sm">{new Date(trainService.arrival_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' , timeZone: 'UTC'})}</p>
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
                          <MapPin className="w-6 h-6 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Arrival</p>
                          <p className="font-bold text-gray-900 text-xl mb-1">{trainService.route.destination}</p>
                          <p className="text-gray-600 text-sm">{new Date(trainService.departure_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone:'UTC' })}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 text-sm">Total Distance</span>
                    <span className="font-semibold text-gray-900">{trainService.route.distance_km} kilometers</span>
                  </div>
                </div>
              </Card>

              {/* Amenities */}
              <CollapsibleCard title="Onboard Amenities" icon={Sparkles}>
                <div className="grid grid-cols-5 gap-4 mt-4">
                  {(() => {
                    const amenities = trainService.vehicle.amenities;
                    
                    // Define amenity configuration
                    const amenityConfig: Record<string, { name: string; icon: React.ElementType; color: string }> = {
                      'wifi': { name: 'WiFi', icon: Wifi, color: 'text-blue-600' },
                      'water_bottle': { name: 'Water Bottle', icon: Droplet, color: 'text-cyan-600' },
                      'reading_light': { name: 'Reading Light', icon: Lightbulb, color: 'text-yellow-600' },
                      'pillow': { name: 'Pillow', icon: Wind, color: 'text-purple-600' },
                      'blanket': { name: 'Blanket', icon: Bed, color: 'text-indigo-600' },
                      'charging_port': { name: 'Charging Port', icon: Plug, color: 'text-green-600' },
                      'entertainment_system': { name: 'Entertainment System', icon: Monitor, color: 'text-red-600' },
                      'meal_service': { name: 'Meal Service', icon: Utensils, color: 'text-orange-600' },
                      'ac': { name: 'AC', icon: AirVent, color: 'text-teal-600' },
                      'washroom': { name: 'Washroom', icon: Bath, color: 'text-slate-600' }
                    };
                    
                    // Handle both object format (from API) and array format (from default)
                    let amenityList: string[] = [];
                    
                    if (typeof amenities === 'object' && amenities !== null && !Array.isArray(amenities)) {
                      // Object format: { wifi: true, ac: false, ... }
                      amenityList = Object.keys(amenities).filter(key => amenities[key] === true);
                    } else if (Array.isArray(amenities)) {
                      // Array format: ["WiFi", "AC", ...]
                      amenityList = amenities.map(a => a.toLowerCase().replace(/[\s-]+/g, '_'));
                    }
                    
                    return amenityList.map((amenityKey, idx) => {
                      const config = amenityConfig[amenityKey];
                      
                      if (!config) return null;
                      
                      const AmenityIcon = config.icon;
                      
                      return (
                        <div key={idx} className="flex items-center gap-2">
                          <AmenityIcon className={`w-4 h-4 ${config.color}`} />
                          <span className="text-sm text-gray-700">{config.name}</span>
                        </div>
                      );
                    }).filter(Boolean);
                  })()}
                </div>
              </CollapsibleCard>

              {/* Policies */}
              <CollapsibleCard title="Booking Policies" icon={Shield}>
                <div className="space-y-4 mt-4">
                  {/* Policy Windows Info - Compact */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-gradient-to-b from-white to-gray-50">
                      <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Window</p>
                      <p className="text-base font-bold text-gray-900">{trainService.policy.cancellation_window}h</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gradient-to-b from-white to-gray-50">
                      <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Cancel Fee</p>
                      <p className="text-base font-bold text-gray-900">₹{trainService.policy.cancellation_fee}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gradient-to-b from-white to-gray-50">
                      <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-slate-100 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-slate-700" />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">Reschedule</p>
                      <p className="text-base font-bold text-gray-900">₹{trainService.policy.reschedule_fee}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-xs font-medium text-gray-500 bg-white">Add Premium Protection</span>
                    </div>
                  </div>

                  {/* Premium Protection Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Free Cancellation Card - Premium Design */}
                    <button
                      onClick={() => setFreeCancellation(!freeCancellation)}
                      className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 ${
                        freeCancellation
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 scale-[1.02]'
                          : 'bg-white border-2 border-gray-200 hover:border-emerald-300 hover:shadow-md hover:scale-[1.01]'
                      }`}
                    >
                      {/* Background Pattern */}
                      <div className={`absolute inset-0 opacity-10 ${freeCancellation ? 'block' : 'hidden'}`}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white transform translate-x-12 -translate-y-12"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white transform -translate-x-10 translate-y-10"></div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                            freeCancellation 
                              ? 'bg-white/20 backdrop-blur-sm' 
                              : 'bg-emerald-50 group-hover:bg-emerald-100'
                          }`}>
                            <Check className={`w-5 h-5 transition-all duration-300 ${
                              freeCancellation ? 'text-white' : 'text-emerald-600'
                            }`} />
                          </div>
                          <div className="text-right">
                            <p className={`text-xs mb-0.5 ${freeCancellation ? 'text-emerald-50' : 'text-gray-500'}`}>
                              Per Passenger
                            </p>
                            <p className={`text-xl font-bold ${freeCancellation ? 'text-white' : 'text-gray-900'}`}>
                              ₹{trainService.policy.no_cancellation_fee_markup || '20.00'}
                            </p>
                          </div>
                        </div>
                        
                        <h5 className={`text-base font-bold mb-1.5 ${freeCancellation ? 'text-white' : 'text-gray-900'}`}>
                          Free Cancellation
                        </h5>
                        <p className={`text-xs leading-relaxed ${freeCancellation ? 'text-emerald-50' : 'text-gray-600'}`}>
                          Cancel anytime before departure. Full refund with zero fees.
                        </p>
                        
                        {/* Selection Indicator */}
                        <div className={`mt-3 pt-3 border-t ${freeCancellation ? 'border-white/20' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              freeCancellation 
                                ? 'border-white bg-white' 
                                : 'border-gray-300 group-hover:border-emerald-400'
                            }`}>
                              {freeCancellation && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                            </div>
                            <span className={`text-xs font-medium ${freeCancellation ? 'text-white' : 'text-gray-500 group-hover:text-emerald-600'}`}>
                              {freeCancellation ? 'Selected' : 'Select this protection'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Free Reschedule Card - Premium Design */}
                    <button
                      onClick={() => setFreeReschedule(!freeReschedule)}
                      className={`group relative overflow-hidden rounded-xl p-4 text-left transition-all duration-300 ${
                        freeReschedule
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 scale-[1.02]'
                          : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
                      }`}
                    >
                      {/* Background Pattern */}
                      <div className={`absolute inset-0 opacity-10 ${freeReschedule ? 'block' : 'hidden'}`}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white transform translate-x-12 -translate-y-12"></div>
                        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white transform -translate-x-10 translate-y-10"></div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                            freeReschedule 
                              ? 'bg-white/20 backdrop-blur-sm' 
                              : 'bg-blue-50 group-hover:bg-blue-100'
                          }`}>
                            <Clock className={`w-5 h-5 transition-all duration-300 ${
                              freeReschedule ? 'text-white' : 'text-blue-600'
                            }`} />
                          </div>
                          <div className="text-right">
                            <p className={`text-xs mb-0.5 ${freeReschedule ? 'text-blue-50' : 'text-gray-500'}`}>
                              Per Passenger
                            </p>
                            <p className={`text-xl font-bold ${freeReschedule ? 'text-white' : 'text-gray-900'}`}>
                              ₹{trainService.policy.no_reschedule_fee_markup || '15.00'}
                            </p>
                          </div>
                        </div>
                        
                        <h5 className={`text-base font-bold mb-1.5 ${freeReschedule ? 'text-white' : 'text-gray-900'}`}>
                          Free Reschedule
                        </h5>
                        <p className={`text-xs leading-relaxed ${freeReschedule ? 'text-blue-50' : 'text-gray-600'}`}>
                          Change travel dates anytime. Flexible rescheduling, no charges.
                        </p>
                        
                        {/* Selection Indicator */}
                        <div className={`mt-3 pt-3 border-t ${freeReschedule ? 'border-white/20' : 'border-gray-100'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                              freeReschedule 
                                ? 'border-white bg-white' 
                                : 'border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {freeReschedule && <Check className="w-2.5 h-2.5 text-blue-600" />}
                            </div>
                            <span className={`text-xs font-medium ${freeReschedule ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`}>
                              {freeReschedule ? 'Selected' : 'Select this protection'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Terms & Conditions - Compact Display */}
                  {trainService.policy.terms_conditions && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200">
                      <div className="flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-semibold text-gray-900 mb-1">Terms & Conditions</h5>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {trainService.policy.terms_conditions}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleCard>

              {/* Travellers */}
              <Card className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Traveller Information</h3>
                  </div>
                  <button
                    onClick={addTraveller}
                    disabled={travellers.length >= 6}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium text-sm shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Traveller
                  </button>
                </div>

                {/* Saved profiles section - Only show if profiles exist */}
                {coTravellerProfiles.length > 0 && (
                  <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus className="w-4 h-4 text-slate-600" />
                      <h4 className="text-sm font-semibold text-slate-700">Quick Fill from Saved Profiles</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {coTravellerProfiles.map((preset, pidx) => {
                        // Check if this profile is already applied to a traveller
                        const isApplied = profileToTravellerMap.has(pidx);
                        const appliedToIndex = profileToTravellerMap.get(pidx);
                        
                        return (
                          <button
                            key={pidx}
                            onClick={() => {
                              // If profile is already applied, clear that traveller card
                              if (isApplied && appliedToIndex !== undefined) {
                                clearTraveller(appliedToIndex);
                                // Remove from map
                                setProfileToTravellerMap(prev => {
                                  const newMap = new Map(prev);
                                  newMap.delete(pidx);
                                  return newMap;
                                });
                                return;
                              }
                              
                              // Find first blank (unsaved and empty) traveller
                              let targetIdx = travellers.findIndex(t => 
                                !t.saved && !t.firstName && !t.lastName && !t.age && !t.gender
                              );
                              
                              // If no blank traveller found, use the first traveller (index 0)
                              if (targetIdx === -1) {
                                targetIdx = 0;
                              }
                              
                              // Apply preset
                              applyPreset(targetIdx, preset);
                              
                              // Track this mapping
                              setProfileToTravellerMap(prev => {
                                const newMap = new Map(prev);
                                newMap.set(pidx, targetIdx);
                                return newMap;
                              });
                            }}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              isApplied 
                                ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' 
                                : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 text-sm">{preset.firstName} {preset.lastName}</div>
                                <div className="text-xs text-gray-500">{preset.age} yrs • {preset.gender}</div>
                              </div>
                              {isApplied && (
                                <div className="flex-shrink-0 ml-2">
                                  <Check className="w-4 h-4 text-blue-600" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {travellers.map((traveller, idx) => (
                    <div key={idx}>
                      {traveller.saved ? (
                        <div className="p-4 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:border-gray-300 transition-all">
                          <div className="flex items-center gap-4">
                            {/* Traveller Number */}
                            <div className="flex-shrink-0 w-16">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-white font-bold text-sm shadow-md">
                                {idx + 1}
                              </div>
                            </div>

                            {/* Traveller Details in Horizontal Layout */}
                            <div className="flex-1 grid grid-cols-[2fr_1fr_1fr_1.5fr] gap-6">
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Name</span>
                                <span className="font-semibold text-gray-900 text-sm">{traveller.firstName} {traveller.lastName}</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Age</span>
                                <span className="font-semibold text-gray-900 text-sm">{traveller.age}</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Gender</span>
                                <span className="font-semibold text-gray-900 text-sm">{traveller.gender}</span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500 block mb-0.5">Nationality</span>
                                <span className="font-semibold text-gray-900 text-sm">{traveller.nationality}</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => editTraveller(idx)}
                                className="p-2 rounded-lg bg-white hover:bg-gray-50 border-2 border-gray-200 transition-all"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4 text-gray-700" />
                              </button>
                              {travellers.length > 1 && (
                                <button
                                  onClick={() => removeTraveller(idx)}
                                  className="p-2 rounded-lg bg-white hover:bg-red-50 border-2 border-gray-200 hover:border-red-200 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 border-2 border-gray-200 rounded-xl bg-white">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-950 text-white font-bold text-sm shadow-sm">
                                {idx + 1}
                              </div>
                              <h4 className="font-semibold text-gray-900 text-base">Traveller {idx + 1}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Action Buttons - Moved to top right */}
                              <button
                                onClick={() => saveTraveller(idx)}
                                disabled={!traveller.firstName || !traveller.lastName || !traveller.age || !traveller.gender}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => clearTraveller(idx)}
                                className="px-3 py-2 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all text-xs"
                              >
                                Clear
                              </button>
                              {travellers.length > 1 && (
                                <button
                                  onClick={() => removeTraveller(idx)}
                                  className="p-2 rounded-lg hover:bg-red-50 border-2 border-gray-200 hover:border-red-200 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-5 h-5 text-red-600" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Compact horizontal layout with separate first name and last name */}
                          <div className="grid grid-cols-[1.5fr_1.5fr_0.8fr_1fr_1.2fr] gap-3 items-end">
                            {/* First Name */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">First Name</label>
                              <input
                                ref={(el) => { inputRefs.current[`${idx}-firstName`] = el; }}
                                type="text"
                                value={traveller.firstName}
                                onChange={(e) => updateTraveller(idx, 'firstName', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'firstName')}
                                placeholder="First name"
                                className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm"
                              />
                            </div>

                            {/* Last Name */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Last Name</label>
                              <input
                                ref={(el) => { inputRefs.current[`${idx}-lastName`] = el; }}
                                type="text"
                                value={traveller.lastName}
                                onChange={(e) => updateTraveller(idx, 'lastName', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'lastName')}
                                placeholder="Last name"
                                className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm"
                              />
                            </div>

                            {/* Age */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Age</label>
                              <input
                                ref={(el) => { inputRefs.current[`${idx}-age`] = el; }}
                                type="text"
                                value={traveller.age}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                  updateTraveller(idx, 'age', value);
                                }}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'age')}
                                placeholder="eg: 24"
                                maxLength={3}
                                className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm"
                              />
                            </div>

                            {/* Nationality */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Nationality</label>
                              <select
                                ref={(el) => { inputRefs.current[`${idx}-nationality`] = el; }}
                                value={traveller.nationality}
                                onChange={(e) => updateTraveller(idx, 'nationality', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, idx, 'nationality')}
                                className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all text-sm bg-white"
                              >
                                {countries.map(country => (
                                  <option key={country} value={country}>{country}</option>
                                ))}
                              </select>
                            </div>

                            {/* Gender */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Gender</label>
                              <div className="inline-flex rounded-lg border-2 border-gray-200 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => updateTraveller(idx, 'gender', 'Male')}
                                  className={`px-3 py-2 font-medium text-xs transition-all ${
                                    traveller.gender === 'Male'
                                      ? "bg-blue-50 text-blue-600"
                                      : "bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  Male
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateTraveller(idx, 'gender', 'Female')}
                                  className={`px-3 py-2 font-medium text-xs transition-all border-l-2 border-gray-200 ${
                                    traveller.gender === 'Female'
                                      ? "bg-pink-50 text-pink-600"
                                      : "bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  Female
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateTraveller(idx, 'gender', 'Other')}
                                  className={`px-3 py-2 font-medium text-xs transition-all border-l-2 border-gray-200 ${
                                    traveller.gender === 'Other'
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-white text-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  Other
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Select Class</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'sleeper', label: 'Sleeper', price: trainService.sleeper_price },
                      { value: 'third_ac', label: '3rd AC', price: trainService.third_ac_price },
                      { value: 'second_ac', label: '2nd AC', price: trainService.second_ac_price }
                    ].map(cls => (
                      <button
                        key={cls.value}
                        onClick={() => setSelectedClass(cls.value as 'sleeper'|'third_ac'|'second_ac')}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          selectedClass === (cls.value as 'sleeper'|'third_ac'|'second_ac')
                            ? 'border-slate-900 bg-slate-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-bold text-gray-900 mb-1">{cls.label}</p>
                        <p className="text-sm text-gray-600">₹{cls.price}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Contact Details */}
              <Card className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-slate-500 focus-within:border-slate-500 transition-all overflow-hidden">
                      <span className="px-4 py-3 bg-gray-100 text-gray-700 font-medium border-r-2 border-gray-200">+91</span>
                      <input
                        type="tel"
                        placeholder="10-digit number"
                        value={contactDetails.mobile}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        className="flex-1 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={contactDetails.email}
                      onChange={(e) => setContactDetails({...contactDetails, email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Fare Summary */}
              <div className="lg:col-span-1">
              <div className="sticky top-6">
                <Card className="p-7">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                      <Tag className="w-5 h-5 text-gray-900" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Fare Summary</h3>
                  </div>                  <div className="space-y-4 mb-6 pb-6 border-b-2 border-gray-200">
                    <div className="flex justify-between text-gray-700">
                      <span className="text-sm">Base Fare ({travellers.length} {travellers.length === 1 ? 'traveller' : 'travellers'})</span>
                      <span className="font-semibold">₹{(getClassPrice() * travellers.length).toFixed(2)}</span>
                    </div>
                    {freeCancellation && trainService.policy.no_cancellation_fee_markup && (
                      <div className="flex justify-between text-gray-700">
                        <span className="text-sm">Free Cancellation ({travellers.length} {travellers.length === 1 ? 'passenger' : 'passengers'})</span>
                        <span className="font-semibold">₹{(parseFloat(trainService.policy.no_cancellation_fee_markup || '0') * travellers.length).toFixed(2)}</span>
                      </div>
                    )}
                    {freeReschedule && trainService.policy.no_reschedule_fee_markup && (
                      <div className="flex justify-between text-gray-700">
                        <span className="text-sm">Free Reschedule ({travellers.length} {travellers.length === 1 ? 'passenger' : 'passengers'})</span>
                        <span className="font-semibold">₹{(parseFloat(trainService.policy.no_reschedule_fee_markup || '0') * travellers.length).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                    <span className="text-3xl font-bold text-slate-900">₹{calculateTotal().toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={validateAndProceed}
                    className="w-full py-4 bg-gradient-to-r from-slate-800 to-slate-950 text-white rounded-xl font-semibold hover:from-slate-700 hover:to-slate-900 transition-all shadow-lg shadow-slate-900/30 flex items-center justify-center gap-2"
                  >
                    Proceed to Payment
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {alertMessage && <Alert message={alertMessage} onClose={() => setAlertMessage('')} />}
    </div>
  );
}