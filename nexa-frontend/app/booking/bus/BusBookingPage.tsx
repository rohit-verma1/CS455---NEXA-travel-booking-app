"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  MapPin,
  Filter,
  IndianRupee,
  Sunrise,
  Sun,
  SunMedium,
  Moon,
  Gauge,
  Armchair,
  BedSingle,
  User2,
  Droplet,
  Wind,
  Zap,
  Lamp,
  Wifi,
  UtensilsCrossed,
  DoorOpen,
  Shield,
  Bus,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/shared/booking-navbar";
import { useSearchParams } from "next/navigation";
import { getAuthFromStorage } from "@/utils/authStorage";
import API from "@/app/api";

/* -------------------------------- helpers -------------------------------- */

function fmtTimeHHmm(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function minutesBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  let diff = Math.round((b - a) / 60000);
  if (diff < 0) diff += 24 * 60; // arrival next day
  return diff;
}
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
function toDateFromYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt;
}

/* ------------------------------- Types (API Response) ------------------------------- */
interface BusSearchResponse {
  source_id: string[];
  destination_id: string[];
  data: BusServiceSearchResult[];
}

interface BusServiceSearchResult {
  service_id: string;
  route: {
    route_id: string;
    source: StationWithBusStops;
    destination: StationWithBusStops;
    distance_km: number;
    estimated_duration: string;
    stops: Array<{
      stop_order: number;
      station: StationWithBusStops;
      price_to_destination: string | null;
      duration_to_destination: string | null;
    }>;
    source_pickup_points: unknown[];
    destination_dropoff_points: unknown[];
  };
  departure_time: string; // ISO format
  arrival_time: string; // ISO format
  status: string;
  current_sleeper_price: string | null;
  current_non_sleeper_price: string | null;
  total_available: number;
  rating: {
    "5"?: number;
    "4"?: number;
    "3"?: number;
    "2"?: number;
    "1"?: number;
  };
  no_of_reviews: number;
  comments: string | null;
  bus_number: number;
  bus_travels_name: string;
}

interface StationWithBusStops {
  station_id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  BusStations: Array<{
    code: string;
    name: string;
    time: string; // ISO format
  }>;
}

/* ------------------------------- Types (UI) ------------------------------- */
interface BusTrip {
  // Service identifiers
  id: string; // service_id
  routeId: string; // route_id
  
  // Route information
  sourceStationId: string;
  sourceStationName: string;
  sourceStationCode: string;
  sourceCity: string;
  sourceState: string;
  
  destinationStationId: string;
  destinationStationName: string;
  destinationStationCode: string;
  destinationCity: string;
  destinationState: string;
  
  // Display info
  operator: string; // Derived from source station name or vehicle model
  departureTime: string; // HH:mm format
  arrivalTime: string; // HH:mm format
  duration: string; // "Xh Ym" format
  distanceKm: number;
  
  // Ratings & reviews
  rating: number; // Calculated average from rating distribution
  ratingDistribution: {
    "5": number;
    "4": number;
    "3": number;
    "2": number;
    "1": number;
  };
  reviews: number; // no_of_reviews
  
  // Availability
  seatsLeft: number; // total_available
  singleSeatsLeft: number; // Calculated estimate
  
  // Bus type
  isAC: boolean;
  type: "Seater" | "Sleeper" | "Both"; // Based on available seat types
  
  // Pricing
  price: number; // Base price (sleeper or non-sleeper)
  sleeperPrice: number | null;
  nonSleeperPrice: number | null;
  premiumPrice: number; // price + markup
  cancellation_markup: number; // Markup for cancellation protection
  reschedule_markup: number; // Markup for reschedule protection
  
  // Service status
  status: string; // "Scheduled", "Running", etc.
  
  // Additional
  amenities: string[];
  pickupPoints: Array<{ 
    time: string; 
    location: string; 
    address: string; 
    phone: string;
    code: string;
  }>;
  dropPoints: Array<{ 
    time: string; 
    location: string; 
    address: string; 
    phone: string;
    code: string;
  }>;
  
  // Stops information
  stops: Array<{
    stopOrder: number;
    stationId: string;
    stationName: string;
    stationCode: string;
    city: string;
    state: string;
    busStations: Array<{
      code: string;
      name: string;
      time: string;
    }>;
    priceToDestination: string | null;
    durationToDestination: string | null;
  }>;
  
  // Seat layout (populated from detail API)
  seatLayout: {
    rows: number;
    cols: number;
    type: "Seater" | "Sleeper";
    decks: "single";
    lowerDeck: Array<Array<{ 
      id: string; 
      type: "seat" | "sleeper" | "empty"; 
      status: "available" | "booked";
      price: number;
    }>>;
  };
  
  // Current pricing from detail API
  currentSleeperPrice: number | null;
  currentNonSleeperPrice: number | null;
  
  // Policies (populated from detail API)
  policies: {
    cancellation: Array<{ time: string; penalty: string }>;
    childPolicy: string;
    luggage: string;
  };
  
  // Comments
  comments: string | null;
}

interface BusServiceDetail {
  service_id: string;
  route: {
    route_id: string;
    source: {
      station_id: string;
      name: string;
      code: string;
      city: string;
      state: string;
      BusStations: Array<{
        code: string;
        name: string;
        time: string;
      }>;
    };
    destination: {
      station_id: string;
      name: string;
      code: string;
      city: string;
      state: string;
      BusStations: Array<{
        code: string;
        name: string;
        time: string;
      }>;
    };
    distance_km: number;
    estimated_duration: string;
    stops: Array<{
      stop_order: number;
      station: {
        station_id: string;
        name: string;
        code: string;
        city: string;
        state: string;
        BusStations: Array<{
          code: string;
          name: string;
          time: string;
        }>;
      };
      price_to_destination: string | null;
      duration_to_destination: string | null;
    }>;
    source_pickup_points: unknown[];
    destination_dropoff_points: unknown[];
  };
  vehicle: {
    vehicle_id: string;
    registration_no: string;
    model: string;
    capacity: number;
    amenities: {
      wifi?: boolean;
      water_bottle?: boolean;
      charging_ports?: boolean;
      [key: string]: boolean | undefined;
    };
    status: string;
  };
  policy: {
    policy_id: string;
    cancellation_window: number;
    cancellation_fee: string;
    reschedule_allowed: boolean;
    reschedule_fee: string;
    no_show_penalty: string;
    terms_conditions: string;
    no_cancellation_fee_markup: string;
    no_reschedule_fee_markup: string;
  };
  seats: Array<{
    seat_id: string;
    seat_number: string;
    seat_type: "Sleeper" | "NonSleeper";
    price: string;
    is_booked: boolean;
  }>;
  num_rows_sleeper: number;
  num_columns_sleeper: number;
  num_rows_non_sleeper: number;
  num_columns_non_sleeper: number;
  departure_time: string;
  arrival_time: string;
  status: string;
  bus_number: number;
  bus_travels_name: string;
  base_price: string;
  sleeper_price: string;
  non_sleeper_price: string;
  dynamic_pricing_enabled: boolean;
  dynamic_factor: number;
  current_sleeper_price: string;
  current_non_sleeper_price: string;
  total_capacity: number;
  booked_seats: number;
  created_at: string;
  updated_at: string;
  provider_user_id: string;
}

interface CoTravellerProfile {
  traveller_id: string;
  customer_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  marital_status: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  address: string;
}

