// Service Data Mappers - Transform form data to API format

interface FormData {
  source: string;
  destination: string;
  departureDate?: Date;
  departureTime: string;
  arrivalDate?: Date;
  arrivalTime: string;
  basePrice: string;
  stops: string[];
  distanceKm: string;
  nonSleeperPrice: string;
  sleeperPrice: string;
  sleeperRows: string;
  sleeperColumns: string;
  nonSleeperRows: string;
  nonSleeperColumns: string;
  estimatedDistance: string;
  secondACPrice: string;
  thirdACPrice: string;
  trainSleeperRows: string;
  trainSleeperColumns: string;
  trainNonSleeperRows: string;
  trainNonSleeperColumns: string;
  noOfBoggies: string;
  trainName: string;
  trainNumber: string;
  economyPrice: string;
  premiumEconomyPrice: string;
  businessPrice: string;
  economyRows: string;
  economyColumns: string;
  premiumEconomyRows: string;
  premiumEconomyColumns: string;
  businessRows: string;
  businessColumns: string;
  flightNumber: string;
  airlineName: string;
  aircraftModel: string;
  registrationNo: string;
  vehicleModel: string;
  capacity: string;
  amenities: string[];
  cancellationWindow: string;
  cancellationFee: string;
  rescheduleWindow: string;
  rescheduleFee: string;
  termsConditions: string;
}

/**
 * Combines date and time strings into ISO 8601 format
 */
const combineDateTimeToISO = (date?: Date, time?: string): string => {
  if (!date || !time) {
    // Return current datetime if not provided
    return new Date().toISOString();
  }
  
  const [hours, minutes] = time.split(':');
  const combinedDate = new Date(date);
  combinedDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
  
  return combinedDate.toISOString();
};

/**
 * Calculates duration between two datetime strings
 * Returns ISO 8601 duration format for Django DurationField
 * Format: "HH:MM:SS" (e.g., "02:30:00" for 2 hours 30 minutes)
 */
