"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle2, Plane, Train, Bus, Trash2, Plus, MapPin, Clock, Calendar as CalendarIcon, Settings, Shield, ChevronDown, Check, Info } from 'lucide-react';
import { createPortal } from "react-dom";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parse } from "date-fns";
import { getAuthFromStorage } from "@/utils/authStorage";
import { formatInTimeZone } from 'date-fns-tz';
import API from "@/app/api";
import { 
  getFlightServiceDetails, 
  getTrainServiceDetails, 
  getBusServiceDetails,
  updateFlightService,
  updateTrainService,
  updateBusService,
  type BusServiceListItem,
  type FlightServiceListItem,
  type TrainServiceListItem
} from "@/app/api";
import { formatWeekNumber } from 'react-day-picker';

type ServiceType = 'flight' | 'train' | 'bus';
type AlertType = 'error' | 'success' | 'info';

interface Alert {
  type: AlertType;
  message: string;
}

interface Station {
  station_id?: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  points?: { name: string; code: string }[];
}

interface Stop {
  station: Station | null;
  departure_date: string;
  departure_time: string;
  base_price: string;
  bus_stops?: CityStopTime[]; // For bus service intermediate stops
}

interface BogieConfig {
  count: number;
  seats_per_bogie: number;
}

interface CityStopTime {
  code: string;
  name: string;
  active: boolean;
  time: string; // "HH:MM"
}

interface FormData {
  // Route
  source: Station | null;
  source_departure_date: string;
  source_departure_time: string;
  source_bus_stops: CityStopTime[]; // For bus service only
  stops: Stop[];
  destination: Station | null;
  destination_arrival_date: string;
  destination_arrival_time: string;
  destination_bus_stops: CityStopTime[]; // For bus service only

  // Pricing
  sleeper_price: string;
  second_ac_price: string;
  third_ac_price: string;
  seater_price: string;
  economy_price: string;
  premium_price: string;
  business_price: string;

  // Vehicle
  registration_no: string;
  model: string;
  amenities: string[];
  // Service specific fields
  travels_name: string; // For bus
  bus_number: string; // For bus
  train_service_name: string; // For train
  train_number: string; // For train
  airline_name: string; // For flight
  aircraft_number: string; // For flight

  // Bus/Flight seat config
  num_rows_sleeper: number;
  num_columns_sleeper: number;
  num_rows_seater: number;
  num_columns_seater: number;
  num_rows_economy: number;
  num_columns_economy: number;
  num_rows_premium: number;
  num_columns_premium: number;
  num_rows_business: number;
  num_columns_business: number;

  // Train bogie config
  bogies_config: {
    sleeper: BogieConfig;
    second_ac: BogieConfig;
    third_ac: BogieConfig;
  };

  // Policy
  cancellation_window: number;
  cancellation_fee: string;
  free_cancellation_price: string;
  reschedule_allowed: boolean;
  reschedule_fee: string;
  free_reschedule_price: string;
  no_show_penalty: string;
  baggage_allowance: string;
  luggage_allowance: string;
  terms_conditions: string;
  
  // Dynamic Pricing
  dynamic_pricing_enabled: boolean;
  dynamic_pricing_factor: string;
}

// ServiceItem interface for the service being edited
// Use the service list item types from the shared API definitions to avoid
// duplicate / incompatible local type declarations.
type ServiceItem = BusServiceListItem | FlightServiceListItem | TrainServiceListItem;