/* --------------------------------- Page ---------------------------------- */
export default function BusBookingPage() {
  const router = useRouter();
  
  // read query params
  const searchParams = useSearchParams();
  const qsSource = decodeURIComponent(searchParams.get("source") || "");
  const qsDestination = decodeURIComponent(searchParams.get("destination") || "");
  const qsDate = searchParams.get("date") || ""; // YYYY-MM-DD

  // page states
  const [searchFrom, setSearchFrom] = useState(qsSource || "Bangalore");
  const [searchTo, setSearchTo] = useState(qsDestination || "Hyderabad");
  const [selectedDate, setSelectedDate] = useState(qsDate ? toDateFromYMD(qsDate) : new Date(2025, 9, 15));
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(5); // Center index
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<string>("");
  const [selectedSeats, setSelectedSeats] = useState<Array<{ id: string; price: number }>>([]);
  const [selectedPickup, setSelectedPickup] = useState<string>("");
  const [selectedDrop, setSelectedDrop] = useState<string>("");
  const [seatLayoutHeight, setSeatLayoutHeight] = useState<number>(650);
  const [isCancellationRefund, setIsCancellationRefund] = useState<boolean>(true);
  const [isRescheduleRefund, setIsRescheduleRefund] = useState<boolean>(false);

  // Traveller details state
  const [travellerDetails, setTravellerDetails] = useState<{
    [seatId: string]: { name: string; age: string; gender: "male" | "female" | "other" | ""; nationality: string };
  }>({});
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactMobile, setContactMobile] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("");
  const [travellerFormError, setTravellerFormError] = useState<string>("");

  // Co-traveller profiles state
  const [coTravellerProfiles, setCoTravellerProfiles] = useState<CoTravellerProfile[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set());
  const [profileToSeatMap, setProfileToSeatMap] = useState<Map<string, string>>(new Map());

  // loading / error
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Store station IDs (used in booking API)
  const [fromStationId, setFromStationId] = useState<string>("");
  const [toStationId, setToStationId] = useState<string>("");

  // Filters (unchanged)
  const [filters, setFilters] = useState({
    ac: false,
    nonAc: false,
    seater: false,
    sleeper: false,
    operators: [] as string[],
    pickupPoints: [] as string[],
    dropPoints: [] as string[],
    pickupTimeRanges: [] as string[],
    dropTimeRanges: [] as string[],
  });

  // trips (now populated from API; but shaped to your existing UI type)
  const [trips, setTrips] = useState<BusTrip[]>([]);

  // Store detailed service data
  const [serviceDetails, setServiceDetails] = useState<Map<string, BusServiceDetail>>(new Map());
  const [loadingServiceDetails, setLoadingServiceDetails] = useState<Set<string>>(new Set());

  // time slots (unchanged)
  const timeSlotConfig = React.useMemo(() => [
    { slot: "early_morning", label: "Before 6 AM", start: 0, end: 6, Icon: Sunrise },
    { slot: "morning", label: "6 AM - 12 PM", start: 6, end: 12, Icon: Sun },
    { slot: "afternoon", label: "12 PM - 6 PM", start: 12, end: 18, Icon: SunMedium },
    { slot: "night", label: "6 PM - 12 AM", start: 18, end: 24, Icon: Moon },
  ], []);

  // Fetch bus services on mount
  React.useEffect(() => {
    if (!qsSource || !qsDestination || !qsDate) {
      setError("Missing search parameters.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const apiUrl = `${API.SEARCH_BUSES}?source=${encodeURIComponent(qsSource)}&destination=${encodeURIComponent(qsDestination)}&date=${qsDate}`;

    fetch(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((response: BusSearchResponse) => {
        // Store station IDs
        setFromStationId(response.source_id?.[0] || "");
        setToStationId(response.destination_id?.[0] || "");

        const resultsArray = response.data || [];

        const mapped: BusTrip[] = resultsArray.map((service) => {
          // Calculate average rating from distribution
          const ratingDist = service.rating || {};
          const totalRatings = 
            (ratingDist["5"] || 0) + 
            (ratingDist["4"] || 0) + 
            (ratingDist["3"] || 0) + 
            (ratingDist["2"] || 0) + 
            (ratingDist["1"] || 0);
          
          const weightedSum = 
            (ratingDist["5"] || 0) * 5 +
            (ratingDist["4"] || 0) * 4 +
            (ratingDist["3"] || 0) * 3 +
            (ratingDist["2"] || 0) * 2 +
            (ratingDist["1"] || 0) * 1;
          
          const avgRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

          // Determine bus type
          const hasSleeperPrice = service.current_sleeper_price !== null;
          const hasNonSleeperPrice = service.current_non_sleeper_price !== null;
          let type: "Seater" | "Sleeper" | "Both" = "Seater";
          if (hasSleeperPrice && hasNonSleeperPrice) {
            type = "Both";
          } else if (hasSleeperPrice) {
            type = "Sleeper";
          }

          // Parse prices
          const sleeperPrice = service.current_sleeper_price 
            ? parseFloat(service.current_sleeper_price) 
            : null;
          const nonSleeperPrice = service.current_non_sleeper_price 
            ? parseFloat(service.current_non_sleeper_price) 
            : null;
          
          // Base price is non-sleeper if available and > 0, otherwise sleeper
          const basePrice = (nonSleeperPrice && nonSleeperPrice > 0) ? nonSleeperPrice : (sleeperPrice || 0);
          const premiumPrice = Math.max(basePrice + 300, basePrice);

          const seatsLeft = service.total_available || 0;

          // Extract pickup points from stops list by finding source station
          const pickupPoints: Array<{
            time: string;
            location: string;
            address: string;
            phone: string;
            code: string;
          }> = [];
          
          const sourceStop = service.route.stops.find(stop => stop.station.code === qsSource);
          if (sourceStop && sourceStop.station.BusStations) {
            sourceStop.station.BusStations.forEach((bs) => {
              pickupPoints.push({
                time: fmtTimeHHmm(bs.time),
                location: bs.name,
                address: `${sourceStop.station.city}, ${sourceStop.station.state}`,
                phone: "+91 1234567890",
                code: bs.code,
              });
            });
          }

          // Extract drop points from stops list by finding destination station
          const dropPoints: Array<{
            time: string;
            location: string;
            address: string;
            phone: string;
            code: string;
          }> = [];
          
          const destinationStop = service.route.stops.find(stop => stop.station.code === qsDestination);
          if (destinationStop && destinationStop.station.BusStations) {
            destinationStop.station.BusStations.forEach((bs) => {
              dropPoints.push({
                time: fmtTimeHHmm(bs.time),
                location: bs.name,
                address: `${destinationStop.station.city}, ${destinationStop.station.state}`,
                phone: "+91 1234567890",
                code: bs.code,
              });
            });
          }

          // Use first pickup point time as departure and first drop point time as arrival
          const departureTimeISO = sourceStop?.station.BusStations?.[0]?.time || service.departure_time;
          const arrivalTimeISO = destinationStop?.station.BusStations?.[0]?.time || service.arrival_time;
          const durMin = minutesBetween(departureTimeISO, arrivalTimeISO);

          // Map stops
          const stops = service.route.stops.map((stop) => ({
            stopOrder: stop.stop_order,
            stationId: stop.station.station_id,
            stationName: stop.station.name,
            stationCode: stop.station.code,
            city: stop.station.city,
            state: stop.station.state,
            busStations: stop.station.BusStations,
            priceToDestination: stop.price_to_destination,
            durationToDestination: stop.duration_to_destination,
          }));

          return {
            // Service identifiers
            id: service.service_id,
            routeId: service.route.route_id,
            
            // Route information
            sourceStationId: service.route.source.station_id,
            sourceStationName: service.route.source.name,
            sourceStationCode: service.route.source.code,
            sourceCity: service.route.source.city,
            sourceState: service.route.source.state,
            
            destinationStationId: service.route.destination.station_id,
            destinationStationName: service.route.destination.name,
            destinationStationCode: service.route.destination.code,
            destinationCity: service.route.destination.city,
            destinationState: service.route.destination.state,
            
            // Display info
            operator: service.bus_travels_name || "Bus Service",
            departureTime: fmtTimeHHmm(departureTimeISO),
            arrivalTime: fmtTimeHHmm(arrivalTimeISO),
            duration: fmtDuration(durMin),
            distanceKm: service.route.distance_km,
            
            // Ratings & reviews
            rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            ratingDistribution: {
              "5": ratingDist["5"] || 0,
              "4": ratingDist["4"] || 0,
              "3": ratingDist["3"] || 0,
              "2": ratingDist["2"] || 0,
              "1": ratingDist["1"] || 0,
            },
            reviews: service.no_of_reviews,
            
            // Availability
            seatsLeft,
            singleSeatsLeft: Math.max(0, Math.floor(seatsLeft * 0.3)),
            
            // Bus type
            isAC: false, // Will be determined from amenities in detail API
            type,
            
            // Pricing
            price: basePrice,
            sleeperPrice,
            nonSleeperPrice,
            premiumPrice,
            cancellation_markup: 0, // Will be populated from detail API
            reschedule_markup: 0, // Will be populated from detail API
            
            // Service status
            status: service.status,
            
            // Additional
            amenities: ["AC", "WiFi", "Charging Port"], // Default amenities
            pickupPoints,
            dropPoints,
            stops,
            
            // Seat layout (will be populated from detail API)
            seatLayout: {
              rows: 10,
              cols: 4,
              type: type === "Seater" ? "Seater" : "Sleeper",
              decks: "single" as const,
              lowerDeck: [],
            },
            
            // Policies (will be populated from detail API)
            policies: {
              cancellation: [],
              childPolicy: "",
              luggage: "",
            },
            
            // Current pricing (will be populated from detail API)
            currentSleeperPrice: sleeperPrice,
            currentNonSleeperPrice: nonSleeperPrice,
            
            // Comments
            comments: service.comments,
          };
        });

        setSearchFrom(qsSource);
        setSearchTo(qsDestination);
        setSelectedDate(toDateFromYMD(qsDate));

        setTrips(mapped);
      })
      .catch((e) => setError(e?.message || "Failed to fetch buses"))
      .finally(() => setLoading(false));
  }, [qsSource, qsDestination, qsDate]);

  // Fetch detailed service information when a trip is expanded
  const fetchServiceDetails = async (serviceId: string) => {
    if (serviceDetails.has(serviceId) || loadingServiceDetails.has(serviceId)) {
      return;
    }

    setLoadingServiceDetails((prev) => new Set(prev).add(serviceId));

    try {
      const apiUrl = API.BUS_SERVICE_DETAILS(serviceId);
      const res = await fetch(apiUrl, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data: BusServiceDetail = await res.json();

      setServiceDetails((prev) => new Map(prev).set(serviceId, data));

      // Update the trip with detailed information
      setTrips((prevTrips) =>
        prevTrips.map((trip) => {
          if (trip.id !== serviceId) return trip;

          // Extract amenities - map all 10 possible amenities
          const amenitiesList: string[] = [];
          if (data.vehicle?.amenities) {
            const amenitiesMap: Record<string, string> = {
              'ac': 'AC',
              'wifi': 'WiFi',
              'pillow': 'Pillow',
              'blanket': 'Blanket',
              'washroom': 'Washroom',
              'meal_service': 'Meal Service',
              'water_bottle': 'Water Bottle',
              'reading_light': 'Reading Light',
              'charging_ports': 'Charging Point',
              'entertainment_system': 'Entertainment System'
            };

            // Check each amenity and add to list if true
            Object.entries(amenitiesMap).forEach(([key, displayName]) => {
              if (data.vehicle.amenities[key] === true) {
                amenitiesList.push(displayName);
              }
            });
          }

          // Extract pickup and drop points
          const pickupPoints: typeof trip.pickupPoints = [];
          const dropPoints: typeof trip.dropPoints = [];

          let foundSource = false;
          for (const stop of data.route.stops || []) {
            if (!foundSource && stop.station.code === qsSource) {
              foundSource = true;
              if (stop.station.BusStations && stop.station.BusStations.length > 0) {
                stop.station.BusStations.forEach((busStation) => {
                  pickupPoints.push({
                    time: fmtTimeHHmm(busStation.time),
                    location: busStation.name,
                    address: `${stop.station.city}, ${stop.station.state}`,
                    phone: "+91 1234567890",
                    code: busStation.code,
                  });
                });
              } else {
                pickupPoints.push({
                  time: trip.departureTime,
                  location: stop.station.name,
                  address: `${stop.station.city}, ${stop.station.state}`,
                  phone: "+91 1234567890",
                  code: stop.station.code,
                });
              }
            } else if (foundSource && stop.station.code === qsDestination) {
              if (stop.station.BusStations && stop.station.BusStations.length > 0) {
                stop.station.BusStations.forEach((busStation) => {
                  dropPoints.push({
                    time: fmtTimeHHmm(busStation.time),
                    location: busStation.name,
                    address: `${stop.station.city}, ${stop.station.state}`,
                    phone: "+91 1234567890",
                    code: busStation.code,
                  });
                });
              } else {
                dropPoints.push({
                  time: trip.arrivalTime,
                  location: stop.station.name,
                  address: `${stop.station.city}, ${stop.station.state}`,
                  phone: "+91 1234567890",
                  code: stop.station.code,
                });
              }
              break;
            }
          }

          // Fallback if no pickup/drop points found
          if (pickupPoints.length === 0) {
            pickupPoints.push({
              time: trip.departureTime,
              location: `${qsSource} Main Stand`,
              address: `${qsSource} Central`,
              phone: "+91 1234567890",
              code: qsSource,
            });
          }
          if (dropPoints.length === 0) {
            dropPoints.push({
              time: trip.arrivalTime,
              location: `${qsDestination} Bus Terminal`,
              address: `${qsDestination} Central`,
              phone: "+91 1234567890",
              code: qsDestination,
            });
          }

          // Build seat layout
          const numRowsNonSleeper = data.num_rows_non_sleeper || 0;
          const numColsNonSleeper = data.num_columns_non_sleeper || 0;
          const numRowsSleeper = data.num_rows_sleeper || 0;
          const numColsSleeper = data.num_columns_sleeper || 0;

          const seatMap = new Map<string, { seat_type: string; is_booked: boolean; price: string }>();
          data.seats.forEach((seat) => {
            seatMap.set(seat.seat_number, {
              seat_type: seat.seat_type,
              is_booked: seat.is_booked,
              price: seat.price,
            });
          });

          // Get current prices from API
          const currentSleeperPriceNum = parseFloat(data.current_sleeper_price) || 0;
          const currentNonSleeperPriceNum = parseFloat(data.current_non_sleeper_price) || 0;

          const lowerDeck: Array<Array<{ id: string; type: "seat" | "sleeper" | "empty"; status: "available" | "booked"; price: number }>> = [];

          // Calculate maximum columns
          const maxCols = Math.max(numColsNonSleeper, numColsSleeper);
          const colDiff = Math.abs(numColsNonSleeper - numColsSleeper);
          
          // Build non-sleeper (seater) section first
          for (let row = 0; row < numRowsNonSleeper; row++) {
            const deckRow: Array<{
              id: string;
              type: "seat" | "sleeper" | "empty";
              status: "available" | "booked";
              price: number;
            }> = [];
            
            let seatIndex = 0;
            const seatsBeforeGap = Math.floor(numColsNonSleeper / 2);
            const gapCount = numColsNonSleeper < maxCols ? colDiff + 1 : 1;
            
            // Add seats before gap
            for (let i = 0; i < seatsBeforeGap; i++) {
              const seatNumber = `N${row + 1}${String.fromCharCode(65 + seatIndex)}`;
              const seatInfo = seatMap.get(seatNumber);
              deckRow.push({
                id: seatNumber,
                type: "seat",
                status: seatInfo?.is_booked ? "booked" : "available",
                price: currentNonSleeperPriceNum,
              });
              seatIndex++;
            }
            
            // Add gap columns
            for (let g = 0; g < gapCount; g++) {
              deckRow.push({ id: "", type: "empty", status: "available", price: 0 });
            }
            
            // Add remaining seats after gap
            const seatsAfterGap = numColsNonSleeper - seatsBeforeGap;
            for (let i = 0; i < seatsAfterGap; i++) {
              const seatNumber = `N${row + 1}${String.fromCharCode(65 + seatIndex)}`;
              const seatInfo = seatMap.get(seatNumber);
              deckRow.push({
                id: seatNumber,
                type: "seat",
                status: seatInfo?.is_booked ? "booked" : "available",
                price: currentNonSleeperPriceNum,
              });
              seatIndex++;
            }
            
            lowerDeck.push(deckRow);
          }

          // Build sleeper section after seaters
          for (let row = 0; row < numRowsSleeper; row++) {
            const deckRow: Array<{
              id: string;
              type: "seat" | "sleeper" | "empty";
              status: "available" | "booked";
              price: number;
            }> = [];
            
            let seatIndex = 0;
            const seatsBeforeGap = Math.floor(numColsSleeper / 2);
            const gapCount = numColsSleeper < maxCols ? colDiff + 1 : 1;
            
            // Add sleepers before gap
            for (let i = 0; i < seatsBeforeGap; i++) {
              const seatNumber = `S${row + 1}${String.fromCharCode(65 + seatIndex)}`;
              const seatInfo = seatMap.get(seatNumber);
              deckRow.push({
                id: seatNumber,
                type: "sleeper",
                status: seatInfo?.is_booked ? "booked" : "available",
                price: currentSleeperPriceNum,
              });
              seatIndex++;
            }
            
            // Add gap columns
            for (let g = 0; g < gapCount; g++) {
              deckRow.push({ id: "", type: "empty", status: "available", price: 0 });
            }
            
            // Add remaining sleepers after gap
            const seatsAfterGap = numColsSleeper - seatsBeforeGap;
            for (let i = 0; i < seatsAfterGap; i++) {
              const seatNumber = `S${row + 1}${String.fromCharCode(65 + seatIndex)}`;
              const seatInfo = seatMap.get(seatNumber);
              deckRow.push({
                id: seatNumber,
                type: "sleeper",
                status: seatInfo?.is_booked ? "booked" : "available",
                price: currentSleeperPriceNum,
              });
              seatIndex++;
            }
            
            lowerDeck.push(deckRow);
          }

          // Build policies
          const policies = {
            cancellation: [
              {
                time: `Cancellation - More than ${data.policy.cancellation_window} hrs before departure`,
                penalty: `₹${data.policy.cancellation_fee}`,
              },
              {
                time: `Cancellation - Less than ${data.policy.cancellation_window} hrs before departure`,
                penalty: "100%",
              },
              {
                time: "No show",
                penalty: `₹${data.policy.no_show_penalty}`,
              },
              {
                time: `Reschedule ${data.policy.reschedule_allowed ? '(Allowed)' : '(Not Allowed)'}`,
                penalty: data.policy.reschedule_allowed ? `₹${data.policy.reschedule_fee}` : "Not Available",
              },
            ],
            childPolicy: "Customers who are not comfortable with the Cancellations and/or Reschedule Policies may consider our additional offerings during booking to negate them",
            luggage: data.policy.terms_conditions || "Please refer to our standard terms and conditions",
          };

          return {
            ...trip,
            isAC: amenitiesList[0] === "AC", // Check if AC is the first amenity
            amenities: amenitiesList,
            pickupPoints,
            dropPoints,
            seatLayout: {
              rows: numRowsNonSleeper + numRowsSleeper,
              cols: Math.max(numColsNonSleeper, numColsSleeper),
              type: numRowsSleeper > 0 ? ("Sleeper" as const) : ("Seater" as const),
              decks: "single" as const,
              lowerDeck,
            },
            policies,
            currentSleeperPrice: currentSleeperPriceNum,
            currentNonSleeperPrice: currentNonSleeperPriceNum,
            cancellation_markup: parseFloat(data.policy.no_cancellation_fee_markup) || 0,
            reschedule_markup: parseFloat(data.policy.no_reschedule_fee_markup) || 0,
          };
        })
      );
    } catch (e) {
      console.error("Failed to fetch service details:", e);
    } finally {
      setLoadingServiceDetails((prev) => {
        const newSet = new Set(prev);
        newSet.delete(serviceId);
        return newSet;
      });
    }
  };

  /* ----------------------- Fetch Co-Traveller Profiles ---------------------- */
  useEffect(() => {
    const fetchCoTravellerProfiles = async () => {
      try {
        // Get auth from storage using the correct method
        const authRaw = localStorage.getItem("auth");
        if (!authRaw) {
          console.log("No auth data found in localStorage");
          return;
        }

        const auth = JSON.parse(authRaw);
        const token = auth?.token;
        
        console.log("Fetching co-traveller profiles, token exists:", !!token);
        if (!token) {
          console.log("No auth token found in auth object");
          return;
        }

        const response = await fetch(API.CO_TRAVELLERS, {
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        console.log("Co-traveller API response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", errorText);
          throw new Error(`Failed to fetch co-traveller profiles: ${response.status}`);
        }

        const data: CoTravellerProfile[] = await response.json();
        console.log("Co-traveller profiles fetched:", data.length, data);
        setCoTravellerProfiles(data);
      } catch (error) {
        console.error("Error fetching co-traveller profiles:", error);
      }
    };

    fetchCoTravellerProfiles();
  }, []);

  /* ------------------------------- Date Range ------------------------------ */
  const dateRange = useMemo(() => {
    const dates: Date[] = [];
    const baseDate = qsDate ? toDateFromYMD(qsDate) : new Date(2025, 9, 15);
    for (let i = -5; i <= 5; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [qsDate]);

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

  /* ---------------------- Unique pickup/drop & operators ------------------- */
  const allPickupPoints = useMemo(
    () => [...new Set(trips.flatMap((t) => t.pickupPoints.map((p) => p.location)))],
    [trips]
  );
  const allDropPoints = useMemo(
    () => [...new Set(trips.flatMap((t) => t.dropPoints.map((p) => p.location)))],
    [trips]
  );
  const operators = useMemo(() => [...new Set(trips.map((t) => t.operator))], [trips]);

  /* -------------------------------- Filters -------------------------------- */
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (filters.ac && !trip.isAC) return false;
      if (filters.nonAc && trip.isAC) return false;
      if (filters.seater && trip.type !== "Seater" && trip.type !== "Both") return false;
      if (filters.sleeper && trip.type !== "Sleeper" && trip.type !== "Both") return false;
      if (filters.operators.length > 0 && !filters.operators.includes(trip.operator)) return false;

      if (filters.pickupPoints.length > 0) {
        const hasPickupPoint = trip.pickupPoints.some((p) => filters.pickupPoints.includes(p.location));
        if (!hasPickupPoint) return false;
      }

      if (filters.dropPoints.length > 0) {
        const hasDropPoint = trip.dropPoints.some((p) => filters.dropPoints.includes(p.location));
        if (!hasDropPoint) return false;
      }

      if (filters.pickupTimeRanges.length > 0) {
        const departureHour = parseInt(trip.departureTime.split(":")[0]);
        const inRange = filters.pickupTimeRanges.some((range) => {
          const r = timeSlotConfig.find((tr) => tr.label === range);
          return r && departureHour >= r.start && departureHour < r.end;
        });
        if (!inRange) return false;
      }

      if (filters.dropTimeRanges.length > 0) {
        const arrivalHour = parseInt(trip.arrivalTime.split(":")[0]);
        const inRange = filters.dropTimeRanges.some((range) => {
          const r = timeSlotConfig.find((tr) => tr.label === range);
          return r && arrivalHour >= r.start && arrivalHour < r.end;
        });
        if (!inRange) return false;
      }

      return true;
    });
  }, [trips, filters, timeSlotConfig]);

  /* --------------------------- Seat selection logic ------------------------ */
  const handleSeatClick = (seat: {
    id: string;
    type: "seat" | "sleeper" | "empty";
    status: "available" | "booked";
    price: number;
  }) => {
    if (seat.status === "booked" || seat.type === "empty") return;

    const isSelected = selectedSeats.some((s) => s.id === seat.id);

    // If deselecting, just remove it
    if (isSelected) {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      return;
    }

    // If selecting a new seat, check if we already have seats of a different type
    if (selectedSeats.length > 0) {
      // Get the type of already selected seats
      const firstSelectedSeatType = selectedSeats[0].id.startsWith('S') ? 'sleeper' : 'seat';
      const newSeatType = seat.type;
      
      if (firstSelectedSeatType !== newSeatType) {
        // Don't allow mixing seat types - show a subtle message
        alert("Please select only one type of seat (either Seater or Sleeper) for this booking.");
        return;
      }
    }

    const seatData = { id: seat.id, price: seat.price };
    setSelectedSeats((prev) => [...prev, seatData]);
  };

  const handleProfileClick = (profile: CoTravellerProfile) => {
    const profileId = profile.traveller_id.toString();

    // Check if profile is already selected
    if (selectedProfileIds.has(profileId)) {
      // Deselect: Remove profile from selectedProfileIds and clear the associated seat data
      const seatId = profileToSeatMap.get(profileId);
      if (seatId) {
        setTravellerDetails((prev) => {
          const updated = { ...prev };
          delete updated[seatId];
          return updated;
        });
        setProfileToSeatMap((prev) => {
          const updated = new Map(prev);
          updated.delete(profileId);
          return updated;
        });
      }
      setSelectedProfileIds((prev) => {
        const updated = new Set(prev);
        updated.delete(profileId);
        return updated;
      });
      return;
    }

    // Find topmost empty or partially filled seat
    let targetSeatId: string | null = null;
    for (const seat of selectedSeats) {
      const details = travellerDetails[seat.id];
      if (!details || !details.name || !details.age || !details.gender) {
        targetSeatId = seat.id;
        break;
      }
    }

    // If all seats are filled, replace the first seat's data
    if (!targetSeatId && selectedSeats.length > 0) {
      targetSeatId = selectedSeats[0].id;
      // Find and deselect the profile associated with this seat
      for (const [pId, sId] of profileToSeatMap.entries()) {
        if (sId === targetSeatId) {
          setSelectedProfileIds((prev) => {
            const updated = new Set(prev);
            updated.delete(pId);
            return updated;
          });
          setProfileToSeatMap((prev) => {
            const updated = new Map(prev);
            updated.delete(pId);
            return updated;
          });
          break;
        }
      }
    }

    if (!targetSeatId) return;

    // Calculate age from date_of_birth
    const age = profile.date_of_birth
      ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear()
      : 0;

    // Map gender
    let gender: "male" | "female" | "other" | "" = "";
    if (profile.gender === "Male") gender = "male";
    else if (profile.gender === "Female") gender = "female";
    else if (profile.gender) gender = "other";

    // Parse nationality from address
    const nationalityOptions = [
      "Indian",
      "American",
      "British",
      "Canadian",
      "Australian",
      "German",
      "French",
      "Japanese",
      "Chinese",
      "Other",
    ];
    let nationality = "";
    if (profile.address) {
      const foundNationality = nationalityOptions.find((opt) =>
        profile.address.toLowerCase().includes(opt.toLowerCase())
      );
      nationality = foundNationality || "Other";
    }

    // Combine first_name and last_name
    const name = `${profile.first_name} ${profile.last_name}`.trim();

    // Update traveller details
    setTravellerDetails((prev) => ({
      ...prev,
      [targetSeatId as string]: {
        name,
        age: age.toString(),
        gender,
        nationality,
      },
    }));

    // Mark profile as selected and map it to the seat
    setSelectedProfileIds((prev) => new Set(prev).add(profileId));
    setProfileToSeatMap((prev) => new Map(prev).set(profileId, targetSeatId as string));
  };

  const handleBookingSubmit = async (trip: BusTrip) => {
    // Validate all fields
    if (!contactEmail || !contactMobile || !billingAddress) {
      setTravellerFormError("Please fill in all contact details.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setTravellerFormError("Please enter a valid email address.");
      return;
    }

    if (!/^\d{10}$/.test(contactMobile)) {
      setTravellerFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    for (const seat of selectedSeats) {
      const details = travellerDetails[seat.id];
      if (!details || !details.name || !details.age || !details.gender || !details.nationality) {
        setTravellerFormError(`Please complete all fields for Seat ${seat.id}.`);
        return;
      }

      if (parseInt(details.age) < 1 || parseInt(details.age) > 120) {
        setTravellerFormError(`Please enter a valid age for Seat ${seat.id}.`);
        return;
      }
    }

    setTravellerFormError("");

    // Get auth token
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      alert("Please log in to continue with booking.");
      return;
    }

    // Determine class type based on selected seats
    const firstSeatId = selectedSeats[0]?.id || "";
    const classType = firstSeatId.startsWith("S") ? "Sleeper" : "NonSleeper";

    // Build passengers array
    const passengers = selectedSeats.map((seat) => {
      const details = travellerDetails[seat.id];
      return {
        name: details.name,
        age: parseInt(details.age),
        gender: details.gender.charAt(0).toUpperCase() + details.gender.slice(1), // Capitalize first letter
        seat_no: seat.id,
        document_id: details.nationality,
      };
    });

    // Prepare booking payload
    const bookingPayload = {
      service_model: "bus",
      service_id: trip.id,
      passengers,
      class_type: classType,
      from_station_id: fromStationId,
      to_station_id: toStationId,
      no_cancellation_free_markup: isCancellationRefund,
      no_reschedule_free_markup: isRescheduleRefund,
    };

    console.log("Submitting booking:", bookingPayload);

    try {
      const response = await fetch(API.BOOKING_CREATE, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingPayload),
      });

      console.log("Booking API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Booking API error:", errorText);
        
        // Handle specific error cases
        if (response.status === 409) {
          // Parse error to get specific seat information
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.detail && errorData.detail.includes("already booked")) {
              alert("One or more selected seats have already been booked by another customer. Please refresh and select different seats.");
              // Optionally reload the page to refresh seat availability
              window.location.reload();
              return;
            }
          } catch {
            alert("The selected seats are no longer available. Please refresh and select different seats.");
            window.location.reload();
            return;
          }
        }
        
        alert(`Failed to create booking: ${response.status}. Please try again.`);
        return;
      }

      const bookingData = await response.json();
      console.log("Booking created successfully:", bookingData);
      
      // Extract booking_id - handle both direct and nested structures
      const bookingId = bookingData.booking_id || bookingData.booking?.booking_id;
      console.log("Booking ID:", bookingId);

      // Check if booking_id exists
      if (!bookingId) {
        console.error("No booking_id in response:", bookingData);
        alert("Booking created but no booking ID returned. Please check your bookings.");
        return;
      }

      // Redirect to payment page with booking_id and service_type
      router.push(`/booking/payment?booking_id=${bookingId}&service_type=bus`);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking. Please try again.");
    }
  };

  const calculateTotal = (trip: BusTrip) => {
    return selectedSeats.reduce((total, seat) => {
      // Find the actual seat to get its price
      for (const row of trip.seatLayout.lowerDeck) {
        for (const s of row) {
          if (s.id === seat.id) {
            return total + s.price;
          }
        }
      }
      return total;
    }, 0);
  };

  React.useEffect(() => {
    if (expandedTrip && expandedTab === "seats") {
      setTimeout(() => {
        const seatLayoutElement = document.getElementById(`seat-layout-${expandedTrip}`);
        if (seatLayoutElement) {
          const height = seatLayoutElement.offsetHeight;
          setSeatLayoutHeight(height - 180);
        }
      }, 100);
    }
  }, [expandedTrip, expandedTab]);

  const clearFilters = () => {
    setFilters({
      ac: false,
      nonAc: false,
      seater: false,
      sleeper: false,
      operators: [],
      pickupPoints: [],
      dropPoints: [],
      pickupTimeRanges: [],
      dropTimeRanges: [],
    });
  };

  /* -------------------------- Loading / Error / Empty ---------------------- */
  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 pt-20">
          <div className="mb-6 h-10 rounded-xl bg-gradient-to-r from-slate-100 to-slate-50" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm relative"
              >
                <div className="absolute inset-0 bg-[linear-gradient(100deg,transparent_40%,rgba(0,0,0,0.04)_50%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_1.6s_infinite]" />
              </div>
            ))}
          </div>
          <style jsx>{`
            @keyframes shimmer {
              0% {
                background-position: 200% 0;
              }
              100% {
                background-position: -200% 0;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-xl mx-auto px-6 pt-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" className="text-red-600">
              <path fill="currentColor" d="M11 7h2v6h-2zm0 8h2v2h-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">We couldn&apos;t load buses</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => location.reload()}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------------- Render -------------------------------- */
  return (
    <div className="relative min-h-screen pb-20">
      {/* Fixed Background Layer */}
      <div className="fixed inset-0 bg-gradient-to-br from-black-50 via-blue-50/30 to-black-50 -z-10" />

      {/* Premium Header */}
      <Navbar />

      <div className="max-w-[1580px] mx-auto px-6 py-8 pb-20">
        <div className="flex gap-8">
          {/* Enhanced Filters Sidebar */}
          <div className="w-[320px] flex-shrink-0">
            <div className="bg-white rounded-3xl shadow-lg border border-black-200 p-6 sticky top-28">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black-900 flex items-center gap-2">
                  <Filter className="w-6 h-6 text-blue-600" />
                  Filters
                </h2>
                <button onClick={clearFilters} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Clear All
                </button>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {/* AC Filter */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Bus Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFilters((f) => ({ ...f, ac: !f.ac }))}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                        filters.ac
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                          : "border-black-200 hover:border-black-300 text-black-700"
                      }`}
                    >
                      AC
                    </button>
                    <button
                      onClick={() => setFilters((f) => ({ ...f, nonAc: !f.nonAc }))}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                        filters.nonAc
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                          : "border-black-200 hover:border-black-300 text-black-700"
                      }`}
                    >
                      Non-AC
                    </button>
                  </div>
                </div>

{/* Seat Type */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Seat Type</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFilters((f) => ({ ...f, seater: !f.seater }))}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                        filters.seater
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                          : "border-black-200 hover:border-black-300 text-black-700"
                      }`}
                    >
                      Seater
                    </button>
                    <button
                      onClick={() => setFilters((f) => ({ ...f, sleeper: !f.sleeper }))}
                      className={`py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all ${
                        filters.sleeper
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md"
                          : "border-black-200 hover:border-black-300 text-black-700"
                      }`}
                    >
                      Sleeper
                    </button>
                  </div>
                </div>

                {/* Pickup Time */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">
                    Pickup Time - {searchFrom}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlotConfig.map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            pickupTimeRanges: f.pickupTimeRanges.includes(label)
                              ? f.pickupTimeRanges.filter((t) => t !== label)
                              : [...f.pickupTimeRanges, label],
                          }));
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          filters.pickupTimeRanges.includes(label)
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-black-200 text-black-600"
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
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">
                    Drop Time - {searchTo}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlotConfig.map(({ slot, label, Icon }) => (
                      <button
                        key={slot}
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            dropTimeRanges: f.dropTimeRanges.includes(label)
                              ? f.dropTimeRanges.filter((t) => t !== label)
                              : [...f.dropTimeRanges, label],
                          }));
                        }}
                        className={`py-3 px-2 rounded-xl text-xs font-medium transition-all border-2 flex flex-col items-center gap-1 ${
                          filters.dropTimeRanges.includes(label)
                            ? "bg-blue-50 border-blue-500 text-blue-700"
                            : "bg-white border-black-200 text-black-600"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pickup Points */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">
                    Pickup Point - {searchFrom}
                  </h3>
                  <div className="space-y-2">
                    {allPickupPoints.map((point) => (
                      <label
                        key={point}
                        className="flex items-center gap-3 cursor-pointer hover:bg-black-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.pickupPoints.includes(point)}
                          onChange={(e) => {
                            setFilters((f) => ({
                              ...f,
                              pickupPoints: e.target.checked
                                ? [...f.pickupPoints, point]
                                : f.pickupPoints.filter((p) => p !== point),
                            }));
                          }}
                          className="w-5 h-5 accent-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-black-700">{point}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Drop Points */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">
                    Drop Point - {searchTo}
                  </h3>
                  <div className="space-y-2">
                    {allDropPoints.map((point) => (
                      <label
                        key={point}
                        className="flex items-center gap-3 cursor-pointer hover:bg-black-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.dropPoints.includes(point)}
                          onChange={(e) => {
                            setFilters((f) => ({
                              ...f,
                              dropPoints: e.target.checked
                                ? [...f.dropPoints, point]
                                : f.dropPoints.filter((p) => p !== point),
                            }));
                          }}
                          className="w-5 h-5 accent-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-black-700">{point}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Operators */}
                <div>
                  <h3 className="font-bold text-black-800 mb-3 text-sm uppercase tracking-wide">Operators</h3>
                  <div className="space-y-2">
                    {operators.map((op) => (
                      <label
                        key={op}
                        className="flex items-center gap-3 cursor-pointer hover:bg-black-50 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filters.operators.includes(op)}
                          onChange={(e) => {
                            setFilters((f) => ({
                              ...f,
                              operators: e.target.checked
                                ? [...f.operators, op]
                                : f.operators.filter((o) => o !== op),
                            }));
                          }}
                          className="w-5 h-5 accent-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-black-700">{op}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Premium Date Selector */}
            <div className="bg-white rounded-3xl shadow-lg border border-black-200 mb-8 p-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {dateRange.map((date, idx) => {
                  const isSelected = selectedDateIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDateIndex(idx);
                        setSelectedDate(date);
                        // Update URL with new date
                        const newParams = new URLSearchParams(searchParams.toString());
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        newParams.set('date', `${y}-${m}-${d}`);
                        router.push(`/booking/bus?${newParams.toString()}`);
                      }}
                      className={`flex-shrink-0 px-8 py-4 rounded-2xl transition-all duration-300 ${
                        isSelected
                          ? "bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-2xl scale-110 -translate-y-1"
                          : "bg-black-50 hover:bg-black-100 text-black-700 hover:scale-105"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-90">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-2xl font-black">{date.getDate()}</div>
                      <div className="text-xs font-semibold mt-1 opacity-90">
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <div className="text-black-700">
                <span className="text-2xl font-bold text-black-900">{filteredTrips.length}</span>
                <span className="text-lg ml-2">buses found</span>
              </div>
              <div className="text-sm text-black-500">
                Showing results for{" "}
                {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </div>

            {/* Bus Cards */}
            <div className="space-y-2">
              {filteredTrips.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-lg border-2 border-slate-200 p-16 text-center">
                  <div className="mx-auto w-28 h-28 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center mb-6">
                    <Bus className="w-14 h-14 text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-3">No buses found</h2>
                  <p className="text-slate-600 text-lg mb-4">No buses match your current filters.</p>
                  <button
                    onClick={clearFilters}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredTrips.map((trip) => {
                  const isExpanded = expandedTrip === trip.id;

                  return (
                    <div
                      key={trip.id}
                      className={`bg-white rounded-3xl shadow-lg border-2 overflow-hidden transition-all duration-500 ${
                        isExpanded ? "border-blue-500 shadow-2xl" : "border-black-200 hover:border-black-300"
                      }`}
                    >
                    {/* Main Card Content */}
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        {/* Bus Info - Left */}
                        <div className="flex-shrink-0">
                          <h3 className="text-xl font-bold text-black-900 mb-2">{trip.operator}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                trip.isAC ? "bg-blue-100 text-blue-700" : "bg-black-100 text-black-700"
                              }`}
                            >
                              {trip.isAC ? "AC" : "Non-AC"}
                            </span>
                            <span className="px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold uppercase tracking-wider">
                              {trip.type === "Both" ? "Seater/Sleeper" : trip.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-bold text-black-900">{trip.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-black-600">({trip.reviews})</span>
                          </div>
                        </div>

                        {/* Journey Details - Center */}
                        <div className="flex-1 flex items-center justify-center">
                          <div className="flex items-center gap-6 px-6 py-4">
                            {/* Departure */}
                            <div className="text-left">
                              <div className="text-3xl font-bold text-slate-900 mb-0.5">{trip.departureTime}</div>
                              <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">{searchFrom}</div>
                              <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md">
                                <span className="text-[10px] font-semibold text-slate-700">
                                  {selectedDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {selectedDate.getDate()}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">
                                  {selectedDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Timeline */}
                            <div className="flex flex-col items-center justify-center px-6">
                              <div className="text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">{trip.duration}</div>
                              <div className="relative w-52 h-[3px]">
                                {/* Bold line */}
                                <div className="absolute inset-0 bg-slate-400 rounded-full"></div>
                                {/* Start dot */}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-600 rounded-full border border-white"></div>
                                {/* End dot */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-600 rounded-full border border-white"></div>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1.5 font-medium">
                                {(() => {
                                  const sourceStop = trip.stops.find(stop => stop.stationCode === qsSource);
                                  const destStop = trip.stops.find(stop => stop.stationCode === qsDestination);
                                  if (sourceStop && destStop) {
                                    const stopsInBetween = destStop.stopOrder - sourceStop.stopOrder - 1;
                                    return stopsInBetween === 1 ? '1 stop' : `${stopsInBetween} stops`;
                                  }
                                  return '0 stops';
                                })()}
                              </div>
                            </div>
                            
                            {/* Arrival */}
                            <div className="text-right">
                              <div className="text-3xl font-bold text-slate-900 mb-0.5">{trip.arrivalTime}</div>
                              <div className="text-xs font-medium text-slate-600 uppercase tracking-wider">{searchTo}</div>
                              <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-white border border-slate-200 rounded-md">
                                {(() => {
                                  const arrivalDate = new Date(selectedDate);
                                  const [depHour] = trip.departureTime.split(':').map(Number);
                                  const [arrHour] = trip.arrivalTime.split(':').map(Number);
                                  if (arrHour < depHour) {
                                    arrivalDate.setDate(arrivalDate.getDate() + 1);
                                  }
                                  return (
                                    <>
                                      <span className="text-[10px] font-semibold text-slate-700">
                                        {arrivalDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                      </span>
                                      <span className="text-xs font-bold text-slate-900">
                                        {arrivalDate.getDate()}
                                      </span>
                                      <span className="text-[10px] font-medium text-slate-500">
                                        {arrivalDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Price - Right */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center justify-end gap-1 mb-1">
                            <IndianRupee className="w-6 h-6 text-slate-900" />
                            <span className="text-3xl font-black text-slate-900">{trip.price}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-600">{trip.seatsLeft} seats left</div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Tabs */}
                    <div className="border-t-2 border-black-100 px-6 py-3 bg-gradient-to-r from-slate-50 to-gray-50">
                      <div className="flex gap-3 justify-between items-center">
                        <div className="flex gap-2">
                          {[
                            { id: "amenities", label: "Amenities" },
                            { id: "pickup", label: "Pickup & Drop Points" },
                            { id: "reviews", label: "Ratings & Reviews" },
                            { id: "policies", label: "Policies" },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => {
                                if (expandedTrip === trip.id && expandedTab === tab.id) {
                                  setExpandedTrip(null);
                                  setExpandedTab("");
                                } else {
                                  setExpandedTrip(trip.id);
                                  setExpandedTab(tab.id);
                                  fetchServiceDetails(trip.id);
                                }
                              }}
                              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                isExpanded && expandedTab === tab.id
                                  ? "bg-slate-100 text-slate-900"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                              }`}
                            >
                              {tab.label}
                              <ChevronDown 
                                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                  isExpanded && expandedTab === tab.id ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        
                        {/* Select/Hide Seats Button */}
                        <button
                          onClick={() => {
                            if (expandedTrip === trip.id && expandedTab === "seats") {
                              setExpandedTrip(null);
                              setExpandedTab("");
                            } else {
                              setExpandedTrip(trip.id);
                              setExpandedTab("seats");
                              setSelectedSeats([]);
                              setSelectedPickup("");
                              setSelectedDrop("");
                              fetchServiceDetails(trip.id);
                            }
                          }}
                          className={`px-8 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                            isExpanded && expandedTab === "seats"
                              ? "bg-white border-2 border-slate-600 text-slate-900 hover:bg-slate-50"
                              : "bg-gradient-to-r from-slate-600 to-slate-700 text-white hover:shadow-lg hover:scale-105"
                          }`}
                        >
                          {isExpanded && expandedTab === "seats" ? "HIDE SEATS" : "SELECT SEATS"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t-2 border-black-100 bg-white">
                        {/* Amenities */}
                        {expandedTab === "amenities" && (
                          <div className="p-6">
                            <div className="grid grid-cols-5 gap-4">
                              {trip.amenities.map((amenity, idx) => {
                                const amenityIcons: Record<
                                  string,
                                  React.ComponentType<{ className?: string; strokeWidth?: number }>
                                > = {
                                  "Water Bottle": Droplet,
                                  AC: Wind,
                                  "Charging Point": Zap,
                                  "Reading Light": Lamp,
                                  WiFi: Wifi,
                                  Snacks: UtensilsCrossed,
                                  "Emergency Exit": DoorOpen,
                                  Safety: Shield,
                                  Blanket: BedSingle,
                                };
                                const Icon = amenityIcons[amenity] || Wind;

                                return (
                                  <div
                                    key={idx}
                                    className="group flex flex-col items-center gap-2 py-3 px-3 rounded-lg hover:bg-slate-50 transition-all duration-300"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center transition-all duration-300">
                                      <Icon
                                        className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-300"
                                        strokeWidth={1.5}
                                      />
                                    </div>
                                    <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-300">
                                      {amenity}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pickup & Drop */}
                        {expandedTab === "pickup" && (
                          <div className="p-8">
                            <div className="grid grid-cols-2 gap-8">
                              <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide">
                                  Boarding Points
                                </h4>
                                <div className="space-y-3">
                                  {trip.pickupPoints.map((point, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => setSelectedPickup(point.location)}
                                      className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                        selectedPickup === point.location
                                          ? "border-blue-500 bg-blue-50"
                                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                      }`}
                                    >
                                      {selectedPickup === point.location && (
                                        <div className="flex justify-end mb-2">
                                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="text-sm text-slate-500 font-medium mb-1">{point.time}</div>
                                          <div className="text-base font-bold text-slate-900 mb-1">{point.location}</div>
                                          <div className="text-sm text-slate-600 leading-relaxed">{point.address}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide">
                                  Drop Points
                                </h4>
                                <div className="space-y-3">
                                  {trip.dropPoints.map((point, idx) => (
                                    <div
                                      key={idx}
                                      onClick={() => setSelectedDrop(point.location)}
                                      className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                        selectedDrop === point.location
                                          ? "border-blue-500 bg-blue-50"
                                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                      }`}
                                    >
                                      {selectedDrop === point.location && (
                                        <div className="flex justify-end mb-2">
                                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="text-sm text-slate-500 font-medium mb-1">{point.time}</div>
                                          <div className="text-base font-bold text-slate-900 mb-1">{point.location}</div>
                                          <div className="text-sm text-slate-600 leading-relaxed">{point.address}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Reviews */}
                        {expandedTab === "reviews" && (
                          <div className="p-5">
                            <div>
                              <div className="flex items-start gap-8 mb-5 pb-4 border-b border-slate-200">
                                <div className="text-center">
                                  <div className="text-3xl font-light text-slate-900 mb-1.5">
                                    {trip.rating.toFixed(1)}
                                  </div>
                                  <div className="flex gap-0.5 mb-1.5 justify-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3 h-3 ${
                                          star <= Math.round(trip.rating)
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-slate-300"
                                        }`}
                                        strokeWidth={1.5}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-xs text-slate-600">{trip.reviews} reviews</div>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                  {[5, 4, 3, 2, 1].map((star) => {
                                    const starKey = star.toString() as "5" | "4" | "3" | "2" | "1";
                                    const count = trip.ratingDistribution[starKey] || 0;
                                    const percentage = trip.reviews > 0 ? (count / trip.reviews) * 100 : 0;
                                    
                                    return (
                                      <div key={star} className="flex items-center gap-2.5">
                                        <span className="text-xs text-slate-700 w-5">{star} ★</span>
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-3">
                                {["Excellent journey!", "Very comfortable", "Good service"].map((review, idx) => (
                                  <div key={idx} className="pb-3 border-b border-slate-100 last:border-0">
                                    <div className="flex items-start justify-between mb-1.5">
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <Star
                                            key={s}
                                            className="w-3 h-3 fill-amber-400 text-amber-400"
                                            strokeWidth={1.5}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-slate-500">2 days ago</span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 mb-1">{review}</div>
                                    <div className="text-xs text-slate-600 mb-1.5">
                                      Great experience overall. Highly recommend!
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-xs font-medium text-slate-700">Traveler {idx + 1}</div>
                                      <span className="text-xs text-slate-400">•</span>
                                      <div className="text-xs text-green-600 font-medium">Verified</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Policies */}
                        {expandedTab === "policies" && (
                          <div className="p-5">
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
                          </div>
                        )}

                        {/* Loading Tab */}
                        {expandedTab === "loading" && (
                          <div className="p-12">
                            <div className="flex flex-col items-center justify-center min-h-[600px] gap-6">
                              {/* Minimal Loading Animation */}
                              <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                              </div>

                              {/* Loading Text */}
                              <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-slate-800">
                                  Preparing Your Journey
                                </h3>
                                <p className="text-slate-500 text-sm">
                                  Please wait while we get your booking details ready
                                </p>
                              </div>

                              {/* Simple Progress Bar */}
                              <div className="w-full max-w-xs mt-2">
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-600 rounded-full animate-[loading_5s_ease-in-out_forwards]" />
                                </div>
                              </div>
                            </div>

                            {/* Add custom animation */}
                            <style jsx>{`
                              @keyframes loading {
                                0% { width: 0%; }
                                100% { width: 100%; }
                              }
                            `}</style>
                          </div>
                        )}

                        {/* Travellers Tab */}
                        {expandedTab === "travellers" && (
                          <div className="p-8">
                            <div className="max-w-5xl mx-auto">
                              {/* Back Button */}
                              <button
                                onClick={() => setExpandedTab("seats")}
                                className="mb-4 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="font-medium">Back to Seat Selection</span>
                              </button>

                              {travellerFormError && (
                                <div className="mb-6 rounded-xl bg-rose-50 border-2 border-rose-200 py-4 px-5 text-rose-700 font-semibold">
                                  {travellerFormError}
                                </div>
                              )}

                              {/* Booking Details Section */}
                              <div className="rounded-3xl overflow-hidden shadow-xl border-2 border-slate-100 bg-white/90 backdrop-blur-sm mb-6">
                                <div className="bg-white px-8 py-4 border-b border-slate-200">
                                  <h3 className="text-xl font-black text-slate-900">Contact Details</h3>
                                </div>

                                <div className="p-6">
                                  <div className="grid grid-cols-3 gap-4">
                                    {/* Email */}
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Email Id*
                                      </label>
                                      <Input
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="your.email@example.com"
                                        type="email"
                                        className="h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                      />
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Mobile Number*
                                      </label>
                                      <div className="flex gap-2">
                                        <div className="flex items-center rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
                                          <span className="text-sm font-medium text-slate-700">+91</span>
                                        </div>
                                        <Input
                                          value={contactMobile}
                                          onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                          placeholder="9876543210"
                                          maxLength={10}
                                          className="flex-1 h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                        />
                                      </div>
                                    </div>

                                    {/* Billing Address */}
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                                        Billing Address*
                                      </label>
                                      <Input
                                        value={billingAddress}
                                        onChange={(e) => setBillingAddress(e.target.value)}
                                        placeholder="Enter your complete billing address"
                                        className="h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Traveller Details Section */}
                              <div className="rounded-3xl overflow-hidden shadow-xl border-2 border-slate-100 bg-white/90 backdrop-blur-sm">
                                <div className="bg-white px-8 py-4 border-b border-slate-200">
                                  <h3 className="text-xl font-black text-slate-900">Traveller Details</h3>
                                </div>

                                <div className="p-6">
                                  {/* Saved Co-Traveller Profiles */}
                                  <div className="mb-6 pb-6 border-b border-slate-200">
                                    <h4 className="text-sm font-bold text-slate-700 mb-3">
                                      Select from Saved Profiles
                                    </h4>
                                    {coTravellerProfiles.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {coTravellerProfiles.map((profile) => {
                                          const profileId = profile.traveller_id.toString();
                                          const isSelected = selectedProfileIds.has(profileId);
                                          return (
                                            <button
                                              key={profile.traveller_id}
                                              onClick={() => handleProfileClick(profile)}
                                              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                isSelected
                                                  ? "bg-blue-500 text-white shadow-md"
                                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                              }`}
                                            >
                                              {profile.first_name} {profile.last_name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-slate-500 italic">
                                        No saved profiles found. Check console for API details.
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-4">
                                    {selectedSeats.map((seat) => (
                                      <div key={seat.id} className="flex items-center gap-4">
                                        {/* Seat Number */}
                                        <div className="flex-shrink-0 w-20 mt-5">
                                          <div className="text-base font-bold text-slate-900">
                                            Seat <span className="font-black">{seat.id}</span>
                                          </div>
                                        </div>

                                        {/* Form Fields */}
                                        <div className="flex-1 grid grid-cols-[1fr_80px_160px_auto] gap-3 items-center">
                                          {/* Name */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                              Full Name
                                            </label>
                                            <Input
                                              value={travellerDetails[seat.id]?.name || ""}
                                              onChange={(e) =>
                                                setTravellerDetails((prev) => ({
                                                  ...prev,
                                                  [seat.id]: {
                                                    ...prev[seat.id],
                                                    name: e.target.value,
                                                  },
                                                }))
                                              }
                                              placeholder="Type here"
                                              className="h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                            />
                                          </div>

                                          {/* Age */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                              Age
                                            </label>
                                            <Input
                                              value={travellerDetails[seat.id]?.age || ""}
                                              onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                                                setTravellerDetails((prev) => ({
                                                  ...prev,
                                                  [seat.id]: {
                                                    ...prev[seat.id],
                                                    age: value,
                                                  },
                                                }));
                                              }}
                                              placeholder="eg : 24"
                                              maxLength={3}
                                              className="h-10 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                            />
                                          </div>

                                          {/* Nationality */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                              Nationality
                                            </label>
                                            <select
                                              value={travellerDetails[seat.id]?.nationality || ""}
                                              onChange={(e) =>
                                                setTravellerDetails((prev) => ({
                                                  ...prev,
                                                  [seat.id]: {
                                                    ...prev[seat.id],
                                                    nationality: e.target.value,
                                                  },
                                                }))
                                              }
                                              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                                            >
                                              <option value="">Select</option>
                                              <option value="Indian">Indian</option>
                                              <option value="American">American</option>
                                              <option value="British">British</option>
                                              <option value="Canadian">Canadian</option>
                                              <option value="Australian">Australian</option>
                                              <option value="Chinese">Chinese</option>
                                              <option value="Japanese">Japanese</option>
                                              <option value="German">German</option>
                                              <option value="French">French</option>
                                              <option value="Other">Other</option>
                                            </select>
                                          </div>

                                          {/* Gender */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                              Gender
                                            </label>
                                            <div className="flex rounded-lg border border-slate-300 overflow-hidden h-10">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setTravellerDetails((prev) => ({
                                                    ...prev,
                                                    [seat.id]: {
                                                      ...prev[seat.id],
                                                      gender: "male",
                                                    },
                                                  }))
                                                }
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all ${
                                                  travellerDetails[seat.id]?.gender === "male"
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                              >
                                                <User2 className="w-3.5 h-3.5" />
                                                Male
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setTravellerDetails((prev) => ({
                                                    ...prev,
                                                    [seat.id]: {
                                                      ...prev[seat.id],
                                                      gender: "female",
                                                    },
                                                  }))
                                                }
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all border-l border-slate-300 ${
                                                  travellerDetails[seat.id]?.gender === "female"
                                                    ? "bg-pink-50 text-pink-600"
                                                    : "bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                              >
                                                <User2 className="w-3.5 h-3.5" />
                                                Female
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setTravellerDetails((prev) => ({
                                                    ...prev,
                                                    [seat.id]: {
                                                      ...prev[seat.id],
                                                      gender: "other",
                                                    },
                                                  }))
                                                }
                                                className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all border-l border-slate-300 ${
                                                  travellerDetails[seat.id]?.gender === "other"
                                                    ? "bg-gray-100 text-gray-700"
                                                    : "bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                              >
                                                <User2 className="w-3.5 h-3.5" />
                                                Other
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Summary & Continue Button */}
                              <div className="mt-6 rounded-3xl overflow-hidden shadow-xl border-2 border-slate-100 bg-white/90 backdrop-blur-sm">
                                <div className="bg-white px-8 py-4 border-b border-slate-200">
                                  <h3 className="text-xl font-black text-slate-900">Booking Summary</h3>
                                </div>

                                <div className="p-6">
                                  <div className="flex items-center gap-6">
                                    {/* Left Section - Journey Details */}
                                    <div className="flex-1 grid grid-cols-4 gap-6">
                                      {/* Journey */}
                                      <div>
                                        <div className="text-xs font-semibold text-slate-600 mb-1">Journey</div>
                                        <div className="text-sm font-bold text-slate-900">
                                          {searchFrom} → {searchTo}
                                        </div>
                                      </div>

                                      {/* Boarding Point */}
                                      <div>
                                        <div className="text-xs font-semibold text-slate-600 mb-1">Boarding</div>
                                        <div className="text-sm font-bold text-slate-900 truncate">
                                          {selectedPickup || "Not selected"}
                                        </div>
                                      </div>

                                      {/* Dropping Point */}
                                      <div>
                                        <div className="text-xs font-semibold text-slate-600 mb-1">Dropping</div>
                                        <div className="text-sm font-bold text-slate-900 truncate">
                                          {selectedDrop || "Not selected"}
                                        </div>
                                      </div>

                                      {/* Seats */}
                                      <div>
                                        <div className="text-xs font-semibold text-slate-600 mb-1">Seats</div>
                                        <div className="flex flex-wrap gap-1">
                                          {selectedSeats.map((seat) => (
                                            <span
                                              key={seat.id}
                                              className="px-2 py-0.5 bg-slate-100 text-slate-900 rounded text-xs font-bold"
                                            >
                                              {seat.id}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Middle Section - Protection & Total */}
                                    <div className="flex items-center gap-4">
                                      {/* Protection Options */}
                                      {(isCancellationRefund || isRescheduleRefund) && (
                                        <div className="flex items-center gap-2">
                                          {isCancellationRefund && (
                                            <div className="flex items-center gap-1 text-xs text-slate-700 bg-green-50 px-2 py-1 rounded">
                                              <svg className="w-3 h-3 text-green-600" fill="none" strokeWidth="3" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                              <span className="font-medium">Free Cancel</span>
                                            </div>
                                          )}
                                          {isRescheduleRefund && (
                                            <div className="flex items-center gap-1 text-xs text-slate-700 bg-green-50 px-2 py-1 rounded">
                                              <svg className="w-3 h-3 text-green-600" fill="none" strokeWidth="3" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                              </svg>
                                              <span className="font-medium">Free Reschedule</span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Total Amount */}
                                      <div className="border-l border-slate-200 pl-4">
                                        <div className="text-xs font-semibold text-slate-600 mb-0.5">Total Amount</div>
                                        <div className="text-xl font-black text-slate-900 flex items-center gap-0.5">
                                          <IndianRupee className="w-4 h-4" />
                                          {calculateTotal(trip) +
                                            (isCancellationRefund ? trip.cancellation_markup * selectedSeats.length : 0) +
                                            (isRescheduleRefund ? trip.reschedule_markup * selectedSeats.length : 0)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right Section - Continue Button */}
                                    <div>
                                      <button
                                        onClick={() => handleBookingSubmit(trip)}
                                        className="px-8 py-2.5 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
                                      >
                                        Continue
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seat Selection */}
                        {expandedTab === "seats" && (
                          <div className="p-6">
                            <div className="flex gap-6 items-start">
                              {/* Left Column: Legend + Seat Map */}
                              <div className="flex flex-col gap-4" id={`seat-layout-${trip.id}`}>
                                {/* Legend */}
                                <div className="grid grid-cols-2 gap-3 p-4 bg-gradient-to-r from-slate-50 to-black-50 rounded-2xl border border-slate-200">
                                  <div className="flex items-center gap-2.5">
                                    <Armchair className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                                    <div>
                                      <div className="text-xs font-semibold text-slate-700">Seater</div>
                                      <div className="text-[10px] text-slate-500">
                                        ₹{trip.currentNonSleeperPrice || trip.nonSleeperPrice || 0}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <BedSingle className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                                    <div>
                                      <div className="text-xs font-semibold text-slate-700">Sleeper</div>
                                      <div className="text-[10px] text-slate-500">
                                        ₹{trip.currentSleeperPrice || trip.sleeperPrice || 0}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                      <Armchair className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                                      <User2 className="absolute inset-0 m-auto w-4 h-4 text-slate-400" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-slate-700">Booked</div>
                                      <div className="text-[10px] text-slate-500">Unavailable</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <Armchair className="w-8 h-8 text-blue-500 fill-sky-300" strokeWidth={1.5} />
                                    <div>
                                      <div className="text-xs font-semibold text-slate-700">Selected</div>
                                      <div className="text-[10px] text-blue-500 font-semibold">Your choice</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Seat Map */}
                                <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-3xl p-6 border-2 border-gray-300">
                                  {/* Seat Grid */}
                                  <div className="space-y-2">
                                    {/* Driver Row - Only show for first row */}
                                    {trip.seatLayout.lowerDeck.length > 0 && (
                                      <div className="flex gap-2 mb-3">
                                        {trip.seatLayout.lowerDeck[0].map((seat, colIdx) => {
                                          if (seat.type === "empty") {
                                            return <div key={colIdx} className="w-9" />;
                                          }
                                          const isLastSeat =
                                            colIdx ===
                                            trip.seatLayout.lowerDeck[0].filter((s) => s.type !== "empty").length - 1;
                                          return (
                                            <div key={colIdx} className="w-9 flex flex-col items-center">
                                              {isLastSeat && (
                                                <div className="mb-2 flex flex-col items-center">
                                                  <Gauge className="w-7 h-7 text-slate-600" strokeWidth={1.5} />
                                                  <span className="text-[7px] font-semibold text-slate-500 mt-0.5">
                                                    Driver
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {trip.seatLayout.lowerDeck.map((row, rowIdx) => (
                                      <div key={rowIdx} className="flex gap-2">
                                        {row.map((seat, colIdx) => {
                                          if (seat.type === "empty") {
                                            return <div key={colIdx} className="w-9" />;
                                          }

                                          const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                          const isBooked = seat.status === "booked";
                                          
                                          // Check if this seat type is disabled due to different type selection
                                          const isDisabledDueToType = selectedSeats.length > 0 && !isSelected && 
                                            ((selectedSeats[0].id.startsWith('S') && seat.type !== 'sleeper') || 
                                             (selectedSeats[0].id.startsWith('N') && seat.type !== 'seat'));

                                          const SeatIcon = seat.type === "sleeper" ? BedSingle : Armchair;

                                          return (
                                            <button
                                              key={colIdx}
                                              onClick={() => handleSeatClick(seat)}
                                              disabled={isBooked || isDisabledDueToType}
                                              className={`relative transition-all duration-200 flex flex-col items-center justify-center group ${
                                                isBooked || isDisabledDueToType
                                                  ? "cursor-not-allowed opacity-40"
                                                  : "cursor-pointer hover:scale-110 hover:-translate-y-0.5"
                                              }`}
                                            >
                                              <div className="relative">
                                                <SeatIcon
                                                  className={`w-9 h-9 transition-all duration-200 ${
                                                    isBooked
                                                      ? "text-slate-300"
                                                      : isSelected
                                                      ? "text-blue-500 fill-sky-300 drop-shadow-md"
                                                      : "text-gray-400"
                                                  }`}
                                                  strokeWidth={1.5}
                                                  fill={isSelected ? "currentColor" : "none"}
                                                />

                                                {isBooked && (
                                                  <div className="absolute inset-0 flex items-center justify-center">
                                                    <User2 className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                                                  </div>
                                                )}
                                              </div>

                                              <span
                                                className={`text-[7px] font-semibold mt-0.5 ${
                                                  isBooked
                                                    ? "text-slate-400"
                                                    : isSelected
                                                    ? "text-blue-600"
                                                    : "text-slate-600"
                                                }`}
                                              >
                                                {seat.id}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Right Side - Flexible structure with sticky bottom */}
                              <div className="flex-1 min-w-0 flex flex-col" style={{ minHeight: "0" }}>
                                {/* Pickup and Drop Points - Scrollable content */}
                                <div className="grid grid-cols-2 gap-4 mb-4 flex-shrink-0">

                                  {/* Boarding Point */}
                                  <div className="flex flex-col h-full">
                                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 flex-shrink-0">
                                      <MapPin className="w-4 h-4 text-gray-600" />
                                      Boarding Point
                                    </h4>
                                    <div 
                                      className="bg-white rounded-xl border-2 border-gray-300 overflow-hidden"
                                      style={{ height: `${Math.floor(seatLayoutHeight / 2)}px` }}
                                    >
                                      <div className="overflow-y-auto h-full">
                                        {trip.pickupPoints.map((point, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => setSelectedPickup(point.location)}
                                            className={`w-full text-left p-4 transition-all border-b-2 border-gray-300 last:border-b-0 hover:bg-gray-50 ${
                                              selectedPickup === point.location
                                                ? "bg-gray-100"
                                                : "bg-white"
                                            }`}
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="w-14 h-14 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {point.time}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900 text-base mb-0.5">
                                                  {point.location}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                  {point.address}
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                                                <div className="text-sm text-gray-700 font-semibold">
                                                  {point.code}
                                                </div>
                                                {selectedPickup === point.location && (
                                                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dropping Point */}
                                  <div className="flex flex-col h-full">
                                    <h4 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 flex-shrink-0">
                                      <MapPin className="w-4 h-4 text-gray-600" />
                                      Dropping Point
                                    </h4>
                                    <div 
                                      className="bg-white rounded-xl border-2 border-gray-300 overflow-hidden"
                                      style={{ height: `${Math.floor(seatLayoutHeight / 2)}px` }}
                                    >
                                      <div className="overflow-y-auto h-full">
                                        {trip.dropPoints.map((point, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => setSelectedDrop(point.location)}
                                            className={`w-full text-left p-4 transition-all border-b-2 border-gray-300 last:border-b-0 hover:bg-gray-50 ${
                                              selectedDrop === point.location
                                                ? "bg-gray-100"
                                                : "bg-white"
                                            }`}
                                          >
                                            <div className="flex items-start gap-3">
                                              <div className="w-14 h-14 rounded-full bg-gray-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                                {point.time}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="font-bold text-gray-900 text-base mb-0.5">
                                                  {point.location}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                  {point.address}
                                                </div>
                                              </div>
                                              <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0">
                                                <div className="text-sm text-gray-700 font-semibold">
                                                  {point.code}
                                                </div>
                                                {selectedDrop === point.location && (
                                                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Spacer to push bottom content down */}
                                <div className="flex-grow"></div>

                                {/* Markup Cards - Above Continue Button */}
                                <div className="grid grid-cols-2 gap-3 mb-3 flex-shrink-0">
                                  {/* No Cancellation Markup Card */}
                                  <button
                                    onClick={() => setIsCancellationRefund(!isCancellationRefund)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                                      isCancellationRefund
                                        ? "border-blue-500 bg-blue-50 shadow-lg scale-[1.02]"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                                    }`}
                                  >
                                    {isCancellationRefund && (
                                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
                                      </div>
                                    )}
                                    <div className="flex items-start gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                        isCancellationRefund ? "bg-blue-500" : "bg-blue-100"
                                      }`}>
                                        <Shield className={`w-5 h-5 ${
                                          isCancellationRefund ? "text-white" : "text-blue-600"
                                        }`} strokeWidth={2} />
                                      </div>
                                      <div className="text-left flex-1">
                                        <div className={`text-sm font-bold mb-1 ${
                                          isCancellationRefund ? "text-blue-900" : "text-gray-900"
                                        }`}>
                                          Free Cancellation
                                        </div>
                                        <div className="text-[10px] text-gray-600 mb-2 leading-tight">
                                          Cancel up to 24hrs before departure
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className={`text-xs font-black ${
                                            isCancellationRefund ? "text-blue-600" : "text-gray-700"
                                          }`}>
                                            ₹{trip.cancellation_markup}
                                          </span>
                                          <span className="text-[9px] text-gray-500">/traveller</span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>

                                  {/* No Reschedule Markup Card */}
                                  <button
                                    onClick={() => setIsRescheduleRefund(!isRescheduleRefund)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                                      isRescheduleRefund
                                        ? "border-purple-500 bg-purple-50 shadow-lg scale-[1.02]"
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                                    }`}
                                  >
                                    {isRescheduleRefund && (
                                      <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
                                      </div>
                                    )}
                                    <div className="flex items-start gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                        isRescheduleRefund ? "bg-purple-500" : "bg-purple-100"
                                      }`}>
                                        <Shield className={`w-5 h-5 ${
                                          isRescheduleRefund ? "text-white" : "text-purple-600"
                                        }`} strokeWidth={2} />
                                      </div>
                                      <div className="text-left flex-1">
                                        <div className={`text-sm font-bold mb-1 ${
                                          isRescheduleRefund ? "text-purple-900" : "text-gray-900"
                                        }`}>
                                          Free Reschedule
                                        </div>
                                        <div className="text-[10px] text-gray-600 mb-2 leading-tight">
                                          Reschedule anytime before departure
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className={`text-xs font-black ${
                                            isRescheduleRefund ? "text-purple-600" : "text-gray-700"
                                          }`}>
                                            ₹{trip.reschedule_markup}
                                          </span>
                                          <span className="text-[9px] text-gray-500">/traveller</span>
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                </div>

                                {/* Booking Summary Card - Elegant Design */}
                                <div className="bg-white border-2 border-slate-200 rounded-xl p-6 flex-shrink-0 shadow-sm">
                                  {selectedSeats.length > 0 ? (
                                    <div className="space-y-4">
                                      {/* Booking Details Grid */}
                                      <div className="grid grid-cols-3 gap-6 pb-4 border-b border-slate-200">
                                        {/* Selected Seats */}
                                        <div>
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Selected Seats</div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {selectedSeats.map((seat) => (
                                              <span
                                                key={seat.id}
                                                className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-bold"
                                              >
                                                {seat.id}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Boarding Point */}
                                        <div>
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Boarding Point</div>
                                          <div className="text-sm font-bold text-slate-900">
                                            {selectedPickup || (
                                              <span className="text-slate-400 font-normal italic">Not selected</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Dropping Point */}
                                        <div>
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dropping Point</div>
                                          <div className="text-sm font-bold text-slate-900">
                                            {selectedDrop || (
                                              <span className="text-slate-400 font-normal italic">Not selected</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Protection Options & Total */}
                                      <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
                                        {/* Protection Options */}
                                        <div>
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Protection</div>
                                          {!isCancellationRefund && !isRescheduleRefund ? (
                                            <div className="text-sm text-slate-400 italic">None selected</div>
                                          ) : (
                                            <div className="flex flex-wrap gap-2">
                                              {isCancellationRefund && (
                                                <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
                                                  Cancellation (₹{trip.cancellation_markup * selectedSeats.length})
                                                </span>
                                              )}
                                              {isRescheduleRefund && (
                                                <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                                                  Reschedule (₹{trip.reschedule_markup * selectedSeats.length})
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Total Amount */}
                                        <div>
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Total Amount</div>
                                          <div className="flex items-center gap-1">
                                            <IndianRupee className="w-5 h-5 text-slate-700" />
                                            <span className="text-2xl font-black text-slate-900">
                                              {calculateTotal(trip) + 
                                                (isCancellationRefund ? trip.cancellation_markup * selectedSeats.length : 0) +
                                                (isRescheduleRefund ? trip.reschedule_markup * selectedSeats.length : 0)}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-500 mt-1">
                                            Base: ₹{calculateTotal(trip)}
                                            {(isCancellationRefund || isRescheduleRefund) && (
                                              <span className="text-blue-600 font-medium">
                                                {" "}+ Protection: ₹
                                                {(isCancellationRefund ? trip.cancellation_markup * selectedSeats.length : 0) +
                                                  (isRescheduleRefund ? trip.reschedule_markup * selectedSeats.length : 0)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Continue Button */}
                                      <button
                                        disabled={!selectedPickup || !selectedDrop}
                                        onClick={() => {
                                          // Initialize traveller details for selected seats
                                          const newDetails: {
                                            [seatId: string]: { name: string; age: string; gender: "male" | "female" | ""; nationality: string };
                                          } = {};
                                          selectedSeats.forEach((seat) => {
                                            newDetails[seat.id] = { name: "", age: "", gender: "", nationality: "" };
                                          });
                                          setTravellerDetails(newDetails);
                                          
                                          // Show loading tab
                                          setExpandedTab("loading");
                                          
                                          // After 5 seconds, show travellers tab
                                          setTimeout(() => {
                                            setExpandedTab("travellers");
                                          }, 5000);
                                        }}
                                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-md hover:shadow-lg"
                                      >
                                        {!selectedPickup || !selectedDrop
                                          ? "⚠ Select Pickup & Drop Points to Continue"
                                          : "Continue to Book →"}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8">
                                      <div className="text-slate-400 text-base font-medium mb-1">
                                        No seats selected
                                      </div>
                                      <div className="text-slate-500 text-sm">
                                        Please select seats from the layout above to continue
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
