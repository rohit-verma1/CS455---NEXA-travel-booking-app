"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plane, Sunrise, Sun, Sunset, Moon, Filter, Sparkles, Lock } from 'lucide-react';
import { Navbar } from '@/components/shared/booking-navbar';
import OrionAgent from "@/components/shared/orion";
import { getAuthFromStorage } from '@/utils/authStorage';

// If your helper file path differs, update this import path accordingly:
import { searchFlights, callSmartFilterLLM, SmartFilterResponse } from '@/app/api';

// ----------------- API Response interfaces (matching backend) -----------------
interface APIFlightResponse {
  service_id: string;
  flight_number: string;
  airline_name: string;
  aircraft_model: string;
  route: string;
  vehicle: string;
  policy: string;
  departure_time: string;
  arrival_time: string;
  status: string;
  base_price: string;
  business_price: string;
  premium_price: string;
  economy_price: string;
  available_seats: any[];
}

interface FlightSearchResponse {
  mode?: string;
  count?: number;
  results?: APIFlightResponse[];
}

// ----------------- Internal Flight interface -----------------
interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string; // "HH:MM" 24h
  arrivalTime: string;   // "HH:MM" 24h
  duration: number;      // minutes
  price: number;
  stops: number;
  discount?: number;
  amenities?: string[];
  rating?: number;
  availableSeats?: number;
  aircraftModel?: string;
}

// ----------------- Transform helper -----------------
const transformAPIFlight = (apiFlight: APIFlightResponse, source: string, destination: string, travelClass: string): Flight => {
  const departure = new Date(apiFlight.departure_time);
  const arrival = new Date(apiFlight.arrival_time);
  const durationMs = arrival.getTime() - departure.getTime();
  const duration = Math.floor(Math.abs(durationMs) / (1000 * 60));
  
  if (durationMs < 0) {
    console.warn(`Flight ${apiFlight.service_id}: Arrival time before departure`, {
      departure: apiFlight.departure_time,
      arrival: apiFlight.arrival_time
    });
  }

  // Determine price based on selected travel class
  let price = parseFloat(apiFlight.economy_price);
  const classLower = travelClass.toLowerCase();
  
  if (classLower.includes('business')) {
    price = parseFloat(apiFlight.business_price);
  } else if (classLower.includes('premium')) {
    price = parseFloat(apiFlight.premium_price);
  } else if (classLower.includes('economy')) {
    price = parseFloat(apiFlight.economy_price);
  } else {
    // Default to base price if class not recognized
    price = parseFloat(apiFlight.base_price);
  }

  // Format times in UTC to match API data (no timezone conversion)
  const formatUTCTime = (date: Date) => {
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return {
    id: apiFlight.service_id,
    airline: apiFlight.airline_name,
    flightNumber: apiFlight.flight_number,
    departure: source,      // Use source from search params
    arrival: destination,   // Use destination from search params
    departureTime: formatUTCTime(departure),
    arrivalTime: formatUTCTime(arrival),
    duration,
    price,
    stops: 2,              // Fixed at 2 stops as per requirement
    amenities: [],         // No amenities in current response
    rating: 4.0,           // Default rating
    availableSeats: apiFlight.available_seats?.length || 0,
    aircraftModel: apiFlight.aircraft_model,
  };
};

type SortType = 'price' | 'fastest' | 'departure';
type TimeSlot = 'before6' | '6to12' | '12to18' | 'after18';
const SORT_OPTIONS: SortType[] = ['price', 'fastest', 'departure'];

// ----------------- Per-direction state types -----------------
type Direction = 'outbound' | 'return';
interface DirectionState {
  loading: boolean;
  error: string | null;
  flights: Flight[];
}

// ----------------- Utility -----------------
const getTimeSlot = (time: string): TimeSlot => {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 6) return 'before6';
  if (hour < 12) return '6to12';
  if (hour < 18) return '12to18';
  return 'after18';
};