// Station data
const TRAIN_STATIONS: Station[] = [
  { name: 'Chhatrapati Shivaji Terminus', code: 'CSMT', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Bengaluru City Junction', code: 'SBC', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Hyderabad Deccan', code: 'HYB', city: 'Hyderabad', state: 'Telangana' },
  { name: 'New Delhi Railway Station', code: 'NDLS', city: 'Delhi', state: 'Delhi' },
  { name: 'Chennai Central', code: 'MAS', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Howrah Junction', code: 'HWH', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Lucknow Junction', code: 'LJN', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur Central', code: 'CNB', city: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Pune Junction', code: 'PUNE', city: 'Pune', state: 'Maharashtra' },
  { name: 'Ahmedabad Junction', code: 'ADI', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Indore Junction', code: 'INDB', city: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Jaipur Junction', code: 'JP', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Madgaon Railway Station', code: 'MAO', city: 'Goa', state: 'Goa' },
  { name: 'Guwahati Railway Station', code: 'GHY', city: 'Guwahati', state: 'Assam' },
  { name: 'Bhubaneswar Railway Station', code: 'BBS', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Ernakulam Junction', code: 'ERS', city: 'Kochi', state: 'Kerala' },
  { name: 'Patna Junction', code: 'PNBE', city: 'Patna', state: 'Bihar' },
  { name: 'Agra Cantt', code: 'AGC', city: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Visakhapatnam Junction', code: 'VSKP', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Chandigarh Railway Station', code: 'CDG', city: 'Chandigarh', state: 'Chandigarh' },
];



const FLIGHT_STATIONS: Station[] = [
  { name: 'Chhatrapati Shivaji Maharaj International Airport', code: 'BOM', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Kempegowda International Airport', code: 'BLR', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Rajiv Gandhi International Airport', code: 'HYD', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Indira Gandhi International Airport', code: 'DEL', city: 'Delhi', state: 'Delhi' },
  { name: 'Chennai International Airport', code: 'MAA', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Netaji Subhas Chandra Bose International Airport', code: 'CCU', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Chaudhary Charan Singh International Airport', code: 'LKO', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur Airport', code: 'KNU', city: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Pune Airport', code: 'PNQ', city: 'Pune', state: 'Maharashtra' },
  { name: 'Sardar Vallabhbhai Patel International Airport', code: 'AMD', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Devi Ahilya Bai Holkar Airport', code: 'IDR', city: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Jaipur International Airport', code: 'JAI', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Manohar International Airport', code: 'GOX', city: 'Goa', state: 'Goa' },
  { name: 'Lokpriya Gopinath Bordoloi International Airport', code: 'GAU', city: 'Guwahati', state: 'Assam' },
  { name: 'Biju Patnaik International Airport', code: 'BBI', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Cochin International Airport', code: 'COK', city: 'Kochi', state: 'Kerala' },
  { name: 'Jay Prakash Narayan Airport', code: 'PAT', city: 'Patna', state: 'Bihar' },
  { name: 'Agra Airport', code: 'AGR', city: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Visakhapatnam Airport', code: 'VTZ', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Shaheed Bhagat Singh International Airport', code: 'IXC', city: 'Chandigarh', state: 'Chandigarh' },
];



const BUS_STATIONS: Station[] = [
  {
    name: 'Delhi',
    code: 'DEL',
    city: 'Delhi',
    state: 'Delhi',
    points: [
      { name: 'Kashmere Gate ISBT', code: 'ISBTKG' },
      { name: 'Anand Vihar ISBT', code: 'ISBTAV' },
      { name: 'Sarai Kale Khan ISBT', code: 'ISBTSKK' },
      { name: 'Azadpur Terminal', code: 'AZDP' },
      { name: 'Dhaula Kuan', code: 'DKN' },
    ],
  },
  {
    name: 'Lucknow',
    code: 'LKO',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Alambagh Bus Station', code: 'ALMB' },
      { name: 'Charbagh', code: 'CHBG' },
      { name: 'Kaiserbagh', code: 'KSBG' },
      { name: 'Polytechnic', code: 'PLTC' },
      { name: 'Dubagga', code: 'DBGA' },
    ],
  },
  {
    name: 'Kanpur',
    code: 'KNU',
    city: 'Kanpur',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Jhakarkati Bus Station', code: 'JKKT' },
      { name: 'Rawatpur', code: 'RWTP' },
      { name: 'Naubasta', code: 'NBST' },
      { name: 'Barra', code: 'BRRA' },
      { name: 'Fazalganj', code: 'FZLG' },
    ],
  },
  {
    name: 'Mumbai',
    code: 'BOM',
    city: 'Mumbai',
    state: 'Maharashtra',
    points: [
      { name: 'Dadar TT', code: 'DDR' },
      { name: 'Andheri East', code: 'ANDR' },
      { name: 'Kurla Nehru Nagar', code: 'KRLN' },
      { name: 'Bandra (E)', code: 'BNDE' },
      { name: 'Borivali Depot', code: 'BORV' },
    ],
  },
  {
    name: 'Pune',
    code: 'PNQ',
    city: 'Pune',
    state: 'Maharashtra',
    points: [
      { name: 'Swargate Bus Stand', code: 'SWGT' },
      { name: 'Shivajinagar Bus Stand', code: 'SVJR' },
      { name: 'Pune Station', code: 'PNST' },
      { name: 'Nigdi', code: 'NGDI' },
      { name: 'Katraj', code: 'KTRJ' },
    ],
  },
  {
    name: 'Ahmedabad',
    code: 'AMD',
    city: 'Ahmedabad',
    state: 'Gujarat',
    points: [
      { name: 'Gita Mandir Bus Stand', code: 'GTMD' },
      { name: 'Nehru Nagar', code: 'NNRG' },
      { name: 'Kalupur', code: 'KLP' },
      { name: 'Iskon Cross Road', code: 'ISCN' },
      { name: 'Naroda', code: 'NRDA' },
    ],
  },
  {
    name: 'Indore',
    code: 'IDR',
    city: 'Indore',
    state: 'Madhya Pradesh',
    points: [
      { name: 'Sarwate Bus Stand', code: 'SRWT' },
      { name: 'Gangwal Bus Stand', code: 'GNGL' },
      { name: 'Vijay Nagar', code: 'VJNR' },
      { name: 'Rajendra Nagar', code: 'RJNR' },
      { name: 'Dewas Naka', code: 'DWNK' },
    ],
  },
  {
    name: 'Jaipur',
    code: 'JAI',
    city: 'Jaipur',
    state: 'Rajasthan',
    points: [
      { name: 'Sindhi Camp Bus Stand', code: 'SNDC' },
      { name: 'Durgapura', code: 'DRGP' },
      { name: 'Sodala', code: 'SDLA' },
      { name: 'Lal Kothi', code: 'LLKT' },
      { name: 'Gopalpura', code: 'GPLP' },
    ],
  },
  {
    name: 'Goa',
    code: 'GOX',
    city: 'Goa',
    state: 'Goa',
    points: [
      { name: 'Panjim KTC Bus Stand', code: 'PNJM' },
      { name: 'Margao KTC Bus Stand', code: 'MRGA' },
      { name: 'Mapusa KTC', code: 'MPSA' },
      { name: 'Vasco Bus Stand', code: 'VSCO' },
      { name: 'Ponda Bus Stand', code: 'PNDA' },
    ],
  },
  {
    name: 'Chennai',
    code: 'MAA',
    city: 'Chennai',
    state: 'Tamil Nadu',
    points: [
      { name: 'CMBT Koyambedu', code: 'CMBT' },
      { name: 'Broadway Bus Terminus', code: 'BWDY' },
      { name: 'T Nagar', code: 'TNGR' },
      { name: 'Saidapet', code: 'SDPT' },
      { name: 'Guindy', code: 'GNDY' },
    ],
  },
  {
    name: 'Bengaluru',
    code: 'BLR',
    city: 'Bengaluru',
    state: 'Karnataka',
    points: [
      { name: 'Kempegowda (Majestic)', code: 'KBS' },
      { name: 'Shivajinagar', code: 'SVN' },
      { name: 'K R Market', code: 'KRM' },
      { name: 'Yeshwanthpur TTMC', code: 'YPRB' },
      { name: 'Hebbal TTMC', code: 'HBL' },
    ],
  },
  {
    name: 'Hyderabad',
    code: 'HYD',
    city: 'Hyderabad',
    state: 'Telangana',
    points: [
      { name: 'MGBS (Imlibun)', code: 'MGBS' },
      { name: 'Jubilee Bus Station', code: 'JBS' },
      { name: 'Koti Bus Depot', code: 'KOTI' },
      { name: 'Dilsukhnagar', code: 'DSNR' },
      { name: 'Secunderabad', code: 'SCBD' },
    ],
  },
  {
    name: 'Kolkata',
    code: 'CCU',
    city: 'Kolkata',
    state: 'West Bengal',
    points: [
      { name: 'Esplanade', code: 'ESP' },
      { name: 'Howrah', code: 'HWHB' },
      { name: 'Karunamoyee', code: 'KMY' },
      { name: 'Garia', code: 'GAR6' },
      { name: 'Shyambazar', code: 'SYMZ' },
    ],
  },
  {
    name: 'Guwahati',
    code: 'GAU',
    city: 'Guwahati',
    state: 'Assam',
    points: [
      { name: 'Paltan Bazar', code: 'PLTN' },
      { name: 'Adabari', code: 'ADBR' },
      { name: 'Khanapara', code: 'KHNP' },
      { name: 'ISBT Guwahati', code: 'ISBTG' },
      { name: 'Jalukbari', code: 'JLBK' },
    ],
  },
  {
    name: 'Bhubaneswar',
    code: 'BBI',
    city: 'Bhubaneswar',
    state: 'Odisha',
    points: [
      { name: 'Baramunda ISBT', code: 'BRMD' },
      { name: 'Kalpana Square', code: 'KLPN' },
      { name: 'Master Canteen', code: 'MSTC' },
      { name: 'Vani Vihar', code: 'VNVR' },
      { name: 'Palasuni', code: 'PLSN' },
    ],
  },
  {
    name: 'Kochi',
    code: 'COK',
    city: 'Kochi',
    state: 'Kerala',
    points: [
      { name: 'Vyttila Mobility Hub', code: 'VYTH' },
      { name: 'Ernakulam KSRTC', code: 'ERNA' },
      { name: 'Kaloor', code: 'KLOR' },
      { name: 'Edappally', code: 'EDPL' },
      { name: 'Fort Kochi', code: 'FTKC' },
    ],
  },
  {
    name: 'Patna',
    code: 'PAT',
    city: 'Patna',
    state: 'Bihar',
    points: [
      { name: 'Mithapur ISBT', code: 'MTPR' },
      { name: 'Gandhi Maidan', code: 'GDMD' },
      { name: 'Meethapur', code: 'MTP' },
      { name: 'Danapur', code: 'DNPR' },
      { name: 'Bailey Road', code: 'BYLR' },
    ],
  },
  {
    name: 'Agra',
    code: 'AGR',
    city: 'Agra',
    state: 'Uttar Pradesh',
    points: [
      { name: 'Idgah Bus Stand', code: 'IDGH' },
      { name: 'ISBT Agra', code: 'ISBTA' },
      { name: 'Bhagwan Talkies', code: 'BGTK' },
      { name: 'Kamla Nagar', code: 'KMLN' },
      { name: 'Water Works', code: 'WTWK' },
    ],
  },
  {
    name: 'Visakhapatnam',
    code: 'VTZ',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    points: [
      { name: 'Dwaraka Bus Complex', code: 'DWRC' },
      { name: 'Maddilapalem', code: 'MDLP' },
      { name: 'Gajuwaka', code: 'GJWK' },
      { name: 'NAD Junction', code: 'NADJ' },
      { name: 'RTC Complex', code: 'RTCC' },
    ],
  },
  {
    name: 'Chandigarh',
    code: 'IXC',
    city: 'Chandigarh',
    state: 'Chandigarh',
    points: [
      { name: 'Sector 17 ISBT', code: 'S17B' },
      { name: 'Sector 43 ISBT', code: 'S43B' },
      { name: 'PGI Bus Stop', code: 'PGIB' },
      { name: 'Sector 22 Market', code: 'S22B' },
      { name: 'Manimajra', code: 'MNMJ' },
    ],
  },
];



const AMENITIES = [
  'AC', 'Blanket', 'Charging Port', 'Entertainment System', 'Meal Service',
  'Pillow', 'Reading Light', 'Washroom', 'Water Bottle', 'WiFi'
];

// Helper function to build amenities object in alphabetical order
const buildAmenitiesObject = (selectedAmenities: string[]): Record<string, boolean> => {
  const amenitiesObj: Record<string, boolean> = {};
  const allAmenities = [
    'ac', 'blanket', 'charging_ports', 'entertainment_system', 'meal_service',
    'pillow', 'reading_light', 'washroom', 'water_bottle', 'wifi'
  ];
  
  const amenityMap: Record<string, string> = {
    'AC': 'ac',
    'Blanket': 'blanket',
    'Charging Port': 'charging_ports',
    'Entertainment System': 'entertainment_system',
    'Meal Service': 'meal_service',
    'Pillow': 'pillow',
    'Reading Light': 'reading_light',
    'Washroom': 'washroom',
    'Water Bottle': 'water_bottle',
    'WiFi': 'wifi'
  };
  
  allAmenities.forEach(amenity => {
    const displayName = Object.keys(amenityMap).find(key => amenityMap[key] === amenity);
    amenitiesObj[amenity] = displayName ? selectedAmenities.includes(displayName) : false;
  });
  
  return amenitiesObj;
};

// Helper function to calculate total capacity
const calculateCapacity = (numRowsSleeper: number, numColsSleeper: number, numRowsNonSleeper: number, numColsNonSleeper: number): number => {
  return (numRowsSleeper * numColsSleeper) + (numRowsNonSleeper * numColsNonSleeper);
};

// Helper function to build terms & conditions with baggage/luggage prepended
const buildTermsConditions = (baggageAllowance: string, luggageAllowance: string, termsConditions: string): string => {
  const prefix = `Baggage Allowance: ${baggageAllowance}kg. Luggage Allowance: ${luggageAllowance}kg. `;
  return prefix + termsConditions;
};

// Helper function to format BusStations array from bus stops
const formatBusStations = (busStops: CityStopTime[], departureDate: string): { code: string; name: string; time: string }[] => {
  if (!busStops || busStops.length === 0) return [];
  
  // Only include stops that are marked as active (selected by user)
  return busStops
    .filter(stop => stop.active)
    .map(stop => {
      // Use the specific time set for this bus stop, or fallback to empty string
      const time = stop.time || '00:00';
      // Combine date and the stop's specific time for ISO timestamp
      const dateTimeStr = `${departureDate}T${time}:00Z`;
      
      return {
        code: stop.code || stop.name.substring(0, 4).toUpperCase(),
        name: stop.name,
        time: dateTimeStr
      };
    });
};

// Helper function to format stops array
const formatStops = (stops: Stop[]): { stop_order: number; station: Record<string, unknown>; price_to_destination: string; duration_to_destination: string }[] => {
  if (!stops || stops.length === 0) return [];
  
  return stops.map((stop, index) => ({
    stop_order: index + 1,
    station: {
      name: stop.station?.name || '',
      code: stop.station?.code || '',
      city: stop.station?.city || '',
      BusStations: formatBusStations(stop.bus_stops || [], stop.departure_date),
      state: stop.station?.state || ''
    },
    price_to_destination: stop.base_price || '0.00',
    duration_to_destination: '00:00:00' // TODO: Calculate based on times
  }));
};

// Main function to build bus service payload
const buildBusServicePayload = (formData: FormData): Record<string, unknown> => {
  const capacity = calculateCapacity(
    formData.num_rows_sleeper,
    formData.num_columns_sleeper,
    formData.num_rows_seater,
    formData.num_columns_seater
  );
  
  const termsConditions = buildTermsConditions(
    formData.baggage_allowance,
    formData.luggage_allowance,
    formData.terms_conditions
  );
  
  // Combine date and time for ISO timestamps
  const departureDateTime = `${formData.source_departure_date}T${formData.source_departure_time}:00Z`;
  const arrivalDateTime = `${formData.destination_arrival_date}T${formData.destination_arrival_time}:00Z`;
  
  return {
    route: {
      source: {
        name: formData.source?.name || '',
        code: formData.source?.code || '',
        city: formData.source?.city || '',
        BusStations: formatBusStations(formData.source_bus_stops, formData.source_departure_date),
        state: formData.source?.state || ''
      },
      destination: {
        name: formData.destination?.name || '',
        code: formData.destination?.code || '',
        city: formData.destination?.city || '',
        BusStations: formatBusStations(formData.destination_bus_stops, formData.destination_arrival_date),
        state: formData.destination?.state || ''
      },
      distance_km: 0, // This would need to be calculated or provided by user
      estimated_duration: '00:00:00', // This would need to be calculated
      stops: formatStops(formData.stops),
      source_pickup_points: {},
      destination_dropoff_points: {}
    },
    vehicle: {
      registration_no: formData.registration_no,
      model: formData.model,
      capacity: capacity,
      amenities: buildAmenitiesObject(formData.amenities),
      status: 'Active'
    },
    policy: {
      cancellation_window: formData.cancellation_window,
      cancellation_fee: formData.cancellation_fee,
      reschedule_allowed: formData.reschedule_allowed,
      reschedule_fee: formData.reschedule_fee,
      no_show_penalty: formData.no_show_penalty,
      terms_conditions: termsConditions,
      no_cancellation_fee_markup: formData.free_cancellation_price,
      no_reschedule_fee_markup: formData.free_reschedule_price
    },
    departure_time: departureDateTime,
    arrival_time: arrivalDateTime,
    status: 'Scheduled',
    bus_number: formData.bus_number,
    bus_travels_name: formData.travels_name,
    num_rows_sleeper: formData.num_rows_sleeper,
    num_columns_sleeper: formData.num_columns_sleeper,
    num_rows_non_sleeper: formData.num_rows_seater,
    num_columns_non_sleeper: formData.num_columns_seater,
    base_price: formData.seater_price, // base_price = non_sleeper_price
    sleeper_price: formData.sleeper_price,
    non_sleeper_price: formData.seater_price,
    dynamic_pricing_enabled: formData.dynamic_pricing_enabled,
    dynamic_factor: parseFloat(formData.dynamic_pricing_factor) || 0
  };
};

// Function to submit bus service to backend
const submitBusService = async (formData: FormData): Promise<{ success: boolean; message: string }> => {
  try {
    // Get auth token
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      return { success: false, message: 'Authentication required. Please login.' };
    }
    
    // Build payload
    const payload = buildBusServicePayload(formData);
    
    // Make API call
    const response = await fetch(`${API.BASE_URL}/services/bus-services/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Token ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create bus service.';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch {
        errorMessage = errorText || `Server error: ${response.status}`;
      }
      return { success: false, message: errorMessage };
    }
    
    await response.json();
    return { success: true, message: 'Bus service created successfully!' };
  } catch (error) {
    console.error('Error submitting bus service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: errorMessage };
  }
};

// Helper function to format stops for flight/train (no BusStations)
const formatStopsSimple = (stops: Stop[]): { stop_order: number; station: Record<string, unknown>; price_to_destination: string; duration_to_destination: string }[] => {
  if (!stops || stops.length === 0) return [];
  
  return stops.map((stop, index) => ({
    stop_order: index + 1,
    station: {
      name: stop.station?.name || '',
      code: stop.station?.code || '',
      city: stop.station?.city || '',
      BusStations: {},
      state: stop.station?.state || ''
    },
    price_to_destination: stop.base_price || '0.00',
    duration_to_destination: '00:00:00'
  }));
};

// Main function to build flight service payload
const buildFlightServicePayload = (formData: FormData): Record<string, unknown> => {
  const capacity = calculateCapacity(
    formData.num_rows_business,
    formData.num_columns_business,
    formData.num_rows_economy,
    formData.num_columns_economy
  ) + (formData.num_rows_premium * formData.num_columns_premium);
  
  const termsConditions = buildTermsConditions(
    formData.baggage_allowance,
    formData.luggage_allowance,
    formData.terms_conditions
  );
  
  const departureDateTime = `${formData.source_departure_date}T${formData.source_departure_time}:00Z`;
  const arrivalDateTime = `${formData.destination_arrival_date}T${formData.destination_arrival_time}:00Z`;
  
  return {
    route: {
      source: {
        name: formData.source?.name || '',
        code: formData.source?.code || '',
        city: formData.source?.city || '',
        BusStations: {},
        state: formData.source?.state || ''
      },
      destination: {
        name: formData.destination?.name || '',
        code: formData.destination?.code || '',
        city: formData.destination?.city || '',
        BusStations: {},
        state: formData.destination?.state || ''
      },
      distance_km: 0,
      estimated_duration: '00:00:00',
      stops: formatStopsSimple(formData.stops),
      source_pickup_points: {},
      destination_dropoff_points: {}
    },
    vehicle: {
      registration_no: formData.registration_no,
      model: formData.model,
      capacity: capacity,
      amenities: buildAmenitiesObject(formData.amenities),
      status: 'Active'
    },
    policy: {
      cancellation_window: formData.cancellation_window,
      cancellation_fee: formData.cancellation_fee,
      reschedule_allowed: formData.reschedule_allowed,
      reschedule_fee: formData.reschedule_fee,
      no_show_penalty: formData.no_show_penalty,
      terms_conditions: termsConditions,
      no_cancellation_fee_markup: formData.free_cancellation_price,
      no_reschedule_fee_markup: formData.free_reschedule_price
    },
    flight_number: formData.aircraft_number,
    airline_name: formData.airline_name,
    aircraft_model: formData.model,
    num_rows_business: formData.num_rows_business,
    num_columns_business: formData.num_columns_business,
    num_rows_premium: formData.num_rows_premium,
    num_columns_premium: formData.num_columns_premium,
    num_rows_economy: formData.num_rows_economy,
    num_columns_economy: formData.num_columns_economy,
    base_price: formData.economy_price,
    business_price: formData.business_price,
    premium_price: formData.premium_price,
    economy_price: formData.economy_price,
    dynamic_pricing_enabled: formData.dynamic_pricing_enabled,
    dynamic_factor: parseFloat(formData.dynamic_pricing_factor) || 0,
    departure_time: departureDateTime,
    arrival_time: arrivalDateTime,
    status: 'Scheduled'
  };
};

// Function to submit flight service to backend
const submitFlightService = async (formData: FormData): Promise<{ success: boolean; message: string }> => {
  try {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      return { success: false, message: 'Authentication required. Please login.' };
    }
    
    const payload = buildFlightServicePayload(formData);
    
    const response = await fetch(`${API.BASE_URL}/services/flight-services/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Token ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create flight service.';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch {
        errorMessage = errorText || `Server error: ${response.status}`;
      }
      return { success: false, message: errorMessage };
    }
    
    await response.json();
    return { success: true, message: 'Flight service created successfully!' };
  } catch (error) {
    console.error('Error submitting flight service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: errorMessage };
  }
};

// Main function to build train service payload
const buildTrainServicePayload = (formData: FormData): Record<string, unknown> => {
  // Calculate capacity from bogies configuration
  const capacity = Object.values(formData.bogies_config).reduce((total, bogie) => {
    return total + (bogie.count * bogie.seats_per_bogie);
  }, 0);
  
  const termsConditions = buildTermsConditions(
    formData.baggage_allowance,
    formData.luggage_allowance,
    formData.terms_conditions
  );
  
  const departureDateTime = `${formData.source_departure_date}T${formData.source_departure_time}:00Z`;
  const arrivalDateTime = `${formData.destination_arrival_date}T${formData.destination_arrival_time}:00Z`;
  
  // Build bogies_config object
  const bogiesConfig: Record<string, { count: number; seats_per_bogie: number }> = {};
  Object.entries(formData.bogies_config).forEach(([key, value]) => {
    bogiesConfig[key] = {
      count: value.count,
      seats_per_bogie: value.seats_per_bogie
    };
  });
  
  return {
    route: {
      source: {
        name: formData.source?.name || '',
        code: formData.source?.code || '',
        city: formData.source?.city || '',
        BusStations: {},
        state: formData.source?.state || ''
      },
      destination: {
        name: formData.destination?.name || '',
        code: formData.destination?.code || '',
        city: formData.destination?.city || '',
        BusStations: {},
        state: formData.destination?.state || ''
      },
      distance_km: 0,
      estimated_duration: '00:00:00',
      stops: formatStopsSimple(formData.stops),
      source_pickup_points: {},
      destination_dropoff_points: {}
    },
    vehicle: {
      registration_no: formData.registration_no,
      model: formData.model,
      capacity: capacity,
      amenities: buildAmenitiesObject(formData.amenities),
      status: 'Active'
    },
    policy: {
      cancellation_window: formData.cancellation_window,
      cancellation_fee: formData.cancellation_fee,
      reschedule_allowed: formData.reschedule_allowed,
      reschedule_fee: formData.reschedule_fee,
      no_show_penalty: formData.no_show_penalty,
      terms_conditions: termsConditions,
      no_cancellation_fee_markup: formData.free_cancellation_price,
      no_reschedule_fee_markup: formData.free_reschedule_price
    },
    train_name: formData.train_service_name,
    train_number: formData.train_number,
    bogies_config: bogiesConfig,
    base_price: formData.third_ac_price,
    sleeper_price: formData.sleeper_price,
    second_ac_price: formData.second_ac_price,
    third_ac_price: formData.third_ac_price,
    dynamic_pricing_enabled: formData.dynamic_pricing_enabled,
    dynamic_factor: parseFloat(formData.dynamic_pricing_factor) || 0,
    departure_time: departureDateTime,
    arrival_time: arrivalDateTime,
    status: 'Scheduled'
  };
};

// Function to submit train service to backend
const submitTrainService = async (formData: FormData): Promise<{ success: boolean; message: string }> => {
  try {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      return { success: false, message: 'Authentication required. Please login.' };
    }
    
    const payload = buildTrainServicePayload(formData);
    
    const response = await fetch(`${API.BASE_URL}/services/train-services/`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Authorization': `Token ${auth.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to create train service.';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch {
        errorMessage = errorText || `Server error: ${response.status}`;
      }
      return { success: false, message: errorMessage };
    }
    
    await response.json();
    return { success: true, message: 'Train service created successfully!' };
  } catch (error) {
    console.error('Error submitting train service:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { success: false, message: errorMessage };
  }
};

// Comprehensive form validation function
const validateFormData = (formData: FormData, serviceType: ServiceType): { isValid: boolean; message: string } => {
  // Route validation
  if (!formData.source || !formData.destination) {
    return { isValid: false, message: 'Please select both source and destination stations.' };
  }
  if (!formData.source_departure_date || !formData.source_departure_time) {
    return { isValid: false, message: 'Please select source departure date and time.' };
  }
  if (!formData.destination_arrival_date || !formData.destination_arrival_time) {
    return { isValid: false, message: 'Please select destination arrival date and time.' };
  }

  // Vehicle validation
  if (!formData.registration_no || !formData.model) {
    return { isValid: false, message: 'Please fill in vehicle registration number and model.' };
  }
  if (formData.amenities.length === 0) {
    return { isValid: false, message: 'Please select at least one amenity.' };
  }

  // Service-specific validation
  if (serviceType === 'bus') {
    if (!formData.travels_name || !formData.bus_number) {
      return { isValid: false, message: 'Please fill in bus travels name and bus number.' };
    }
    if (!formData.sleeper_price || !formData.seater_price) {
      return { isValid: false, message: 'Please fill in all bus class prices.' };
    }
    if (formData.num_rows_sleeper === 0 || formData.num_columns_sleeper === 0 || 
        formData.num_rows_seater === 0 || formData.num_columns_seater === 0) {
      return { isValid: false, message: 'Please configure bus seat layout (rows and columns must be greater than 0).' };
    }
  } else if (serviceType === 'flight') {
    if (!formData.airline_name || !formData.aircraft_number) {
      return { isValid: false, message: 'Please fill in airline name and aircraft number.' };
    }
    if (!formData.economy_price || !formData.business_price) {
      return { isValid: false, message: 'Please fill in all flight class prices (Economy and Business are required).' };
    }
    if (formData.num_rows_economy === 0 || formData.num_columns_economy === 0 || 
        formData.num_rows_business === 0 || formData.num_columns_business === 0) {
      return { isValid: false, message: 'Please configure flight seat layout (Economy and Business rows/columns must be greater than 0).' };
    }
  } else if (serviceType === 'train') {
    if (!formData.train_service_name || !formData.train_number) {
      return { isValid: false, message: 'Please fill in train service name and train number.' };
    }
    if (!formData.sleeper_price || !formData.second_ac_price || !formData.third_ac_price) {
      return { isValid: false, message: 'Please fill in all train class prices.' };
    }
    const hasValidBogie = Object.values(formData.bogies_config).some(
      bogie => bogie.count > 0 && bogie.seats_per_bogie > 0
    );
    if (!hasValidBogie) {
      return { isValid: false, message: 'Please configure at least one bogie type with count and seats greater than 0.' };
    }
  }

  // Policy validation
  if (formData.cancellation_window === 0) {
    return { isValid: false, message: 'Please set a cancellation window (hours).' };
  }
  if (!formData.cancellation_fee || !formData.no_show_penalty) {
    return { isValid: false, message: 'Please fill in cancellation fee and no-show penalty.' };
  }
  if (!formData.free_cancellation_price) {
    return { isValid: false, message: 'Please fill in free cancellation price.' };
  }
  if (formData.reschedule_allowed && (!formData.reschedule_fee || !formData.free_reschedule_price)) {
    return { isValid: false, message: 'Please fill in reschedule fee and free reschedule price (reschedule is enabled).' };
  }
  if (!formData.baggage_allowance || !formData.luggage_allowance) {
    return { isValid: false, message: 'Please fill in baggage and luggage allowance.' };
  }
  if (!formData.terms_conditions || formData.terms_conditions.trim() === '') {
    return { isValid: false, message: 'Please fill in terms and conditions.' };
  }

  // Dynamic pricing validation
  if (formData.dynamic_pricing_enabled && (!formData.dynamic_pricing_factor || parseFloat(formData.dynamic_pricing_factor) === 0)) {
    return { isValid: false, message: 'Please set a dynamic pricing factor (must be between 0 and 1).' };
  }

  return { isValid: true, message: '' };
};

interface EditServiceFormProps {
  service: ServiceItem;
  onClose?: () => void;
  onSubmit?: () => void;
  isDarkMode?: boolean;
}

const EditServiceForm = ({ service, onClose, onSubmit, isDarkMode = true }: EditServiceFormProps) => {
  // Auto-detect service type from the service object (read-only, no toggle)
  const serviceType: ServiceType = (() => {
    if ('flight_number' in service && service.flight_number) return 'flight';
    if ('train_number' in service && service.train_number) return 'train';
    if ('bus_number' in service && service.bus_number) return 'bus';
    return 'flight'; // fallback
  })();
  
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'route' | 'vehicle' | 'policy'>('route');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store original values for conditional validation
  const [originalValues, setOriginalValues] = useState<{
    baggage_allowance: string;
    luggage_allowance: string;
    cancellation_window: number;
    cancellation_fee: string;
    reschedule_fee: string;
    terms_conditions: string;
  }>({
    baggage_allowance: '',
    luggage_allowance: '',
    cancellation_window: 0,
    cancellation_fee: '',
    reschedule_fee: '',
    terms_conditions: ''
  });
  
  // Refs for field navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleEnterNav = (currentField: string, nextField: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputRefs.current[nextField]) {
        inputRefs.current[nextField]?.focus();
      }
    }
  };

  const [formData, setFormData] = useState<FormData>({
    source: null,
    source_departure_date: '',
    source_departure_time: '',
    source_bus_stops: [],
    stops: [],
    destination: null,
    destination_arrival_date: '',
    destination_arrival_time: '',
    destination_bus_stops: [],
    sleeper_price: '',
    second_ac_price: '',
    third_ac_price: '',
    seater_price: '',
    economy_price: '',
    premium_price: '',
    business_price: '',
    registration_no: '',
    model: '',
    amenities: [],
    travels_name: '',
    bus_number: '',
    train_service_name: '',
    train_number: '',
    airline_name: '',
    aircraft_number: '',
    num_rows_sleeper: 0,
    num_columns_sleeper: 0,
    num_rows_seater: 0,
    num_columns_seater: 0,
    num_rows_economy: 0,
    num_columns_economy: 0,
    num_rows_premium: 0,
    num_columns_premium: 0,
    num_rows_business: 0,
    num_columns_business: 0,
    bogies_config: {
      sleeper: { count: 0, seats_per_bogie: 0 },
      second_ac: { count: 0, seats_per_bogie: 0 },
      third_ac: { count: 0, seats_per_bogie: 0 },
    },
    cancellation_window: 24,
    cancellation_fee: '',
    free_cancellation_price: '',
    reschedule_allowed: true,
    reschedule_fee: '',
    free_reschedule_price: '',
    no_show_penalty: '',
    baggage_allowance: '',
    luggage_allowance: '',
    terms_conditions: '',
    dynamic_pricing_enabled: false,
    dynamic_pricing_factor: '0',
  });

  // Fetch and populate service details on mount
  useEffect(() => {
    const fetchAndPopulateServiceDetails = async () => {
      if (!service.service_id) {
        setAlert({ type: 'error', message: 'Service ID is required' });
        setLoading(false);
        return;
      }

      const auth = getAuthFromStorage();
      if (!auth || !auth.token) {
        setAlert({ type: 'error', message: 'Please log in to edit services' });
        setLoading(false);
        return;
      }

      setLoading(true);
      setAlert(null);

      try {
        let details: any;
        
        // Fetch service details based on type
        if (serviceType === 'flight') {
          details = await getFlightServiceDetails(service.service_id, auth.token);
        } else if (serviceType === 'train') {
          details = await getTrainServiceDetails(service.service_id, auth.token);
        } else if (serviceType === 'bus') {
          details = await getBusServiceDetails(service.service_id, auth.token);
        }

        console.log('[EditServiceForm] Service details fetched:', details);

        // Helper function to find station by code
        const findStation = (code: string): Station | null => {
          const stations = serviceType === 'flight' ? FLIGHT_STATIONS : 
                          serviceType === 'train' ? TRAIN_STATIONS : 
                          BUS_STATIONS;
          return stations.find(s => s.code === code) || null;
        };

        // Helper function to parse datetime string to date and time
        const parseDateTime = (dateTimeStr: string): { date: string; time: string } => {
          console.log('Parsing dateTimeStr:', dateTimeStr);
          if (!dateTimeStr) return { date: '', time: '' };
          try {
            // Force UTC formatting
            const date = formatInTimeZone(dateTimeStr, 'UTC', 'yyyy-MM-dd');
            const time = formatInTimeZone(dateTimeStr, 'UTC', 'HH:mm');
            console.log('Parsed date (UTC): %s, time (UTC): %s', date, time);
            return { date, time };
          } catch {
            return { date: '', time: '' };
          }
        };

        const parseDurationToMillis = (duration?: string): number => {
          if (!duration) return 0;
          const parts = duration.split(':').map(Number);
          if (parts.length !== 3 || parts.some(isNaN)) return 0;
          const [hours, minutes, seconds] = parts;
          return ((hours * 60 + minutes) * 60 + seconds) * 1000;
        };

        // Helper function to initialize bus stops from station
        const initBusStopsFromStation = (station: Station | null): CityStopTime[] => {
          if (!station || !station.points) return [];
          return station.points.map(point => ({
            code: point.code,
            name: point.name,
            active: false,
            time: ''
          }));
        };

        // Helper function to populate bus stops from API data
        const populateBusStops = (station: Station | null, busStations: any[]): CityStopTime[] => {
          const initialized = initBusStopsFromStation(station);
          if (!busStations || busStations.length === 0) return initialized;
          
          return initialized.map(stop => {
            const apiStop = busStations.find((bs: any) => bs.code === stop.code);
            if (apiStop) {
              const { time } = parseDateTime(apiStop.time);
              return { ...stop, active: true, time };
            }
            return stop;
          });
        };

        // Parse route data
        const source = findStation(details.route?.source?.code || '');
        const destination = findStation(details.route?.destination?.code || '');
        const sourceDT = parseDateTime(details.departure_time);
        const destDT = parseDateTime(details.arrival_time);

        // Parse amenities
        const amenitiesMap: Record<string, string> = {
          'ac': 'AC',
          'blanket': 'Blanket',
          'charging_ports': 'Charging Port',
          'entertainment_system': 'Entertainment System',
          'meal_service': 'Meal Service',
          'pillow': 'Pillow',
          'reading_light': 'Reading Light',
          'washroom': 'Washroom',
          'water_bottle': 'Water Bottle',
          'wifi': 'WiFi'
        };
        const selectedAmenities = Object.entries(details.vehicle?.amenities || {})
          .filter(([_, value]) => value === true)
          .map(([key, _]) => amenitiesMap[key] || key);

        // Parse stops
        const arrivalMillis = new Date(details.arrival_time || '').getTime();
        const routeStops: any[] = details.route?.stops || [];
        const intermediateStops = routeStops.length > 2 ? routeStops.slice(1, -1) : [];

        const parsedStops: Stop[] = intermediateStops.map((stop: any) => {
          const stopStation = findStation(stop.station?.code || '');
          const stopDT = stop.departure_time
            ? parseDateTime(stop.departure_time)
            : (() => {
                if (!Number.isFinite(arrivalMillis)) return { date: '', time: '' };
                const durationMillis = parseDurationToMillis(stop.duration_to_destination);
                if (!durationMillis) return { date: '', time: '' };
                const stopTime = new Date(arrivalMillis - durationMillis);
                return parseDateTime(stopTime.toISOString());
              })();
          const busStops = serviceType === 'bus' ? populateBusStops(stopStation, stop.station?.BusStations || []) : [];

          return {
            station: stopStation,
            departure_date: stopDT.date,
            departure_time: stopDT.time,
            base_price: stop.price_to_destination || '',
            bus_stops: busStops
          };
        });

        // Parse terms and conditions to extract baggage/luggage
        let baggage = '';
        let luggage = '';
        let terms = details.policy?.terms_conditions || '';
        
        // Try to parse "Baggage Allowance: Xkg. Luggage Allowance: Ykg. " prefix
        const match = terms.match(/^Baggage Allowance: ([\d.]+)kg\. Luggage Allowance: ([\d.]+)kg\. /);
        if (match) {
          baggage = match[1];
          luggage = match[2];
          terms = terms.substring(match[0].length);
        }

        // Build the populated form data
        const populated: FormData = {
          // Route
          source,
          source_departure_date: sourceDT.date,
          source_departure_time: sourceDT.time,
          source_bus_stops: serviceType === 'bus' ? populateBusStops(source, details.route?.source?.BusStations || []) : [],
          stops: parsedStops,
          destination,
          destination_arrival_date: destDT.date,
          destination_arrival_time: destDT.time,
          destination_bus_stops: serviceType === 'bus' ? populateBusStops(destination, details.route?.destination?.BusStations || []) : [],

          // Pricing
          sleeper_price: String(details.sleeper_price || details.base_sleeper_price || ''),
          second_ac_price: String(details.second_ac_price || ''),
          third_ac_price: String(details.third_ac_price || details.base_price || ''),
          seater_price: String(details.non_sleeper_price || details.base_price || ''),
          economy_price: String(details.economy_price || details.base_price || ''),
          premium_price: String(details.premium_price || ''),
          business_price: String(details.business_price || ''),

          // Vehicle
          registration_no: details.vehicle?.registration_no || '',
          model: details.vehicle?.model || details.aircraft_model || '',
          amenities: selectedAmenities,
          
          // Service specific
          travels_name: details.bus_travels_name || '',
          bus_number: details.bus_number || '',
          train_service_name: details.train_name || '',
          train_number: details.train_number || '',
          airline_name: details.airline_name || '',
          aircraft_number: details.flight_number || '',

          // Seat/Bogie configuration
          num_rows_sleeper: details.num_rows_sleeper || 0,
          num_columns_sleeper: details.num_columns_sleeper || 0,
          num_rows_seater: details.num_rows_non_sleeper || 0,
          num_columns_seater: details.num_columns_non_sleeper || 0,
          num_rows_economy: details.num_rows_economy || 0,
          num_columns_economy: details.num_columns_economy || 0,
          num_rows_premium: details.num_rows_premium || 0,
          num_columns_premium: details.num_columns_premium || 0,
          num_rows_business: details.num_rows_business || 0,
          num_columns_business: details.num_columns_business || 0,

          // Train bogie config
          bogies_config: {
            sleeper: details.bogies_config?.sleeper || { count: 0, seats_per_bogie: 0 },
            second_ac: details.bogies_config?.second_ac || { count: 0, seats_per_bogie: 0 },
            third_ac: details.bogies_config?.third_ac || { count: 0, seats_per_bogie: 0 },
          },

          // Policy
          cancellation_window: details.policy?.cancellation_window || 24,
          cancellation_fee: String(details.policy?.cancellation_fee || ''),
          free_cancellation_price: String(details.policy?.no_cancellation_fee_markup || ''),
          reschedule_allowed: details.policy?.reschedule_allowed !== false,
          reschedule_fee: String(details.policy?.reschedule_fee || ''),
          free_reschedule_price: String(details.policy?.no_reschedule_fee_markup || ''),
          no_show_penalty: String(details.policy?.no_show_penalty || ''),
          baggage_allowance: baggage,
          luggage_allowance: luggage,
          terms_conditions: terms,

          // Dynamic Pricing
          dynamic_pricing_enabled: details.dynamic_pricing_enabled || false,
          dynamic_pricing_factor: String(details.dynamic_factor || '0'),
        };

        console.log('[EditServiceForm] Populated form data:', populated);
        setFormData(populated);
        
        // Store original values for conditional validation
        setOriginalValues({
          baggage_allowance: baggage,
          luggage_allowance: luggage,
          cancellation_window: details.policy?.cancellation_window || 24,
          cancellation_fee: String(details.policy?.cancellation_fee || ''),
          reschedule_fee: String(details.policy?.reschedule_fee || ''),
          terms_conditions: terms
        });
        
        setLoading(false);
      } catch (err) {
        console.error('[EditServiceForm] Error fetching service details:', err);
        setAlert({ 
          type: 'error', 
          message: err instanceof Error ? err.message : 'Failed to fetch service details'
        });
        setLoading(false);
      }
    };

    fetchAndPopulateServiceDetails();
  }, [service.service_id, serviceType]);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const getStations = () => {
    switch (serviceType) {
      case 'train': return TRAIN_STATIONS;
      case 'flight': return FLIGHT_STATIONS;
      case 'bus': return BUS_STATIONS;
    }
  };

  const addStop = () => {
    if (formData.stops.length < 8) {
      setFormData({
        ...formData,
        stops: [...formData.stops, { 
          station: null, 
          departure_date: '', 
          departure_time: '', 
          base_price: '',
          bus_stops: [] 
        }]
      });
    }
  };

  const removeStop = (index: number) => {
    setFormData({
      ...formData,
      stops: formData.stops.filter((_, i) => i !== index)
    });
  };

  const updateStop = (index: number, field: keyof Stop, value: string | Station | null) => {
    const newStops = [...formData.stops];
    
    // If updating station for bus service, initialize bus stops
    if (field === 'station' && serviceType === 'bus' && value && typeof value === 'object') {
      newStops[index] = { 
        ...newStops[index], 
        [field]: value,
        bus_stops: initializeBusStops(value as Station)
      };
    } else {
      newStops[index] = { ...newStops[index], [field]: value };
    }
    
    setFormData({ ...formData, stops: newStops });
  };

  // Bus stop management for intermediate stops
  const toggleIntermediateBusStop = (stopIndex: number, busStopCode: string) => {
    const newStops = [...formData.stops];
    const busStops = newStops[stopIndex].bus_stops || [];
    const busStopIndex = busStops.findIndex(s => s.code === busStopCode);
    
    if (busStopIndex !== -1) {
      busStops[busStopIndex] = { ...busStops[busStopIndex], active: !busStops[busStopIndex].active };
      newStops[stopIndex] = { ...newStops[stopIndex], bus_stops: busStops };
      setFormData({ ...formData, stops: newStops });
    }
  };

  const updateIntermediateBusStopTime = (stopIndex: number, busStopCode: string, time: string) => {
    const newStops = [...formData.stops];
    const busStops = newStops[stopIndex].bus_stops || [];
    const busStopIndex = busStops.findIndex(s => s.code === busStopCode);
    
    if (busStopIndex !== -1) {
      busStops[busStopIndex] = { ...busStops[busStopIndex], time };
      newStops[stopIndex] = { ...newStops[stopIndex], bus_stops: busStops };
      setFormData({ ...formData, stops: newStops });
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.includes(amenity)
        ? formData.amenities.filter(a => a !== amenity)
        : [...formData.amenities, amenity]
    });
  };

  // Bus stop management functions
  const initializeBusStops = (station: Station | null): CityStopTime[] => {
    if (!station || !station.points) return [];
    return station.points.map(point => ({
      code: point.code,
      name: point.name,
      active: false,
      time: ''
    }));
  };

  const toggleBusStop = (type: 'source' | 'destination', stopCode: string) => {
    const field = type === 'source' ? 'source_bus_stops' : 'destination_bus_stops';
    const stops = [...formData[field]];
    const index = stops.findIndex(s => s.code === stopCode);
    if (index !== -1) {
      stops[index] = { ...stops[index], active: !stops[index].active };
      setFormData({ ...formData, [field]: stops });
    }
  };

  const updateBusStopTime = (type: 'source' | 'destination', stopCode: string, time: string) => {
    const field = type === 'source' ? 'source_bus_stops' : 'destination_bus_stops';
    const stops = [...formData[field]];
    const index = stops.findIndex(s => s.code === stopCode);
    if (index !== -1) {
      stops[index] = { ...stops[index], time };
      setFormData({ ...formData, [field]: stops });
    }
  };

  const handleSubmit = async () => {
    // Validate only editable fields (pricing, amenities, policies)
    
    // Pricing validation
    if (serviceType === 'bus') {
      if (!formData.seater_price || parseFloat(formData.seater_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Seater price.' });
        return;
      }
      if (!formData.sleeper_price || parseFloat(formData.sleeper_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Sleeper price.' });
        return;
      }
    } else if (serviceType === 'flight') {
      if (!formData.economy_price || parseFloat(formData.economy_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Economy price.' });
        return;
      }
      if (!formData.premium_price || parseFloat(formData.premium_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Premium price.' });
        return;
      }
      if (!formData.business_price || parseFloat(formData.business_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Business price.' });
        return;
      }
    } else if (serviceType === 'train') {
      if (!formData.sleeper_price || parseFloat(formData.sleeper_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter Sleeper price.' });
        return;
      }
      if (!formData.second_ac_price || parseFloat(formData.second_ac_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter 2nd AC price.' });
        return;
      }
      if (!formData.third_ac_price || parseFloat(formData.third_ac_price) === 0) {
        setAlert({ type: 'error', message: 'Please enter 3rd AC price.' });
        return;
      }
    }

    // Amenities validation
    if (formData.amenities.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one amenity.' });
      return;
    }

    // Policy validation with conditional rules
    // Baggage/luggage allowance can only increase
    if (parseFloat(formData.baggage_allowance) < parseFloat(originalValues.baggage_allowance)) {
      setAlert({ type: 'error', message: `Baggage allowance cannot be decreased below ${originalValues.baggage_allowance}kg.` });
      return;
    }
    if (parseFloat(formData.luggage_allowance) < parseFloat(originalValues.luggage_allowance)) {
      setAlert({ type: 'error', message: `Luggage allowance cannot be decreased below ${originalValues.luggage_allowance}kg.` });
      return;
    }

    // Cancellation window can only increase
    if (formData.cancellation_window < originalValues.cancellation_window) {
      setAlert({ type: 'error', message: `Cancellation window cannot be decreased below ${originalValues.cancellation_window} hours.` });
      return;
    }

    // Cancellation/reschedule fees can only decrease
    if (parseFloat(formData.cancellation_fee) > parseFloat(originalValues.cancellation_fee)) {
      setAlert({ type: 'error', message: `Cancellation fee cannot be increased above ₹${originalValues.cancellation_fee}.` });
      return;
    }
    if (formData.reschedule_allowed && parseFloat(formData.reschedule_fee) > parseFloat(originalValues.reschedule_fee)) {
      setAlert({ type: 'error', message: `Reschedule fee cannot be increased above ₹${originalValues.reschedule_fee}.` });
      return;
    }

    // Terms can only be appended to, not modified
    if (!formData.terms_conditions.startsWith(originalValues.terms_conditions)) {
      setAlert({ type: 'error', message: 'You can only append to the existing terms and conditions, not modify them.' });
      return;
    }

    // Standard policy validations
    if (!formData.cancellation_fee || !formData.no_show_penalty) {
      setAlert({ type: 'error', message: 'Please enter cancellation fee and no-show penalty.' });
      return;
    }
    if (!formData.free_cancellation_price) {
      setAlert({ type: 'error', message: 'Please enter free cancellation price.' });
      return;
    }
    if (formData.reschedule_allowed && !formData.reschedule_fee) {
      setAlert({ type: 'error', message: 'Please enter reschedule fee.' });
      return;
    }
    if (formData.reschedule_allowed && !formData.free_reschedule_price) {
      setAlert({ type: 'error', message: 'Please enter free reschedule price.' });
      return;
    }
    if (!formData.baggage_allowance || !formData.luggage_allowance) {
      setAlert({ type: 'error', message: 'Please enter baggage and luggage allowance.' });
      return;
    }
    if (!formData.terms_conditions || formData.terms_conditions.trim() === '') {
      setAlert({ type: 'error', message: 'Please enter terms and conditions.' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);

    try {
      // Get auth token
      const auth = getAuthFromStorage();
      if (!auth || !auth.token) {
        setAlert({ type: 'error', message: 'Authentication required. Please login.' });
        setIsSubmitting(false);
        return;
      }

      // Call UPDATE APIs with PUT request
      const baseUrl = 'http://127.0.0.1:8000/services';
      let endpoint = '';
      let payload: Record<string, unknown> = {};

      if (serviceType === 'bus') {
        endpoint = `${baseUrl}/bus-services/${service.service_id}/`;
        payload = buildBusServicePayload(formData);
      } else if (serviceType === 'flight') {
        endpoint = `${baseUrl}/flight-services/${service.service_id}/`;
        payload = buildFlightServicePayload(formData);
      } else if (serviceType === 'train') {
        endpoint = `${baseUrl}/train-services/${service.service_id}/`;
        payload = buildTrainServicePayload(formData);
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${auth.token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Update failed (${response.status}): ${errorText || response.statusText}`);
      }

      setAlert({ type: 'success', message: 'Service updated successfully!' });
      // Call onSubmit callback to refresh data
      if (onSubmit) onSubmit();
      // Close modal after success
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      setAlert({ type: 'error', message: error instanceof Error ? error.message : 'An unexpected error occurred while updating the service.' });
      console.error('Update error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Station Dropdown
  const StationDropdown = ({
    value,
    onChange,
    placeholder = "Select station",
    label,
    required = false
  }: {
    value: Station | null;
    onChange: (station: Station | null) => void;
    placeholder?: string;
    label: string;
    required?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const anchorRef = useRef<HTMLDivElement>(null);
    const [menuRect, setMenuRect] = useState<{ left: number; top: number; width: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const stations = getStations();
    const filteredStations = stations.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      (s.state && s.state.toLowerCase().includes(search.toLowerCase()))
    );

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const t = event.target as Node;
        if (dropdownRef.current?.contains(t) || menuRef.current?.contains(t)) return;
        setIsOpen(false);
      };
      if (isOpen) document.addEventListener('mousedown', handleClickOutside, true);
      return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [isOpen]);

    useEffect(() => {
      if (!isOpen) return;
      const update = () => {
        const el = anchorRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setMenuRect({ left: r.left, top: r.bottom + 8, width: r.width });
      };
      update();
      window.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);
      return () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
      };
    }, [isOpen]);

    return (
      <div className="space-y-2" ref={dropdownRef}>
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
          {label} {required && <span className="text-rose-600 dark:text-rose-400">*</span>}
        </label>
        <div className="relative" ref={anchorRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-xl transition-all duration-200 text-sm font-medium flex items-center justify-between hover:border-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
                       dark:bg-slate-900/80 dark:border-slate-800 dark:hover:border-slate-700 dark:focus:border-blue-500 dark:focus:ring-blue-500/20 dark:text-white`}
          >
            {value ? (
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-300 font-bold text-xs text-blue-700
                                dark:bg-slate-800/80 dark:border-slate-700 dark:text-blue-400">
                  {value.code}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate dark:text-white">{value.name}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">{value.city}, {value.state}</div>
                </div>
              </div>
            ) : (
              <span className="text-gray-500 dark:text-slate-500">{placeholder}</span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && menuRect && createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", left: menuRect.left, top: menuRect.top, width: menuRect.width, zIndex: 9999 }}
              className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200
                         dark:bg-slate-900 dark:border-slate-800"
            >
              <div className="p-3 border-b border-gray-200 dark:border-slate-800">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search stations..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20
                             dark:bg-slate-800/80 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto">
                {filteredStations.map((station, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={() => { onChange(station); setSearch(''); setIsOpen(false); }}
                    className="w-full px-4 py-3 transition-all flex items-center gap-3 border-b border-gray-100 last:border-0 hover:bg-gray-50
                               dark:border-slate-800/50 dark:hover:bg-slate-800/50"
                  >
                    <div className="px-2.5 py-1 rounded-lg font-bold text-xs bg-gray-100 border border-gray-300 text-blue-700
                                    dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400">
                      {station.code}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate dark:text-white">{station.name}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-500">{station.city}, {station.state}</div>
                    </div>
                    {value?.code === station.code && <Check className="w-4 h-4 text-blue-600 dark:text-blue-500 flex-shrink-0" />}
                  </button>
                ))}
                {filteredStations.length === 0 && (
                  <div className="text-gray-500 dark:text-slate-500 px-4 py-8 text-center text-sm">
                    No stations found
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>
    );
  };

  // iOS-Style Spinning Wheel Time Picker
  const SpinningTimePicker = ({
    value,
    onChange,
    onClose
  }: {
    value: string;
    onChange: (time: string) => void;
    onClose: () => void;
  }) => {
    const initialHour = value ? parseInt(value.split(':')[0]) : 0;
    const initialMinute = value ? parseInt(value.split(':')[1]) : 0;
    
    const [selectedHour, setSelectedHour] = useState(initialHour);
    const [selectedMinute, setSelectedMinute] = useState(initialMinute);
    const [hourScroll, setHourScroll] = useState(0);
    const [minuteScroll, setMinuteScroll] = useState(0);
    
    const hourRef = useRef<HTMLDivElement>(null);
    const minuteRef = useRef<HTMLDivElement>(null);
    const isAdjustingRef = useRef(false);
    const lastScrollTimeRef = useRef(0);

    const hourOptions = Array.from({ length: 24 }, (_, i) => i);
    const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5);
    
    // Create extended arrays for infinite scroll - 3 full copies
    const extendedHours = [...hourOptions, ...hourOptions, ...hourOptions];
    const extendedMinutes = [...minuteOptions, ...minuteOptions, ...minuteOptions];

    useEffect(() => {
      // Start in the middle copy - set instantly without animation
      // We need to calculate scroll position so the item is CENTERED in the selection bar
      // For an item to be centered: scrollTop = (itemIndex * itemHeight) - centerOffset
      // where centerOffset = (containerHeight / 2) - (itemHeight / 2) = 90px
      const itemHeight = 45;
      const centerOffset = 90; // (225 / 2) - (45 / 2)
      
      if (hourRef.current) {
        // Position the initial hour in the middle copy AND centered in viewport
        const itemIndexInExtendedArray = initialHour + 24; // Middle copy
        const scrollPos = (itemIndexInExtendedArray * itemHeight) - centerOffset;
        hourRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll for initial set
        hourRef.current.scrollTop = scrollPos;
        setHourScroll(scrollPos);
        setTimeout(() => {
          if (hourRef.current) {
            hourRef.current.style.scrollBehavior = ''; // Re-enable smooth scroll
          }
        }, 0);
      }
      if (minuteRef.current) {
        const minuteIndex = minuteOptions.indexOf(initialMinute);
        const actualMinuteIndex = minuteIndex >= 0 ? minuteIndex : 0;
        // Position the initial minute in the middle copy AND centered in viewport
        const itemIndexInExtendedArray = actualMinuteIndex + 12; // Middle copy
        const scrollPos = (itemIndexInExtendedArray * itemHeight) - centerOffset;
        minuteRef.current.style.scrollBehavior = 'auto'; // Disable smooth scroll for initial set
        minuteRef.current.scrollTop = scrollPos;
        setMinuteScroll(scrollPos);
        setTimeout(() => {
          if (minuteRef.current) {
            minuteRef.current.style.scrollBehavior = ''; // Re-enable smooth scroll
          }
        }, 0);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleScroll = (
      ref: React.RefObject<HTMLDivElement | null>, 
      options: number[], 
      setter: (val: number) => void,
      scrollSetter: (val: number) => void
    ) => {
      if (!ref.current || isAdjustingRef.current) return;
      
      // Throttle scroll updates to reduce speed sensitivity
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 32) return; // Reduced to ~30fps for smoother feel
      lastScrollTimeRef.current = now;
      
      const scrollTop = ref.current.scrollTop;
      const itemHeight = 45;
      const containerHeight = 225;
      const itemCount = options.length;
      
      // Update scroll state
      scrollSetter(scrollTop);
      
      // The center of the visible container is at scrollTop + (containerHeight / 2)
      // We want to find which item's CENTER aligns with this position
      // Item center position = (itemIndex * itemHeight) + (itemHeight / 2)
      // So: scrollTop + (containerHeight / 2) = (itemIndex * itemHeight) + (itemHeight / 2)
      // Solving: itemIndex = (scrollTop + containerHeight/2 - itemHeight/2) / itemHeight
      const centerOffset = (containerHeight / 2) - (itemHeight / 2); // 90px for our values
      const centeredItemIndex = Math.round((scrollTop + centerOffset) / itemHeight);
      const actualIndex = centeredItemIndex % itemCount;
      setter(options[actualIndex]);
      
      // Check if we need to reposition (near top or bottom of extended list)
      const minSafeIndex = itemCount * 0.5; // First half of first copy
      const maxSafeIndex = itemCount * 2.5; // Last half of third copy
      
      if (centeredItemIndex < minSafeIndex) {
        // Too close to top - jump to equivalent position in middle copy
        isAdjustingRef.current = true;
        const newScrollTop = scrollTop + (itemCount * itemHeight);
        ref.current.scrollTop = newScrollTop;
        scrollSetter(newScrollTop);
        setTimeout(() => { isAdjustingRef.current = false; }, 50);
      } else if (centeredItemIndex > maxSafeIndex) {
        // Too close to bottom - jump to equivalent position in middle copy
        isAdjustingRef.current = true;
        const newScrollTop = scrollTop - (itemCount * itemHeight);
        ref.current.scrollTop = newScrollTop;
        scrollSetter(newScrollTop);
        setTimeout(() => { isAdjustingRef.current = false; }, 50);
      }
    };

    const getItemStyle = (scrollTop: number, index: number) => {
      const itemHeight = 45;
      const containerHeight = 225;
      
      // Calculate the scroll position of the item's center
      const itemCenterPosition = index * itemHeight + (itemHeight / 2);
      
      // Calculate the scroll position of the visible center of the container
      const visibleCenterPosition = scrollTop + (containerHeight / 2);
      
      // Calculate distance from the visible center (in number of items)
      const distance = Math.abs(visibleCenterPosition - itemCenterPosition) / itemHeight;
      
      // The closer to center (distance = 0), the larger the font
      const fontSize = Math.max(18, 29 - distance * 5.5);
      const fontWeight = distance < 0.5 ? 800 : 600;
      
      return { 
        fontSize: `${fontSize}px`, 
        fontWeight
      };
    };

    const handleConfirm = () => {
      const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
      onChange(timeString);
      onClose();
    };

    return (
      <div className="w-72 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl">
        
        <div className="relative h-[225px] overflow-hidden rounded-xl bg-gradient-to-b from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-800/50">
          
          {/* Center selection bar */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[45px] bg-white dark:bg-slate-700 border-y-2 border-gray-400 dark:border-slate-500 pointer-events-none z-10 shadow-lg" />
          
          <div className="flex items-center justify-center gap-6 h-full relative z-20">
            {/* Hours column */}
            <div
              ref={hourRef}
              onScroll={() => handleScroll(hourRef, hourOptions, setSelectedHour, setHourScroll)}
              className="h-[225px] w-20 overflow-y-scroll scrollbar-hide"
              style={{ 
                scrollSnapType: 'y mandatory',
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {extendedHours.map((hour, index) => {
                const style = getItemStyle(hourScroll, index);
                return (
                  <div
                    key={`hour-${index}`}
                    className="h-[45px] flex items-center justify-center font-bold transition-all duration-200 ease-in-out"
                    style={{
                      scrollSnapAlign: 'center',
                      scrollSnapStop: 'always',
                      ...style,
                      color: '#111827'
                    }}
                  >
                    {hour.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div 
              className="font-bold flex items-center"
              style={{
                fontSize: '28px',
                color: '#111827'
              }}
            >
              :
            </div>

            {/* Minutes column */}
            <div
              ref={minuteRef}
              onScroll={() => handleScroll(minuteRef, minuteOptions, setSelectedMinute, setMinuteScroll)}
              className="h-[225px] w-20 overflow-y-scroll scrollbar-hide"
              style={{ 
                scrollSnapType: 'y mandatory',
                scrollBehavior: 'smooth',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {extendedMinutes.map((minute, index) => {
                const style = getItemStyle(minuteScroll, index);
                return (
                  <div
                    key={`minute-${index}`}
                    className="h-[45px] flex items-center justify-center font-bold transition-all duration-200 ease-in-out"
                    style={{
                      scrollSnapAlign: 'center',
                      scrollSnapStop: 'always',
                      ...style,
                      color: '#111827'
                    }}
                  >
                    {minute.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="flex-1 h-10 font-medium text-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 h-10 font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirm
          </Button>
        </div>
      </div>
    );
  };

  // Enhanced Date Time Picker with Shadcn Calendar & iOS Time Picker
  const DateTimePicker = ({
    dateValue,
    timeValue,
    onDateChange,
    onTimeChange,
    label,
    minDate,
    required = false
  }: {
    dateValue: string;
    timeValue: string;
    onDateChange: (date: string) => void;
    onTimeChange: (time: string) => void;
    label: string;
    minDate?: string;
    required?: boolean;
  }) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    
    // Convert string date to Date object for Calendar
    const selectedDate = dateValue ? parse(dateValue, 'yyyy-MM-dd', new Date()) : undefined;
    const minDateObj = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : undefined;

    return (
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
          {label} {required && <span className="text-rose-600 dark:text-rose-400">*</span>}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Enhanced Date Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal h-11 px-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all
                           dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700 ${
                  !dateValue && "text-gray-500 dark:text-slate-500"
                }`}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500 dark:text-slate-400" />
                <span className="text-sm">
                  {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : "Pick date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(format(date, 'yyyy-MM-dd'));
                    setIsCalendarOpen(false);
                  }
                }}
                disabled={(date) => {
                  if (minDateObj && date < minDateObj) return true;
                  return false;
                }}
                initialFocus
                captionLayout="dropdown"
                fromYear={new Date().getFullYear()}
                toYear={new Date().getFullYear() + 5}
              />
            </PopoverContent>
          </Popover>

          {/* iOS-Style Spinning Time Picker */}
          <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal h-11 px-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all
                           dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700 ${
                  !timeValue && "text-gray-500 dark:text-slate-500"
                }`}
              >
                <Clock className="mr-2 h-4 w-4 text-gray-500 dark:text-slate-400" />
                <span className="text-sm">
                  {timeValue || "Pick time"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0" align="start">
              <SpinningTimePicker
                value={timeValue}
                onChange={onTimeChange}
                onClose={() => setIsTimePickerOpen(false)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  };

  // Bus Stops Selector Component
  const BusStopsSelector = ({ 
    type, 
    station 
  }: { 
    type: 'source' | 'destination';
    station: Station | null;
  }) => {
    const stops = type === 'source' ? formData.source_bus_stops : formData.destination_bus_stops;
    const [openTimePickerFor, setOpenTimePickerFor] = useState<string | null>(null);
    
    if (!station || !station.points || station.points.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center dark:bg-indigo-500/10 dark:border-indigo-500/20">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
            Select Bus Stops in {station.city}
          </label>
          <span className="text-xs text-gray-500 dark:text-slate-500">
            ({stops.filter(s => s.active).length} selected)
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {stops.map((stop) => (
            <div key={stop.code} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleBusStop(type, stop.code)}
                className={`px-3 py-2 rounded-lg border transition-all text-xs font-medium ${
                  stop.active
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {stop.active && <Check className="w-3 h-3" />}
                  <span>{stop.name}</span>
                </div>
              </button>
              
              {stop.active && (
                <Popover open={openTimePickerFor === stop.code} onOpenChange={(open) => setOpenTimePickerFor(open ? stop.code : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2 text-xs bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200 ${
                        !stop.time && "text-gray-500 dark:text-slate-500"
                      }`}
                    >
                      <Clock className="mr-1.5 h-3 w-3 text-gray-500 dark:text-slate-400" />
                      <span>{stop.time || "Time"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0" align="start">
                    <SpinningTimePicker
                      value={stop.time}
                      onChange={(time) => updateBusStopTime(type, stop.code, time)}
                      onClose={() => setOpenTimePickerFor(null)}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Intermediate Bus Stops Selector Component
  const IntermediateBusStopsSelector = ({ 
    stopIndex,
    busStops,
    cityName
  }: { 
    stopIndex: number;
    busStops: CityStopTime[];
    cityName: string;
  }) => {
    const [openTimePickerFor, setOpenTimePickerFor] = useState<string | null>(null);
    
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center dark:bg-indigo-500/10 dark:border-indigo-500/20">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
            Select Bus Stops in {cityName}
          </label>
          <span className="text-xs text-gray-500 dark:text-slate-500">
            ({busStops.filter(s => s.active).length} selected)
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {busStops.map((busStop) => (
            <div key={busStop.code} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleIntermediateBusStop(stopIndex, busStop.code)}
                className={`px-3 py-2 rounded-lg border transition-all text-xs font-medium ${
                  busStop.active
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-300'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {busStop.active && <Check className="w-3 h-3" />}
                  <span>{busStop.name}</span>
                </div>
              </button>
              
              {busStop.active && (
                <Popover open={openTimePickerFor === busStop.code} onOpenChange={(open) => setOpenTimePickerFor(open ? busStop.code : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-8 px-2 text-xs bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-slate-900/80 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:border-slate-700 animate-in fade-in slide-in-from-left-2 duration-200 ${
                        !busStop.time && "text-gray-500 dark:text-slate-500"
                      }`}
                    >
                      <Clock className="mr-1.5 h-3 w-3 text-gray-500 dark:text-slate-400" />
                      <span>{busStop.time || "Time"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-0" align="start">
                    <SpinningTimePicker
                      value={busStop.time}
                      onChange={(time) => updateIntermediateBusStopTime(stopIndex, busStop.code, time)}
                      onClose={() => setOpenTimePickerFor(null)}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRouteSection = () => (
    <div className="space-y-6">
      {/* Source */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center dark:bg-green-500/10 dark:border-green-500/20">
            <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Source Station</h4>
          <span className="ml-2 text-xs text-gray-500 dark:text-slate-500">(Read-only)</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 opacity-70 pointer-events-none">
          <StationDropdown
            value={formData.source}
            onChange={() => {}}
            label="Station"
            required
          />
          <DateTimePicker
            dateValue={formData.source_departure_date}
            timeValue={formData.source_departure_time}
            onDateChange={() => {}}
            onTimeChange={() => {}}
            label="Departure Date & Time"
            required
          />
        </div>
        
        {/* Bus Stops Selector for Source */}
        {serviceType === 'bus' && <BusStopsSelector type="source" station={formData.source} />}
      </div>

      {/* Stops */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center dark:bg-amber-500/10 dark:border-amber-500/20">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Intermediate Stops</h4>
            <span className="text-xs text-gray-500 ml-2 dark:text-slate-500">({formData.stops.length}/8)</span>
            <span className="text-xs text-gray-500 dark:text-slate-500">(Read-only)</span>
          </div>
        </div>

        {formData.stops.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl dark:border-slate-800">
            <MapPin className="w-10 h-10 mx-auto mb-3 text-gray-400 dark:text-slate-700" />
            <p className="text-sm text-gray-500 dark:text-slate-500">No intermediate stops</p>
          </div>
        ) : (
          <div className="space-y-4 opacity-70 pointer-events-none">
            {formData.stops.map((stop, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 dark:bg-slate-900/50 dark:border-slate-800">
                <div className="flex items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center dark:bg-amber-500/20 dark:border-amber-500/30">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{index + 1}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-400">Stop #{index + 1}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <StationDropdown
                      value={stop.station}
                      onChange={() => {}}
                      label="Station"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                      Base Price to Destination <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        value={stop.base_price}
                        readOnly
                        className="w-full pl-8 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all
                                   dark:bg-slate-900/80 dark:border-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <DateTimePicker
                    dateValue={stop.departure_date}
                    timeValue={stop.departure_time}
                    onDateChange={() => {}}
                    onTimeChange={() => {}}
                    label="Departure Date & Time"
                    required
                  />
                </div>

                {/* Bus Stops Selector for Intermediate Stop */}
                {serviceType === 'bus' && stop.station && stop.bus_stops && stop.bus_stops.length > 0 && (
                  <IntermediateBusStopsSelector
                    stopIndex={index}
                    busStops={stop.bus_stops}
                    cityName={stop.station.city}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Destination */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center dark:bg-rose-500/10 dark:border-rose-500/20">
            <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Destination Station</h4>
          <span className="ml-2 text-xs text-gray-500 dark:text-slate-500">(Read-only)</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 opacity-70 pointer-events-none">
          <StationDropdown
            value={formData.destination}
            onChange={() => {}}
            label="Station"
            required
          />
          <DateTimePicker
            dateValue={formData.destination_arrival_date}
            timeValue={formData.destination_arrival_time}
            onDateChange={() => {}}
            onTimeChange={() => {}}
            label="Arrival Date & Time"
            required
          />
        </div>
        
        {/* Bus Stops Selector for Destination */}
        {serviceType === 'bus' && <BusStopsSelector type="destination" station={formData.destination} />}
      </div>

      {/* Pricing */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center dark:bg-blue-500/10 dark:border-blue-500/20">
                                    <span className="w-4 h-4 text-blue-600 dark:text-blue-400 flex items-center justify-center">₹</span>            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Class Pricing (Source to Destination)</h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.dynamic_pricing_enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setFormData({ 
                  ...formData, 
                  dynamic_pricing_enabled: enabled,
                  dynamic_pricing_factor: enabled ? formData.dynamic_pricing_factor || '0' : '0'
                });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 relative peer-checked:bg-blue-600 dark:bg-slate-700 dark:peer-focus:ring-blue-800">
              <div className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white border border-gray-300 transition-all peer-checked:translate-x-full peer-checked:border-white" />
            </div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-white">
              Dynamic Pricing
            </span>
          </label>
        </div>

        {formData.dynamic_pricing_enabled && (
          <div className="mb-5">
            <div className="space-y-2 max-w-md">
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                Dynamic Pricing Factor (0 to 1) <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <Input
                ref={(el) => { inputRefs.current['dynamic_pricing_factor'] = el; }}
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.dynamic_pricing_factor}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value >= 0 && value <= 1) {
                    setFormData({ ...formData, dynamic_pricing_factor: e.target.value });
                  } else if (e.target.value === '') {
                    setFormData({ ...formData, dynamic_pricing_factor: '' });
                  }
                }}
                className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-center font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {serviceType === 'train' && (
            <>
              {[
                { label: 'Sleeper', field: 'sleeper_price' },
                { label: '2nd AC', field: 'second_ac_price' },
                { label: '3rd AC', field: 'third_ac_price' }
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData[field as keyof FormData] as string}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full pl-8 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {serviceType === 'bus' && (
            <>
              {[
                { label: 'Seater', field: 'seater_price' },
                { label: 'Sleeper', field: 'sleeper_price' }
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData[field as keyof FormData] as string}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full pl-8 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {serviceType === 'flight' && (
            <>
              {[
                { label: 'Economy', field: 'economy_price' },
                { label: 'Premium Economy', field: 'premium_price' },
                { label: 'Business Class', field: 'business_price' }
              ].map(({ label, field }) => (
                <div key={field} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData[field as keyof FormData] as string}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className="w-full pl-8 pr-3 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderVehicleSection = () => (
    <div className="space-y-6">
      {/* Vehicle Information */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center dark:bg-purple-500/10 dark:border-purple-500/20">
            <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Vehicle Information</h4>
          <span className="ml-2 text-xs text-gray-500 dark:text-slate-500">(Read-only)</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 opacity-70 pointer-events-none">
          {serviceType === 'bus' && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Travels Name <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.travels_name}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm"
                  placeholder="ABC Travels"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Bus Number <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.bus_number}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm uppercase font-bold"
                  placeholder="DL01AB1234"
                />
              </div>
            </>
          )}
          {serviceType === 'train' && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Train Service Name <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.train_service_name}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm"
                  placeholder="Rajdhani Express"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Train Number <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.train_number}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm uppercase font-bold"
                  placeholder="12951"
                />
              </div>
            </>
          )}
          {serviceType === 'flight' && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Airline Name <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.airline_name}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm"
                  placeholder="Air India"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Aircraft Number <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.aircraft_number}
                  readOnly
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm uppercase font-bold"
                  placeholder="VT-ANL"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Registration Number <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={formData.registration_no}
              readOnly
              className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm uppercase font-bold"
              placeholder="DL01AB1234"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Vehicle Model <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <Input
              type="text"
              value={formData.model}
              readOnly
              className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm"
              placeholder="Boeing 737-800"
            />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center dark:bg-emerald-500/10 dark:border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Amenities</h4>
          <span className="text-xs text-gray-500 ml-auto dark:text-slate-500">{formData.amenities.length} selected</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`px-3 py-2.5 rounded-lg border transition-all text-xs font-medium ${
                formData.amenities.includes(amenity)
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-300'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                {formData.amenities.includes(amenity) && <Check className="w-3 h-3" />}
                <span>{amenity}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Seat/Bogie Configuration */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center dark:bg-cyan-500/10 dark:border-cyan-500/20">
            <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {serviceType === 'train' ? 'Bogie Configuration' : 'Seat Configuration'}
          </h4>
          <span className="ml-2 text-xs text-gray-500 dark:text-slate-500">(Read-only)</span>
        </div>

        {serviceType === 'train' ? (
          <div className="space-y-4 opacity-70 pointer-events-none">
            {[
              { label: 'Sleeper', field: 'sleeper' },
              { label: '2nd AC', field: 'second_ac' },
              { label: '3rd AC', field: 'third_ac' }
            ].map(({ label, field }) => (
              <div key={field} className="bg-white border border-gray-200 rounded-xl p-4 dark:bg-slate-900/50 dark:border-slate-800">
                <h5 className="text-xs font-semibold text-gray-600 mb-3 dark:text-slate-400">{label}</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Bogies</label>
                    <input
                      type="number"
                      value={formData.bogies_config[field as keyof typeof formData.bogies_config].count}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Seats/Bogie</label>
                    <input
                      type="number"
                      value={formData.bogies_config[field as keyof typeof formData.bogies_config].seats_per_bogie}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Total</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center dark:bg-slate-800/50 dark:border-slate-700">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {formData.bogies_config[field as keyof typeof formData.bogies_config].count *
                          formData.bogies_config[field as keyof typeof formData.bogies_config].seats_per_bogie}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 opacity-70 pointer-events-none">
            {serviceType === 'bus' && [
              { label: 'Seater', field: 'seater' },
              { label: 'Sleeper', field: 'sleeper' }
            ].map(({ label, field }) => (
              <div key={field} className="bg-white border border-gray-200 rounded-xl p-4 dark:bg-slate-900/50 dark:border-slate-800">
                <h5 className="text-xs font-semibold text-gray-600 mb-3 dark:text-slate-400">{label}</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Rows</label>
                    <input
                      type="number"
                      value={formData[`num_rows_${field}` as keyof FormData] as number}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Columns</label>
                    <input
                      type="number"
                      value={formData[`num_columns_${field}` as keyof FormData] as number}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Total</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center dark:bg-slate-800/50 dark:border-slate-700">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {(formData[`num_rows_${field}` as keyof FormData] as number) *
                          (formData[`num_columns_${field}` as keyof FormData] as number)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {serviceType === 'flight' && [
              { label: 'Economy', field: 'economy' },
              { label: 'Premium Economy', field: 'premium' },
              { label: 'Business Class', field: 'business' }
            ].map(({ label, field }) => (
              <div key={field} className="bg-white border border-gray-200 rounded-xl p-4 dark:bg-slate-900/50 dark:border-slate-800">
                <h5 className="text-xs font-semibold text-gray-600 mb-3 dark:text-slate-400">{label}</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Rows</label>
                    <input
                      type="number"
                      value={formData[`num_rows_${field}` as keyof FormData] as number}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Columns</label>
                    <input
                      type="number"
                      value={formData[`num_columns_${field}` as keyof FormData] as number}
                      readOnly
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-bold text-center
                                 dark:bg-slate-900/80 dark:border-slate-800 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs text-gray-500 dark:text-slate-500">Total</label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center dark:bg-slate-800/50 dark:border-slate-700">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {(formData[`num_rows_${field}` as keyof FormData] as number) *
                          (formData[`num_columns_${field}` as keyof FormData] as number)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPolicySection = () => (
    <div className="space-y-6">
      {/* Booking Policy */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center dark:bg-amber-500/10 dark:border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Booking Policy</h4>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.reschedule_allowed}
              onChange={(e) => setFormData({ ...formData, reschedule_allowed: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 rounded-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-200 relative peer-checked:bg-blue-600 dark:bg-slate-700 dark:peer-focus:ring-blue-800">
              <div className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white border border-gray-300 transition-all peer-checked:translate-x-full peer-checked:border-white" />
            </div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-white">
              Reschedule {formData.reschedule_allowed ? 'Allowed' : 'Not Allowed'}
            </span>
          </label>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Row 1 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Cancellation Window (Hours) <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <Input
              ref={(el) => { inputRefs.current['cancellation_window'] = el; }}
              type="number"
              value={formData.cancellation_window}
              onChange={(e) => setFormData({ ...formData, cancellation_window: parseInt(e.target.value) || 0 })}
              onKeyDown={handleEnterNav('cancellation_window', 'free_cancellation_price')}
              className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-center font-bold"
              placeholder="24"
              min={0}
            />
            <p className="text-xs text-gray-500 dark:text-slate-500">Hours before departure for free cancellation</p>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Free Cancellation Price <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium z-10">₹</span>
              <Input
                ref={(el) => { inputRefs.current['free_cancellation_price'] = el; }}
                type="number"
                step="0.01"
                value={formData.free_cancellation_price}
                onChange={(e) => setFormData({ ...formData, free_cancellation_price: e.target.value })}
                onKeyDown={handleEnterNav('free_cancellation_price', 'cancellation_fee')}
                className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 pl-8 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Row 2 */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Cancellation Fee <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium z-10">₹</span>
              <Input
                ref={(el) => { inputRefs.current['cancellation_fee'] = el; }}
                type="number"
                step="0.01"
                value={formData.cancellation_fee}
                onChange={(e) => setFormData({ ...formData, cancellation_fee: e.target.value })}
                onKeyDown={handleEnterNav('cancellation_fee', 'no_show_penalty')}
                className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 pl-8 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              No Show Penalty <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium z-10">₹</span>
              <Input
                ref={(el) => { inputRefs.current['no_show_penalty'] = el; }}
                type="number"
                step="0.01"
                value={formData.no_show_penalty}
                onChange={(e) => setFormData({ ...formData, no_show_penalty: e.target.value })}
                onKeyDown={handleEnterNav('no_show_penalty', formData.reschedule_allowed ? 'free_reschedule_price' : 'baggage_allowance')}
                className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 pl-8 font-bold"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Row 3 - Reschedule fields (shown only when toggle is on) */}
          {formData.reschedule_allowed && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Free Reschedule Price <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium z-10">₹</span>
                  <Input
                    ref={(el) => { inputRefs.current['free_reschedule_price'] = el; }}
                    type="number"
                    step="0.01"
                    value={formData.free_reschedule_price}
                    onChange={(e) => setFormData({ ...formData, free_reschedule_price: e.target.value })}
                    onKeyDown={handleEnterNav('free_reschedule_price', 'reschedule_fee')}
                    className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 pl-8 font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
                  Reschedule Fee <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500 font-medium z-10">₹</span>
                  <Input
                    ref={(el) => { inputRefs.current['reschedule_fee'] = el; }}
                    type="number"
                    step="0.01"
                    value={formData.reschedule_fee}
                    onChange={(e) => setFormData({ ...formData, reschedule_fee: e.target.value })}
                    onKeyDown={handleEnterNav('reschedule_fee', 'baggage_allowance')}
                    className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 pl-8 font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-gray-50/50 border border-gray-200/70 rounded-2xl p-6 backdrop-blur-sm dark:bg-slate-900/30 dark:border-slate-800/50">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center dark:bg-blue-500/10 dark:border-blue-500/20">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Terms & Conditions <span className="text-rose-600 dark:text-rose-400">*</span>
          </h4>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Baggage Allowance (kg) <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <Input
              ref={(el) => { inputRefs.current['baggage_allowance'] = el; }}
              type="number"
              step="0.01"
              value={formData.baggage_allowance}
              onChange={(e) => setFormData({ ...formData, baggage_allowance: e.target.value })}
              onKeyDown={handleEnterNav('baggage_allowance', 'luggage_allowance')}
              className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-center font-bold"
              placeholder="0.00"
              min={0}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 tracking-wide">
              Luggage Allowance (kg) <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <Input
              ref={(el) => { inputRefs.current['luggage_allowance'] = el; }}
              type="number"
              step="0.01"
              value={formData.luggage_allowance}
              onChange={(e) => setFormData({ ...formData, luggage_allowance: e.target.value })}
              className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-center font-bold"
              placeholder="0.00"
              min={0}
            />
          </div>
        </div>
        <textarea
          value={formData.terms_conditions}
          onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all resize-none
                     dark:bg-slate-900/80 dark:border-slate-800 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
          placeholder="Enter detailed terms and conditions for this service..."
          rows={8}
        />
        <div className="mt-2 text-xs text-gray-500 text-right dark:text-slate-500">
          {formData.terms_conditions.length} characters
        </div>
      </div>
    </div>
  );

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex items-center justify-center w-full min-h-screen p-4">
        <div className="bg-white rounded-2xl w-[1220px] min-w-[1220px] max-w-[1220px] overflow-hidden shadow-2xl border border-gray-200 mx-auto box-border flex-none shrink-0 dark:bg-slate-950 dark:border-slate-800">
          
          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center w-full h-[440px]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-500 dark:border-t-blue-400 dark:border-r-blue-300 animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Loading Service Details</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">Fetching and populating form data...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20">
                      {serviceType === 'flight' && <Plane className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                      {serviceType === 'train' && <Train className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                      {serviceType === 'bus' && <Bus className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1 dark:text-white">Edit Service</h2>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {('flight_number' in service && service.flight_number) ?
                          `${(service as FlightServiceListItem).airline_name} ${(service as FlightServiceListItem).flight_number}` : null}
                        {('train_number' in service && service.train_number) ?
                          `${(service as TrainServiceListItem).train_name} ${(service as TrainServiceListItem).train_number ? `(${(service as TrainServiceListItem).train_number})` : ''}` : null}
                        {('bus_number' in service && service.bus_number) ?
                          `${(service as BusServiceListItem).bus_travels_name}` : null}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onClose?.()}
                    className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Content (stable scrollbar) */}
              <div className="overflow-y-scroll h-[calc(100vh-320px)] [scrollbar-gutter:stable] overscroll-contain px-8 py-6">
            {/* Section Navigation (rounded, gradient active, no scale) */}
            <div className="flex gap-3 mb-6 pb-5 border-b-2 border-dashed border-gray-300 dark:border-slate-800/50">
              <button
                onClick={() => setActiveSection('route')}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm uppercase tracking-wide ${
                  activeSection === 'route'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                Route Details
              </button>
              <button
                onClick={() => setActiveSection('vehicle')}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm uppercase tracking-wide ${
                  activeSection === 'vehicle'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                Vehicle Details
              </button>
              <button
                onClick={() => setActiveSection('policy')}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 text-sm uppercase tracking-wide ${
                  activeSection === 'policy'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:bg-slate-900'
                }`}
              >
                Policy Details
              </button>
            </div>

            {/* Render Active Section */}
            <div className="transition-all duration-300">
              {activeSection === 'route' && renderRouteSection()}
              {activeSection === 'vehicle' && renderVehicleSection()}
              {activeSection === 'policy' && renderPolicySection()}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center gap-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
            {/* Alert in footer */}
            <div className="flex-1 max-w-xl">
              {alert && (
                <Alert variant={alert.type === 'error' ? 'destructive' : 'default'} className="animate-in slide-in-from-left-2 duration-300">
                  {alert.type === 'error' ? <AlertCircle className="h-4 w-4" /> : alert.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <AlertDescription className="text-sm font-medium">{alert.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-4 rounded-lg font-medium transition-all text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditServiceForm;
