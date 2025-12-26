// Card components for Orion responses
import React, { useState } from 'react';
import Link from 'next/link';

// Types
export type TripPlanData = {
    trip_summary: {
        source: string;
        destination: string;
        days: number;
        start_date: string;
        end_date: string;
        budget: number;
    };
    transport_decision: {
        outbound: { mode: string; reason: string };
        return: { mode: string; reason: string };
    };
    expenses: {
        transport: number;
        stay: number;
        food: number;
        misc: number;
        total: number;
    };
    itinerary: string;
};

export type BookingResultData = {
    results: Record<string, {
        mode: string;
        count: number;
        results: Array<{
            service_id: string;
            provider_name: string;
            airline_name?: string;
            aircraft_model?: string;
            train_name?: string;
            train_number?: string;
            bus_travels_name?: string;
            bus_number?: number;
            source: string;
            destination: string;
            departure_time: string;
            arrival_time: string;
            amenities: string[];
            rating?: Record<string, any>;
            no_of_reviews: number;
        }>;
    }>;
};

// Helper to format dates
const formatDate = (dateStr: string) => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    } catch {
        return dateStr;
    }
};

const formatTime = (dateTimeStr: string) => {
    try {
        const date = new Date(dateTimeStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
    } catch {
        return dateTimeStr;
    }
};

// Itinerary parsing - extract days with time slots from text
const parseItinerary = (text: string): Array<{ 
    day: number; 
    date?: string;
    title: string; 
    timeSlots: Array<{ time: string; activities: string[] }> 
}> => {
    const lines = text.split('\n');
    const days: Array<{ day: number; date?: string; title: string; timeSlots: Array<{ time: string; activities: string[] }> }> = [];
    let currentDay: { day: number; date?: string; title: string; timeSlots: Array<{ time: string; activities: string[] }> } | null = null;
    let currentTimeSlot: { time: string; activities: string[] } | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('**Travel Dates') || trimmed.startsWith('**Mode of Transport')) continue;

        // Match day headers: "### **Day 1:" or "**Day 1:" or "Day 1:"
        const dayMatch = trimmed.match(/^#{0,3}\s*\*?\*?Day\s+(\d+)[:\-\s]+(.+?)(?:\*\*)?$/i);
        if (dayMatch) {
            if (currentDay) {
                if (currentTimeSlot) currentDay.timeSlots.push(currentTimeSlot);
                days.push(currentDay);
            }
            const dayNum = parseInt(dayMatch[1]);
            const titlePart = dayMatch[2].replace(/\*+/g, '').trim();
            
            // Extract date if present (e.g., "Monday, November 17, 2025")
            const dateMatch = titlePart.match(/([A-Za-z]+,\s+[A-Za-z]+\s+\d+,\s+\d{4})/);
            const date = dateMatch ? dateMatch[1] : undefined;
            const title = titlePart.replace(dateMatch?.[0] || '', '').replace(/^[\s\-–—]+|[\s\-–—]+$/g, '').trim();
            
            currentDay = { day: dayNum, date, title, timeSlots: [] };
            currentTimeSlot = null;
            continue;
        }

        // Match time slot headers: "*   **Morning (6:00 AM - 12:00 PM):"
        const timeMatch = trimmed.match(/^\*\s+\*\*([^(]+)\s*\(([^)]+)\)[:\s]*(.+?)?\*\*$/);
        if (timeMatch && currentDay) {
            if (currentTimeSlot) currentDay.timeSlots.push(currentTimeSlot);
            const period = timeMatch[1].trim(); // Morning, Afternoon, Evening
            const timeRange = timeMatch[2].trim(); // 6:00 AM - 12:00 PM
            const subtitle = timeMatch[3] ? timeMatch[3].trim() : '';
            currentTimeSlot = { 
                time: `${period} (${timeRange})${subtitle ? ' – ' + subtitle : ''}`, 
                activities: [] 
            };
            continue;
        }

        // Match activity bullets: "*   **6:00 AM - 7:00 AM:** Activity description"
        const activityMatch = trimmed.match(/^\*\s+\*\*([^*]+)\*\*[:\s]*(.+)$/);
        if (activityMatch && currentTimeSlot) {
            const timeOrLabel = activityMatch[1].trim();
            const description = activityMatch[2].trim();
            currentTimeSlot.activities.push(`**${timeOrLabel}:** ${description}`);
            continue;
        }

        // Regular bullet points or tips
        if (trimmed.startsWith('*') && currentTimeSlot) {
            const cleaned = trimmed.replace(/^\*\s+/, '').trim();
            if (cleaned && !cleaned.startsWith('**Tip') && !cleaned.startsWith('Tip:')) {
                currentTimeSlot.activities.push(cleaned);
            }
        }
    }

    if (currentDay) {
        if (currentTimeSlot) currentDay.timeSlots.push(currentTimeSlot);
        days.push(currentDay);
    }

    return days;
};

