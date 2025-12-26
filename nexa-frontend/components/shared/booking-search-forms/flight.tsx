"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronDown, MapPin, Users, ChevronLeft, ChevronRight, X, ArrowLeftRight, Baby, User } from "lucide-react";
import { Interface } from "readline";

interface Station {
  station_id?: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  points?: { name: string; code: string }[];
}


const FLIGHT_STATIONS: Station[] = [
  { name: 'Indira Gandhi International Airport', code: 'DEL', city: 'Delhi', state: 'Delhi' },
  { name: 'Chaudhary Charan Singh International Airport', code: 'LKO', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur Airport', code: 'KNU', city: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Chhatrapati Shivaji Maharaj International Airport', code: 'BOM', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Pune Airport', code: 'PNQ', city: 'Pune', state: 'Maharashtra' },
  { name: 'Sardar Vallabhbhai Patel International Airport', code: 'AMD', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Devi Ahilya Bai Holkar Airport', code: 'IDR', city: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Jaipur International Airport', code: 'JAI', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Manohar International Airport', code: 'GOX', city: 'Goa', state: 'Goa' },
  { name: 'Chennai International Airport', code: 'MAA', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Kempegowda International Airport', code: 'BLR', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Rajiv Gandhi International Airport', code: 'HYD', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Netaji Subhas Chandra Bose International Airport', code: 'CCU', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Lokpriya Gopinath Bordoloi International Airport', code: 'GAU', city: 'Guwahati', state: 'Assam' },
  { name: 'Biju Patnaik International Airport', code: 'BBI', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Cochin International Airport', code: 'COK', city: 'Kochi', state: 'Kerala' },
  { name: 'Jay Prakash Narayan Airport', code: 'PAT', city: 'Patna', state: 'Bihar' },
  { name: 'Agra Airport', code: 'AGR', city: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Visakhapatnam Airport', code: 'VTZ', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Shaheed Bhagat Singh International Airport', code: 'IXC', city: 'Chandigarh', state: 'Chandigarh' },
];


export default function FlightSearchForm() {
  const router = useRouter();
  
  // Initialize trip type - always start with "oneWay" for consistent SSR
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">("oneWay");
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeField, setActiveField] = useState<"departure" | "return" | null>(null);
  
  // For special fares - only one can be selected at a time
  const [selectedSpecialFare, setSelectedSpecialFare] = useState<"student" | "armedForces" | "seniorCitizen" | "family" | null>(null);
  
  // Dropdown states
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showTravellersDropdown, setShowTravellersDropdown] = useState(false);
  
  // From/To selection state
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  const [selectedFrom, setSelectedFrom] = useState<Station | null>(null);
  const [selectedTo, setSelectedTo] = useState<Station | null>(null);
  const [showSameAirportError, setShowSameAirportError] = useState(false);
  const [freeCancellation, setFreeCancellation] = useState(false);
  
  // Travellers state
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState<"Economy" | "Premium" | "Business">("Economy");
  
  // Refs for dropdowns
  const fromFieldRef = useRef<HTMLDivElement>(null);
  const toFieldRef = useRef<HTMLDivElement>(null);
  const travellersFieldRef = useRef<HTMLDivElement>(null);

  // Date state - Initialize with null for consistent SSR
  const today = new Date();
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  
  // Set default dates after mount to avoid hydration issues
  useEffect(() => {
    if (!departureDate) {
      setDepartureDate(new Date());
    }
  }, [departureDate]);
  
  // Temporary state for date selection before applying
  const [tempDepartureDate, setTempDepartureDate] = useState<Date | null>(departureDate);
  const [tempReturnDate, setTempReturnDate] = useState<Date | null>(returnDate);
  
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Start with current month
  const [showReturnDateError, setShowReturnDateError] = useState(false);
  
  // References for field positioning
  const departureFieldRef = useRef<HTMLDivElement>(null);
  const returnFieldRef = useRef<HTMLDivElement>(null);
  
  // Create state for calendar and dropdown positioning
  const [departureRect, setDepartureRect] = useState({ top: 0, left: 0, width: 0 });
  const [returnRect, setReturnRect] = useState({ top: 0, left: 0, width: 0 });
  const [fromRect, setFromRect] = useState({ top: 0, left: 0, width: 0 });
  const [toRect, setToRect] = useState({ top: 0, left: 0, width: 0 });
  const [travellersRect, setTravellersRect] = useState({ top: 0, left: 0, width: 0 });
  
  // Update position references when fields are mounted/updated or dropdown visibility changes
  useEffect(() => {
    const updatePositions = () => {
      if (showCalendar && departureFieldRef.current && activeField === "departure") {
        const rect = departureFieldRef.current.getBoundingClientRect();
        setDepartureRect({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
      
      if (showCalendar && returnFieldRef.current && activeField === "return") {
        const rect = returnFieldRef.current.getBoundingClientRect();
        setReturnRect({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
      
      if (showFromDropdown && fromFieldRef.current) {
        const rect = fromFieldRef.current.getBoundingClientRect();
        setFromRect({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
      
      if (showToDropdown && toFieldRef.current) {
        const rect = toFieldRef.current.getBoundingClientRect();
        setToRect({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
      
      if (showTravellersDropdown && travellersFieldRef.current) {
        const rect = travellersFieldRef.current.getBoundingClientRect();
        setTravellersRect({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      }
    };

    updatePositions();
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [showCalendar, activeField, showFromDropdown, showToDropdown, showTravellersDropdown]);
  
  // Initialize temp dates when calendar opens
  useEffect(() => {
    if (showCalendar) {
      setTempDepartureDate(departureDate);
      setTempReturnDate(returnDate);
    }
  }, [showCalendar]);
  
  // Filter airports based on search
  const filteredFromAirports = FLIGHT_STATIONS.filter(station => 
    station.city.toLowerCase().includes(fromSearch.toLowerCase()) ||
    station.code.toLowerCase().includes(fromSearch.toLowerCase()) ||
    station.name.toLowerCase().includes(fromSearch.toLowerCase()) ||
    (station.state ?? "").toLowerCase().includes(fromSearch.toLowerCase())
  );
  
  const filteredToAirports = FLIGHT_STATIONS.filter(station => 
    station.city.toLowerCase().includes(toSearch.toLowerCase()) ||
    station.code.toLowerCase().includes(toSearch.toLowerCase()) ||
    station.name.toLowerCase().includes(toSearch.toLowerCase()) ||
    (station.state ?? "").toLowerCase().includes(toSearch.toLowerCase())
  );
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if clicking on dropdown containers
      const isClickInFromDropdown = target.closest('.from-dropdown-container');
      const isClickInToDropdown = target.closest('.to-dropdown-container');
      const isClickInTravellersDropdown = target.closest('.travellers-dropdown-container');
      
      const isClickOnFrom = target.closest('[data-field="from"]');
      const isClickOnTo = target.closest('[data-field="to"]');
      const isClickOnTravellers = target.closest('[data-field="travellers"]');
      
      if (showFromDropdown && !isClickInFromDropdown && !isClickOnFrom) {
        setShowFromDropdown(false);
      }
      
      if (showToDropdown && !isClickInToDropdown && !isClickOnTo) {
        setShowToDropdown(false);
      }
      
      if (showTravellersDropdown && !isClickInTravellersDropdown && !isClickOnTravellers) {
        setShowTravellersDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFromDropdown, showToDropdown, showTravellersDropdown]);
  
  // Swap From and To
  const handleSwapAirports = () => {
    const tempFrom = selectedFrom;
    const tempTo = selectedTo;
    setSelectedFrom(tempTo);
    setSelectedTo(tempFrom);
  };

  const toYMD = (d: Date) => {
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, '0');
    const day = String(dd.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };


  // Validate that From and To are different
  useEffect(() => {
    if (selectedFrom && selectedTo && selectedFrom.code === selectedTo.code) {
      setShowSameAirportError(true);
      setTimeout(() => setShowSameAirportError(false), 3000);
    }
  }, [selectedFrom, selectedTo]);

  // Get traveller summary
  const getTravellerSummary = () => {
    const total = adults + children + infants;
    return `${total} Traveller${total > 1 ? 's' : ''}, ${travelClass}`;
  };
  
  // Helper function to get days in month for calendar
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysArray: (Date | null)[] = [];
    
    // Add empty spots for days before the 1st of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysArray.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      daysArray.push(new Date(year, month, day));
    }
    
    // Optionally pad the end to complete the grid
    const remainingCells = 42 - daysArray.length; // 6 rows x 7 days
    for (let i = 0; i < remainingCells; i++) {
      daysArray.push(null);
    }
    
    return daysArray;
  };
  
  // Format dates for display
  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return "";
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    
    return `${dayName}, ${dayNum} ${month}`;
  };
  
  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is part of the departure or return field
      const isClickOnDeparture = (event.target as Element)?.closest('[data-field="departure"]');
      const isClickOnReturn = (event.target as Element)?.closest('[data-field="return"]');
      
      // Check if clicking on any calendar element
      const isClickInCalendar = (event.target as Element)?.closest('.calendar-container');
      
      // Only close calendar if click is outside relevant elements
      if (!isClickInCalendar && !isClickOnDeparture && !isClickOnReturn) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeField]);

  // Handle date selection (just update temp state based on active field)
  const handleDateSelect = (date: Date) => {
    if (activeField === "departure") {
      setTempDepartureDate(date);
      setShowReturnDateError(false);
    } else if (activeField === "return") {
      // Check if return date is before departure date
      if (tempDepartureDate && date < tempDepartureDate) {
        setShowReturnDateError(true);
        setTimeout(() => setShowReturnDateError(false), 2000); // Reset after 2 seconds
        return;
      }
      setTempReturnDate(date);
      setShowReturnDateError(false);
    }
  };
  
  // Apply the selected dates
  const handleApply = () => {
    setDepartureDate(tempDepartureDate);
    setReturnDate(tempReturnDate);
    setShowCalendar(false);
  };

  // Get the next month
  const getNextMonth = (date: Date): Date => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  // Navigate to previous month
  const handlePrevMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  // Check if a date is in the range between departure and return
  const isInRange = (date: Date): boolean => {
    if (tripType === "oneWay") return false;
    if (!tempDepartureDate || !tempReturnDate) return false;
    return date > tempDepartureDate && date < tempReturnDate;
  };

  // Auto-switch to round trip when clicking on return field
  const handleReturnClick = () => {
    setTripType("roundTrip");
    if (typeof window !== 'undefined') {
      localStorage.setItem('tripType', 'roundTrip');
    }
    
    setActiveField("return");
    setShowCalendar(true);
    
    if (!departureDate) {
      setDepartureDate(new Date());
      setTempDepartureDate(new Date());
    }
    
    if (!returnDate) {
      const newReturnDate = new Date();
      newReturnDate.setDate(newReturnDate.getDate() + 1);
      setReturnDate(newReturnDate);
      setTempReturnDate(newReturnDate);
    }
  };
  
  // Handle toggle between Departure and Return in calendar
  const handleToggleChange = (field: "departure" | "return") => {
    // If in one-way mode and trying to select return, switch to round trip
    if (tripType === "oneWay" && field === "return") {
      setTripType("roundTrip");
      if (typeof window !== 'undefined') {
        localStorage.setItem('tripType', 'roundTrip');
      }
      
      // Set default return date if not set
      if (!tempReturnDate) {
        const newReturnDate = new Date(tempDepartureDate || new Date());
        newReturnDate.setDate(newReturnDate.getDate() + 1);
        setTempReturnDate(newReturnDate);
      }
    }
    
    setActiveField(field);
  };

  // Render calendar dates
  const renderCalendarDates = (monthDate: Date) => {
    return getDaysInMonth(monthDate).map((day, index) => {
      const isToday = day && day.getDate() === today.getDate() && 
                      day.getMonth() === today.getMonth() && 
                      day.getFullYear() === today.getFullYear();
      
      const isSelected = day && tempDepartureDate && 
                        day.getDate() === tempDepartureDate.getDate() && 
                        day.getMonth() === tempDepartureDate.getMonth() && 
                        day.getFullYear() === tempDepartureDate.getFullYear();
      
      const isReturnDate = day && tempReturnDate && 
                          day.getDate() === tempReturnDate.getDate() && 
                          day.getMonth() === tempReturnDate.getMonth() && 
                          day.getFullYear() === tempReturnDate.getFullYear();
      
      const isInSelectionRange = day && isInRange(day);
      
      const isPast = day && day < today;
      
      const isEndOfWeek = day && day.getDay() === 6;
      const isStartOfWeek = day && day.getDay() === 0;
      
      // Show background bar only when both dates are selected
      const showRangeBar = tempDepartureDate && tempReturnDate && (isInSelectionRange || isSelected || isReturnDate);
      
      // Check if date is before departure (for return date selection)
      const isBeforeDeparture = activeField === "return" && tempDepartureDate && day && day < tempDepartureDate;
      const isDisabled = isPast || isBeforeDeparture;
      
      return (
        <div 
          key={index} 
          className={`h-10 flex items-center justify-center relative transition-all ${
            !day ? 'invisible' : 
            isDisabled ? 'text-gray-300 cursor-not-allowed' : 
            'cursor-pointer'
          }`}
          onClick={() => !isDisabled && day && handleDateSelect(day)}
        >
          {/* Background bar for range */}
          {day && showRangeBar && (
            <div 
              className={`absolute inset-0 bg-blue-100 ${
                isSelected ? 'rounded-l-full' : 
                isReturnDate ? 'rounded-r-full' : 
                isStartOfWeek && isInSelectionRange ? 'rounded-l-full' :
                isEndOfWeek && isInSelectionRange ? 'rounded-r-full' : ''
              }`}
              style={{ zIndex: 0 }}
            />
          )}
          
          {/* Date circle */}
          <div 
            className={`relative z-10 h-10 w-10 flex items-center justify-center rounded-full ${
              !day ? 'invisible' : 
              isDisabled ? '' : 
              isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 
              isReturnDate ? 'bg-blue-600 text-white hover:bg-blue-700' : 
              isInSelectionRange ? 'text-blue-800 hover:bg-blue-200' : 
              isToday ? 'border border-blue-400 text-blue-600 font-medium hover:bg-gray-100' : 
              'hover:bg-gray-100'
            }`}
          >
            {day ? day.getDate() : ''}
          </div>
        </div>
      );
    });
  };

  // Handle search - navigate to booking/flight page with search parameters
  const handleSearch = () => {
    if (!selectedFrom || !selectedTo) { alert("Please select departure and arrival airports"); return; }
    if (!departureDate) { alert("Please select a departure date"); return; }
    if (tripType === "roundTrip" && !returnDate) { alert("Please select a return date"); return; }

    const params = new URLSearchParams({
      source: selectedFrom.code,           // Airport code for API
      destination: selectedTo.code,        // Airport code for API
      departure_date: toYMD(departureDate), // YYYY-MM-DD format
      tripType,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      class: travelClass,
    });

    if (tripType === "roundTrip" && returnDate) {
      params.append("return_date", toYMD(returnDate)); // YYYY-MM-DD format
    }

    router.push(`/booking/flight?${params.toString()}`);
  };


  return (
    <div className="px-2 md:px-4 py-4 md:py-6 relative w-full" id="search-box-container" style={{ overflow: 'visible' }}>
      {/* Trip type selector */}
      <div className="flex gap-4 mb-6">
        <button
          className={`py-2 px-6 rounded-full text-base border ${
            tripType === "oneWay"
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-gray-300 text-gray-600"
          }`}
          onClick={() => {
            setTripType("oneWay");
            setReturnDate(null);
            if (typeof window !== 'undefined') {
              localStorage.setItem('tripType', 'oneWay');
            }
          }}
        >
          One Way
        </button>
        <button
          className={`py-2 px-6 rounded-full text-base border ${
            tripType === "roundTrip"
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "bg-white border-gray-300 text-gray-600"
          }`}
          onClick={() => {
            setTripType("roundTrip");
            if (typeof window !== 'undefined') {
              localStorage.setItem('tripType', 'roundTrip');
            }
            
            if (!returnDate) {
              const newReturnDate = new Date();
              newReturnDate.setDate(newReturnDate.getDate() + 1);
              setReturnDate(newReturnDate);
            }
          }}
        >
          Round Trip
        </button>
        
        {/* Green checkmark for Hassle-Free Bookings */}
        <div className="ml-auto flex items-center text-green-700 gap-1.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#DCFCE7" stroke="#16A34A" strokeWidth="2"/>
            <path d="M8 12L11 15L16 9" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-medium">Hassle-Free Bookings</span>
        </div>
      </div>

      {/* Main search form */}
      <div className="flex flex-col lg:flex-row bg-gray-100 rounded-xl relative h-24 w-full border-l border-t border-b border-gray-200">
        {/* From */}
        <div 
          className="lg:flex-[2] p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 h-full lg:min-w-[240px] rounded-l-2xl"
          style={{ zIndex: showFromDropdown ? 10 : 1 }}
        >
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">From</label>
            <div 
              className="flex items-center gap-2 cursor-pointer justify-between" 
              data-field="from"
              ref={fromFieldRef}
              onClick={() => setShowFromDropdown(!showFromDropdown)}
            >
              <div className="flex items-center gap-2 flex-1">
                <MapPin size={18} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="From" 
                  value={selectedFrom ? `${selectedFrom.code} - ${selectedFrom.city}` : fromSearch}
                  onChange={(e) => {
                    setFromSearch(e.target.value);
                    setSelectedFrom(null);
                    setShowFromDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredFromAirports.length > 0) {
                      e.preventDefault();
                      setSelectedFrom(filteredFromAirports[0]);
                      setFromSearch("");
                      setShowFromDropdown(false);
                    }
                  }}
                  className="w-full bg-transparent text-lg focus:outline-none"
                />
              </div>
              {selectedFrom && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFrom(null);
                    setFromSearch("");
                    setShowFromDropdown(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition"
                  aria-label="Clear From"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="hidden lg:flex items-center justify-center absolute left-[calc(40%/5*2)] top-1/2 translate-x-5 -translate-y-1/2 z-20">
          <button
            onClick={handleSwapAirports}
            className="w-9 h-9 rounded-full bg-gray-100 border border-gray-300 hover:bg-gray-200 hover:border-gray-400 transition-all flex items-center justify-center shadow-sm"
            title="Swap airports"
          >
            <ArrowLeftRight size={16} className="text-gray-600" />
          </button>
        </div>
        
        {/* To */}
        <div 
          className="lg:flex-[2] p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 h-full lg:min-w-[240px]"
          style={{ zIndex: showToDropdown ? 10 : 1 }}
        >
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">To</label>
            <div 
              className="flex items-center gap-2 cursor-pointer justify-between"
              data-field="to"
              ref={toFieldRef}
              onClick={() => setShowToDropdown(!showToDropdown)}
            >
              <div className="flex items-center gap-2 flex-1">
                <MapPin size={18} className="text-gray-400" />
                <input 
                  type="text" 
                  placeholder="To" 
                  value={selectedTo ? `${selectedTo.code} - ${selectedTo.city}` : toSearch}
                  onChange={(e) => {
                    setToSearch(e.target.value);
                    setSelectedTo(null);
                    setShowToDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredToAirports.length > 0) {
                      e.preventDefault();
                      setSelectedTo(filteredToAirports[0]);
                      setToSearch("");
                      setShowToDropdown(false);
                    }
                  }}
                  className="w-full bg-transparent text-lg focus:outline-none"
                />
              </div>
              {selectedTo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTo(null);
                    setToSearch("");
                    setShowToDropdown(true);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition"
                  aria-label="Clear To"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Departure */}
        <div className="lg:flex-[2] p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 relative h-full lg:min-w-[200px]" style={{ zIndex: showCalendar && activeField === "departure" ? 10 : 1 }}>
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Departure</label>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              data-field="departure"
              ref={departureFieldRef}
              onClick={() => {
                if (showCalendar && activeField === "departure") {
                  setShowCalendar(false);
                } else {
                  setActiveField("departure");
                  setShowCalendar(true);
                }
              }}
            >
              <CalendarIcon size={18} className="text-gray-400" />
              <div className="w-full text-lg">
                {departureDate ? formatDisplayDate(departureDate) : "Select Date"}
              </div>
            </div>
          </div>
        </div>
        
        {/* Return */}
        <div 
          className={`lg:flex-[2] p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 relative h-full lg:min-w-[200px] ${tripType === "oneWay" ? "opacity-50" : ""}`}
          style={{ zIndex: showCalendar && activeField === "return" ? 10 : 1 }}
        >
          {/* X icon at top right corner */}
          {returnDate && tripType === "roundTrip" && (
            <X size={16} 
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 cursor-pointer z-10" 
              onClick={(e) => {
                e.stopPropagation();
                setReturnDate(null);
              }}
            />
          )}
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Return</label>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              data-field="return"
              ref={returnFieldRef}
              onClick={handleReturnClick}
            >
              <CalendarIcon size={18} className="text-gray-400" />
              <div className="w-full text-lg">
                {returnDate && tripType === "roundTrip" ? formatDisplayDate(returnDate) : ""}
              </div>
            </div>
          </div>
        </div>
        
        {/* Travellers & Class */}
        <div 
          className="lg:flex-[2] p-4 border-b lg:border-b-0 border-gray-200 bg-gray-50 h-full lg:min-w-[220px]"
          style={{ zIndex: showTravellersDropdown ? 10 : 1 }}
        >
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Travellers & Class</label>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              data-field="travellers"
              ref={travellersFieldRef}
              onClick={() => setShowTravellersDropdown(!showTravellersDropdown)}
            >
              <Users size={18} className="text-gray-400" />
              <div className="w-full text-base">
                <span>{getTravellerSummary()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search Button */}
        <div className="lg:w-52 h-full w-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-xl overflow-hidden">
          <Button 
            onClick={handleSearch}
            className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium text-lg rounded-r-xl"
            style={{ minHeight: '100%' }}
          >
            <div className="flex items-center">
              <span>Search</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-1">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Button>
        </div>
      </div>

      {/* Same Airport Error Popup */}
      {showSameAirportError && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">Departure and arrival airports cannot be the same</h3>
            <p className="text-xs text-red-600 mt-1">Please select different airports for your journey</p>
          </div>
        </div>
      )}

      {/* Special fare options */}
      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-3">Special Fares (Optional):</p>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");}}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "student" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Student Fare
          </button>
          
          <button
            onClick={() => {window.open("https://www.youtube.com/watch?v=DlXjwuUiPjE&list=RDDlXjwuUiPjE&start_radio=1", "_blank");}}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "armedForces" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Armed Forces
          </button>
          
          <button
            onClick={() => {window.open("https://youtu.be/5dVmzw1Xbao?si=dstnigv9lGAawJYe&t=18", "_blank");}}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "seniorCitizen" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Senior Citizen
          </button>
          
          <button
           onClick={() => {window.open("https://youtu.be/hfyaAymL_To?si=juCayPJRPFz5qwaW&t=42", "_blank");}}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "family" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Family Fare
          </button>
        </div>
      </div>
      
      {/* Free cancellation option */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <label 
          className="flex items-start gap-3 cursor-pointer group"
          onClick={() => setFreeCancellation(!freeCancellation)}
        >
          <div 
            className={`w-5 h-5 mt-0.5 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
              freeCancellation 
                ? 'bg-green-500 border-green-500' 
                : 'bg-white border-gray-300 group-hover:border-green-400'
            }`}
          >
            <svg 
              className={`w-3 h-3 text-white transition-opacity ${
                freeCancellation ? 'opacity-100' : 'opacity-0'
              }`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-green-700 group-hover:text-green-800 transition-colors">Always opt for Free Cancellation</div>
            <div className="flex flex-wrap text-xs text-gray-500 mt-1 gap-x-2">
              <span className="flex items-center">₹0 cancellation fee</span>
              <span>•</span>
              <span>Instant refunds, no questions asked</span>
              <span>•</span>
              <span>Priority customer service</span>
            </div>
          </div>
        </label>
      </div>
      
      {/* Fixed position calendar for both departure and return */}
      {showCalendar && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-xl p-4 border border-gray-200 calendar-container"
          style={{ 
            width: '650px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 650 - 10, departureRect.left - 20))}px`, 
            top: `${departureRect.top + 30}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          
          {/* Calendar content */}
          <div className="flex flex-col">
            {/* Header with Toggle and Apply Button */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-1 relative">
                  {/* Sliding background indicator */}
                  <div 
                    className="absolute inset-y-1 bg-white shadow-sm rounded-md transition-all duration-300 ease-in-out"
                    style={{
                      width: 'calc(50% - 4px)',
                      transform: activeField === "return" ? 'translateX(calc(100% + 0px))' : 'translateX(0)',
                      left: '4px'
                    }}
                  />
                  
                  <button
                    onClick={() => handleToggleChange("departure")}
                    className={`relative z-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ${
                      activeField === "departure"
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Departure
                  </button>
                  <button
                    onClick={() => handleToggleChange("return")}
                    className={`relative z-10 px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-300 ${
                      activeField === "return"
                        ? "text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Return
                  </button>
                </div>
                
                <div className={`text-sm ${showReturnDateError ? 'text-red-500' : 'text-gray-500'}`}>
                  {showReturnDateError 
                    ? "Can't return prior to departure" 
                    : activeField === "departure" 
                      ? "Select departure date" 
                      : "Select return date"}
                </div>
              </div>
              
              {/* Apply Button - Top right corner */}
              <Button 
                onClick={handleApply}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium px-15 py-6 rounded-lg"
              >
                Apply
              </Button>
            </div>
            
            {/* Calendar header */}
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronLeft size={24} className="text-gray-600" />
              </button>
              
              <div className="flex gap-4 flex-grow justify-center">
                <h2 className="font-medium text-lg text-center w-[45%]">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <h2 className="font-medium text-lg text-center w-[45%]">
                  {getNextMonth(currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
              </div>
              
              <button 
                onClick={handleNextMonth}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <ChevronRight size={24} className="text-gray-600" />
              </button>
            </div>
            
            {/* Double calendar view */}
            <div className="flex gap-4 flex-wrap md:flex-nowrap">
              {/* First month */}
              <div className="w-full md:w-1/2">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="h-8 flex items-center justify-center text-sm text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-y-1">
                  {renderCalendarDates(currentMonth)}
                </div>
              </div>
              
              {/* Second month */}
              <div className="w-full md:w-1/2">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <div key={index} className="h-8 flex items-center justify-center text-sm text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 gap-y-1">
                  {renderCalendarDates(getNextMonth(currentMonth))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed position From dropdown */}
      {showFromDropdown && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto from-dropdown-container"
          style={{ 
            width: '415px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 410, fromRect.left))}px`, 
            top: `${fromRect.top + 20}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Dropdown pointer */}
          <div 
            className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2 left-6"
            style={{ zIndex: 10000 }}
          ></div>
          
          {/* Airport list */}
          {filteredFromAirports.length > 0 ? (
            filteredFromAirports.map((airport) => {
              const isSameAsTo = selectedTo && airport.code === selectedTo.code;
              return (
                <div
                  key={airport.code}
                  className={`p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                    isSameAsTo 
                      ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isSameAsTo) {
                      setSelectedFrom(airport);
                      setFromSearch("");
                      setShowFromDropdown(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-gray-700">{airport.code}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{airport.city}, {airport.state}</div>
                      <div className="text-sm text-gray-500">{airport.name}</div>
                    </div>
                    {isSameAsTo && (
                      <div className="text-xs text-red-500 font-medium">Already selected</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-500">No airports found</div>
          )}
        </div>
      )}
      
      {/* Fixed position To dropdown */}
      {showToDropdown && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto to-dropdown-container"
          style={{ 
            width: '415px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 410, toRect.left))}px`, 
            top: `${toRect.top + 20}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Dropdown pointer */}
          <div 
            className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2 left-6"
            style={{ zIndex: 10000 }}
          ></div>
          
          {/* Airport list */}
          {filteredToAirports.length > 0 ? (
            filteredToAirports.map((airport) => {
              const isSameAsFrom = selectedFrom && airport.code === selectedFrom.code;
              return (
                <div
                  key={airport.code}
                  className={`p-4 border-b border-gray-100 last:border-b-0 transition-colors ${
                    isSameAsFrom 
                      ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isSameAsFrom) {
                      setSelectedTo(airport);
                      setToSearch("");
                      setShowToDropdown(false);
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-gray-700">{airport.code}</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{airport.city}</div>
                      <div className="text-sm text-gray-500">{airport.name}</div>
                      {airport.state && (
                        <div className="text-xs text-gray-400 mt-0.5">{airport.state}</div>
                      )}
                    </div>
                    {isSameAsFrom && (
                      <div className="text-xs text-red-500 font-medium">Already selected</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-gray-500">No airports found</div>
          )}
        </div>
      )}
      
      {/* Fixed position Travellers dropdown */}
      {showTravellersDropdown && (
        <div 
          className="fixed z-[9999] bg-white rounded-xl shadow-2xl border border-gray-200 travellers-dropdown-container"
          style={{ 
            width: '380px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 390, travellersRect.left - 100))}px`, 
            top: `${travellersRect.top + 40}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Dropdown pointer */}
          <div 
            className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2"
            style={{ 
              zIndex: 10000,
              left: `${Math.min(150, travellersRect.width / 2)}px`
            }}
          ></div>
          
          <div className="p-5">
            {/* Adults */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Adults</div>
                  <div className="text-xs text-gray-500">12+ years</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdults(Math.max(1, adults - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center"
                  disabled={adults <= 1}
                >
                  <span className="text-gray-500 font-semibold">−</span>
                </button>
                <span className="w-8 text-center font-semibold text-gray-700">{adults}</span>
                <button
                  onClick={() => {
                    const total = adults + children;
                    if (total < 10) {
                      setAdults(adults + 1);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={adults + children >= 10}
                >
                  <span className="text-gray-500 font-semibold">+</span>
                </button>
              </div>
            </div>
            
            {/* Children */}
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Baby size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Children</div>
                  <div className="text-xs text-gray-500">2-12 years</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChildren(Math.max(0, children - 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center"
                >
                  <span className="text-gray-500 font-semibold">−</span>
                </button>
                <span className="w-8 text-center font-semibold text-gray-700">{children}</span>
                <button
                  onClick={() => {
                    const total = adults + children;
                    if (total < 10) {
                      setChildren(children + 1);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={adults + children >= 10}
                >
                  <span className="text-gray-500 font-semibold">+</span>
                </button>
              </div>
            </div>

            {/* Max travellers warning */}
            {adults + children >= 10 && (
              <div className="mb-4 text-xs text-orange-600 bg-orange-50 p-2 rounded-md">
                Maximum 10 travellers allowed per booking
              </div>
            )}
            
            {/* Class Section */}
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-600 mb-2">Travel Class</div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTravelClass("Economy")}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    travelClass === "Economy"
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Economy
                </button>
                <button
                  onClick={() => setTravelClass("Premium")}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    travelClass === "Premium"
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Premium
                </button>
                <button
                  onClick={() => setTravelClass("Business")}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${
                    travelClass === "Business"
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  Business
                </button>
              </div>
            </div>
            
            {/* Done Button */}
            <Button
              onClick={() => setShowTravellersDropdown(false)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg mt-2"
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
