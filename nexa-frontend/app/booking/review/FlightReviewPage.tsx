"use client";


import React, { useRef, useState, KeyboardEvent, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import {
  Check,
  Plus,
  X,
  ChevronDown,
  Plane,
  Clock,
  Calendar,
  Users,
  Shield,
  Info,
  Briefcase,
  Luggage,
  Lock,
  Ticket,
  Receipt,
} from "lucide-react";
import { ElegantAlert } from "@/components/ui/elegant-alert";

import {
  TravellerData,
  ProfileData,
  OfferData,
  FieldRefs,
  ContactDetails,
  BillingAddress,
} from "./types";

import { getFlightServiceDetails, FlightServiceDetails, getCoTravellers, CoTravellerResponse } from "@/app/api";
import { getAuthFromStorage } from "@/utils/authStorage";

// Constants
const indianStates = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi"
];

const offers: OfferData[] = [
  { 
    id: "none", 
    label: "No offer", 
    instantOff: 0,
    code: "NONE",
    discount: 0,
    description: "No offer applied"
  },
  { 
    id: "sale", 
    label: "SALE - ₹330 Off", 
    instantOff: 330,
    code: "SALE",
    discount: 330,
    description: "Enjoy an instant discount of ₹330 and receive a Hotel discount code after your booking."
  },
  { 
    id: "money", 
    label: "MONEY - ₹401 ixigo money", 
    instantOff: 401,
    code: "MONEY",
    discount: 401,
    description: "Get ₹401 ixigo money post this booking."
  },
  {
    id: "iphone",
    label: "iPhone 17 Contest",
    instantOff: 0,
    code: "IPHONE17",
    discount: 0,
    description: "Get a chance to win brand new iPhone 17 post this booking."
  }
];