// Trip Plan Card
export const TripPlanCard: React.FC<{ data: TripPlanData }> = ({ data }) => {
    const { trip_summary, transport_decision, expenses } = data;
    const itineraryDays = parseItinerary(data.itinerary);
    
    // State to track which days are expanded (default: first day expanded)
    const [expandedDays, setExpandedDays] = useState<boolean[]>(
        itineraryDays.map((_, idx) => idx === 0)
    );

    return (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <h3 className="text-xl font-semibold">
                    {trip_summary.source.toUpperCase()} → {trip_summary.destination.toUpperCase()}
                </h3>
                <p className="text-sm text-blue-100 mt-1">
                    {formatDate(trip_summary.start_date)} - {formatDate(trip_summary.end_date)} · {trip_summary.days} Days · ₹{trip_summary.budget.toLocaleString()} Budget
                </p>
            </div>

            <div className="p-4 space-y-4">
                {/* Transport & Expenses */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Transport */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Transport</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Onward:</span>
                                <span className="font-medium capitalize">{transport_decision.outbound.mode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Return:</span>
                                <span className="font-medium capitalize">{transport_decision.return.mode}</span>
                            </div>
                        </div>
                    </div>

                    {/* Expense Summary */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Expense Summary</h4>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Transport</span>
                                <span className="font-medium">₹{expenses.transport.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Stay</span>
                                <span className="font-medium">₹{expenses.stay.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Food</span>
                                <span className="font-medium">₹{expenses.food.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1 font-semibold">
                                <span>Total</span>
                                <span>₹{expenses.total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Itinerary */}
                <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Itinerary</h4>
                    <div className="space-y-3">
                        {itineraryDays.map((day, dayIdx) => (
                            <div key={day.day} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Day Header */}
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 border-b border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-bold text-blue-900">Day {day.day}</span>
                                            {day.date && <span className="text-xs text-blue-700 ml-2">{day.date}</span>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newExpanded = [...expandedDays];
                                                newExpanded[dayIdx] = !newExpanded[dayIdx];
                                                setExpandedDays(newExpanded);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            <svg 
                                                className={`w-5 h-5 transform transition-transform ${expandedDays[dayIdx] ? 'rotate-180' : ''}`}
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-700 mt-1 font-medium">{day.title}</div>
                                </div>

                                {/* Day Content - Collapsible */}
                                {expandedDays[dayIdx] && (
                                    <div className="p-3 space-y-3 bg-white">
                                        {day.timeSlots.map((slot, slotIdx) => (
                                            <div key={slotIdx} className="border-l-2 border-blue-400 pl-3">
                                                <div className="text-xs font-semibold text-blue-700 mb-1">
                                                    {slot.time}
                                                </div>
                                                <div className="space-y-1">
                                                    {slot.activities.map((activity, actIdx) => {
                                                        // Parse markdown bold: **text** -> <strong>text</strong>
                                                        const parts = activity.split(/(\*\*[^*]+\*\*)/g);
                                                        return (
                                                            <div key={actIdx} className="text-xs text-gray-700 leading-relaxed">
                                                                {parts.map((part, partIdx) => {
                                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                                        return <strong key={partIdx} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
                                                                    }
                                                                    return <span key={partIdx}>{part}</span>;
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Booking Result Card
export const BookingResultCard: React.FC<{ data: BookingResultData }> = ({ data }) => {
    const steps = Object.entries(data.results);

    return (
        <div className="w-full max-w-md space-y-3">
            {steps.map(([stepKey, stepData]) => {
                // Safely access results array and first element
                if (!stepData || !stepData.results || stepData.results.length === 0) {
                    return null;
                }
                const service = stepData.results[0]; // Show first result
                if (!service) return null;

                const isFlightMode = stepData.mode === 'flight';
                const isTrainMode = stepData.mode === 'train';
                const isBusMode = stepData.mode === 'bus';

                return (
                    <div key={stepKey} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* Header with Mode Badge */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-semibold">
                                    {service.source.split('(')[0].trim()} → {service.destination.split('(')[0].trim()}
                                </h3>
                                <p className="text-xs text-green-100 mt-0.5">
                                    {stepData.count} {stepData.count === 1 ? 'result' : 'results'} found
                                </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium uppercase">
                                {stepData.mode}
                            </div>
                        </div>

                        {/* Service Details */}
                        <div className="p-4 space-y-3">
                            {/* Service Name & Provider */}
                            <div>
                                <div className="text-lg font-bold text-gray-800">
                                    {isFlightMode && service.airline_name}
                                    {isTrainMode && service.train_name}
                                    {isBusMode && service.bus_travels_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {isFlightMode && `${service.aircraft_model} · Flight`}
                                    {isTrainMode && `${service.train_number} · Train`}
                                    {isBusMode && `Bus #${service.bus_number}`}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                    Provider: {service.provider_name}
                                </div>
                            </div>

                            {/* Time & Route */}
                            <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-800">{formatTime(service.departure_time)}</div>
                                    <div className="text-xs text-gray-500">{service.source.split('(')[1]?.replace(')', '') || 'DEP'}</div>
                                </div>
                                <div className="flex-grow mx-3 flex items-center">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <div className="flex-grow h-0.5 bg-blue-300"></div>
                                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        {isFlightMode && <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>}
                                        {isTrainMode && <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/>}
                                        {isBusMode && <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"/>}
                                    </svg>
                                    <div className="flex-grow h-0.5 bg-blue-300"></div>
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xl font-bold text-gray-800">{formatTime(service.arrival_time)}</div>
                                    <div className="text-xs text-gray-500">{service.destination.split('(')[1]?.replace(')', '') || 'ARR'}</div>
                                </div>
                            </div>

                            {/* Amenities */}
                            {service.amenities && service.amenities.length > 0 && (
                                <div>
                                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Amenities</div>
                                    <div className="flex flex-wrap gap-2">
                                        {service.amenities.slice(0, 6).map((amenity) => (
                                            <span
                                                key={amenity}
                                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                            >
                                                {amenity.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                        {service.amenities.length > 6 && (
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                +{service.amenities.length - 6} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Reviews */}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{service.no_of_reviews} {service.no_of_reviews === 1 ? 'review' : 'reviews'}</span>
                                <Link
                                    href={`http://localhost:3000/booking/review?service_id=${service.service_id}&tripType=oneWay&travellers=1&class_type=Economy`}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    View Details →
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