export default function FlightSelectionPage() {
  // ----------- Read query params -----------
  const searchParams = useSearchParams();
  const router = useRouter();

  const sourceCode = searchParams.get('source') || 'HYD';
  const destinationCode = searchParams.get('destination') || 'DEL';
  const departureDateStr = searchParams.get('departure_date') || new Date().toISOString().slice(0, 10);
  const returnDateStr = searchParams.get('return_date') || '';
  const tripTypeParam = (searchParams.get('tripType') as 'oneWay' | 'roundTrip') || 'roundTrip';

  const searchData = useMemo(() => ({
    source: sourceCode,
    destination: destinationCode,
    departureDate: new Date(departureDateStr),
    returnDate: returnDateStr ? new Date(returnDateStr) : null,
    tripType: tripTypeParam,
    adults: parseInt(searchParams.get('adults') || '1', 10),
    children: parseInt(searchParams.get('children') || '0', 10),
    infants: parseInt(searchParams.get('infants') || '0', 10),
    travelClass: searchParams.get('class') || 'Economy',
  }), [searchParams, sourceCode, destinationCode, departureDateStr, returnDateStr, tripTypeParam]);

  const [tripType] = useState<'oneWay' | 'roundTrip'>(searchData.tripType);
  const [selectedOutbound, setSelectedOutbound] = useState<Flight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<Flight | null>(null);
  const [filterDirection, setFilterDirection] = useState<'outbound' | 'return'>('outbound');
  const [selectedOutboundDate, setSelectedOutboundDate] = useState<number>(3);
  const [selectedReturnDate, setSelectedReturnDate] = useState<number>(5);

  // ----------- Per-direction data states -----------
  const [outState, setOutState] = useState<DirectionState>({ loading: true, error: null, flights: [] });
  const [retState, setRetState] = useState<DirectionState>({ loading: false, error: null, flights: [] });

  // ----------- Dynamic filter options & ranges (per direction) -----------
  // Airline options (unique list from results)
  const [outboundAirlineOptions, setOutboundAirlineOptions] = useState<string[]>([]);
  const [returnAirlineOptions, setReturnAirlineOptions] = useState<string[]>([]);

  // Active airline filters
  const [outboundAirlines, setOutboundAirlines] = useState<string[]>([]);
  const [returnAirlines, setReturnAirlines] = useState<string[]>([]);

  // Price bounds and active range
  const [outboundPriceBounds, setOutboundPriceBounds] = useState<[number, number]>([0, 100000]);
  const [returnPriceBounds, setReturnPriceBounds] = useState<[number, number]>([0, 100000]);
  const [outboundPriceRange, setOutboundPriceRange] = useState<[number, number]>([0, 100000]);
  const [returnPriceRange, setReturnPriceRange] = useState<[number, number]>([0, 100000]);

  // Duration bounds (minutes) and active range
  const [outboundDurationBounds, setOutboundDurationBounds] = useState<[number, number]>([0, 1440]);
  const [returnDurationBounds, setReturnDurationBounds] = useState<[number, number]>([0, 1440]);
  const [outboundDurationRange, setOutboundDurationRange] = useState<[number, number]>([0, 1440]);
  const [returnDurationRange, setReturnDurationRange] = useState<[number, number]>([0, 1440]);

  // Time-of-day filters
  const [outboundDepartureTime, setOutboundDepartureTime] = useState<TimeSlot[]>([]);
  const [outboundArrivalTime, setOutboundArrivalTime] = useState<TimeSlot[]>([]);
  const [returnDepartureTime, setReturnDepartureTime] = useState<TimeSlot[]>([]);
  const [returnArrivalTime, setReturnArrivalTime] = useState<TimeSlot[]>([]);

  // Sorts
  const [outboundSort, setOutboundSort] = useState<SortType>('price');
  const [returnSort, setReturnSort] = useState<SortType>('price');

  // Misc
  const [smartFilter, setSmartFilter] = useState('');

  // Refs & indicator state for measured sliding indicator
  const sortBtnRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0, opacity: 0 });

  const handleDateChange = (newDate: Date, direction: 'outbound' | 'return') => {
    const newParams = new URLSearchParams(searchParams.toString());
    const dateString = newDate.toISOString().slice(0, 10);
  
    if (direction === 'outbound') {
      newParams.set('departure_date', dateString);
      // If the new departure date is after the current return date, clear the return date.
      if (searchData.returnDate && newDate.getTime() > searchData.returnDate.getTime()) {
        newParams.delete('return_date');
      }
    } else { // direction === 'return'
      newParams.set('return_date', dateString);
    }
  
    router.push(`/booking/flight?${newParams.toString()}`, { scroll: false });
  };

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

  React.useEffect(() => {
    measureActiveSort(outboundSort);
    const onResize = () => measureActiveSort(outboundSort);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [outboundSort, tripType, measureActiveSort]);

  // ----------- Helper: compute dynamic options & ranges -----------
  const recomputeDynamicFilters = (direction: Direction, flights: Flight[]) => {
    if (!flights || flights.length === 0) {
      if (direction === 'outbound') {
        setOutboundAirlineOptions([]);
        setOutboundPriceBounds([0, 100000]);
        setOutboundPriceRange([0, 100000]);
        setOutboundDurationBounds([0, 1440]);
        setOutboundDurationRange([0, 1440]);
      } else {
        setReturnAirlineOptions([]);
        setReturnPriceBounds([0, 100000]);
        setReturnPriceRange([0, 100000]);
        setReturnDurationBounds([0, 1440]);
        setReturnDurationRange([0, 1440]);
      }
      return;
    }

    const airlines = Array.from(new Set(flights.map(f => f.airline))).sort((a, b) => a.localeCompare(b));
    const prices = flights.map(f => f.price);
    const durations = flights.map(f => f.duration);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minDur = Math.min(...durations);
    const maxDur = Math.max(...durations);

    if (direction === 'outbound') {
      setOutboundAirlineOptions(airlines);
      const paddedMin = Math.max(0, Math.floor(minPrice / 100) * 100);
      const paddedMax = Math.ceil(maxPrice / 100) * 100;
      setOutboundPriceBounds([paddedMin, paddedMax]);
      setOutboundPriceRange([paddedMin, paddedMax]);

      const durPad = 5; // minutes padding
      const dMin = Math.max(0, minDur - durPad);
      const dMax = maxDur + durPad;
      setOutboundDurationBounds([dMin, dMax]);
      setOutboundDurationRange([dMin, dMax]);
    } else {
      setReturnAirlineOptions(airlines);
      const paddedMin = Math.max(0, Math.floor(minPrice / 100) * 100);
      const paddedMax = Math.ceil(maxPrice / 100) * 100;
      setReturnPriceBounds([paddedMin, paddedMax]);
      setReturnPriceRange([paddedMin, paddedMax]);

      const durPad = 5;
      const dMin = Math.max(0, minDur - durPad);
      const dMax = maxDur + durPad;
      setReturnDurationBounds([dMin, dMax]);
      setReturnDurationRange([dMin, dMax]);
    }
  };

  // ----------- Fetch function per direction -----------
  const fetchFlightsFor = async (
    direction: Direction,
    p: { source: string; destination: string; date: string; classType?: string; signal?: AbortSignal; token?: string; csrfToken?: string; }
  ) => {
    (direction === 'outbound' ? setOutState : setRetState)(s => ({ ...s, loading: true, error: null }));
    try {
      const data: FlightSearchResponse = await searchFlights(p);
      const flights = (data.results || []).map(flight => 
        transformAPIFlight(flight, p.source, p.destination, searchData.travelClass)
      );
      (direction === 'outbound' ? setOutState : setRetState)({ loading: false, error: null, flights });
      recomputeDynamicFilters(direction, flights);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          // Request was aborted, this is expected on unmount, so we don't treat it as an error.
          return;
        }
        // If no route exists, treat it as "no flights found" instead of a hard error.
        if (e.message.includes('404') && e.message.includes('No route contains both airports')) {
          (direction === 'outbound' ? setOutState : setRetState)({ loading: false, error: null, flights: [] });
          recomputeDynamicFilters(direction, []);
          return;
        }
      }
      const msg = e instanceof Error ? e.message : `Failed to fetch ${direction} flights`;
      (direction === 'outbound' ? setOutState : setRetState)({ loading: false, error: msg, flights: [] });
      recomputeDynamicFilters(direction, []);
    }
  };

  // ----------- Orchestrate oneWay vs roundTrip -----------
  useEffect(() => {
    const ac = new AbortController();
    const signal = ac.signal;

    // Get auth token from authStorage
    const auth = getAuthFromStorage();
    const token = auth?.token || '';
    const csrfToken = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';

    const depDate = departureDateStr; // Already in YYYY-MM-DD format
    const retDate = returnDateStr; // Already in YYYY-MM-DD format

    // Always fetch outbound
    fetchFlightsFor('outbound', {
      source: sourceCode,
      destination: destinationCode,
      date: depDate,
      // Omit classType as per backend requirements
      signal, token, csrfToken
    });

    // Conditionally fetch return
    if (tripType === 'roundTrip' && retDate) {
      setRetState(s => ({ ...s, loading: true, error: null }));
      fetchFlightsFor('return', {
        source: destinationCode,  // reversed for return
        destination: sourceCode,  // reversed for return
        date: retDate,
        // Omit classType as per backend requirements
        signal, token, csrfToken
      });
    } else {
      // reset return side for one-way
      setRetState({ loading: false, error: null, flights: [] });
      setReturnAirlineOptions([]);
      setReturnAirlines([]);
      setReturnPriceBounds([0, 100000]);
      setReturnPriceRange([0, 100000]);
      setReturnDurationBounds([0, 1440]);
      setReturnDurationRange([0, 1440]);
      setReturnDepartureTime([]);
      setReturnArrivalTime([]);
      setSelectedReturn(null);
    }

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCode, destinationCode, departureDateStr, returnDateStr, tripType]);

  // ----------- Filtering & sorting -----------
  const toggleStops = (stop: number, isOutbound: boolean) => {
    if (isOutbound) {
      // we support 0/1/2 stops toggles exactly as-is
      // (no change to UI)
      setOutboundDepartureTime(t => t); // no-op to keep state grouping tidy (optional)
      setOutboundAirlines(a => a);      // no-op
      setOutboundStops(prev => prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]);
    } else {
      setReturnStops(prev => prev.includes(stop) ? prev.filter(s => s !== stop) : [...prev, stop]);
    }
  };

  // NOTE: we keep stops arrays in scope (defined here to satisfy above usage)
  const [outboundStops, setOutboundStops] = useState<number[]>([]);
  const [returnStops, setReturnStops] = useState<number[]>([]);

  const toggleAirline = (airline: string, isOutbound: boolean) => {
    if (isOutbound) {
      setOutboundAirlines(prev => prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]);
    } else {
      setReturnAirlines(prev => prev.includes(airline) ? prev.filter(a => a !== airline) : [...prev, airline]);
    }
  };

  const toggleTimeSlot = (slot: TimeSlot, isOutbound: boolean, isDeparture: boolean) => {
    if (isOutbound) {
      if (isDeparture) {
        setOutboundDepartureTime(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
      } else {
        setOutboundArrivalTime(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
      }
    } else {
      if (isDeparture) {
        setReturnDepartureTime(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
      } else {
        setReturnArrivalTime(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
      }
    }
  };

  // ----------- Smart Filter Handler -----------
  const applySmartFilter = async (response: SmartFilterResponse, isOutbound: boolean) => {
    console.log('Applying smart filter:', response);
    
    // Parse stops if present
    if (response.stops) {
      let stopsNum = -1;
      if (response.stops === 'non-stop') stopsNum = 2;
      else if (response.stops === '1-stop') stopsNum = 3;
      else if (response.stops === '2-stop') stopsNum = 4;
      
      if (stopsNum !== -1) {
        if (isOutbound) {
          setOutboundStops([stopsNum]);
        } else {
          setReturnStops([stopsNum]);
        }
      }
    }

    // Apply price range if present
    if (response.price_min !== null || response.price_max !== null) {
      const priceBounds = isOutbound ? outboundPriceBounds : returnPriceBounds;
      const minPrice = response.price_min ?? priceBounds[0];
      const maxPrice = response.price_max ?? priceBounds[1];
      
      if (isOutbound) {
        setOutboundPriceRange([minPrice, maxPrice]);
      } else {
        setReturnPriceRange([minPrice, maxPrice]);
      }
    }

    // Apply duration range if present
    if (response.duration_min !== null || response.duration_max !== null) {
      const durationBounds = isOutbound ? outboundDurationBounds : returnDurationBounds;
      const minDuration = response.duration_min ?? durationBounds[0];
      const maxDuration = response.duration_max ?? durationBounds[1];
      
      if (isOutbound) {
        setOutboundDurationRange([minDuration, maxDuration]);
      } else {
        setReturnDurationRange([minDuration, maxDuration]);
      }
    }

    // Parse and apply departure time slot if present
    if (response.departure_time) {
      let slot: TimeSlot | null = null;
      if (response.departure_time === 'before_6am') slot = 'before6';
      else if (response.departure_time === '6am_12pm') slot = '6to12';
      else if (response.departure_time === '12pm_6pm') slot = '12to18';
      else if (response.departure_time === 'after_6pm') slot = 'after18';
      
      if (slot) {
        if (isOutbound) {
          setOutboundDepartureTime([slot]);
        } else {
          setReturnDepartureTime([slot]);
        }
      }
    }

    // Parse and apply arrival time slot if present
    if (response.arrival_time) {
      let slot: TimeSlot | null = null;
      if (response.arrival_time === 'before_6am') slot = 'before6';
      else if (response.arrival_time === '6am_12pm') slot = '6to12';
      else if (response.arrival_time === '12pm_6pm') slot = '12to18';
      else if (response.arrival_time === 'after_6pm') slot = 'after18';
      
      if (slot) {
        if (isOutbound) {
          setOutboundArrivalTime([slot]);
        } else {
          setReturnArrivalTime([slot]);
        }
      }
    }

    // Apply airlines if present and valid
    if (response.airlines && response.airlines.length > 0) {
      const airlineOptions = isOutbound ? outboundAirlineOptions : returnAirlineOptions;
      const validAirlines = response.airlines.filter(airline => airlineOptions.includes(airline));
      
      if (validAirlines.length > 0) {
        if (isOutbound) {
          setOutboundAirlines(validAirlines);
        } else {
          setReturnAirlines(validAirlines);
        }
      }
    }
  };

  const handleSmartFilterEnter = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      if (!smartFilter.trim()) return;
      
      try {
        const auth = getAuthFromStorage();
        const token = auth?.token || '';
        const csrfToken = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';
        
        const response = await callSmartFilterLLM(smartFilter, token, csrfToken);
        
        // Apply to outbound direction first
        await applySmartFilter(response, true);
        
        // If roundTrip, also apply to return direction
        if (tripType === 'roundTrip') {
          await applySmartFilter(response, false);
        }
        
        // Clear the filter text after successful application
        setSmartFilter('');
      } catch (error) {
        console.error('Error applying smart filter:', error);
        alert(`Error: ${error instanceof Error ? error.message : 'Failed to apply smart filter'}`);
      }
    }
  };

  const filterFlights = (flights: Flight[], isOutbound: boolean): Flight[] => {
    const stops = isOutbound ? outboundStops : returnStops;
    const airlinesActive = isOutbound ? outboundAirlines : returnAirlines;
    const [pMin, pMax] = isOutbound ? outboundPriceRange : returnPriceRange;
    const [dMin, dMax] = isOutbound ? outboundDurationRange : returnDurationRange;
    const depSlots = isOutbound ? outboundDepartureTime : returnDepartureTime;
    const arrSlots = isOutbound ? outboundArrivalTime : returnArrivalTime;

    return flights.filter(f => {
      if (stops.length > 0 && !stops.includes(f.stops)) return false;
      if (airlinesActive.length > 0 && !airlinesActive.includes(f.airline)) return false;
      if (f.price < pMin || f.price > pMax) return false;
      if (f.duration < dMin || f.duration > dMax) return false;
      if (depSlots.length > 0 && !depSlots.includes(getTimeSlot(f.departureTime))) return false;
      if (arrSlots.length > 0 && !arrSlots.includes(getTimeSlot(f.arrivalTime))) return false;
      return true;
    });
  };

  const sortFlights = (flights: Flight[], sortType: SortType): Flight[] => {
    const sorted = [...flights];
    if (sortType === 'price') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortType === 'fastest') {
      sorted.sort((a, b) => a.duration - b.duration);
    } else {
      // departure string "HH:MM" compares lexicographically fine for 24h
      sorted.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    }
    return sorted;
  };

  // Derived filtered lists
  const filteredOutbound = useMemo(() => {
    const flights = outState.flights;
    return sortFlights(filterFlights(flights, true), outboundSort);
  }, [
    outState.flights,
    outboundStops, outboundAirlines, outboundPriceRange, outboundDurationRange,
    outboundDepartureTime, outboundArrivalTime, outboundSort
  ]);

  const filteredReturn = useMemo(() => {
    const flights = retState.flights;
    return sortFlights(filterFlights(flights, false), returnSort);
  }, [
    retState.flights,
    returnStops, returnAirlines, returnPriceRange, returnDurationRange,
    returnDepartureTime, returnArrivalTime, returnSort
  ]);

  // Current filter references for the sidebar (does not change UI structure)
  const currentFilters = filterDirection === 'outbound'
    ? {
        stops: outboundStops,
        airlines: outboundAirlines,
        airlineOptions: outboundAirlineOptions,
        priceRange: outboundPriceRange,
        priceBounds: outboundPriceBounds,
        durationRange: outboundDurationRange,
        durationBounds: outboundDurationBounds,
        departureTime: outboundDepartureTime,
        arrivalTime: outboundArrivalTime,
      }
    : {
        stops: returnStops,
        airlines: returnAirlines,
        airlineOptions: returnAirlineOptions,
        priceRange: returnPriceRange,
        priceBounds: returnPriceBounds,
        durationRange: returnDurationRange,
        durationBounds: returnDurationBounds,
        departureTime: returnDepartureTime,
        arrivalTime: returnArrivalTime,
      };

  // Generate date options based on actual search dates
  const outboundDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(searchData.departureDate);
    for (let i = -3; i <= 4; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        price: 4850 + Math.abs(i) * 150,
        actualDate: new Date(date), // Store the actual date for later use
        offset: i // Store the offset for reference
      });
    }
    return dates;
  }, [searchData.departureDate]);

  const returnDates = useMemo(() => {
    const dates = [];
    const baseDate = searchData.returnDate ? new Date(searchData.returnDate) : new Date(searchData.departureDate);
    for (let i = -5; i <= 5; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        price: 4900 + Math.abs(i) * 130,
        actualDate: new Date(date), // Store the actual date for later use
        offset: i // Store the offset for reference
      });
    }
    return dates;
  }, [searchData.returnDate, searchData.departureDate]);

  // Sync selected date index with the actual search dates
  useEffect(() => {
    // Find the index in outboundDates that matches the actual departure date
    const departureDateStr = searchData.departureDate.toISOString().slice(0, 10);
    const outboundIndex = outboundDates.findIndex(dateObj => 
      dateObj.actualDate.toISOString().slice(0, 10) === departureDateStr
    );
    if (outboundIndex !== -1 && outboundIndex !== selectedOutboundDate) {
      setSelectedOutboundDate(outboundIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchData.departureDate, outboundDates]);

  useEffect(() => {
    // Find the index in returnDates that matches the actual return date
    if (searchData.returnDate) {
      const returnDateStr = searchData.returnDate.toISOString().slice(0, 10);
      const returnIndex = returnDates.findIndex(dateObj => 
        dateObj.actualDate.toISOString().slice(0, 10) === returnDateStr
      );
      if (returnIndex !== -1 && returnIndex !== selectedReturnDate) {
        setSelectedReturnDate(returnIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchData.returnDate, returnDates]);

  // Total price/discount (unchanged UI)
  const totalPrice = (selectedOutbound?.price || 0) + (tripType === 'roundTrip' ? (selectedReturn?.price || 0) : 0);
  const totalDiscount = (selectedOutbound?.discount || 0) + (tripType === 'roundTrip' ? (selectedReturn?.discount || 0) : 0);

  // Handle Book Now button click
  const handleBookNow = () => {
    if (!selectedOutbound) return;
    
    // Calculate total number of travellers
    const totalTravellers = searchData.adults + searchData.children + searchData.infants;
    
    const params = new URLSearchParams({
      service_id: selectedOutbound.id,
      tripType: tripType,
      travellers: totalTravellers.toString(),
      class_type: searchData.travelClass,
    });
    
    if (tripType === 'roundTrip' && selectedReturn) {
      params.set('return_service_id', selectedReturn.id);
    }
    
    router.push(`/booking/review?${params.toString()}`);
  };

  // Date label in navbar
  const formatNavDate = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  };

  // ------------------- RENDER (UI stays the same beyond placeholders) -------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <Navbar
        tripType={searchData.tripType}
      />

      {/* Main Content */}
      <div className="pt-[168px] pb-32 max-w-7xl mx-auto px-6">
        <div className="flex gap-6">
          {/* Filters */}
          <div className={`w-80 flex-shrink-0 transition-transform duration-300 -translate-y-35 ${tripType === 'roundTrip' ? '-translate-x-42' : ''}`}>
            <div className="bg-white rounded-2xl shadow-lg border sticky top-[180px] max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="p-6">
                <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filters
                </h3>

                {/* Smart Filter */}
                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Smart Filters</span>
                  </div>
                  <textarea
                    value={smartFilter}
                    onChange={(e) => setSmartFilter(e.target.value)}
                    onKeyDown={handleSmartFilterEnter}
                    placeholder="I want flights with no stops under ₹5000... (Cmd+Enter or Ctrl+Enter to apply)"
                    className="w-full h-20 text-sm bg-white rounded-lg px-3 py-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                {/* Direction Toggle */}
                {tripType === 'roundTrip' && (
                  <div className="mb-6">
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                      <button
                        onClick={() => setFilterDirection('outbound')}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                          filterDirection === 'outbound' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                        }`}
                      >
                        {searchData.source} → {searchData.destination}
                      </button>
                      <button
                        onClick={() => setFilterDirection('return')}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all ${
                          filterDirection === 'return' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
                        }`}
                      >
                        {searchData.destination} → {searchData.source}
                      </button>
                    </div>
                  </div>
                )}

                {/* Stops */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Stops</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2].map(stop => (
                      <button
                        key={stop}
                        onClick={() => toggleStops(stop, filterDirection === 'outbound')}
                        className={`py-3 rounded-xl text-xs font-medium transition-all border-2 ${
                          currentFilters.stops.includes(stop)
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {stop === 0 ? 'Non-Stop' : `${stop} Stop`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Airlines (dynamic) */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Airlines</h4>
                  <div className="space-y-2">
                    {(currentFilters.airlineOptions?.length ? currentFilters.airlineOptions : ['IndiGo', 'Air India', 'Air India Express', 'Akasa Air']).map(airline => (
                      <button
                        key={airline}
                        onClick={() => toggleAirline(airline, filterDirection === 'outbound')}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium text-left transition-all border-2 ${
                          currentFilters.airlines.includes(airline)
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {airline}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price (dynamic bounds, same UI) */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Price Range</h4>
                  <input
                    type="range"
                    min={currentFilters.priceBounds?.[0] ?? 0}
                    max={currentFilters.priceBounds?.[1] ?? 100000}
                    value={currentFilters.priceRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (filterDirection === 'outbound') {
                        setOutboundPriceRange([currentFilters.priceBounds?.[0] ?? 0, val]);
                      } else {
                        setReturnPriceRange([currentFilters.priceBounds?.[0] ?? 0, val]);
                      }
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-sm font-medium text-gray-700 mt-2">
                    <span>₹{(currentFilters.priceRange[0]).toLocaleString()}</span>
                    <span>₹{(currentFilters.priceRange[1]).toLocaleString()}</span>
                  </div>
                </div>

                {/* Duration (dynamic bounds, same UI) */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Duration</h4>
                  <input
                    type="range"
                    min={currentFilters.durationBounds?.[0] ?? 0}
                    max={currentFilters.durationBounds?.[1] ?? 1440}
                    value={currentFilters.durationRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (filterDirection === 'outbound') {
                        setOutboundDurationRange([currentFilters.durationBounds?.[0] ?? 0, val]);
                      } else {
                        setReturnDurationRange([currentFilters.durationBounds?.[0] ?? 0, val]);
                      }
                    }}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-sm font-medium text-gray-700 mt-2">
                    <span>{Math.floor(currentFilters.durationRange[0] / 60)}h</span>
                    <span>{Math.floor(currentFilters.durationRange[1] / 60)}h</span>
                  </div>
                </div>

                {/* Departure Time */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Departure Time</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ slot: 'before6', label: 'Before 6AM', Icon: Moon },
                      { slot: '6to12', label: '6AM - 12PM', Icon: Sunrise },
                      { slot: '12to18', label: '12PM - 6PM', Icon: Sun },
                      { slot: 'after18', label: 'After 6PM', Icon: Sunset }] as {slot: TimeSlot; label: string; Icon: any}[])
                      .map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => toggleTimeSlot(slot, filterDirection === 'outbound', true)}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          currentFilters.departureTime.includes(slot)
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Arrival Time */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">Arrival Time</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {([{ slot: 'before6', label: 'Before 6AM', Icon: Moon },
                      { slot: '6to12', label: '6AM - 12PM', Icon: Sunrise },
                      { slot: '12to18', label: '12PM - 6PM', Icon: Sun },
                      { slot: 'after18', label: 'After 6PM', Icon: Sunset }] as {slot: TimeSlot; label: string; Icon: any}[])
                      .map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => toggleTimeSlot(slot, filterDirection === 'outbound', false)}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          currentFilters.arrivalTime.includes(slot)
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600'
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

          {/* Flight Lists */}
          <div className={`flex-1 transition-transform duration-300 -translate-y-38 ${tripType === 'roundTrip' ? '-translate-x-42' : ''}`}>
            <div
              className="grid grid-cols-1 gap-6"
              style={{
                gridTemplateColumns:
                  tripType === 'roundTrip'
                    ? 'minmax(600px, 1fr) minmax(600px, 1fr)'
                    : 'minmax(900px, 1fr) minmax(900px, 1fr)'
              }}
            >
              {/* Outbound Flights */}
              <div>
                {/* Sticky wrapper so date + sort remain fixed while flight list scrolls */}
                <div className={`sticky top-[170px] z-40 transition-transform duration-300 ${tripType === 'roundTrip' ? 'translate-y-4' : 'translate-y-3'}`}>
                  {/* Date Selector */}
                  <div className={`bg-white rounded-xl shadow-sm border p-4 mb-4`}>
                    <h3 className="font-semibold text-gray-800 mb-3">{searchData.source} → {searchData.destination}</h3>
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-2">
                        {outboundDates.map((dateObj, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedOutboundDate(idx);
                              handleDateChange(dateObj.actualDate, 'outbound');
                            }}
                            className={`flex-shrink-0 px-4 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${
                              selectedOutboundDate === idx
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium">{dateObj.date}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sort Bar with measured sliding indicator (Outbound) */}
                  <div className={`bg-white rounded-xl shadow-sm border p-4 mb-4 ${tripType === 'roundTrip' ? '-translate-y-2' : '-translate-y-2'}`}>
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
                        {SORT_OPTIONS.map((sort) => {
                          const isActive = outboundSort === sort;
                          return (
                            <button
                              key={sort}
                              ref={(el) => { sortBtnRefs.current[sort] = el; }}
                              onClick={() => {
                                setOutboundSort(sort);
                                setTimeout(() => measureActiveSort(sort), 0);
                              }}
                              className={`relative z-10 flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-colors focus:outline-none ${
                                isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                              }`}
                            >
                              {sort}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outbound List Area */}
                <div className="space-y-3">
                  {/* Loading skeletons (elegant, inside list only) */}
                  {outState.loading && (
                    <>
                      {[1,2,3].map(i => (
                        <div key={i} className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                          <div className="animate-pulse">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-8 flex-1">
                                <div className="w-24">
                                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                                </div>
                                <div className="flex items-center gap-6 flex-1">
                                  <div>
                                    <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                  </div>
                                  <div className="flex-1 px-4">
                                    <div className="h-3 bg-gray-200 rounded w-24 mx-auto mb-3"></div>
                                    <div className="h-0.5 bg-gray-200"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto mt-3"></div>
                                  </div>
                                  <div>
                                    <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-8">
                                <div className="h-6 bg-gray-200 rounded w-24 ml-auto"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Error card (inside list only) */}
                  {!outState.loading && outState.error && (
                    <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                      <div className="flex items-start gap-3">
                        <svg className="h-6 w-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <h3 className="text-base font-semibold text-red-800">Couldn’t load outbound flights</h3>
                          <p className="text-sm text-red-700 mt-1">{outState.error}</p>
                          <button
                            onClick={() => {
                              const ac = new AbortController();
                              const auth = getAuthFromStorage();
                              const token = auth?.token || '';
                              const csrf = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';
                              const depDate = departureDateStr;
                              fetchFlightsFor('outbound', { source: sourceCode, destination: destinationCode, date: depDate, signal: ac.signal, token, csrfToken: csrf });
                            }}
                            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty state (inside list) */}
                  {!outState.loading && !outState.error && filteredOutbound.length === 0 && (
                    <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                      <div className="flex items-start gap-3">
                        <Plane className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                        <div>
                          <h3 className="text-base font-semibold text-yellow-900">No outbound flights found</h3>
                          <p className="text-sm text-yellow-800 mt-1">Try searching for other modes of travel or  clearing flight filters (if any).</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Outbound flights */}
                  {!outState.loading && !outState.error && filteredOutbound.map(flight => (
                    <div
                      key={flight.id}
                      onClick={() => setSelectedOutbound(flight)}
                      className={`bg-white rounded-2xl p-6 cursor-pointer transition-all border-2 ${
                        selectedOutbound?.id === flight.id ? 'border-blue-500 shadow-lg ring-4 ring-blue-100' : 'border-gray-100 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8 flex-1">
                          <div className="w-24">
                            <div className="font-bold text-gray-800 text-sm">{flight.airline}</div>
                            <div className="text-xs text-gray-500">{flight.flightNumber}</div>
                          </div>
                          <div className="flex items-center gap-6 flex-1">
                            <div>
                              <div className="text-2xl font-bold text-gray-800">{flight.departureTime}</div>
                              <div className="text-sm text-gray-500 mt-1">{flight.departure}</div>
                            </div>
                            <div className="flex-1 px-4">
                              <div className="text-xs text-gray-500 text-center mb-2">{Math.floor(flight.duration / 60)}h {flight.duration % 60}m</div>
                              <div className="relative">
                                <div className="h-0.5 bg-gray-300"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                  <Plane className="w-4 h-4 text-gray-400 rotate-90" />
                                </div>
                              </div>
                              <div className="text-xs text-green-600 text-center mt-2 font-medium">
                                {flight.stops === 2 ? 'Non-stop' : `${flight.stops-2} Stop(${flight.stops > 3 ? 's' : ''})`}
                              </div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-gray-800">{flight.arrivalTime}</div>
                              <div className="text-sm text-gray-500 mt-1">{flight.arrival}</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-8">
                          <div className="text-2xl font-bold text-gray-800">₹{flight.price.toLocaleString()}</div>
                          {flight.discount && (
                            <div className="text-xs text-green-600 font-semibold mt-1 bg-green-50 px-2 py-1 rounded">
                              Save ₹{flight.discount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Flights */}
              {tripType === 'roundTrip' && (
                <div>
                  {/* Sticky wrapper so date + sort remain fixed while flight list scrolls */}
                  <div className={`sticky top-[170px] z-40 transition-transform duration-300 ${tripType === 'roundTrip' ? 'translate-y-4' : ''}`}>
                    {/* Date Selector */}
                    <div className={`bg-white rounded-xl shadow-sm border p-4 mb-4`}>
                      <h3 className="font-semibold text-gray-800 mb-3">{searchData.destination} → {searchData.source}</h3>
                      <div className="overflow-x-auto scrollbar-hide">
                        <div className="flex gap-2">
                          {returnDates.map((dateObj, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setSelectedReturnDate(idx);
                                handleDateChange(dateObj.actualDate, 'return');
                              }}
                              className={`flex-shrink-0 px-4 py-2.5 rounded-lg border-2 transition-all whitespace-nowrap ${
                                selectedReturnDate === idx
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-sm font-medium">{dateObj.date}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sort Bar (Return) */}
                    <div className={`bg-white rounded-xl shadow-sm border p-4 mb-4 ${tripType === 'roundTrip' ? '-translate-y-2' : ''}`}>
                      <div className="relative">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg relative overflow-hidden">
                          {/* Sliding indicator (reuse same measurements for aesthetics) */}
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
                          {SORT_OPTIONS.map((sort) => {
                            const isActive = returnSort === sort;
                            return (
                              <button
                                key={sort}
                                ref={(el) => { sortBtnRefs.current[sort] = el; }}
                                onClick={() => {
                                  setReturnSort(sort);
                                  setTimeout(() => measureActiveSort(sort), 0);
                                }}
                                className={`relative z-10 flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-colors focus:outline-none ${
                                  isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                                }`}
                              >
                                {sort}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return List Area */}
                  <div className="space-y-3">
                    {/* Loading skeletons */}
                    {retState.loading && (
                      <>
                        {[1,2,3].map(i => (
                          <div key={i} className="bg-white rounded-2xl p-6 border-2 border-gray-100">
                            <div className="animate-pulse">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-8 flex-1">
                                  <div className="w-24">
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                                  </div>
                                  <div className="flex items-center gap-6 flex-1">
                                    <div>
                                      <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                                    </div>
                                    <div className="flex-1 px-4">
                                      <div className="h-3 bg-gray-200 rounded w-24 mx-auto mb-3"></div>
                                      <div className="h-0.5 bg-gray-200"></div>
                                      <div className="h-3 bg-gray-200 rounded w-16 mx-auto mt-3"></div>
                                    </div>
                                    <div>
                                      <div className="h-6 bg-gray-200 rounded w-16 mb-2"></div>
                                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right ml-8">
                                  <div className="h-6 bg-gray-200 rounded w-24 ml-auto"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Error card */}
                    {!retState.loading && retState.error && (
                      <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                        <div className="flex items-start gap-3">
                          <svg className="h-6 w-6 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div>
                            <h3 className="text-base font-semibold text-red-800">Couldn’t load return flights</h3>
                            <p className="text-sm text-red-700 mt-1">{retState.error}</p>
                            <button
                              onClick={() => {
                                const ac = new AbortController();
                                const auth = getAuthFromStorage();
                                const token = auth?.token || '';
                                const csrf = typeof window !== 'undefined' ? (localStorage.getItem('CSRF_TOKEN') || '') : '';
                                const rd = returnDateStr;
                                if (rd) {
                                  fetchFlightsFor('return', { source: destinationCode, destination: sourceCode, date: rd, signal: ac.signal, token, csrfToken: csrf });
                                }
                              }}
                              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Try Again
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state */}
                    {!retState.loading && !retState.error && filteredReturn.length === 0 && (
                      <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                        <div className="flex items-start gap-3">
                          <Plane className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                          <div>
                            <h3 className="text-base font-semibold text-yellow-900">No return flights found</h3>
                            <p className="text-sm text-yellow-800 mt-1">Try widening price/duration or clearing airline/time filters.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Return flights */}
                    {!retState.loading && !retState.error && filteredReturn.map(flight => (
                      <div
                        key={flight.id}
                        onClick={() => setSelectedReturn(flight)}
                        className={`bg-white rounded-2xl p-6 cursor-pointer transition-all border-2 ${
                          selectedReturn?.id === flight.id ? 'border-blue-500 shadow-lg ring-4 ring-blue-100' : 'border-gray-100 hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-8 flex-1">
                            <div className="w-24">
                              <div className="font-bold text-gray-800 text-sm">{flight.airline}</div>
                              <div className="text-xs text-gray-500">{flight.flightNumber}</div>
                            </div>
                            <div className="flex items-center gap-6 flex-1">
                              <div>
                                <div className="text-2xl font-bold text-gray-800">{flight.departureTime}</div>
                                <div className="text-sm text-gray-500 mt-1">{flight.departure}</div>
                              </div>
                              <div className="flex-1 px-4">
                                <div className="text-xs text-gray-500 text-center mb-2">{Math.floor(flight.duration / 60)}h {flight.duration % 60}m</div>
                                <div className="relative">
                                  <div className="h-0.5 bg-gray-300"></div>
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                                    <Plane className="w-4 h-4 text-gray-400 rotate-90" />
                                  </div>
                                </div>
                                <div className="text-xs text-green-600 text-center mt-2 font-medium">
                                  {flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop`}
                                </div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-800">{flight.arrivalTime}</div>
                                <div className="text-sm text-gray-500 mt-1">{flight.arrival}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-8">
                            <div className="text-2xl font-bold text-gray-800">₹{flight.price.toLocaleString()}</div>
                            {flight.discount && (
                              <div className="text-xs text-green-600 font-semibold mt-1 bg-green-50 px-2 py-1 rounded">
                                Save ₹{flight.discount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      {(selectedOutbound || selectedReturn) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-50">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                {selectedOutbound && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Outbound</div>
                    <div className="font-semibold text-gray-800">{selectedOutbound.airline} {selectedOutbound.flightNumber}</div>
                    <div className="text-sm text-gray-600">{selectedOutbound.departureTime} - {selectedOutbound.arrivalTime}</div>
                  </div>
                )}
                {tripType === 'roundTrip' && selectedReturn && (
                  <>
                    <div className="h-12 w-px bg-gray-300" />
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Return</div>
                      <div className="font-semibold text-gray-800">{selectedReturn.airline} {selectedReturn.flightNumber}</div>
                      <div className="text-sm text-gray-600">{selectedReturn.departureTime} - {selectedReturn.arrivalTime}</div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Total Price</div>
                  <div className="text-3xl font-bold text-gray-800">₹{totalPrice.toLocaleString()}</div>
                  {totalDiscount > 0 && (
                    <div className="text-sm text-green-600 font-semibold">Total Savings: ₹{totalDiscount}</div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Lock Price
                  </button>
                  <button 
                    onClick={handleBookNow}
                    disabled={!selectedOutbound || (tripType === 'roundTrip' && !selectedReturn)}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <OrionAgent />
    </div>
  );
}
