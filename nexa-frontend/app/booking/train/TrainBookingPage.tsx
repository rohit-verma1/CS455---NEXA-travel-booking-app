"use client"; 

import React, { useState, useMemo } from 'react';
import { Star, Filter, IndianRupee, Sunrise, Sun, SunMedium, Moon, Bed, Armchair, Crown, Sofa, Droplet, Wind, Zap, Lamp, Wifi, UtensilsCrossed, DoorOpen, Tv, Snowflake, CircleDot } from 'lucide-react';
import { Navbar } from '@/components/shared/booking-navbar';
import { fetchTrains, SearchTrainsResult } from '@/app/api';
import API from '@/app/api';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuthFromStorage } from '@/utils/authStorage';
import { formatInTimeZone } from 'date-fns-tz';

// Types

type UICardTrip = {
  id: string;
  operator: string;
  departureTime: string; // "HH:MM"
  arrivalTime: string;   // "HH:MM"
  duration: string;      // "8h 30m"
  durationMinutes: number;
  rating: number;
  reviews: number;
  seatsLeft: number;
  classType: 'Sleeper' | '1st Class AC' | '2nd Class AC' | '3rd Class AC';
  price: number;
  amenities: Record<string, boolean> | string[];
  ratingBreakdown?: Record<string, number>; // { "1": 5, "2": 10, "3": 20, "4": 30, "5": 35 }
  policies?: {
    cancellation: Array<{ time: string; penalty: string }>;
    childPolicy: string;
    luggage: string;
  };
};

