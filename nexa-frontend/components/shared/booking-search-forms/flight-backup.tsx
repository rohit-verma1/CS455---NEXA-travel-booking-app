 "use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronDown, MapPin, Users, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function FlightSearchForm() {
  // Initialize trip type from localStorage if available, otherwise default to "oneWay"
  const initialTripType = typeof window !== 'undefined' ? 
    (localStorage.getItem('tripType') as "oneWay" | "roundTrip" || "oneWay") : 
    "oneWay";
  
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">(initialTripType);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeField, setActiveField] = useState<"departure" | "return" | null>(null);
  
  // For special fares - only one can be selected at a time
  const [selectedSpecialFare, setSelectedSpecialFare] = useState<"student" | "armedForces" | "seniorCitizen" | "family" | null>(null);

  // Date state
  const today = new Date(); // Use the actual current date
  const [departureDate, setDepartureDate] = useState<Date | null>(() => {
    // Default departure to today
    return new Date();
  });
  const [returnDate, setReturnDate] = useState<Date | null>(() => {
    // For oneWay trips, return date should be null
    if (typeof window !== "undefined" && localStorage.getItem("tripType") === "oneWay") {
      return null;
    }
    // Otherwise set default return to today + 1 days for a standard trip
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 1);
    return returnDate;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date()); // Start with current month
  
  // References for field positioning
  const departureFieldRef = useRef<HTMLDivElement>(null);
  const returnFieldRef = useRef<HTMLDivElement>(null);
  
  // Create state for calendar positioning
  const [departureRect, setDepartureRect] = useState({ top: 0, left: 0, width: 0 });
  const [returnRect, setReturnRect] = useState({ top: 0, left: 0, width: 0 });
  
  // Update position references when fields are mounted/updated or calendar visibility changes
  useEffect(() => {
    if (showCalendar && departureFieldRef.current && activeField === "departure") {
      const rect = departureFieldRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setDepartureRect({
        top: rect.bottom + scrollTop,
        left: rect.left,
        width: rect.width
      });
    }
    
    if (showCalendar && returnFieldRef.current && activeField === "return") {
      const rect = returnFieldRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setReturnRect({
        top: rect.bottom + scrollTop,
        left: rect.left,
        width: rect.width
      });
    }
  }, [showCalendar, activeField]);
  
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
      
      console.log("Click outside check:", { 
        isClickInCalendar,
        isClickOnDeparture,
        isClickOnReturn
      });
      
      // Only close calendar if click is outside relevant elements
      if (!isClickInCalendar && !isClickOnDeparture && !isClickOnReturn) {
        console.log("Closing calendar from outside click");
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeField]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (tripType === "oneWay") {
      // In one-way mode, simply set the departure date and close calendar
      setDepartureDate(date);
      // Ensure return date is null in one-way mode
      setReturnDate(null);
      // Close calendar after selection in one-way mode
      setShowCalendar(false);
    } else if (activeField === "departure") {
      // When selecting a departure date in round trip mode
      const newDepartureDate = date;
      
      // If departure date is after existing return date, swap them
      if (returnDate && newDepartureDate > returnDate) {
        setDepartureDate(returnDate);
        setReturnDate(newDepartureDate);
        // Focus switches to return field
        setActiveField("return");
      } else {
        // Normal case - just set departure date
        setDepartureDate(newDepartureDate);
        
        // If no return date is set, focus on return field
        if (!returnDate) {
          setActiveField("return");
          // Set default return date to departure date + 1 days
          const newReturnDate = new Date(newDepartureDate);
          newReturnDate.setDate(newReturnDate.getDate() + 1);
          setReturnDate(newReturnDate);
        }
      }
    } else if (activeField === "return") {
      // When selecting a return date
      const newReturnDate = date;
      
      // If selected date is before departure date, swap them
      if (departureDate && newReturnDate < departureDate) {
        setReturnDate(departureDate);
        setDepartureDate(newReturnDate);
      } else {
        setReturnDate(newReturnDate);
      }
      // For return date, always close calendar after selection
      setShowCalendar(false);
    }
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
    // In one-way mode, no date should be in a range
    if (tripType === "oneWay") return false;
    
    // In round trip mode, check if between departure and return
    if (!departureDate || !returnDate) return false;
    return date > departureDate && date < returnDate;
  };

  // Auto-switch to round trip when clicking on return field
  const handleReturnClick = () => {
    // Always switch to round trip mode when clicking on return
    setTripType("roundTrip");
    if (typeof window !== 'undefined') {
      localStorage.setItem('tripType', 'roundTrip');
    }
    
    setActiveField("return");
    setShowCalendar(true);
    
    // If no departure date is set, default to today
    if (!departureDate) {
      setDepartureDate(new Date());
    }
    
    // If no return date is set, default to today + 1 days
    if (!returnDate) {
      const newReturnDate = new Date();
      newReturnDate.setDate(newReturnDate.getDate() + 1);
      setReturnDate(newReturnDate);
    }
  };

  return (
    <div className="p-4 md:p-6 relative" id="search-box-container" style={{ overflow: 'visible' }}>
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
            
            // If no return date is set, default to today + 1 days
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

      {/* Main search form - connected boxes */}
  <div className="flex flex-col lg:flex-row bg-gray-100 rounded-lg relative h-24">
        {/* From */}
  <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 h-full">
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">From</label>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="From" 
                className="w-full bg-transparent text-lg focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        {/* To */}
  <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 h-full">
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">To</label>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="To" 
                className="w-full bg-transparent text-lg focus:outline-none"
              />
            </div>
          </div>
        </div>
        
        {/* Departure */}
  <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 relative h-full" style={{ zIndex: showCalendar && activeField === "departure" ? 10 : 1 }}>
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Departure</label>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              data-field="departure"
              ref={departureFieldRef}
              onClick={() => {
                console.log("Departure clicked");
                setActiveField("departure");
                setShowCalendar(true);
                console.log("Calendar should show:", true);
              }}
            >
              <CalendarIcon size={18} className="text-gray-400" />
              <div className="w-full text-lg">
                {departureDate ? formatDisplayDate(departureDate) : "Select Date"}
              </div>
            </div>
          </div>
          
          {/* Calendar rendered fixed position at the bottom of the component */}
        </div>
        
        {/* Return */}
        <div 
          className={`flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50 relative h-full ${tripType === "oneWay" ? "opacity-50" : ""}`}
          style={{ zIndex: showCalendar && activeField === "return" ? 10 : 1 }}
        >
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Return</label>
            <div 
              className="flex items-center gap-2 cursor-pointer"
              data-field="return"
              ref={returnFieldRef}
              onClick={handleReturnClick} // Always call handleReturnClick regardless of trip type
            >
              <CalendarIcon size={18} className="text-gray-400" />
              <div className="w-full text-lg flex items-center justify-between">
                <span>
                  {returnDate && tripType === "roundTrip" ? formatDisplayDate(returnDate) : ""}
                </span>
                {returnDate && tripType === "roundTrip" && (
                  <X 
                    size={16} 
                    className="text-gray-500 hover:text-gray-800" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setReturnDate(null);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          
          {/* Calendar now rendered as fixed position at the bottom */}
        </div>
        
        {/* Travellers & Class */}
  <div className="w-40 p-4 border-b lg:border-b-0 border-gray-200 bg-gray-50 h-full">
          <div className="flex flex-col h-full">
            <label className="text-sm text-gray-500 mb-1">Travellers & Class</label>
            <div className="flex items-center gap-2">
              <Users size={18} className="text-gray-400" />
              <div className="w-full text-lg flex items-center justify-between">
                <span>1 Traveller, Economy</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search Button */}
        <div className="lg:w-40 h-full w-full lg:bg-gradient-to-r from-blue-500 to-indigo-600 rounded-r-xl overflow-hidden">
          <Button 
            className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:bg-blue-600 text-white font-medium text-lg rounded-r-xl"
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

      {/* Special fare options */}
      <div className="mt-6">
        <p className="text-sm text-gray-600 mb-3">Special Fares (Optional):</p>
        
        {/* Special fare toggles */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedSpecialFare(selectedSpecialFare === "student" ? null : "student")}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "student" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Student Fare
          </button>
          
          <button
            onClick={() => setSelectedSpecialFare(selectedSpecialFare === "armedForces" ? null : "armedForces")}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "armedForces" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Armed Forces
          </button>
          
          <button
            onClick={() => setSelectedSpecialFare(selectedSpecialFare === "seniorCitizen" ? null : "seniorCitizen")}
            className={`py-1.5 px-4 rounded-full text-sm border transition-all ${
              selectedSpecialFare === "seniorCitizen" 
                ? "bg-blue-50 border-blue-300 text-blue-700 font-medium" 
                : "bg-white border-gray-300 text-gray-600"
            }`}
          >
            Senior Citizen
          </button>
          
          <button
            onClick={() => setSelectedSpecialFare(selectedSpecialFare === "family" ? null : "family")}
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4 accent-green-500 cursor-pointer" />
          <div>
            <div className="text-sm font-medium text-green-700">Always opt for Free Cancellation</div>
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
      
      {/* Fixed position calendar for departure */}
      {showCalendar && activeField === "departure" && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-xl p-4 border border-gray-200 calendar-container"
          style={{ 
            width: '650px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 650 - 10, departureRect.left - 20))}px`, 
            top: `${departureRect.top + 50}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Calendar pointer */}
          <div 
            className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2 left-16"
            style={{ zIndex: 10000 }}
          ></div>
          
          {/* Calendar content */}
          <div className="flex flex-col">
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
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    const isToday = day && day.getDate() === today.getDate() && 
                                    day.getMonth() === today.getMonth() && 
                                    day.getFullYear() === today.getFullYear();
                    
                    const isSelected = day && departureDate && 
                                      day.getDate() === departureDate.getDate() && 
                                      day.getMonth() === departureDate.getMonth() && 
                                      day.getFullYear() === departureDate.getFullYear();
                    
                    const isReturnDate = day && returnDate && 
                                        day.getDate() === returnDate.getDate() && 
                                        day.getMonth() === returnDate.getMonth() && 
                                        day.getFullYear() === returnDate.getFullYear();
                    
                    const isInSelectionRange = day && isInRange(day);
                    
                    const isPast = day && day < today;
                    
                    // Check if this date is at the end of a week (Saturday)
                    const isEndOfWeek = day && day.getDay() === 6;
                    // Check if this date is at the start of a week (Sunday)
                    const isStartOfWeek = day && day.getDay() === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`h-10 flex items-center justify-center relative cursor-pointer transition-all ${
                          !day ? 'invisible' : 
                          isPast ? 'text-gray-300 cursor-not-allowed' : 
                          ''
                        }`}
                        onClick={() => !isPast && day && handleDateSelect(day)}
                      >
                        {/* Background bar for range */}
                        {day && (isInSelectionRange || isSelected || isReturnDate) && (
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
                            isPast ? '' : 
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
                  })}
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
                
                <div className="grid grid-cols-7">
                  {getDaysInMonth(getNextMonth(currentMonth)).map((day, index) => {
                    const isToday = day && day.getDate() === today.getDate() && 
                                    day.getMonth() === today.getMonth() && 
                                    day.getFullYear() === today.getFullYear();
                    
                    const isSelected = day && departureDate && 
                                      day.getDate() === departureDate.getDate() && 
                                      day.getMonth() === departureDate.getMonth() && 
                                      day.getFullYear() === departureDate.getFullYear();
                    
                    const isReturnDate = day && returnDate && 
                                        day.getDate() === returnDate.getDate() && 
                                        day.getMonth() === returnDate.getMonth() && 
                                        day.getFullYear() === returnDate.getFullYear();
                    
                    const isInSelectionRange = day && isInRange(day);
                    
                    const isPast = day && day < today;
                    
                    // Check if this date is at the end of a week (Saturday)
                    const isEndOfWeek = day && day.getDay() === 6;
                    // Check if this date is at the start of a week (Sunday)
                    const isStartOfWeek = day && day.getDay() === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`h-10 flex items-center justify-center relative cursor-pointer transition-all ${
                          !day ? 'invisible' : 
                          isPast ? 'text-gray-300 cursor-not-allowed' : 
                          ''
                        }`}
                        onClick={() => !isPast && day && handleDateSelect(day)}
                      >
                        {/* Background bar for range */}
                        {day && (isInSelectionRange || isSelected || isReturnDate) && (
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
                            isPast ? '' : 
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
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed position calendar for return */}
      {showCalendar && activeField === "return" && (
        <div 
          className="fixed z-[9999] bg-white rounded-lg shadow-xl p-4 border border-gray-200 calendar-container"
          style={{ 
            width: '650px',
            maxWidth: '95vw',
            left: `${Math.max(10, Math.min(window.innerWidth - 650 - 10, departureRect.left - 20))}px`, 
            top: `${departureRect.top + 50}px`,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* Calendar pointer */}
          <div 
            className="absolute w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45 -top-2 left-16"
            style={{ zIndex: 10000 }}
          ></div>
          
          {/* Calendar content */}
          <div className="flex flex-col">
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
                
                <div className="grid grid-cols-7">
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    const isToday = day && day.getDate() === today.getDate() && 
                                    day.getMonth() === today.getMonth() && 
                                    day.getFullYear() === today.getFullYear();
                    
                    const isSelected = day && departureDate && 
                                      day.getDate() === departureDate.getDate() && 
                                      day.getMonth() === departureDate.getMonth() && 
                                      day.getFullYear() === departureDate.getFullYear();
                    
                    const isReturnDate = day && returnDate && 
                                        day.getDate() === returnDate.getDate() && 
                                        day.getMonth() === returnDate.getMonth() && 
                                        day.getFullYear() === returnDate.getFullYear();
                    
                    const isInSelectionRange = day && isInRange(day);
                    
                    const isPast = day && day < today;
                    
                    // Check if this date is at the end of a week (Saturday)
                    const isEndOfWeek = day && day.getDay() === 6;
                    // Check if this date is at the start of a week (Sunday)
                    const isStartOfWeek = day && day.getDay() === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`h-10 flex items-center justify-center relative cursor-pointer transition-all ${
                          !day ? 'invisible' : 
                          isPast ? 'text-gray-300 cursor-not-allowed' : 
                          ''
                        }`}
                        onClick={() => !isPast && day && handleDateSelect(day)}
                      >
                        {/* Background bar for range */}
                        {day && (isInSelectionRange || isSelected || isReturnDate) && (
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
                            isPast ? '' : 
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
                  })}
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
                
                <div className="grid grid-cols-7">
                  {getDaysInMonth(getNextMonth(currentMonth)).map((day, index) => {
                    const isToday = day && day.getDate() === today.getDate() && 
                                    day.getMonth() === today.getMonth() && 
                                    day.getFullYear() === today.getFullYear();
                    
                    const isSelected = day && departureDate && 
                                      day.getDate() === departureDate.getDate() && 
                                      day.getMonth() === departureDate.getMonth() && 
                                      day.getFullYear() === departureDate.getFullYear();
                    
                    const isReturnDate = day && returnDate && 
                                        day.getDate() === returnDate.getDate() && 
                                        day.getMonth() === returnDate.getMonth() && 
                                        day.getFullYear() === returnDate.getFullYear();
                    
                    const isInSelectionRange = day && isInRange(day);
                    
                    const isPast = day && day < today;
                    
                    // Check if this date is at the end of a week (Saturday)
                    const isEndOfWeek = day && day.getDay() === 6;
                    // Check if this date is at the start of a week (Sunday)
                    const isStartOfWeek = day && day.getDay() === 0;
                    
                    return (
                      <div 
                        key={index} 
                        className={`h-10 flex items-center justify-center relative cursor-pointer transition-all ${
                          !day ? 'invisible' : 
                          isPast ? 'text-gray-300 cursor-not-allowed' : 
                          ''
                        }`}
                        onClick={() => !isPast && day && handleDateSelect(day)}
                      >
                        {/* Background bar for range */}
                        {day && (isInSelectionRange || isSelected || isReturnDate) && (
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
                            isPast ? '' : 
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
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