const calculateDuration = (departureISO: string, arrivalISO: string): string => {
  const departure = new Date(departureISO);
  const arrival = new Date(arrivalISO);
  
  const durationMs = arrival.getTime() - departure.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
  
  // Return in HH:MM:SS format for Django DurationField
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Maps Bus form data to API format
 */
export const mapBusFormToAPI = (formData: FormData) => {
  const departureTime = combineDateTimeToISO(formData.departureDate, formData.departureTime);
  const arrivalTime = combineDateTimeToISO(formData.arrivalDate, formData.arrivalTime);
  const estimatedDuration = calculateDuration(departureTime, arrivalTime);

  return {
    route: {
      source: formData.source,
      destination: formData.destination,
      distance_km: parseFloat(formData.distanceKm) || 0, // ✅ Float for backend
      estimated_duration: estimatedDuration, // ✅ HH:MM:SS format
      via_points: formData.stops, // ✅ Already an array
    },
    vehicle: {
      registration_no: formData.registrationNo,
      model: formData.vehicleModel,
      capacity: parseInt(formData.capacity) || 0,
      amenities: formData.amenities, // ✅ Already an array
      status: 'Active',
    },
    policy: {
      cancellation_window: parseInt(formData.cancellationWindow) || 0,
      cancellation_fee: parseFloat(formData.cancellationFee) || 0, // ✅ Convert to number for Decimal field
      reschedule_allowed: !!formData.rescheduleWindow,
      reschedule_fee: parseFloat(formData.rescheduleFee) || 0, // ✅ Convert to number for Decimal field
      no_show_penalty: 0, // ✅ Number for Decimal field
      terms_conditions: formData.termsConditions,
    },
    departure_time: departureTime,
    arrival_time: arrivalTime,
    status: 'Scheduled',
    num_rows_sleeper: parseInt(formData.sleeperRows) || 0,
    num_columns_sleeper: parseInt(formData.sleeperColumns) || 0,
    num_rows_non_sleeper: parseInt(formData.nonSleeperRows) || 0,
    num_columns_non_sleeper: parseInt(formData.nonSleeperColumns) || 0,
    base_price: parseFloat(formData.basePrice) || 0, // ✅ Convert to number for Decimal field
    sleeper_price: parseFloat(formData.sleeperPrice) || 0, // ✅ Convert to number for Decimal field
    non_sleeper_price: parseFloat(formData.nonSleeperPrice) || 0, // ✅ Convert to number for Decimal field
    dynamic_pricing_enabled: false,
    dynamic_factor: 0,
  };
};

/**
 * Maps Train form data to API format
 * 🚆 Note: Train-specific fields (train_name, train_number, num_bogies) are at service level, not in vehicle
 */
export const mapTrainFormToAPI = (formData: FormData) => {
  const departureTime = combineDateTimeToISO(formData.departureDate, formData.departureTime);
  const arrivalTime = combineDateTimeToISO(formData.arrivalDate, formData.arrivalTime);
  const estimatedDuration = calculateDuration(departureTime, arrivalTime);

  return {
    route: {
      source: formData.source,
      destination: formData.destination,
      distance_km: parseFloat(formData.estimatedDistance) || parseFloat(formData.distanceKm) || 0, // ✅ Float for backend
      estimated_duration: estimatedDuration, // ✅ HH:MM:SS format
      via_points: formData.stops || [], // ✅ Empty array if no stops
    },
    vehicle: {
      registration_no: formData.registrationNo || formData.trainNumber || 'N/A', // ✅ Use train number as fallback
      model: formData.vehicleModel || 'Standard Train', // ✅ Train model
      capacity: parseInt(formData.capacity) || 0,
      amenities: formData.amenities || [], // ✅ Empty array if no amenities
      status: 'Active',
    },
    policy: {
      cancellation_window: parseInt(formData.cancellationWindow) || 0,
      cancellation_fee: parseFloat(formData.cancellationFee) || 0, // ✅ Convert to number for Decimal field
      reschedule_allowed: !!formData.rescheduleWindow,
      reschedule_fee: parseFloat(formData.rescheduleFee) || 0, // ✅ Convert to number for Decimal field
      no_show_penalty: 0, // ✅ Number for Decimal field
      terms_conditions: formData.termsConditions,
    },
    // 🚆 Train-specific fields at service level
    train_name: formData.trainName || formData.vehicleModel || 'Express Train',
    train_number: formData.trainNumber || formData.registrationNo || 'N/A',
    num_bogies: parseInt(formData.noOfBoggies) || 0,
    departure_time: departureTime,
    arrival_time: arrivalTime,
    status: 'Scheduled',
    // Note: Train API doesn't have separate seat configuration fields like Bus
    // Seat management is handled differently through bogies
    // Pricing - all converted to numbers
    base_price: parseFloat(formData.basePrice) || parseFloat(formData.thirdACPrice) || 0, // ✅ Use 3AC as base (most common)
    sleeper_price: parseFloat(formData.sleeperPrice) || 0, // ✅ Convert to number for Decimal field
    second_ac_price: parseFloat(formData.secondACPrice) || 0, // ✅ Convert to number for Decimal field
    third_ac_price: parseFloat(formData.thirdACPrice) || 0, // ✅ Convert to number for Decimal field
    dynamic_pricing_enabled: false,
    dynamic_factor: 0,
  };
};

/**
 * Maps Flight form data to API format
 * ✈️ Note: Flight-specific fields (flight_number, airline_name, aircraft_model) are at service level, not in vehicle
 */
export const mapFlightFormToAPI = (formData: FormData) => {
  const departureTime = combineDateTimeToISO(formData.departureDate, formData.departureTime);
  const arrivalTime = combineDateTimeToISO(formData.arrivalDate, formData.arrivalTime);
  const estimatedDuration = calculateDuration(departureTime, arrivalTime);

  return {
    route: {
      source: formData.source,
      destination: formData.destination,
      distance_km: 0, // ✅ Flights typically calculate distance from coordinates, not user input
      estimated_duration: estimatedDuration, // ✅ HH:MM:SS format
      via_points: formData.stops || [], // ✅ Empty array if no stops
    },
    vehicle: {
      registration_no: formData.flightNumber || 'N/A', // ✅ Use flight number as registration
      model: formData.aircraftModel || 'Unknown', // ✅ Aircraft model as vehicle model
      capacity: parseInt(formData.capacity) || 0,
      amenities: formData.amenities, // ✅ Already an array
      status: 'Active',
    },
    policy: {
      cancellation_window: parseInt(formData.cancellationWindow) || 0,
      cancellation_fee: parseFloat(formData.cancellationFee) || 0, // ✅ Convert to number for Decimal field
      reschedule_allowed: !!formData.rescheduleWindow,
      reschedule_fee: parseFloat(formData.rescheduleFee) || 0, // ✅ Convert to number for Decimal field
      no_show_penalty: 0, // ✅ Number for Decimal field
      terms_conditions: formData.termsConditions,
    },
    // ✈️ Flight-specific fields at service level
    flight_number: formData.flightNumber,
    airline_name: formData.airlineName,
    aircraft_model: formData.aircraftModel,
    departure_time: departureTime,
    arrival_time: arrivalTime,
    status: 'Scheduled',
    // Seat configuration
    num_rows_business: parseInt(formData.businessRows) || 0,
    num_columns_business: parseInt(formData.businessColumns) || 0,
    num_rows_premium: parseInt(formData.premiumEconomyRows) || 0, // ✅ API uses 'premium' not 'premium_economy'
    num_columns_premium: parseInt(formData.premiumEconomyColumns) || 0,
    num_rows_economy: parseInt(formData.economyRows) || 0,
    num_columns_economy: parseInt(formData.economyColumns) || 0,
    // Pricing - all converted to numbers
    base_price: parseFloat(formData.businessPrice) || 0, // ✅ Use business as base (highest tier)
    business_price: parseFloat(formData.businessPrice) || 0, // ✅ Convert to number for Decimal field
    premium_price: parseFloat(formData.premiumEconomyPrice) || 0, // ✅ Convert to number for Decimal field
    economy_price: parseFloat(formData.economyPrice) || 0, // ✅ Convert to number for Decimal field
    dynamic_pricing_enabled: false,
    dynamic_factor: 0,
  };
};