function pad2(n: number){ return String(n).padStart(2,'0'); }
function timeHHMM(iso: string){
  const d = new Date(iso);
  // Use UTC time to match API response exactly (no timezone conversion)
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}
function diffMinutes(aIso: string, bIso: string){
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  const diff = Math.max(0, b - a); // handle day wrap if backend gives next-day with tz
  return Math.round(diff / 60000);
}
function durationLabel(mins: number){
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}h ${m}m`;
}
interface TrainTrip {
  id: string;
  operator: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  rating: number;
  reviews: number;
  seatsLeft: number;
  singleSeatsLeft: number;
  classType: 'Sleeper' | '1st Class AC' | '2nd Class AC' | '3rd Class AC';
  price: number;
  premiumPrice: number;
  amenities: string[];
  policies: {
    cancellation: Array<{ time: string; penalty: string }>;
    childPolicy: string;
    luggage: string;
  };
}

// Enhanced Dummy Data
const generateDummyTrips = (): TrainTrip[] => {
  const operators = ['Shatabdi Express', 'Rajdhani Express', 'Duronto Express', 'Garib Rath', 'Humsafar Express', 'Tejas Express', 'Vande Bharat', 'Jan Shatabdi'];
  const amenities = ['Water Bottle', 'Blankets', 'Charging Point', 'Reading Light', 'WiFi', 'Meals', 'Emergency Exit', 'CCTV', 'Pillow'];
  const classTypes: Array<'Sleeper' | '1st Class AC' | '2nd Class AC' | '3rd Class AC'> = ['Sleeper', '1st Class AC', '2nd Class AC', '3rd Class AC'];
  
  return Array.from({ length: 15 }, (_, i) => {
    const classType = classTypes[Math.floor(Math.random() * classTypes.length)];
    const departureHour = Math.floor(Math.random() * 24);
    const departureMin = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const durationHours = 8 + Math.floor(Math.random() * 6);
    const durationMins = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const arrivalHour = (departureHour + durationHours) % 24;
    const arrivalMin = (departureMin + durationMins) % 60;
    const durationMinutes = durationHours * 60 + durationMins;
    
    // Base price varies by class type
    let basePrice = 600;
    if (classType === '1st Class AC') basePrice = 1500;
    else if (classType === '2nd Class AC') basePrice = 1000;
    else if (classType === '3rd Class AC') basePrice = 800;
    else basePrice = 400;
    
    const availableSeats = 20 + Math.floor(Math.random() * 60);
    
    return {
      id: `trip-${i}`,
      operator: operators[i % operators.length],
      departureTime: `${String(departureHour).padStart(2, '0')}:${String(departureMin).padStart(2, '0')}`,
      arrivalTime: `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`,
      duration: `${durationHours}h ${durationMins}m`,
      durationMinutes,
      rating: 3.5 + Math.random() * 1.3,
      reviews: 50 + Math.floor(Math.random() * 200),
      seatsLeft: availableSeats,
      singleSeatsLeft: Math.floor(availableSeats * 0.3),
      classType,
      price: basePrice + Math.floor(Math.random() * 300),
      premiumPrice: basePrice + 400 + Math.floor(Math.random() * 400),
      amenities: amenities.slice(0, 4 + Math.floor(Math.random() * 5)),
      policies: {
        cancellation: [
          { time: 'More than 48 hrs before departure', penalty: '0% + ₹120 cancellation fee' },
          { time: '12 to 48 hrs before departure', penalty: '25% + ₹120 cancellation fee' },
          { time: '4 to 12 hrs before departure', penalty: '50% + ₹120 cancellation fee' },
          { time: 'Less than 4 hrs before departure', penalty: 'No refund' },
        ],
        childPolicy: 'Children above the age of 5 will need a ticket. Children between 5-12 years get 50% discount.',
        luggage: 'General class: 35kg, Sleeper: 40kg, AC: 50kg per passenger allowed',
      },
    };
  });
};

// Constant sort options array
const SORT_OPTIONS = ['price', 'fastest', 'departure'] as const;
type SortType = typeof SORT_OPTIONS[number];

// Time slot configuration
const timeSlotConfig = [
  { slot: 'early_morning', label: 'Before 6 AM', start: 0, end: 6, Icon: Sunrise },
  { slot: 'morning', label: '6 AM - 12 PM', start: 6, end: 12, Icon: Sun },
  { slot: 'afternoon', label: '12 PM - 6 PM', start: 12, end: 18, Icon: SunMedium },
  { slot: 'night', label: '6 PM - 12 AM', start: 18, end: 24, Icon: Moon },
];

export default function TrainBookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Helper to safely extract string from query param (in case it's a stringified object)
  const getStringParam = (key: string): string => {
    const value = searchParams.get(key) || '';
    try {
      // Try to parse as JSON in case it's a stringified object
      const parsed = JSON.parse(value);
      // If it's an object with a 'code' or 'name' field, use that
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed.code || parsed.name || '';
      }
      return value.trim();
    } catch {
      // Not JSON, just return the string value
      return value.trim();
    }
  };

  const source = getStringParam('source');
  const destination = getStringParam('destination');
  const dateParam = (searchParams.get('date') || '').trim();       // YYYY-MM-DD
  const classTypeParam = (searchParams.get('class_type') || '').trim() || undefined;

  // Helper to safely display station names (in case they're objects)
  const displayStationName = (value: string | Record<string, unknown>): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      return (value.name as string) || (value.code as string) || (value.city as string) || String(value);
    }
    return String(value || '');
  };

  const sourceDisplay = displayStationName(source);
  const destinationDisplay = displayStationName(destination);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [apiData, setApiData] = useState<SearchTrainsResult | null>(null);
    const [sourceStationId, setSourceStationId] = useState<string>('');
    const [destinationStationId, setDestinationStationId] = useState<string>('');
    const refetch = React.useCallback(() => {
    if (!source || !destination || !dateParam) return;
    setLoading(true);
    setError(null);
    
    // Get auth token from storage
    const auth = getAuthFromStorage();
    const authToken = auth?.token || '';
    const csrf = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';
    
    fetchTrains({
        source,
        destination,
        date: dateParam,
        class_type: classTypeParam && classTypeParam !== 'All Class' ? classTypeParam : undefined,
        authToken,
        csrf,
    })
        .then((data) => setApiData(data))
        .catch((e) => setError(e.message || 'Failed to load trains'))
        .finally(() => setLoading(false));
  }, [source, destination, dateParam, classTypeParam]);

  // selectedDate state now derives from query
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = dateParam ? new Date(dateParam) : new Date();
    d.setHours(0,0,0,0);
    return d;
  });

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(5); // Center index
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<string>('');
  const [sortType, setSortType] = useState<SortType>('price');
  const [loadingPolicies, setLoadingPolicies] = useState<Set<string>>(new Set());
  
  // Refs for sort indicator
  const sortBtnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0, opacity: 0 });
  
  // Filters
  const [filters, setFilters] = useState({
    classTypes: [] as Array<'Sleeper' | '1st Class AC' | '2nd Class AC' | '3rd Class AC'>,
    priceRange: [0, 20000] as [number, number],
    durationRange: [0, 4000] as [number, number],
    pickupTimeRanges: [] as string[],
    dropTimeRanges: [] as string[],
  });

  const dateRange = useMemo(() => {
    const dates = [];
    const baseDate = dateParam ? new Date(dateParam) : new Date();
    baseDate.setHours(0, 0, 0, 0);
    for (let i = -5; i <= 5; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [dateParam]);

  // Sync selected date index with the actual search date
  React.useEffect(() => {
    const searchDateStr = selectedDate.toISOString().slice(0, 10);
    const index = dateRange.findIndex(date => 
      date.toISOString().slice(0, 10) === searchDateStr
    );
    if (index !== -1 && index !== selectedDateIndex) {
      setSelectedDateIndex(index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, dateRange]);

  const bumpDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', `${y}-${m}-${day}`);
    router.push(`/booking/train?${params.toString()}`);
  };


  // Helper to measure active sort button
  const measureActiveSort = React.useCallback((activeSort: SortType) => {
    const btn = sortBtnRefs.current[activeSort];
    if (!btn || !btn.parentElement) {
      setIndicatorStyle(s => ({ ...s, opacity: 0 }));
      return;
    }
  
    const parent = btn.parentElement as HTMLElement;
    const parentScrollLeft = parent.scrollLeft || 0;
    const left = btn.offsetLeft - parentScrollLeft;
    const width = btn.offsetWidth;
  
    const idx = SORT_OPTIONS.indexOf(activeSort);
    const leftNudgeForFirst = -4;
    const rightNudgeForLast = 4;
    let nudge = 0;
    if (idx === 0) nudge = leftNudgeForFirst;
    else if (idx === SORT_OPTIONS.length - 1) nudge = rightNudgeForLast;
  
    const bleed = 4;
    const extraLeft = Math.max(0, left + nudge);
    const extraWidth = Math.min(parent.clientWidth, width + bleed);
  
    setIndicatorStyle({ left: extraLeft, width: extraWidth, opacity: 1 });
  }, []);

  // Measure on mount and sort change
  React.useEffect(() => {
    measureActiveSort(sortType);
    const onResize = () => measureActiveSort(sortType);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [sortType, measureActiveSort]);

  React.useEffect(() => {
    // keep selectedDate in sync with query
    if (dateParam) {
        const d = new Date(dateParam);
        d.setHours(0,0,0,0);
        setSelectedDate(d);
    }
    if (!source || !destination || !dateParam) {
        setApiData(null);
        return;
    }
    refetch();
  }, [source, destination, dateParam, classTypeParam, refetch]);


    React.useEffect(() => {
    // keep selectedDate in sync with query
    if (dateParam) {
        const d = new Date(dateParam);
        d.setHours(0,0,0,0);
        setSelectedDate(d);
    }

    if (!source || !destination || !dateParam) {
        setApiData(null);
        return;
    }

    setLoading(true);
    setError(null);

    // Get auth token from storage
    const auth = getAuthFromStorage();
    const authToken = auth?.token || '';
    const csrf = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';

    fetchTrains({
        source,
        destination,
        date: dateParam,
        class_type: classTypeParam && classTypeParam !== 'All Class' ? classTypeParam : undefined,
        authToken,
        csrf,
    })
        .then((data) => {
            setApiData(data);
            // Store source_id and destination_id for booking
            if (data.source_id) setSourceStationId(data.source_id);
            if (data.destination_id) setDestinationStationId(data.destination_id);
        })
        .catch((e) => setError(e.message || 'Failed to load trains'))
        .finally(() => setLoading(false));
    }, [source, destination, dateParam, classTypeParam]);

    const [trips, setTrips] = useState<UICardTrip[]>([]);

    React.useEffect(() => {
        if (!apiData) {
            setTrips([]);
            return;
        }
        
        const mapped = apiData.results.map(r => {
            const dm = diffMinutes(r.departure_time, r.arrival_time);
            const validClassTypes = ['Sleeper', '1st Class AC', '2nd Class AC', '3rd Class AC'];
            const classType = r.class_type && validClassTypes.includes(r.class_type) 
                ? r.class_type as 'Sleeper' | '1st Class AC' | '2nd Class AC' | '3rd Class AC'
                : 'Sleeper';
            
            // Calculate overall rating from rating dictionary
            let calculatedRating = 0;
            let ratingBreakdown: Record<string, number> | undefined;
            const totalReviews = r.no_of_reviews ?? 0;
            if (r.rating && typeof r.rating === 'object' && totalReviews > 0) {
                const ratingObj = r.rating as Record<string, number>;
                ratingBreakdown = ratingObj;
                const weightedSum = 
                    (ratingObj['5'] || 0) * 5 +
                    (ratingObj['4'] || 0) * 4 +
                    (ratingObj['3'] || 0) * 3 +
                    (ratingObj['2'] || 0) * 2 +
                    (ratingObj['1'] || 0) * 1;
                calculatedRating = weightedSum / totalReviews;
            } else if (typeof r.rating === 'number') {
                calculatedRating = r.rating;
            }
            
            return {
            id: r.service_id,
            operator: r.train_name || r.provider_name,
            departureTime: timeHHMM(r.departure_time),
            arrivalTime: timeHHMM(r.arrival_time),
            duration: durationLabel(dm),
            durationMinutes: dm,
            rating: calculatedRating,
            reviews: totalReviews,
            seatsLeft: r.available_seats ?? 0,
            classType,
            price: r.price ?? 0,
            amenities: r.amenities ?? [],
            ratingBreakdown,
            };
        });
        
        setTrips(mapped);
    }, [apiData]);

  // Fetch service details for policies
  const fetchServiceDetails = React.useCallback(async (serviceId: string) => {
    if (loadingPolicies.has(serviceId)) return;
    
    // Check if trip already has policies
    const trip = trips.find(t => t.id === serviceId);
    if (trip?.policies) return;

    setLoadingPolicies(prev => new Set(prev).add(serviceId));

    try {
      const apiUrl = API.TRAIN_SERVICE_DETAILS(serviceId);
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      // Build policies from API response
      const policies = {
        cancellation: [
          {
            time: `Cancellation - More than ${data.policy?.cancellation_window || 12} hrs before departure`,
            penalty: `₹${data.policy?.cancellation_fee || '0'}`,
          },
          {
            time: `Cancellation - Less than ${data.policy?.cancellation_window || 12} hrs before departure`,
            penalty: '100%',
          },
          {
            time: 'No show',
            penalty: `₹${data.policy?.no_show_penalty || '0'}`,
          },
          {
            time: `Reschedule ${data.policy?.reschedule_allowed ? '(Allowed)' : '(Not Allowed)'}`,
            penalty: data.policy?.reschedule_allowed ? `₹${data.policy?.reschedule_fee || '0'}` : 'Not Available',
          },
        ],
        childPolicy: 'Customers who are not comfortable with the Cancellations and/or Reschedule Policies may consider our additional offerings during booking to negate them',
        luggage: data.policy?.terms_conditions || 'Please refer to our standard terms and conditions',
      };

      // Update trips with policies
      setTrips(prevTrips =>
        prevTrips.map(t =>
          t.id === serviceId ? { ...t, policies } : t
        )
      );
    } catch (e) {
      console.error('Failed to fetch service details:', e);
    } finally {
      setLoadingPolicies(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceId);
        return newSet;
      });
    }
  }, [loadingPolicies, trips]);

  // Auto-expand the first trip's policies tab on initial load
  React.useEffect(() => {
    if (trips.length > 0 && !expandedTrip) {
      const firstTripId = trips[0].id;
      setExpandedTrip(firstTripId);
      setExpandedTab('policies');
      // Fetch policies for the first trip
      fetchServiceDetails(firstTripId);
    }
  }, [trips, expandedTrip, fetchServiceDetails]);

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // Class type filter
      if (filters.classTypes.length > 0 && !filters.classTypes.includes(trip.classType)) return false;
      
      // Price filter
      if (trip.price < filters.priceRange[0] || trip.price > filters.priceRange[1]) return false;
      
      // Duration filter (in minutes)
      if (trip.durationMinutes < filters.durationRange[0] || trip.durationMinutes > filters.durationRange[1]) return false;
      
      // Pickup time filter
      if (filters.pickupTimeRanges.length > 0) {
        const departureHour = parseInt(trip.departureTime.split(':')[0]);
        const inRange = filters.pickupTimeRanges.some(label => {
          const r = timeSlotConfig.find(c => c.label === label);
          return r && departureHour >= r.start && departureHour < r.end;
        });
        if (!inRange) return false;
      }
      
      // Drop time filter
      if (filters.dropTimeRanges.length > 0) {
        const arrivalHour = parseInt(trip.arrivalTime.split(':')[0]);
        const inRange = filters.dropTimeRanges.some(label => {
          const r = timeSlotConfig.find(c => c.label === label);
          return r && arrivalHour >= r.start && arrivalHour < r.end;
        });
        if (!inRange) return false;
      }
      
      return true;
    });
  }, [trips, filters]);

  // Sort trips
  const sortedTrips = useMemo(() => {
    const sorted = [...filteredTrips];
    if (sortType === 'price') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortType === 'fastest') {
      sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
    } else if (sortType === 'departure') {
      sorted.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }
    return sorted;
  }, [filteredTrips, sortType]);

  const clearFilters = () => {
    setFilters({
      classTypes: [],
      priceRange: [0, 20000],
      durationRange: [0, 4000],
      pickupTimeRanges: [],
      dropTimeRanges: [],
    });
  };


  return (
    <div className="relative min-h-screen pb-20">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -z-10" />
      
      <Navbar />
      
      <div className="pt-4 pb-20 max-w-[1600px] mx-auto px-8 translate-x-3">
        <div className="flex gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="w-[320px] flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-lg border border-black-200 p-6 sticky top-28">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black-900 flex items-center gap-2">
                  <Filter className="w-6 h-6 text-slate-700" />
                  Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-800"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {/* Class Type Filter */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Class Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'Sleeper' as const, Icon: Bed, label: 'Sleeper' },
                      { type: '1st Class AC' as const, Icon: Crown, label: '1st AC' },
                      { type: '2nd Class AC' as const, Icon: Sofa, label: '2nd AC' },
                      { type: '3rd Class AC' as const, Icon: Armchair, label: '3rd AC' },
                    ].map(({ type, Icon, label }) => (
                      <button
                        key={type}
                        onClick={() => {
                          setFilters(f => ({
                            ...f,
                            classTypes: f.classTypes.includes(type)
                              ? f.classTypes.filter(c => c !== type)
                              : [...f.classTypes, type]
                          }));
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          filters.classTypes.includes(type)
                            ? 'border-slate-500 bg-slate-50 text-slate-800 shadow-md'
                            : 'border-black-200 hover:border-black-300 text-black-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Price Range</h3>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    value={filters.priceRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFilters(f => ({ ...f, priceRange: [0, val] }));
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-sm font-medium text-black-700 mt-2">
                    <span>₹{filters.priceRange[0]}</span>
                    <span>₹{filters.priceRange[1]}</span>
                  </div>
                </div>

                {/* Duration Range */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Duration</h3>
                  <input
                    type="range"
                    min="0"
                    max="4000"
                    value={filters.durationRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFilters(f => ({ ...f, durationRange: [0, val] }));
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-sm font-medium text-black-700 mt-2">
                    <span>{Math.floor(filters.durationRange[0] / 60)}h {filters.durationRange[0] % 60}m</span>
                    <span>{Math.floor(filters.durationRange[1] / 60)}h {filters.durationRange[1] % 60}m</span>
                  </div>
                </div>

                {/* Pickup Time */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Departure Time - {sourceDisplay}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlotConfig.map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => {
                          setFilters(f => ({
                            ...f,
                            pickupTimeRanges: f.pickupTimeRanges.includes(label)
                              ? f.pickupTimeRanges.filter(t => t !== label)
                              : [...f.pickupTimeRanges, label]
                          }));
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          filters.pickupTimeRanges.includes(label)
                            ? 'bg-slate-50 border-slate-500 text-slate-800'
                            : 'bg-white border-black-200 text-black-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Drop Time */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Arrival Time - {destinationDisplay}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlotConfig.map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => {
                          setFilters(f => ({
                            ...f,
                            dropTimeRanges: f.dropTimeRanges.includes(label)
                              ? f.dropTimeRanges.filter(t => t !== label)
                              : [...f.dropTimeRanges, label]
                          }));
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          filters.dropTimeRanges.includes(label)
                            ? 'bg-slate-50 border-slate-500 text-slate-800'
                            : 'bg-white border-black-200 text-black-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-[1000px] h-[50px] flex-shrink-0">
            {/* Date Selector - Flight Style */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 sticky top-28 z-10">
              <h3 className="font-semibold text-gray-800 mb-3">{source} → {destination}</h3>
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-2">
                  {dateRange.map((date, idx) => {
                    const isSelected = selectedDateIndex === idx;
                    // Calculate price based on how far from selected date
                    const daysDiff = Math.abs(idx - 5);
                    const basePrice = 850;
                    const price = basePrice + daysDiff * 50;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                            setSelectedDateIndex(idx);
                            const y = date.getFullYear();
                            const m = String(date.getMonth()+1).padStart(2,'0');
                            const d = String(date.getDate()).padStart(2,'0');
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('date', `${y}-${m}-${d}`);
                            router.push(`/booking/train?${params.toString()}`);
                        }}
                        className={`flex-shrink-0 px-4 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sort Bar */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-4 sticky top-52 z-10">
              <div className="relative">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg relative overflow-hidden">
                  {/* Sliding indicator */}
                  <div
                    aria-hidden
                    className="absolute top-0 h-full rounded-lg shadow-sm"
                    style={{
                      left: indicatorStyle.left,
                      width: indicatorStyle.width,
                      transform: `translateX(0)`,
                      transition: 'left 360ms cubic-bezier(.2,.9,.25,1), width 320ms ease',
                      willChange: 'left,width',
                      pointerEvents: 'none',
                      background: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  />
                  {/* Sort buttons */}
                  {SORT_OPTIONS.map((sort) => {
                    const isActive = sortType === sort;
                    return (
                      <button
                        key={sort}
                        ref={(el) => { sortBtnRefs.current[sort] = el; }}
                        onClick={() => {
                          setSortType(sort);
                          setTimeout(() => measureActiveSort(sort), 0);
                        }}
                        className={`relative z-10 flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-colors focus:outline-none ${
                          isActive ? 'text-slate-700' : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        {sort === 'fastest' ? 'Fastest' : sort === 'departure' ? 'Earliest' : 'Cheapest'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-black-700">
                <span className="text-2xl font-bold text-black-900">{sortedTrips.length}</span>
                <span className="text-lg ml-2">trains found</span>
              </div>
              <div className="text-sm text-black-500">
                Showing results for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            {loading && (
            <div className="space-y-4 animate-pulse">
                {/* subtle header pill */}
                <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="h-4 w-40 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-full bg-[length:200%_100%] animate-[shimmer_1.6s_infinite]"/>
                </div>

                {/* skeleton cards */}
                {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl shadow-lg border-2 border-gray-100 overflow-hidden">
                    <div className="p-5">
                    <div className="flex items-center justify-between gap-6">
                        {/* left: operator */}
                        <div className="space-y-2">
                        <div className="h-5 w-48 bg-gray-100 rounded-md"/>
                        <div className="h-3 w-24 bg-gray-100 rounded-md"/>
                        </div>
                        {/* center: journey */}
                        <div className="flex items-center gap-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 flex-1">
                        <div className="space-y-2">
                            <div className="h-6 w-16 bg-gray-100 rounded-md"/>
                            <div className="h-3 w-20 bg-gray-100 rounded-md"/>
                            <div className="h-3 w-28 bg-gray-100 rounded-md"/>
                        </div>
                        <div className="flex flex-col items-center px-6">
                            <div className="h-3 w-24 bg-gray-100 rounded-md mb-2"/>
                            <div className="w-40 h-1.5 bg-gray-200 rounded-full"/>
                            <div className="h-3 w-20 bg-gray-100 rounded-md mt-2"/>
                        </div>
                        <div className="space-y-2">
                            <div className="h-6 w-16 bg-gray-100 rounded-md"/>
                            <div className="h-3 w-20 bg-gray-100 rounded-md"/>
                            <div className="h-3 w-28 bg-gray-100 rounded-md"/>
                        </div>
                        </div>
                        {/* right: price */}
                        <div className="text-right space-y-2">
                        <div className="h-7 w-24 bg-gray-100 rounded-md ml-auto"/>
                        <div className="h-3 w-20 bg-gray-100 rounded-md ml-auto"/>
                        </div>
                    </div>
                    </div>
                    <div className="border-t-2 border-gray-100 px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                        <div className="h-8 w-28 bg-gray-100 rounded-lg"/>
                        <div className="h-8 w-40 bg-gray-100 rounded-lg"/>
                        <div className="h-8 w-28 bg-gray-100 rounded-lg"/>
                        </div>
                        <div className="h-9 w-28 bg-gray-200 rounded-xl"/>
                    </div>
                    </div>
                </div>
                ))}
            </div>
            )}

            {!loading && error && (
            <div className="bg-white rounded-2xl border border-red-200 shadow p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500"><path fill="currentColor" d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2Zm1 14h-2v-2h2Zm0-4h-2V6h2Z"/></svg>
                </div>
                <div className="text-red-700 font-semibold mb-1">We couldn’t load trains</div>
                <div className="text-red-600/80 text-sm mb-4">{error}</div>
                <div className="flex items-center justify-center gap-3">
                <button
                    onClick={refetch}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold shadow hover:shadow-lg transition"
                >
                    Retry
                </button>
                <button
                    onClick={() => {
                    // go back to home if needed
                    router.push('/');
                    }}
                    className="px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
                >
                    Home
                </button>
                </div>
            </div>
            )}

            {!loading && !error && sortedTrips.length === 0 && (
            <div className="bg-white rounded-2xl border shadow p-10 text-center">
                <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8 text-slate-700"><path fill="currentColor" d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2Zm-1 15H8v-2h3Zm5 0h-3v-2h3Zm1-5H7V9h10Z"/></svg>
                </div>
                <div className="text-xl font-bold text-gray-900">No trains found</div>
                <div className="text-gray-600 mt-1">
                {source} → {destination} on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                <button
                    onClick={() => bumpDate(-1)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                    Previous Day
                </button>
                <button
                    onClick={() => bumpDate(1)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                >
                    Next Day
                </button>
                <button
                    onClick={() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.delete('class_type');
                    router.push(`/booking/train?${p.toString()}`);
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:shadow"
                >
                    Show All Classes
                </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                Tip: Try adjusting departure date or removing filters.
                </div>
            </div>
            )}

          

            {/* Train Cards */}
            <div className="space-y-2">
              {sortedTrips.map((trip) => {
                const isExpanded = expandedTrip === trip.id;

                return (
                  <div
                    key={trip.id}
                    className={`bg-white rounded-3xl shadow-lg border-2 overflow-hidden transition-all duration-500 ${
                      isExpanded ? 'border-slate-400 shadow-2xl' : 'border-black-200 hover:border-black-300'
                    }`}
                  >
                    {/* Main Card Content */}
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        {/* Train Info - Left */}
                        <div>
                          <div className="mb-2">
                            <h3 className="text-xl font-bold text-black-900">{trip.operator}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-base font-bold text-black-900">{(typeof trip.rating === 'number' ? trip.rating : 0).toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-black-600">({trip.reviews} reviews)</span>
                          </div>
                        </div>

                        {/* Journey Details - Center */}
                        <div className="flex items-center gap-8 bg-gradient-to-r from-black-50 to-blue-50/50 rounded-xl p-4">
                          <div>
                            <div className="text-2xl font-black text-black-900 mb-0.5">{trip.departureTime}</div>
                            <div className="text-sm font-semibold text-black-600">{source}</div>
                            <div className="text-xs text-black-500 mt-0.5">
                              {selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="flex flex-col items-center px-6">
                            <div className="text-xs font-bold text-black-600 mb-1.5">{trip.duration}</div>
                            <div className="w-40 h-0.5 bg-gradient-to-r from-slate-400 to-slate-500 rounded-full relative">
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-slate-600 rounded-full" />
                            </div>
                            <div className="text-xs text-black-500 mt-1.5">{trip.classType}</div>
                          </div>
                          <div>
                            <div className="text-2xl font-black text-black-900 mb-0.5">{trip.arrivalTime}</div>
                            <div className="text-sm font-semibold text-black-600">{destination}</div>
                            <div className="text-xs text-black-500 mt-0.5">
                              {(() => {
                                // Calculate arrival date (could be next day)
                                const arrivalDate = new Date(selectedDate);
                                const [depHour] = trip.departureTime.split(':').map(Number);
                                const [arrHour] = trip.arrivalTime.split(':').map(Number);
                                if (arrHour < depHour) {
                                  arrivalDate.setDate(arrivalDate.getDate() + 1);
                                }
                                return arrivalDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Price - Right */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <IndianRupee className="w-6 h-6 text-black-900" />
                            <span className="text-3xl font-black text-black-900">{trip.price}</span>
                          </div>
                          <div className="text-xs font-semibold text-black-600">{trip.seatsLeft} seats left</div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Tabs */}
                    <div className="border-t-2 border-black-100 px-6 py-3 bg-gradient-to-r from-slate-50 to-gray-50">
                      <div className="flex gap-2 justify-between items-center">
                        <div className="flex gap-2">
                          {[
                            { id: 'amenities', label: 'Amenities' },
                            { id: 'reviews', label: 'Ratings & Reviews' },
                            { id: 'policies', label: 'Policies' },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                if (expandedTrip === trip.id && expandedTab === tab.id) {
                                  setExpandedTrip(null);
                                  setExpandedTab('');
                                } else {
                                  setExpandedTrip(trip.id);
                                  setExpandedTab(tab.id);
                                  // Fetch service details if policies tab is opened
                                  if (tab.id === 'policies') {
                                    fetchServiceDetails(trip.id);
                                  }
                                }
                              }}
                              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                                isExpanded && expandedTab === tab.id
                                  ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg scale-105'
                                  : 'text-black-700 hover:bg-white hover:shadow-md'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        
                        {/* Book Now Button */}
                        <button
                          onClick={() => {
                            const params = new URLSearchParams({
                              service_id: trip.id,
                              from_station_id: sourceStationId,
                              to_station_id: destinationStationId,
                              class_type: trip.classType,
                              departure_time: apiData?.results.find(r => r.service_id === trip.id)?.departure_time || '',
                              arrival_time: apiData?.results.find(r => r.service_id === trip.id)?.arrival_time || '',
                            });
                            router.push(`/booking/review/train-form?${params.toString()}`);
                          }}
                          className="px-8 py-2 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-bold text-base hover:shadow-2xl hover:scale-105 transition-all duration-300"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>

                    {/* Expanded Tab Content */}
                    {isExpanded && (
                      <div className="border-t-2 border-black-100 bg-white">
                        {/* Amenities */}
                        {expandedTab === 'amenities' && (
                          <div className="p-8 bg-white">
                            <div className="grid grid-cols-5 gap-3 max-w-5xl mx-auto">
                              {(() => {
                                // Canonical amenity list (lowercase keys used for matching)
                                const canonical: Array<{ key: string; label: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }> = [
                                  { key: 'wifi', label: 'WiFi', Icon: Wifi },
                                  { key: 'water bottle', label: 'Water Bottle', Icon: Droplet },
                                  { key: 'reading light', label: 'Reading Light', Icon: Lamp },
                                  { key: 'pillow', label: 'Pillow', Icon: CircleDot },
                                  { key: 'blanket', label: 'Blanket', Icon: Snowflake },
                                  { key: 'charging port', label: 'Charging Port', Icon: Zap },
                                  { key: 'entertainment system', label: 'Entertainment System', Icon: Tv },
                                  { key: 'meal service', label: 'Meal Service', Icon: UtensilsCrossed },
                                  { key: 'ac', label: 'AC', Icon: Wind },
                                  { key: 'washroom', label: 'Washroom', Icon: DoorOpen },
                                ];

                                // Normalize incoming amenity data to an array of strings
                                const raw = trip.amenities;
                                const amenArray: string[] = [];
                                if (Array.isArray(raw)) {
                                  raw.forEach(a => { if (typeof a === 'string') amenArray.push(a); });
                                } else if (raw && typeof raw === 'object') {
                                  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => { if (v) amenArray.push(k); });
                                }

                                const normalize = (s: string) => s?.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');

                                // common synonyms -> canonical key
                                const synonyms: Record<string, string> = {
                                  'blankets': 'blanket',
                                  'charging point': 'charging port',
                                  'meals': 'meal service',
                                  'wifi': 'wifi',
                                  'wi fi': 'wifi',
                                  'wi-fi': 'wifi',
                                  'wash room': 'washroom',
                                  'restroom': 'washroom',
                                  'toilet': 'washroom',
                                  'a c': 'ac',
                                  'ac': 'ac',
                                  'pillow': 'pillow',
                                };

                                const presentSet = new Set(amenArray.map(a => {
                                  const n = normalize(a);
                                  return synonyms[n] || n;
                                }));

                                return canonical.map(({ key, label, Icon }) => {
                                  const present = presentSet.has(key);
                                  return (
                                    <div
                                      key={key}
                                      className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl transition-all duration-300 bg-white ${present ? '' : 'opacity-40'}`}
                                    >
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-100`}>
                                        <Icon className={`w-4 h-4 text-black`} strokeWidth={1.6} />
                                      </div>
                                      <span className={`text-[12px] font-medium text-center leading-tight text-black`}>{label}</span>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Reviews */}
                        {expandedTab === 'reviews' && (
                          <div className="p-5 bg-white">
                            <div className="max-w-4xl mx-auto">
                              {/* Rating Summary */}
                              <div className="flex items-start gap-8 mb-5 pb-4 border-b border-slate-200">
                                <div className="text-center">
                                    <div className="text-3xl font-light text-slate-900 mb-1.5">{(typeof trip.rating === 'number' ? trip.rating : 0).toFixed(1)}</div>
                                  <div className="flex gap-0.5 mb-1.5 justify-center">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= Math.round(trip.rating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-slate-200 text-slate-200'
                                        }`}
                                        strokeWidth={0}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-xs text-slate-500 font-medium">{trip.reviews} reviews</div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                  {[5, 4, 3, 2, 1].map(star => {
                                    const count = trip.ratingBreakdown?.[star.toString()] || 0;
                                    const percentage = trip.reviews > 0 ? (count / trip.reviews) * 100 : 0;
                                    return (
                                      <div key={star} className="flex items-center gap-2.5">
                                        <span className="text-xs font-medium text-slate-600 w-4">{star}</span>
                                        <Star className="w-2.5 h-2.5 fill-slate-400 text-slate-400" strokeWidth={0} />
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Policies */}
                        {expandedTab === 'policies' && (
                          <div className="p-5">
                            {loadingPolicies.has(trip.id) ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-slate-600"></div>
                                <span className="ml-2 text-sm text-slate-600">Loading policies...</span>
                              </div>
                            ) : trip.policies ? (
                              <div className="space-y-5">
                                <div>
                                  <h4 className="text-base font-semibold text-black-900 mb-2.5">Booking Policy</h4>
                                  <div className="overflow-hidden rounded-lg border border-black-200">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="bg-black-50">
                                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-black-700">
                                            Alteration Time
                                          </th>
                                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-black-700">
                                            Penalty
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {trip.policies.cancellation.map((policy, idx) => (
                                          <tr
                                            key={idx}
                                            className="border-t border-black-100 hover:bg-black-50 transition-colors"
                                          >
                                            <td className="px-4 py-2.5 text-xs font-medium text-black-800">
                                              {policy.time}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-semibold text-red-600">
                                              {policy.penalty}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                                    <div className="font-semibold text-amber-900 mb-1.5 text-xs">
                                      Important Note
                                    </div>
                                    <div className="text-xs text-amber-800 leading-relaxed">{trip.policies.childPolicy}</div>
                                  </div>
                                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                                    <div className="font-semibold text-purple-900 mb-1.5 text-xs">Terms & Conditions</div>
                                    <div className="text-xs text-purple-800 leading-relaxed max-h-24 overflow-y-auto">{trip.policies.luggage}</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-sm text-slate-600">
                                Failed to load policies. Please try again.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