const FlightReviewPage = () => {
  const searchParams = useSearchParams();
  
  // Get parameters from URL
  const serviceId = searchParams.get('service_id');
  const returnServiceId = searchParams.get('return_service_id');
  const tripType = searchParams.get('tripType') as 'oneWay' | 'roundTrip' || 'oneWay';
  const numTravellers = parseInt(searchParams.get('travellers') || '1', 10);
  const classType = searchParams.get('class_type') || 'Economy';

  // Flight details state
  const [outboundFlight, setOutboundFlight] = useState<FlightServiceDetails | null>(null);
  const [returnFlight, setReturnFlight] = useState<FlightServiceDetails | null>(null);
  const [loadingFlights, setLoadingFlights] = useState(true);
  const [flightError, setFlightError] = useState<string | null>(null);

  // Saved profiles state
  const [savedProfiles, setSavedProfiles] = useState<ProfileData[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Fetch saved profiles from backend
  useEffect(() => {
    const fetchSavedProfiles = async () => {
      try {
        setLoadingProfiles(true);
        setProfileError(null);
        
        const auth = getAuthFromStorage();
        if (!auth?.token) {
          console.warn('[Review] No auth token for fetching profiles');
          setLoadingProfiles(false);
          return;
        }

        console.log('[Review] Fetching co-travellers...');
        const coTravellers = await getCoTravellers(auth.token);
        
        // Transform backend response to ProfileData format
        const transformedProfiles: ProfileData[] = coTravellers.map((traveller) => ({
          id: traveller.traveller_id,
          customerName: traveller.customer_name,
          firstName: traveller.first_name,
          lastName: traveller.last_name,
          gender: traveller.gender,
          nationality: "India", // Default nationality since backend doesn't have this field yet
          dateOfBirth: traveller.date_of_birth,
          email: traveller.email,
          phoneNumber: traveller.phone_number,
          address: traveller.address,
        }));
        
        setSavedProfiles(transformedProfiles);
        console.log('[Review] Co-travellers fetched successfully:', transformedProfiles);
      } catch (error) {
        console.error('[Review] Error fetching co-travellers:', error);
        setProfileError(error instanceof Error ? error.message : "Failed to load co-travellers");
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchSavedProfiles();
  }, []);

  // Fetch flight details
  useEffect(() => {
    const fetchFlightDetails = async () => {
      try {
        setLoadingFlights(true);
        setFlightError(null);
        
        const auth = getAuthFromStorage();
        console.log('[Review] Auth from storage:', auth);
        console.log('[Review] Token exists:', !!auth?.token);
        console.log('[Review] Token value:', auth?.token);
        
        if (!auth?.token) {
          console.error('[Review] No auth token found in storage');
          setFlightError("Authentication required");
          return;
        }

        if (!serviceId) {
          console.error('[Review] No service_id in URL params');
          setFlightError("No flight selected");
          return;
        }

        console.log('[Review] Fetching flight details for service_id:', serviceId);
        console.log('[Review] Using token:', auth.token);
        
        // Fetch outbound flight
        const outbound = await getFlightServiceDetails(serviceId, auth.token);
        setOutboundFlight(outbound);
        console.log('[Review] Outbound flight fetched successfully');

        // Fetch return flight if it's a round trip
        if (tripType === 'roundTrip' && returnServiceId) {
          console.log('[Review] Fetching return flight for service_id:', returnServiceId);
          const returnFlightData = await getFlightServiceDetails(returnServiceId, auth.token);
          setReturnFlight(returnFlightData);
          console.log('[Review] Return flight fetched successfully');
        }
      } catch (error) {
        console.error("[Review] Error fetching flight details:", error);
        setFlightError(error instanceof Error ? error.message : "Failed to load flight details");
      } finally {
        setLoadingFlights(false);
      }
    };

    fetchFlightDetails();
  }, [serviceId, returnServiceId, tripType]);

  // travellers initial: initialize based on numTravellers
  const [travellers, setTravellers] = useState<TravellerData[]>(() => {
    const initialTravellers: TravellerData[] = [];
    for (let i = 0; i < numTravellers; i++) {
      if (i < savedProfiles.length) {
        const profile = savedProfiles[i];
        initialTravellers.push({
          id: i + 1,
          saved: true,
          linkedProfileId: profile.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          gender: "",
          nationality: "India",
          dateOfBirth: ""
        });
      } else {
        initialTravellers.push({
          id: i + 1,
          saved: false,
          linkedProfileId: null,
          firstName: "",
          lastName: "",
          gender: "",
          nationality: "India",
          dateOfBirth: ""
        });
      }
    }
    return initialTravellers;
  });

  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(
    new Set(travellers.filter(t => t.linkedProfileId !== null).map(t => t.linkedProfileId as string))
  );
  const [expanded, setExpanded] = useState<Set<number>>(
    new Set(travellers.filter(t => !t.saved).map(t => t.id))
  );
  
  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    countryCode: "+91",
    mobile: "6303811202",
    email: "",
  });
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    pincode: "502032",
    address: "Hyderabad",
    city: "Sangareddy",
    state: "Telangana",
  });
  const [addGST, setAddGST] = useState(false);
  const [selectedCancellationOutbound, setSelectedCancellationOutbound] = useState("free");
  const [selectedCancellationReturn, setSelectedCancellationReturn] = useState("free");
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offers[1].id); // default SALE
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const router = useRouter();
  
  const pageRefs = {
    travellers: useRef<HTMLDivElement>(null),
    contact: useRef<HTMLDivElement>(null),
    billing: useRef<HTMLDivElement>(null),
  };
  const fieldRefs = useRef<FieldRefs>({});

  // helper: update a traveller field
  const updateTraveller = (
    id: number,
    field: keyof TravellerData,
    value: string | boolean | null
  ) => {
    setTravellers((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  };

  // toggle expand/collapse of a traveller card
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // toggle selection of a saved profile chip
  const handleToggleProfile = (profile: ProfileData) => {
    const isSelected = selectedProfiles.has(profile.id);
    if (isSelected) {
      // deselect: find traveller linked to this profile and clear it
      setTravellers((prev) =>
        prev.map((t) =>
          t.linkedProfileId === profile.id ? { ...t, saved: false, linkedProfileId: null, firstName: "", lastName: "", gender: "", nationality: "India", dateOfBirth: "" } : t
        )
      );
      setSelectedProfiles((prev) => {
        const copy = new Set(prev);
        copy.delete(profile.id);
        return copy;
      });
      // ensure that traveller card for that slot is expanded for edit (if user wants to add new)
      return;
    }

    // selecting: find first un-saved traveller slot
    const freeSlot = travellers.find((t) => !t.saved);
    if (freeSlot) {
      setTravellers((prev) =>
        prev.map((t) =>
          t.id === freeSlot.id
            ? { 
                ...t, 
                saved: true, 
                linkedProfileId: profile.id, 
                firstName: profile.firstName, 
                lastName: profile.lastName,
                gender: profile.gender || "",
                nationality: profile.nationality || "India",
                dateOfBirth: profile.dateOfBirth || ""
              }
            : t
        )
      );
      setSelectedProfiles((prev) => new Set(prev).add(profile.id));
      // collapse that slot
      setExpanded((prev) => {
        const copy = new Set(prev);
        copy.delete(freeSlot.id);
        return copy;
      });
    } else {
      // no free slot: optionally replace the last traveller (or show a toast). We'll replace the last unsaved/smallest index.
      // We'll replace the last traveller (ID largest) for convenience:
      const lastId = travellers[travellers.length - 1].id;
      setTravellers((prev) =>
        prev.map((t) =>
          t.id === lastId
            ? { 
                ...t, 
                saved: true, 
                linkedProfileId: profile.id, 
                firstName: profile.firstName, 
                lastName: profile.lastName,
                gender: profile.gender || "",
                nationality: profile.nationality || "India",
                dateOfBirth: profile.dateOfBirth || ""
              }
            : t
        )
      );
      setSelectedProfiles((prev) => new Set(prev).add(profile.id));
      setExpanded((prev) => {
        const copy = new Set(prev);
        copy.delete(lastId);
        return copy;
      });
    }
  };

  // Continue pressed on traveller card => validate minimal fields, mark saved, collapse and open next
  const handleTravellerContinue = (id: number) => {
    const t = travellers.find((x) => x.id === id);
    if (!t) return;
    // minimal validation: firstName + lastName
    if (!t.firstName || !t.lastName) {
      alert("Please fill First & Last name before continuing.");
      setExpanded((prev) => new Set(prev).add(id));
      return;
    }

    // mark saved
    setTravellers((prev) => prev.map((x) => (x.id === id ? { ...x, saved: true } : x)));
    // collapse this
    setExpanded((prev) => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });

    // open next traveller or move to next section
    const idx = travellers.findIndex((x) => x.id === id);
    const next = travellers[idx + 1];
    if (next) {
      setExpanded((prev) => new Set(prev).add(next.id));
      setTimeout(() => {
        const el = document.getElementById(`traveller-card-${next.id}`) as HTMLElement;
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    } else {
      const el = pageRefs.contact.current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };


  // on Enter, move to next field in same traveller or finish the traveller
  const handleKeyDown = (travellerId: number, fieldIndex: number, e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const nextKey = `t${travellerId}-f${fieldIndex + 1}`;
    const nextEl = fieldRefs.current[nextKey];

    if (nextEl) {
      nextEl.focus();
      // place cursor at end (works for inputs)
      if (nextEl instanceof HTMLInputElement) {
        try {
          const len = nextEl.value?.length || 0;
          nextEl.setSelectionRange(len, len);
        } catch {}
      }
    }
  };

  // Clear traveller details and remove profile link
  const handleClearTraveller = (id: number) => {
    setTravellers((prev: TravellerData[]) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              saved: false,
              linkedProfileId: null,
              firstName: "",
              lastName: "",
              gender: "",
              nationality: "India",
              dateOfBirth: ""
            }
          : t
      )
    );

  // also remove any profile selection that referenced this traveller
  setSelectedProfiles((prev) => {
    // prev is a Set; make a shallow copy and remove any profile that was assigned to this traveller
    const copy = new Set(prev);
    // find the profile id (if any) that was linked to this traveller BEFORE we cleared travellers
    // NOTE: because setTravellers is async, we check the current travellers array synchronously
    const t = travellers.find((x) => x.id === id);
    if (t && t.linkedProfileId) copy.delete(t.linkedProfileId);
    return copy;
  });

  // Open the card so the user can immediately add new details if they want
  setExpanded((prev) => {
    const copy = new Set(prev);
    copy.add(id);
    return copy;
  });
};

  // Validation and Continue Handler
  const validateAndContinue = () => {
    // Validate all travellers have required fields
    for (const traveller of travellers) {
      if (!traveller.firstName || !traveller.lastName) {
        setAlertMessage("Please fill in all traveller details (First Name & Last Name are required)");
        return;
      }
      if (!traveller.gender) {
        setAlertMessage("Please select gender for all travellers");
        return;
      }
      if (!traveller.dateOfBirth && !traveller.age) {
        setAlertMessage("Please provide age for all travellers");
        return;
      }
    }

    // Validate contact details
    if (!contactDetails.mobile || !contactDetails.email) {
      setAlertMessage("Please fill in contact details (Mobile & Email are required)");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactDetails.email)) {
      setAlertMessage("Please provide a valid email address");
      return;
    }

    // Validate billing address
    if (!billingAddress.pincode || !billingAddress.address || !billingAddress.city || !billingAddress.state) {
      setAlertMessage("Please fill in all billing address fields");
      return;
    }

    // All validations passed - prepare booking data
    if (!outboundFlight) {
      setAlertMessage("Flight data not available. Please try again.");
      return;
    }

    // Map cancellation selection to markup booleans
    // For outbound and return, check if either has free cancellation or flex selected
    const hasOutboundCancellation = selectedCancellationOutbound === 'free' || selectedCancellationOutbound === 'flex';
    const hasOutboundReschedule = selectedCancellationOutbound === 'flex';
    const hasReturnCancellation = selectedCancellationReturn === 'free' || selectedCancellationReturn === 'flex';
    const hasReturnReschedule = selectedCancellationReturn === 'flex';
    
    const no_cancellation_free_markup = hasOutboundCancellation || hasReturnCancellation;
    const no_reschedule_free_markup = hasOutboundReschedule || hasReturnReschedule;

    // Prepare passengers data
    const passengers = travellers.map(t => ({
      name: `${t.firstName} ${t.lastName}`,
      age: t.age ? parseInt(t.age) : 0,
      gender: t.gender,
      nationality: t.nationality || "Indian",
    }));

    // Prepare service IDs
    const service_ids = returnServiceId 
      ? [serviceId!, returnServiceId] 
      : [serviceId!];

    // Prepare booking data
    const bookingData = {
      tripType,
      class_type: classType as 'Economy' | 'Premium' | 'Business',
      from_station_id: outboundFlight.route.source.station_id,
      to_station_id: outboundFlight.route.destination.station_id,
      no_cancellation_free_markup,
      no_reschedule_free_markup,
      passengers,
      service_ids,
      email: contactDetails.email,
      phone_number: contactDetails.mobile,
    };

    // Store in sessionStorage
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));

    // Navigate to seat selection
    router.push('/booking/add-ons/seat-selection');
  };

  // offers -> calculate instant off
  const currentOffer = offers.find((o: OfferData) => o.id === selectedOfferId) || offers[0];
  
  // Get price for the selected class type
  const getPriceForClass = (flight: FlightServiceDetails, classType: string): number => {
    const classLower = classType.toLowerCase();
    if (classLower.includes('business')) {
      return parseFloat(flight.business_price);
    } else if (classLower.includes('premium') && flight.premium_price) {
      return parseFloat(flight.premium_price);
    } else {
      return parseFloat(flight.economy_price);
    }
  };
  
  // Calculate fare based on flight data
  const calculateOnwardFare = () => {
    if (!outboundFlight) return 0;
    return getPriceForClass(outboundFlight, classType);
  };

  const calculateReturnFare = () => {
    if (!returnFlight || tripType !== 'roundTrip') return 0;
    return getPriceForClass(returnFlight, classType);
  };
  
  const onwardFarePerPerson = calculateOnwardFare();
  const returnFarePerPerson = calculateReturnFare();
  const baseFareTotal = (onwardFarePerPerson + returnFarePerPerson) * numTravellers;
  
  // Calculate cancellation and reschedule markup fees for both flights
  const calculateCancellationProtection = () => {
    let total = 0;
    
    // Outbound flight protection
    if (selectedCancellationOutbound === 'free' || selectedCancellationOutbound === 'flex') {
      const outboundCancelMarkup = outboundFlight?.policy.no_cancellation_fee_markup 
        ? parseFloat(outboundFlight.policy.no_cancellation_fee_markup) 
        : 0;
      total += outboundCancelMarkup * numTravellers;
    }
    
    // Return flight protection
    if ((selectedCancellationReturn === 'free' || selectedCancellationReturn === 'flex') && returnFlight && tripType === 'roundTrip') {
      const returnCancelMarkup = returnFlight.policy.no_cancellation_fee_markup
        ? parseFloat(returnFlight.policy.no_cancellation_fee_markup)
        : 0;
      total += returnCancelMarkup * numTravellers;
    }
    
    return total;
  };

  const calculateRescheduleProtection = () => {
    let total = 0;
    
    // Outbound flight reschedule
    if (selectedCancellationOutbound === 'flex') {
      const outboundRescheduleMarkup = outboundFlight?.policy.no_reschedule_fee_markup 
        ? parseFloat(outboundFlight.policy.no_reschedule_fee_markup) 
        : 0;
      total += outboundRescheduleMarkup * numTravellers;
    }
    
    // Return flight reschedule
    if (selectedCancellationReturn === 'flex' && returnFlight && tripType === 'roundTrip') {
      const returnRescheduleMarkup = returnFlight.policy.no_reschedule_fee_markup
        ? parseFloat(returnFlight.policy.no_reschedule_fee_markup)
        : 0;
      total += returnRescheduleMarkup * numTravellers;
    }
    
    return total;
  };

  const cancellationProtectionFee = calculateCancellationProtection();
  const rescheduleProtectionFee = calculateRescheduleProtection();
  const totalProtectionFee = cancellationProtectionFee + rescheduleProtectionFee;
  
  const instantOff = currentOffer.instantOff * numTravellers;
  const totalAmount = baseFareTotal + totalProtectionFee - instantOff;

  // Helper functions
  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    // Use UTC time to match the API response (timestamps end with Z indicating UTC)
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
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

  // Parse baggage allowance from terms_conditions
  const parseBaggageAllowance = (termsConditions: string) => {
    const baggageMatch = termsConditions.match(/Baggage Allowance:\s*(\d+(?:\.\d+)?)\s*kg/i);
    const luggageMatch = termsConditions.match(/Luggage Allowance:\s*(\d+(?:\.\d+)?)\s*kg/i);
    
    return {
      cabin: baggageMatch ? `${baggageMatch[1]} kg` : '7 kg',
      checkin: luggageMatch ? `${luggageMatch[1]} kg` : '15 kg'
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      <Navbar />

      {/* Page body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading state */}
            {loadingFlights && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-slate-600">Loading flight details...</p>
              </div>
            )}

            {/* Error state */}
            {flightError && (
              <div className="bg-red-50 rounded-2xl shadow-sm border border-red-200 p-6">
                <p className="text-red-600 font-semibold">Error: {flightError}</p>
              </div>
            )}

            {/* Outbound Flight Details */}
            {!loadingFlights && !flightError && outboundFlight && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    {outboundFlight.route.source.code} → {outboundFlight.route.destination.code}
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {formatDate(outboundFlight.departure_time)} • 
                    {outboundFlight.route.stops.length === 0 ? ' Non-stop' : ` ${outboundFlight.route.stops.length} stop(s)`} • 
                    {' '}{calculateDuration(outboundFlight.departure_time, outboundFlight.arrival_time)}
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 rounded-xl flex items-center justify-center">
                        <Plane className="w-6 h-6 text-orange-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{outboundFlight.airline_name}</p>
                        <p className="text-sm text-slate-500">{outboundFlight.flight_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-3xl font-bold text-slate-900">{formatTime(outboundFlight.departure_time)}</p>
                      <p className="text-sm font-medium text-slate-600 mt-1">{outboundFlight.route.source.city}</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-4">
                      <Clock className="w-4 h-4 text-slate-400 mb-1" />
                      <p className="text-sm text-slate-500">{calculateDuration(outboundFlight.departure_time, outboundFlight.arrival_time)}</p>
                      <div className="w-full h-0.5 bg-gradient-to-r from-slate-300 via-blue-500 to-slate-300 my-2" />
                      <p className="text-xs text-emerald-600 font-medium">
                        {outboundFlight.route.stops.length === 0 ? 'Non-stop' : `${outboundFlight.route.stops.length} stop(s)`}
                      </p>
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-3xl font-bold text-slate-900">{formatTime(outboundFlight.arrival_time)}</p>
                      <p className="text-sm font-medium text-slate-600 mt-1">{outboundFlight.route.destination.city}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm flex-wrap gap-4">
                      <div className="flex items-center text-slate-600">
                        <Luggage className="w-4 h-4 mr-2" />
                        <span>Cabin: {parseBaggageAllowance(outboundFlight.policy.terms_conditions).cabin} per adult</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Briefcase className="w-4 h-4 mr-2" />
                        <span>Check-in: {parseBaggageAllowance(outboundFlight.policy.terms_conditions).checkin} per piece</span>
                      </div>
                      {Array.isArray(outboundFlight.vehicle.amenities) && outboundFlight.vehicle.amenities.length > 0 && (
                        <div className="flex items-center text-slate-600">
                          <Info className="w-4 h-4 mr-2" />
                          <span>{outboundFlight.vehicle.amenities.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Return Flight Details */}
            {!loadingFlights && !flightError && returnFlight && tripType === 'roundTrip' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-indigo-800 to-indigo-900">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    {returnFlight.route.source.code} → {returnFlight.route.destination.code} (Return)
                  </h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {formatDate(returnFlight.departure_time)} • 
                    {returnFlight.route.stops.length === 0 ? ' Non-stop' : ` ${returnFlight.route.stops.length} stop(s)`} • 
                    {' '}{calculateDuration(returnFlight.departure_time, returnFlight.arrival_time)}
                  </p>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-200 to-indigo-300 rounded-xl flex items-center justify-center">
                        <Plane className="w-6 h-6 text-indigo-700" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{returnFlight.airline_name}</p>
                        <p className="text-sm text-slate-500">{returnFlight.flight_number}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-3xl font-bold text-slate-900">{formatTime(returnFlight.departure_time)}</p>
                      <p className="text-sm font-medium text-slate-600 mt-1">{returnFlight.route.source.city}</p>
                    </div>

                    <div className="flex-1 flex flex-col items-center px-4">
                      <Clock className="w-4 h-4 text-slate-400 mb-1" />
                      <p className="text-sm text-slate-500">{calculateDuration(returnFlight.departure_time, returnFlight.arrival_time)}</p>
                      <div className="w-full h-0.5 bg-gradient-to-r from-slate-300 via-indigo-500 to-slate-300 my-2" />
                      <p className="text-xs text-emerald-600 font-medium">
                        {returnFlight.route.stops.length === 0 ? 'Non-stop' : `${returnFlight.route.stops.length} stop(s)`}
                      </p>
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-3xl font-bold text-slate-900">{formatTime(returnFlight.arrival_time)}</p>
                      <p className="text-sm font-medium text-slate-600 mt-1">{returnFlight.route.destination.city}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm flex-wrap gap-4">
                      <div className="flex items-center text-slate-600">
                        <Luggage className="w-4 h-4 mr-2" />
                        <span>Cabin: {parseBaggageAllowance(returnFlight.policy.terms_conditions).cabin} per adult</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <Briefcase className="w-4 h-4 mr-2" />
                        <span>Check-in: {parseBaggageAllowance(returnFlight.policy.terms_conditions).checkin} per piece</span>
                      </div>
                      {Array.isArray(returnFlight.vehicle.amenities) && returnFlight.vehicle.amenities.length > 0 && (
                        <div className="flex items-center text-slate-600">
                          <Info className="w-4 h-4 mr-2" />
                          <span>{returnFlight.vehicle.amenities.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flight Details: toned down header */}
            {!loadingFlights && !flightError && !outboundFlight && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900">
                <h2 className="text-xl font-bold text-white flex items-center">
                  Lucknow → New Delhi
                </h2>
                <p className="text-blue-100 text-sm mt-1">Mon, 27 Oct • Non-stop • 1h 30m • Economy</p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-200 to-orange-300 rounded-xl flex items-center justify-center">
                      <Plane className="w-6 h-6 text-orange-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Air India Express</p>
                      <p className="text-sm text-slate-500">IX 1618</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-slate-900">19:30</p>
                    <p className="text-sm font-medium text-slate-600 mt-1">LKO - Lucknow</p>
                    <p className="text-xs text-slate-500">Chaudhary Charan Singh Airport</p>
                    <p className="text-xs text-slate-500">Terminal 3</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-4">
                    <Clock className="w-4 h-4 text-slate-400 mb-1" />
                    <p className="text-sm text-slate-500">1h 30m</p>
                    <div className="w-full h-0.5 bg-gradient-to-r from-slate-300 via-blue-500 to-slate-300 my-2" />
                    <p className="text-xs text-emerald-600 font-medium">Non-stop</p>
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-3xl font-bold text-slate-900">21:00</p>
                    <p className="text-sm font-medium text-slate-600 mt-1">DEL - New Delhi</p>
                    <p className="text-xs text-slate-500">Indira Gandhi Airport</p>
                    <p className="text-xs text-slate-500">Terminal 1</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between text-sm">
                  <div className="flex items-center text-slate-600">
                    <Luggage className="w-4 h-4 mr-2" />
                    <span>Cabin: 7 kg per adult</span>
                  </div>
                  <div className="flex items-center text-slate-600">
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span>Check-in: 15 kg per piece, 1 piece per adult</span>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Cancellation options */}
            {!loadingFlights && !flightError && outboundFlight && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-slate-700" />
                   Cancellation Protection
                </h3>
              </div>

              <div className="p-6 space-y-6">
                {/* Outbound Flight Protection */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">
                    Onward Flight ({outboundFlight.route.source.code} → {outboundFlight.route.destination.code})
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {/* No Protection */}
                    <div
                      onClick={() => setSelectedCancellationOutbound("none")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCancellationOutbound === "none" ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-slate-900 text-sm">No Protection</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">₹0</p>
                      </div>
                    </div>

                    {/* Free Cancellation */}
                    <div
                      onClick={() => setSelectedCancellationOutbound("free")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCancellationOutbound === "free" ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-slate-900 text-sm">Free Cancellation</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          ₹{parseFloat(outboundFlight.policy.no_cancellation_fee_markup || '0').toFixed(0)}
                        </p>
                      </div>
                    </div>

                    {/* Cancellation + Reschedule */}
                    <div
                      onClick={() => setSelectedCancellationOutbound("flex")}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCancellationOutbound === "flex" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-center">
                        <p className="font-semibold text-slate-900 text-sm">Cancel + Reschedule</p>
                        <p className="text-lg font-bold text-slate-900 mt-1">
                          ₹{(parseFloat(outboundFlight.policy.no_cancellation_fee_markup || '0') + parseFloat(outboundFlight.policy.no_reschedule_fee_markup || '0')).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Flight Protection (if round trip) */}
                {tripType === 'roundTrip' && returnFlight && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      Return Flight ({returnFlight.route.source.code} → {returnFlight.route.destination.code})
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* No Protection */}
                      <div
                        onClick={() => setSelectedCancellationReturn("none")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCancellationReturn === "none" ? "border-slate-400 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-center">
                          <p className="font-semibold text-slate-900 text-sm">No Protection</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">₹0</p>
                        </div>
                      </div>

                      {/* Free Cancellation */}
                      <div
                        onClick={() => setSelectedCancellationReturn("free")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCancellationReturn === "free" ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-center">
                          <p className="font-semibold text-slate-900 text-sm">Free Cancellation</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">
                            ₹{parseFloat(returnFlight.policy.no_cancellation_fee_markup || '0').toFixed(0)}
                          </p>
                        </div>
                      </div>

                      {/* Cancellation + Reschedule */}
                      <div
                        onClick={() => setSelectedCancellationReturn("flex")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCancellationReturn === "flex" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="text-center">
                          <p className="font-semibold text-slate-900 text-sm">Cancel + Reschedule</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">
                            ₹{(parseFloat(returnFlight.policy.no_cancellation_fee_markup || '0') + parseFloat(returnFlight.policy.no_reschedule_fee_markup || '0')).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Traveller Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" ref={pageRefs.travellers}>
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-slate-700" />
                  Traveller Details
                </h3>
                <p className="text-sm text-slate-500 mt-1">Choose from saved profiles or add new passengers</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="mb-2 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
                  <Info className="w-5 h-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Please ensure your name matches your govt. ID (Aadhaar, Passport or Driver&apos;s License).
                  </p>
                </div>

                {/* Saved profiles chips */}
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Saved Profiles</p>
                  {loadingProfiles && (
                    <p className="text-sm text-slate-500 mb-3">Loading profiles...</p>
                  )}
                  {profileError && (
                    <p className="text-sm text-red-600 mb-3">Error loading profiles: {profileError}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mb-4">
                    {savedProfiles.map((p) => {
                      const isSel = selectedProfiles.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleToggleProfile(p)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium flex items-center space-x-2 transition ${
                            isSel
                              ? "border-sky-500 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          }`}
                        >
                          {isSel ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          <span>{p.firstName} {p.lastName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Traveller cards */}
                <div className="space-y-4">
                {travellers.map((traveller, idx) => (
                    <div key={traveller.id} className={`rounded-xl border-2 p-4 transition-all ${
                      traveller.saved && traveller.firstName 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-white border-slate-200'
                    }`}>
                        {traveller.saved && traveller.firstName ? (
                          // Collapsed saved state
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="w-4 h-4 text-white stroke-[3]" />
                              </div>
                              <div className="text-xs font-semibold text-slate-500 mr-6">
                                Adult {idx + 1}
                              </div>
                              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-8 flex-1 items-center">
                                <div>
                                  <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Full Name</div>
                                  <div className="font-bold text-slate-900">
                                    {traveller.firstName} {traveller.lastName}
                                  </div>
                                </div>
                                {traveller.age && (
                                  <div>
                                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Age</div>
                                    <div className="font-semibold text-slate-900">{traveller.age} yrs</div>
                                  </div>
                                )}
                                {traveller.gender && (
                                  <div>
                                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Gender</div>
                                    <div className="font-semibold text-slate-900">{traveller.gender}</div>
                                  </div>
                                )}
                                {traveller.nationality && (
                                  <div>
                                    <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-0.5">Nationality</div>
                                    <div className="font-semibold text-slate-900">{traveller.nationality}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setTravellers(prev => prev.map(t => 
                                  t.id === traveller.id ? { ...t, saved: false } : t
                                ));
                              }}
                              className="ml-4 px-4 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-semibold transition-colors flex-shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Adult Number */}
                            <div className="text-xs font-semibold text-slate-500 mb-3">
                              Adult {idx + 1}
                            </div>
                            
                            {/* Expanded form */}
                            <div className="space-y-3">
                            {/* Row 1: First Name, Last Name, Age */}
                            <div className="grid grid-cols-[1fr_1fr_100px] gap-3">
                              {/* First Name */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  First Name
                                </label>
                                <input
                                  ref={(el) => {
                                    if (el) fieldRefs.current[`t${traveller.id}-f0`] = el;
                                  }}
                                  type="text"
                                  value={traveller.firstName}
                                  onChange={(e) => updateTraveller(traveller.id, "firstName", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(traveller.id, 0, e)}
                                  placeholder="Type here"
                                  className="h-10 w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-3"
                                />
                              </div>

                              {/* Last Name */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Last Name
                                </label>
                                <input
                                  ref={(el) => {
                                    if (el) fieldRefs.current[`t${traveller.id}-f1`] = el;
                                  }}
                                  type="text"
                                  value={traveller.lastName}
                                  onChange={(e) => updateTraveller(traveller.id, "lastName", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(traveller.id, 1, e)}
                                  placeholder="Type here"
                                  className="h-10 w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-3"
                                />
                              </div>

                              {/* Age */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Age
                                </label>
                                <input
                                  ref={(el) => {
                                    if (el) fieldRefs.current[`t${traveller.id}-f4`] = el;
                                  }}
                                  type="text"
                                  value={traveller.age || ""}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 3);
                                    updateTraveller(traveller.id, "age", value);
                                  }}
                                  onKeyDown={(e) => handleKeyDown(traveller.id, 4, e)}
                                  placeholder="eg: 24"
                                  maxLength={3}
                                  className="h-10 w-full rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 px-3"
                                />
                              </div>
                            </div>

                            {/* Row 2: Nationality, Gender, Clear, Save */}
                            <div className="grid grid-cols-[220px_280px_1fr] gap-3 items-center">
                              {/* Nationality */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                  Nationality
                                </label>
                                <select
                                  ref={(el) => {
                                    if (el) fieldRefs.current[`t${traveller.id}-f3`] = el;
                                  }}
                                  value={traveller.nationality || "Indian"}
                                  onChange={(e) => updateTraveller(traveller.id, "nationality", e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(traveller.id, 3, e)}
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
                                    onClick={() => updateTraveller(traveller.id, "gender", "Male")}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all ${
                                      traveller.gender === "Male"
                                        ? "bg-blue-50 text-blue-600"
                                        : "bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Male
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTraveller(traveller.id, "gender", "Female")}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all border-l border-slate-300 ${
                                      traveller.gender === "Female"
                                        ? "bg-pink-50 text-pink-600"
                                        : "bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Female
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateTraveller(traveller.id, "gender", "Other")}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-4 font-medium text-xs transition-all border-l border-slate-300 ${
                                      traveller.gender === "Other"
                                        ? "bg-gray-100 text-gray-700"
                                        : "bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                    Other
                                  </button>
                                </div>
                              </div>

                              {/* Clear and Save buttons */}
                              <div className="flex items-center justify-end gap-3 mt-5">
                                <button
                                  onClick={() => {
                                    setTravellers(prev => prev.map(t => 
                                      t.id === traveller.id 
                                        ? { ...t, firstName: "", lastName: "", gender: "", nationality: "India", age: "", dateOfBirth: "", saved: false, linkedProfileId: null } 
                                        : t
                                    ));
                                  }}
                                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                  Clear
                                </button>
                                <button
                                  onClick={() => {
                                    if (traveller.firstName && traveller.lastName) {
                                      setTravellers(prev => prev.map(t => 
                                        t.id === traveller.id ? { ...t, saved: true } : t
                                      ));
                                    } else {
                                      setAlertMessage("Please fill in First Name and Last Name");
                                    }
                                  }}
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                          </>
                        )}
                    </div>
                ))}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" ref={pageRefs.contact}>
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-slate-700" />
                  Contact Details
                </h3>
                <p className="text-sm text-slate-500 mt-1">Your ticket & flight information will be sent here</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Country Code</label>
                    <select
                      value={contactDetails.countryCode}
                      onChange={(e) => setContactDetails({ ...contactDetails, countryCode: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent appearance-none text-slate-900 font-medium"
                    >
                      <option value="+91">India (+91)</option>
                      <option value="+1">USA (+1)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={contactDetails.mobile}
                      onChange={(e) => setContactDetails({ ...contactDetails, mobile: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-slate-900"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={contactDetails.email}
                      onChange={(e) => setContactDetails({ ...contactDetails, email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing address with State dropdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" ref={pageRefs.billing}>
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-slate-700" />
                  Billing Address
                </h3>
                <p className="text-sm text-slate-500 mt-1">Provide your billing address (mandatory)</p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={billingAddress.pincode}
                      onChange={(e) => setBillingAddress({ ...billingAddress, pincode: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                    <input
                      type="text"
                      value={billingAddress.address}
                      onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
                    <select
                      value={billingAddress.state}
                      onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent appearance-none text-slate-900 font-medium"
                    >
                      <option value="">Select State</option>
                      {indianStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-9 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Offers card */}
                {/* Offers Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
                            <Ticket className="w-5 h-5 mr-3 text-black-600"/>
                            Offers For You
                        </h3>
                        <div className="relative mb-4">
                            <input type="text" placeholder="Have a promocode?" className="w-full px-4 py-3 pr-24 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700">Redeem</button>
                        </div>
                        <div className="space-y-3">
                            {offers.map((offer: OfferData) => (
                                <div key={offer.id} className="flex items-start cursor-pointer" onClick={() => setSelectedOfferId(offer.id)}>
                                    <input type="radio" name="offer" checked={selectedOfferId === offer.id} readOnly className="mt-1" />
                                    <div className="ml-3">
                                        <p className="font-semibold text-slate-800 flex items-center">{offer.code} <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-md">Save ₹{offer.discount}</span></p>
                                        <p className="text-xs text-slate-500">{offer.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

              {/* Fare Summary */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                        <Receipt className="w-5 h-5 mr-3 text-black-600"/>
                        Fare Summary
                    </h3>
                  <p className="text-slate-500 text-sm ml-8">{numTravellers} {numTravellers === 1 ? 'Traveller' : 'Travellers'}</p>
                </div>

                <div className="p-6 space-y-3">
                  {/* Onward Fare */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">Onward Fare</span>
                      <span className="text-xs text-slate-500 mt-0.5">{numTravellers} × ₹{onwardFarePerPerson.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-base font-semibold text-slate-900">
                      ₹{(onwardFarePerPerson * numTravellers).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Return Fare (if round trip) */}
                  {tripType === 'roundTrip' && returnFlight && (
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">Return Fare</span>
                        <span className="text-xs text-slate-500 mt-0.5">{numTravellers} × ₹{returnFarePerPerson.toLocaleString('en-IN')}</span>
                      </div>
                      <span className="text-base font-semibold text-slate-900">
                        ₹{(returnFarePerPerson * numTravellers).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Cancellation Protection (if selected) */}
                  {cancellationProtectionFee > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">Cancellation Protection</span>
                        <span className="text-xs text-slate-500 mt-0.5">{numTravellers} × ₹{(cancellationProtectionFee / numTravellers).toFixed(0)}</span>
                      </div>
                      <span className="text-base font-semibold text-slate-900">
                        ₹{cancellationProtectionFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Reschedule Protection (if selected) */}
                  {rescheduleProtectionFee > 0 && (
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">Reschedule Protection</span>
                        <span className="text-xs text-slate-500 mt-0.5">{numTravellers} × ₹{(rescheduleProtectionFee / numTravellers).toFixed(0)}</span>
                      </div>
                      <span className="text-base font-semibold text-slate-900">
                        ₹{rescheduleProtectionFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Instant Discount */}
                  {instantOff > 0 && (
                    <div className="flex justify-between items-start pt-2 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-emerald-600">Instant Discount</span>
                        <span className="text-xs text-emerald-500 mt-0.5">Applied successfully</span>
                      </div>
                      <span className="text-base font-semibold text-emerald-600">
                        -₹{instantOff.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-4 mt-2 border-t-2 border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900">Total Amount</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">₹{totalAmount.toLocaleString('en-IN')}</div>
                        {instantOff > 0 && (
                          <p className="text-xs text-slate-400 line-through mt-0.5">
                            ₹{(totalAmount + instantOff).toLocaleString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alert Message */}
                  {alertMessage && (
                    <div className="mt-4">
                      <ElegantAlert
                        message={alertMessage}
                        type="error"
                        onClose={() => setAlertMessage(null)}
                      />
                    </div>
                  )}

                  <div className="mt-4 relative z-10">
                    <button 
                      onClick={validateAndContinue}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Continue
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-start space-x-2">
                      <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">100% Safe Payment Process</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <div className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">UPI</div>
                          <div className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">Credit Card</div>
                          <div className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">Net Banking</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      By clicking on continue, I confirm that I have read, understood, and agree with the{' '}
                      <a href="#" className="text-blue-600 hover:underline">Fare Rules</a>,{' '}
                      <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a> and{' '}
                      <a href="#" className="text-blue-600 hover:underline">Terms of Use</a>.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div> {/* end sidebar */}
        </div>
      </div>
    </div>
  );
};

export default FlightReviewPage;