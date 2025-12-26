// frontend/apps/apiEndpoints.ts
// Central place to store all backend API endpoints.

const BASE_URL = "http://127.0.0.1:8000";

export const API = {
  REGISTER: `${BASE_URL}/auth/register/`,
  VERIFY_OTP: `${BASE_URL}/auth/verify-otp/`,
  RESEND_OTP: `${BASE_URL}/auth/resend-otp/`,
  LOGIN: `${BASE_URL}/auth/login/`,
  LOGOUT: `${BASE_URL}/auth/logout/`,
  CHECK_USERNAME: `${BASE_URL}/auth/check-username/`,
  CHECK_EMAIL: `${BASE_URL}/auth/check-email/`,
  FORGOT_PASSWORD: `${BASE_URL}/auth/forgot-password/`,
  RESET_PASSWORD: `${BASE_URL}/auth/reset-password/`,
  GOOGLE_LOGIN: `${BASE_URL}/auth/google-login/`,
  MICROSOFT_LOGIN: `${BASE_URL}/auth/microsoft-login/`,
  GITHUB_LOGIN: `${BASE_URL}/auth/github-login/`,
  BOOKING_DATA : `${BASE_URL}/bookings/bookings/`,
  FORUMS_LIST: `${BASE_URL}/forums/forums/`,
  FORUM_POST_CREATE: `${BASE_URL}/forums/forums/post/`,
  FORUM_COMMENT_CREATE: `${BASE_URL}/forums/forums/comment/`,

  // Booking Search Endpoints
  SEARCH_FLIGHTS: `${BASE_URL}/bookings/search/flights`,    // No trailing slash
  SEARCH_TRAINS: `${BASE_URL}/bookings/search/trains/`,     // Has trailing slash
  SEARCH_BUSES: `${BASE_URL}/bookings/search/buses/`,        // No trailing slash (check backend)
  
  // Flight Service Details
  FLIGHT_SERVICE_DETAILS: (serviceId: string) => `${BASE_URL}/services/flight-services/${serviceId}/`,
  
  // Train Service Details
  TRAIN_SERVICE_DETAILS: (serviceId: string) => `${BASE_URL}/services/train-services/${serviceId}/`,
  TRAIN_SERVICE_BOOKING_CONFIRM: (serviceId: string, fromId : string, toId:string) => `${BASE_URL}/services/train-services/${serviceId}/detail/?from_station_id=${fromId}&to_station_id=${toId}/`,
  // Bus Service Details
  BUS_SERVICE_DETAILS: (serviceId: string) => `${BASE_URL}/services/bus-services/${serviceId}/`,
  
  // Provider Service Liststo
  BUS_SERVICES_LIST: `${BASE_URL}/services/bus-card/list/`,
  FLIGHT_SERVICES_LIST: `${BASE_URL}/services/flight-card/list/`,
  TRAIN_SERVICES_LIST: `${BASE_URL}/services/train-card/list/`,

  // Provider Service Operations (Update/Delete)
  BUS_SERVICE_OPERATIONS: (serviceId: string) => `${BASE_URL}/services/bus-services/${serviceId}/`,
  FLIGHT_SERVICE_OPERATIONS: (serviceId: string) => `${BASE_URL}/services/flight-services/${serviceId}/`,
  TRAIN_SERVICE_OPERATIONS: (serviceId: string) => `${BASE_URL}/services/train-services/${serviceId}/`,
  
  // User Management - Co-travellers
  CO_TRAVELLERS: `${BASE_URL}/user_management/co-travellers/`,
  
  // User Management - Service Provider
  SERVICE_PROVIDER_DETAILS: (userId: string) => `${BASE_URL}/user_management/service-providers/${userId}/`,
  SERVICE_PROVIDER_LIST: `${BASE_URL}/user_management/service-providers/`,
  SERVICE_PROVIDER_ADD_REVIEW: (bookingId: string) => `${BASE_URL}/user_management/service-provider-ratings/${bookingId}/add_review/`,

  // Provider analytics
  PROVIDER_DASHBOARD_ANALYTICS: `${BASE_URL}/provideranalytics/provider-dashboard/`,
  PROVIDER_OCCUPANCY_HEATMAP: `${BASE_URL}/provideranalytics/occupancy-heatmap/`,
  PROVIDER_ROUTE_COMPARISON: `${BASE_URL}/provideranalytics/route-comparison/`,
  ADMIN_PROVIDER_PERFORMANCE: `${BASE_URL}/adminanalytics/provider-performance/`,
  ADMIN_USER_STATS: `${BASE_URL}/adminanalytics/user-stats/`,
  ADMIN_PROVIDER_LIST: `${BASE_URL}/user_management/service-providers/`,
  ADMIN_FINANCIAL_OVERVIEW: `${BASE_URL}/adminanalytics/financial-overview/`,
  ADMIN_DASHBOARD: `${BASE_URL}/adminanalytics/dashboard/`,
  ADMIN_SQL_QUERY_RUNNER: `${BASE_URL}/adminanalytics/execute-sql/`,
  
  // User Management - Customer
  CUSTOMER_DETAILS: (userId: string) => `${BASE_URL}/user_management/customers/${userId}/`,
  
  // User Management - Co-Travellers
  CO_TRAVELLER_DETAILS: (travellerId: string) => `${BASE_URL}/user_management/co-travellers/${travellerId}/`,
  
  // Auth - Change Password
  CHANGE_PASSWORD: `${BASE_URL}/auth/change-password/`,
  
  // Bookings
  BOOKING_CREATE: `${BASE_URL}/bookings/bookings/`,
  BOOKING_DETAILS: (bookingId: string) => `${BASE_URL}/bookings/bookings/${bookingId}/`,
  BOOKING_CANCEL: (bookingId: string) => `${BASE_URL}/bookings/bookings/${bookingId}/cancel/`,
  PROVIDER_BOOKINGS_LIST: `${BASE_URL}/bookings/bookings-list/list/`,
  ADMIN_BOOKINGS_LIST: `${BASE_URL}/bookings/bookings-list/`,
  
  // Payments
  PAYMENT_CONFIRM: `${BASE_URL}/payments/confirm/`,
  PROVIDER_FINANCES_OVERVIEW: `${BASE_URL}/payments/finances-provider/`,
  PROVIDER_FINANCE_TRANSACTIONS: `${BASE_URL}/payments/transactions/list/`,
  
  // Notifications
  NOTIFICATIONS_INBOX: `${BASE_URL}/notifications/inbox/`,
  NOTIFICATION_MARK_READ: (receiptId: string) => `${BASE_URL}/notifications/inbox/${receiptId}/read/`,
  PROVIDER_SENT_NOTIFICATIONS: `${BASE_URL}/notifications/provider/notifications/`,
  PROVIDER_NOTIFICATION_CREATE: `${BASE_URL}/notifications/provider/notifications/create/`,
  ADMIN_NOTIFICATIONS_LIST: `${BASE_URL}/notifications/admin/notifications/`,
  ADMIN_NOTIFICATION_CREATE: `${BASE_URL}/notifications/admin/notifications/create/`,
  ADMIN_NOTIFICATION_DETAIL: (notificationId: string) =>
    `${BASE_URL}/notifications/admin/notifications/${notificationId}/`,
  
  // Agentic AI
  TRIP_PLANNER: `${BASE_URL}/agenticai/trip-planner/`,
  BOOKING_AGENT: `${BASE_URL}/agenticai/agent-query/`,
  SMART_FILTER_LLM: `${BASE_URL}/agenticai/smart-filter-llm/`,

  // Base URL export for complex paths
  BASE_URL: BASE_URL,
};

export type AdminNotificationListItem = {
  notification_id: string;
  subject: string;
  target_audience_type: string;
  channel: string;
  sender_email: string;
  created_at: string;
  total_recipients: number;
  sent_count: number;
};

export type AdminNotificationRecipient = {
  receipt_id: string;
  recipient_email: string;
  status: string;
  sent_to_address: string;
  sent_at: string | null;
  read_at: string | null;
  error_message: string | null;
};

export type AdminNotificationDetail = {
  notification_id: string;
  subject: string;
  message_body: string;
  channel: string;
  target_audience_type: string;
  sender_email: string;
  created_at: string;
  receipts: AdminNotificationRecipient[];
};

export type CreateAdminNotificationPayload = {
  subject: string;
  message_body: string;
  channel: "Email";
  target_audience_type: string;
  provider_id?: string;
  service_id?: string;
  customer_id?: string;
};

export type CreateAdminNotificationResponse = {
  message: string;
  notification_id: string;
  target_audience_type: string;
  subject: string;
};

export type AdminDashboardMetric = {
  value: number | string;
  label: string;
  growth: string;
};

export interface AdminDashboardResponse {
  total_active_users?: AdminDashboardMetric;
  bookings_today?: AdminDashboardMetric;
  revenue_today?: AdminDashboardMetric;
}

export async function getAdminDashboardStats(token: string): Promise<AdminDashboardResponse> {
  if (!token || token.trim() === "") {
    throw new Error("Invalid or missing authentication token");
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_DASHBOARD;
  console.log("[API] Fetching admin dashboard stats from:", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log("[API] Admin dashboard stats response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[API] Error fetching admin dashboard stats:", text);
      throw new Error(`Failed to fetch dashboard stats (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log("[API] Admin dashboard stats received:", data);
    return data;
  } catch (error) {
    console.error("[API] Exception while fetching admin dashboard stats:", error);
    throw error;
  }
}

// Service provider listing and reviews
export interface ProviderReviewComment {
  date: string;
  user: string;
  rating: number | string;
  comment_body: string;
  comment_title?: string;
  booking_id?: string;
  booking_source?: string;
  booking_destination?: string;
}

export interface ServiceProviderDetail {
  user: string;
  username: string;
  email: string;
  company_name: string;
  license_info: string;
  contact_number: string;
  status: string;
  verified: boolean;
  verified_at: string | null;
  rating: number | string;
  total_reviews: number;
  ratings_dict: Record<string, number>;
  comments: ProviderReviewComment[];
}


// Train Search Inputs
export type SearchTrainsParams = {
  source: string;
  destination: string;
  date: string;         // YYYY-MM-DD
  class_type?: string;  // optional ("Sleeper", etc.)
  authToken: string;    // REQUIRED
  csrf: string;         // REQUIRED
};

// Train Search Outputs
export type SearchTrainsResult = {
  mode: "train";
  count: number;
  source_id: string;
  destination_id: string;
  results: Array<{
    service_id: string;
    provider_name: string;
    train_name: string;
    train_number: string;
    source: string;
    destination: string;
    departure_time: string; // ISO
    arrival_time: string;   // ISO
    amenities: string[];
    stops: string[];
    rating: number;
    no_of_reviews: number;
    class_type: string;
    price: number;
    available_seats: number;
    bookable: boolean;
  }>;
};

// Bus Search Inputs
export type SearchBusesParams = {
  source: string;
  destination: string;
  date: string;      // YYYY-MM-DD
  authToken: string; // REQUIRED
  csrf: string;      // REQUIRED
};

// Bus Search Outputs
export type SearchBusesResult = Array<{
  service_id: string;
  route: {
    route_id: string;
    source: {
      station_id: string;
      name: string;
      code: string;
      city: string;
      state: string;
      BusStations: any[];
    };
    destination: {
      station_id: string;
      name: string;
      code: string;
      city: string;
      state: string;
      BusStations: any[];
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
        BusStations: any[];
      };
      price_to_destination: string;
      duration_to_destination: string;
    }>;
  };
  departure_time: string;
  arrival_time: string;
  status: string;
  current_sleeper_price: number | null;
  current_non_sleeper_price: number | null;
  available_seats: any[];
  total_available: number;
}>;

export interface APIFlightResponse {
  service_id: string;
  flight_number: string;
  airline_name: string;
  aircraft_model: string;
  route: string;          // UUID reference to route
  vehicle: string;        // UUID reference to vehicle
  policy: string;         // UUID reference to policy
  departure_time: string; // ISO timestamp
  arrival_time: string;   // ISO timestamp
  status: string;         // "Scheduled", etc.
  base_price: string;     // Decimal as string
  business_price: string; // Decimal as string
  premium_price: string;  // Decimal as string
  economy_price: string;  // Decimal as string
  available_seats: any[]; // Array of seat objects (we'll ignore for now)
}

export interface FlightSearchResponse {
  mode?: string;      // "flight" (optional)
  count?: number;     // total count (optional)
  results?: APIFlightResponse[]; // Can be array directly or under results
}

// Flight Service Details Response
export interface StationInfo {
  station_id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  BusStations: any[];
}

export interface RouteStop {
  stop_order: number;
  station: StationInfo;
  price_to_destination: string;
  duration_to_destination: string;
}

export interface FlightRouteDetails {
  route_id: string;
  source: StationInfo;
  destination: StationInfo;
  distance_km: number;
  estimated_duration: string;
  stops: RouteStop[];
}

export interface FlightVehicleDetails {
  vehicle_id: string;
  registration_no: string;
  model: string;
  capacity: number;
  amenities: any[] | Record<string, any>;
  status: string;
}

export interface FlightPolicyDetails {
  policy_id: string;
  cancellation_window: number;
  cancellation_fee: string;
  reschedule_allowed: boolean;
  reschedule_fee: string;
  no_show_penalty: string;
  terms_conditions: string;
  no_cancellation_fee_markup: string | null;
  no_reschedule_fee_markup: string | null;
}

export interface FlightServiceDetails {
  service_id: string;
  route: FlightRouteDetails;
  vehicle: FlightVehicleDetails;
  policy: FlightPolicyDetails;
  flight_number: string;
  airline_name: string;
  aircraft_model: string;
  num_rows_business: number;
  num_columns_business: number;
  num_rows_premium: number;
  num_columns_premium: number;
  num_rows_economy: number;
  num_columns_economy: number;
  base_price: string;
  business_price: string;
  premium_price: string | null;
  economy_price: string;
  dynamic_pricing_enabled: boolean;
  dynamic_factor: number;
  departure_time: string;
  arrival_time: string;
  status: string;
  total_capacity: number;
  booked_seats: number;
  created_at: string;
  updated_at: string;
  provider_user_id: string;
}

type SearchFlightsParams = {
  source: string;        // e.g., "DEL"
  destination: string;   // e.g., "BOM"
  date: string;          // "YYYY-MM-DD"
  classType?: string;    // optional: "Economy" | "Premium" | "Business" (not used for now)
  signal?: AbortSignal;  // optional abort support
  token?: string;        // optional auth token
  csrfToken?: string;    // optional CSRF token
};

const _flightCache = new Map<string, FlightSearchResponse>();
export const clearFlightCache = () => _flightCache.clear();

const buildKey = (p: SearchFlightsParams) =>
  JSON.stringify({ s: p.source, d: p.destination, dt: p.date, c: p.classType ?? "" });

// Train Search API
export async function fetchTrains(
  params: SearchTrainsParams,
  init?: RequestInit
): Promise<SearchTrainsResult> {
  const q = new URLSearchParams({
    source: params.source,
    destination: params.destination,
    date: params.date,
  });
  // Only add class_type if provided and not "All Class"
  if (params.class_type && params.class_type !== "All Class") {
    q.set("class_type", params.class_type);
  }

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: `Token ${params.authToken}`,
  };
  
  // CSRF token optional for GET (usually not needed)
  if (params.csrf) {
    headers["X-CSRFTOKEN"] = params.csrf;
  }

  const res = await fetch(`${API.SEARCH_TRAINS}?${q.toString()}`, {
    method: "GET",
    headers,
    credentials: "omit",  // Omit cookies to avoid CORS issues
    cache: "no-store",
    mode: "cors",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Train search failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// Bus Search API 
export async function fetchBuses(
  params: SearchBusesParams,
  init?: RequestInit
): Promise<SearchBusesResult> {
  const q = new URLSearchParams({
    source: params.source,
    destination: params.destination,
    date: params.date,
  });

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: `Token ${params.authToken}`,
  };
  
  // CSRF token optional for GET (usually not needed)
  if (params.csrf) {
    headers["X-CSRFTOKEN"] = params.csrf;
  }

  const res = await fetch(`${API.SEARCH_BUSES}?${q.toString()}`, {
    method: "GET",
    headers,
    credentials: "omit",  // Omit cookies to avoid CORS issues
    cache: "no-store",
    mode: "cors",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bus search failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

// Flight Search API
export async function searchFlights(params: SearchFlightsParams): Promise<FlightSearchResponse> {
  const { source, destination, date, signal, token, csrfToken } = params;
  const key = buildKey(params);
  if (_flightCache.has(key)) return _flightCache.get(key)!;

  const url = new URL(API.SEARCH_FLIGHTS);
  url.searchParams.set("source", source);
  url.searchParams.set("destination", destination);
  url.searchParams.set("date", date);
  // Omit classType parameter for now as per user request

  const headers: Record<string, string> = {
    accept: "application/json",
  };
  
  // Add Authorization header if token is provided
  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }
  
  // CSRF token in header if provided (not in URL params)
  if (csrfToken) {
    headers["X-CSRFTOKEN"] = csrfToken;
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers,
    credentials: "omit",  // Omit cookies to avoid CORS issues
    cache: "no-store",
    mode: "cors",
    signal,
  });

  if (!res.ok) {
    // propagate a nice error
    const text = await res.text().catch(() => "");
    throw new Error(`Flight search failed (${res.status}): ${text || res.statusText}`);
  }

  const rawData = await res.json();
  
  // Handle both array response and object response
  let data: FlightSearchResponse;
  if (Array.isArray(rawData)) {
    // Backend returned array directly
    data = {
      results: rawData,
      count: rawData.length,
      mode: 'flight'
    };
  } else {
    // Backend returned object with results
    data = rawData;
  }
  
  _flightCache.set(key, data);
  return data;
}

// Fetch Flight Service Details
export async function getFlightServiceDetails(
  serviceId: string,
  token: string,
  csrfToken?: string
): Promise<FlightServiceDetails> {
  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };
  
  if (csrfToken) {
    headers["X-CSRFTOKEN"] = csrfToken;
  }

  const url = API.FLIGHT_SERVICE_DETAILS(serviceId);
  console.log('=== FLIGHT SERVICE DETAILS API CALL ===');
  console.log('[API] URL:', url);
  console.log('[API] Service ID:', serviceId);
  console.log('[API] Token length:', token?.length);
  console.log('[API] Token preview:', token ? `${token.substring(0, 10)}...` : 'none');
  console.log('[API] Full token:', token);
  console.log('[API] Headers:', JSON.stringify(headers, null, 2));
  console.log('[API] Authorization header:', headers['Authorization']);
  
  // Test if token matches the working curl command
  const expectedToken = '4oB5ZiStupb68RQucCPs48xWUgqJiZl8QDtVeen2';
  console.log('[API] Token matches expected:', token === expectedToken);
  console.log('=======================================');

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "omit",  // Omit cookies to avoid CORS preflight issues
    cache: "no-store",
    mode: "cors",
  });

  console.log('[API] Response status:', res.status);
  console.log('[API] Response URL:', res.url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error response:', text);
    throw new Error(`Failed to fetch flight service details (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  console.log('[API] Flight service data received');
  return data;
}

// Fetch Train Service Details
export async function getTrainServiceDetails(
  serviceId: string,
  token: string,
  csrfToken?: string
): Promise<any> {
  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };
  
  if (csrfToken) {
    headers["X-CSRFTOKEN"] = csrfToken;
  }

  const url = API.TRAIN_SERVICE_DETAILS(serviceId);
  console.log('[API] Fetching train service details from:', url);

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "omit",
    cache: "no-store",
    mode: "cors",
  });

  console.log('[API] Train service details response status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error fetching train service details:', text);
    throw new Error(`Failed to fetch train service details (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  console.log('[API] Train service details received');
  return data;
}

// Fetch Bus Service Details
export async function getBusServiceDetails(
  serviceId: string,
  token: string,
  csrfToken?: string
): Promise<any> {
  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };
  
  if (csrfToken) {
    headers["X-CSRFTOKEN"] = csrfToken;
  }

  const url = API.BUS_SERVICE_DETAILS(serviceId);
  console.log('[API] Fetching bus service details from:', url);

  const res = await fetch(url, {
    method: "GET",
    headers,
    credentials: "omit",
    cache: "no-store",
    mode: "cors",
  });

  console.log('[API] Bus service details response status:', res.status);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error fetching bus service details:', text);
    throw new Error(`Failed to fetch bus service details (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  console.log('[API] Bus service details received');
  return data;
}

// Interface for co-traveller from backend
export interface CoTravellerResponse {
  traveller_id: string;
  customer_name: string;
  first_name: string;
  last_name: string;
  gender: string;
  marital_status: string;
  date_of_birth: string;
  email?: string;
  phone_number?: string;
  address?: string;
}

// Fetch co-travellers from backend
export async function getCoTravellers(token: string): Promise<CoTravellerResponse[]> {
  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.CO_TRAVELLERS;
  console.log('[API] Fetching co-travellers from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Co-travellers response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching co-travellers:', text);
      throw new Error(`Failed to fetch co-travellers (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Co-travellers data received:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching co-travellers:', error);
    throw error;
  }
}

// Types for Provider Service Lists (Card-optimized responses)
export interface BusServiceListItem {
  service_id: string; // Required for delete/edit operations
  bus_travels_name: string;
  bus_number: number;
  status: string;
  source: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  vehicle_model: string;
  registration_no: string;
  price_range: string;
  distance_km: number;
  occupancy: string;
}

export interface TrainServiceListItem {
  service_id: string; // Required for delete/edit operations
  train_name: string;
  train_number: string;
  status: string;
  source: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  vehicle_model: string;
  registration_no: string;
  price_range: string;
  distance_km: number;
  occupancy: string;
}

export interface FlightServiceListItem {
  service_id: string; // Required for delete/edit operations
  airline_name: string;
  flight_number: string;
  status: string;
  source: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  vehicle_model: string;
  registration_no: string;
  price_range: string;
  distance_km: number;
  occupancy: string;
}

// Fetch all bus services for the provider
export async function getBusServicesList(token: string): Promise<BusServiceListItem[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.BUS_SERVICES_LIST;
  console.log('[API] Fetching bus services from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Bus services response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching bus services:', text);
      throw new Error(`Failed to fetch bus services (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Bus services data received:', data.length, 'services');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching bus services:', error);
    throw error;
  }
}

// Fetch all flight services for the provider
export async function getFlightServicesList(token: string): Promise<FlightServiceListItem[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.FLIGHT_SERVICES_LIST;
  console.log('[API] Fetching flight services from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Flight services response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching flight services:', text);
      throw new Error(`Failed to fetch flight services (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Flight services data received:', data.length, 'services');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching flight services:', error);
    throw error;
  }
}

// Fetch all train services for the provider
export async function getTrainServicesList(token: string): Promise<TrainServiceListItem[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.TRAIN_SERVICES_LIST;
  console.log('[API] Fetching train services from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Train services response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching train services:', text);
      throw new Error(`Failed to fetch train services (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Train services data received:', data.length, 'services');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching train services:', error);
    throw error;
  }
}

// Delete service functions
export async function deleteFlightService(serviceId: string, token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.FLIGHT_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Deleting flight service:', serviceId);

  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "omit",
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error deleting flight service:', text);
    throw new Error(`Failed to delete flight service (${res.status}): ${text || res.statusText}`);
  }

  console.log('[API] Flight service deleted successfully');
}

export async function deleteTrainService(serviceId: string, token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.TRAIN_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Deleting train service:', serviceId);

  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "omit",
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error deleting train service:', text);
    throw new Error(`Failed to delete train service (${res.status}): ${text || res.statusText}`);
  }

  console.log('[API] Train service deleted successfully');
}

export async function deleteBusService(serviceId: string, token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.BUS_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Deleting bus service:', serviceId);

  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "omit",
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error deleting bus service:', text);
    throw new Error(`Failed to delete bus service (${res.status}): ${text || res.statusText}`);
  }

  console.log('[API] Bus service deleted successfully');
}

// Update service functions
export async function updateFlightService(serviceId: string, token: string, data: unknown): Promise<FlightServiceListItem> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.FLIGHT_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Updating flight service:', serviceId);

  const res = await fetch(url, {
    method: "PUT",
    headers,
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error updating flight service:', text);
    throw new Error(`Failed to update flight service (${res.status}): ${text || res.statusText}`);
  }

  const responseData = await res.json();
  console.log('[API] Flight service updated successfully');
  return responseData;
}

export async function updateTrainService(serviceId: string, token: string, data: unknown): Promise<TrainServiceListItem> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.TRAIN_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Updating train service:', serviceId);

  const res = await fetch(url, {
    method: "PUT",
    headers,
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error updating train service:', text);
    throw new Error(`Failed to update train service (${res.status}): ${text || res.statusText}`);
  }

  const responseData = await res.json();
  console.log('[API] Train service updated successfully');
  return responseData;
}

export async function updateBusService(serviceId: string, token: string, data: unknown): Promise<BusServiceListItem> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.BUS_SERVICE_OPERATIONS(serviceId);
  console.log('[API] Updating bus service:', serviceId);

  const res = await fetch(url, {
    method: "PUT",
    headers,
    credentials: "omit",
    mode: "cors",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error updating bus service:', text);
    throw new Error(`Failed to update bus service (${res.status}): ${text || res.statusText}`);
  }

  const responseData = await res.json();
  console.log('[API] Bus service updated successfully');
  return responseData;
}

// Bookings API - Types
export interface PassengerDetails {
  passenger_id: string;
  name: string;
  age: number;
  gender: string;
  seat_no: string;
  document_id: string;
}

export interface ServiceDetails {
  type: "FlightService" | "TrainService" | "BusService";
  service_id: string;
  flight_number?: string;
  airline_name?: string;
  train_number?: string;
  train_name?: string;
  bus_number?: string;
  bus_travels_name?: string;
  departure_time: string;
  arrival_time: string;
  status: string;
  source: string;
  destination: string;
}

export interface StatusLog {
  status: string;
  timestamp: string;
  remarks: string;
}

export interface BookingPolicy {
  cancellation_window: number;
  cancellation_fee: number;
  reschedule_allowed: boolean;
  reschedule_fee: number;
  no_show_penalty: number;
  terms_conditions: string;
  no_cancellation_fee_markup: number | null;
  no_reschedule_fee_markup: number | null;
}

export interface BookingResponse {
  booking_id: string;
  customer: string;
  service_details: ServiceDetails | null;
  total_amount: string;
  status: string;
  payment_status: string;
  booking_date: string;
  created_at: string;
  passengers: PassengerDetails[];
  ticket: string | null;
  status_logs: StatusLog[];
  source_id: string;
  destination_id: string;
  class_type: string;
  policy: BookingPolicy | null;
  mobile_number: string | null;
  email_address: string | null;
}

// Fetch all bookings for the authenticated user
export async function getUserBookings(token: string): Promise<BookingResponse[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.BOOKING_CREATE;
  console.log('[API] Fetching user bookings from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Bookings response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching bookings:', text);
      throw new Error(`Failed to fetch bookings (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Bookings data received:', Array.isArray(data) ? data.length : 0, 'bookings');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching bookings:', error);
    throw error;
  }
}

// Active Sessions API - Types
export interface ActiveSession {
  session_token: string;
  is_current: boolean;
  created_at: string;
  expires_at: string;
  device: string;
}

export interface ActiveSessionsResponse {
  active_sessions: ActiveSession[];
  total_count: number;
}

// Fetch active sessions for the authenticated user
export async function getActiveSessions(token: string): Promise<ActiveSessionsResponse> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Content-Type": "application/json",
  };

  const url = `${BASE_URL}/auth/active-sessions/`;
  console.log('[API] Fetching active sessions from:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
      body: JSON.stringify({ token }),
    });

    console.log('[API] Active sessions response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching active sessions:', text);
      throw new Error(`Failed to fetch active sessions (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Active sessions data received:', data.total_count || 0, 'sessions');
    return data;
  } catch (error) {
    console.error('[API] Exception while fetching active sessions:', error);
    throw error;
  }
}

// Service provider summary
export async function getServiceProvidersList(token: string): Promise<ServiceProviderDetail[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.SERVICE_PROVIDER_LIST;
  console.log('[API] Fetching service providers from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Service providers response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching service providers:', text);
      throw new Error(`Failed to fetch service providers (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Service providers data received:', Array.isArray(data) ? data.length : 0, 'entries');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching service providers:', error);
    throw error;
  }
}

export interface AuthProfileUpdatePayload {
  username?: string;
  email?: string;
}

export async function updateAuthProfile(
  token: string,
  payload: AuthProfileUpdatePayload
): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  };

  const url = `${BASE_URL}/auth/update-profile/`;
  console.log('[API] Updating auth profile at:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify({
        token,
        ...(payload.username ? { username: payload.username } : {}),
        ...(payload.email ? { email: payload.email } : {}),
      }),
    });

    console.log('[API] Auth profile update response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[API] Failed to update auth profile:', text);
      throw new Error(`Failed to update profile (${res.status}): ${text || res.statusText}`);
    }
  } catch (error) {
    console.error('[API] Exception while updating auth profile:', error);
    throw error;
  }
}

export interface ServiceProviderUpdatePayload {
  company_name?: string;
  license_info?: string;
  contact_number?: string;
}

export async function updateServiceProviderDetails(
  providerUserId: string,
  payload: ServiceProviderUpdatePayload,
  token: string
): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }
  if (!providerUserId) {
    throw new Error('Provider user ID is required');
  }

  const headers: HeadersInit = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  };

  const url = API.SERVICE_PROVIDER_DETAILS(providerUserId);
  console.log('[API] Updating service provider details at:', url);

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify(payload),
    });

    console.log('[API] Service provider update response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[API] Failed to update service provider:', text);
      throw new Error(`Failed to update provider (${res.status}): ${text || res.statusText}`);
    }
  } catch (error) {
    console.error('[API] Exception while updating service provider:', error);
    throw error;
  }
}

export async function logoutSession(sessionToken: string, currentToken: string): Promise<void> {
  if (!sessionToken) {
    throw new Error('Session token to revoke is required');
  }
  if (!currentToken || currentToken.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Token ${currentToken}`,
  };

  const url = API.LOGOUT;
  console.log('[API] Revoking session via logout endpoint:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify({ token: sessionToken }),
    });

    console.log('[API] Session revoke response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[API] Failed to revoke session:', text);
      throw new Error(`Failed to revoke session (${res.status}): ${text || res.statusText}`);
    }
  } catch (error) {
    console.error('[API] Exception while revoking session:', error);
    throw error;
  }
}

// Logout from all devices
export async function logoutAllDevices(token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = `${BASE_URL}/auth/logout-all/`;
  console.log('[API] Logging out from all devices:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ token }),
    });

    console.log('[API] Logout all response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error logging out from all devices:', text);
      throw new Error(`Failed to logout from all devices (${res.status}): ${text || res.statusText}`);
    }

    console.log('[API] Successfully logged out from all devices');
  } catch (error) {
    console.error('[API] Exception while logging out from all devices:', error);
    throw error;
  }
}

// Deactivate user account
export async function deactivateAccount(token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = `${BASE_URL}/auth/delete-profile/`;
  console.log('[API] Deactivating account:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ token }),
    });

    console.log('[API] Deactivate account response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error deactivating account:', text);
      throw new Error(`Failed to deactivate account (${res.status}): ${text || res.statusText}`);
    }

    console.log('[API] Account deactivated successfully');
  } catch (error) {
    console.error('[API] Exception while deactivating account:', error);
    throw error;
  }
}

// Provider Bookings List types
export interface ProviderBookingListItem {
  booking_id: string;
  service_id: string | null;
  passenger_name: string;
  route: string;
  date: string;
  seats: string;
  amount: string;
  status: string;
  service_type: string;
  service_provider?: string | null;
}

export interface AdminBookingListItem extends ProviderBookingListItem {
  service_provider: string | null | undefined;
}

// Fetch provider bookings list
export async function getProviderBookingsList(token: string): Promise<ProviderBookingListItem[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.PROVIDER_BOOKINGS_LIST;
  console.log('[API] Fetching provider bookings from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Provider bookings response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching provider bookings:', text);
      throw new Error(`Failed to fetch provider bookings (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Provider bookings data received:', Array.isArray(data) ? data.length : 0, 'bookings');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching provider bookings:', error);
    throw error;
  }
}

// Fetch all bookings list for admin dashboard
export async function getAdminBookingsList(token: string): Promise<AdminBookingListItem[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_BOOKINGS_LIST;
  console.log('[API] Fetching admin bookings from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Admin bookings response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching admin bookings:', text);
      throw new Error(`Failed to fetch admin bookings (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Admin bookings data received:', Array.isArray(data) ? data.length : 0, 'bookings');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching admin bookings:', error);
    throw error;
  }
}

// Notification types
export interface RecipientNotification {
  receipt_id: string;
  status: "Pending" | "Read";
  sent_at: string;
  read_at: string | null;
  notification_id: string;
  subject: string;
  message_body: string;
  sent_by: string;
}

// Fetch notifications inbox
export async function getNotifications(token: string): Promise<RecipientNotification[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.NOTIFICATIONS_INBOX;
  console.log('[API] Fetching notifications from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Notifications response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching notifications:', text);
      throw new Error(`Failed to fetch notifications (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Notifications data received:', Array.isArray(data) ? data.length : 0, 'notifications');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching notifications:', error);
    throw error;
  }
}

// Mark notification as read
export async function markNotificationAsRead(receiptId: string, token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.NOTIFICATION_MARK_READ(receiptId);
  console.log('[API] Marking notification as read:', receiptId);

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ status: "Read" }),
    });

    console.log('[API] Mark as read response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error marking notification as read:', text);
      throw new Error(`Failed to mark notification as read (${res.status}): ${text || res.statusText}`);
    }

    console.log('[API] Notification marked as read successfully');
  } catch (error) {
    console.error('[API] Exception while marking notification as read:', error);
    throw error;
  }
}

export async function getAdminNotifications(token: string): Promise<AdminNotificationListItem[]> {
  if (!token || token.trim() === "") {
    throw new Error("Invalid or missing authentication token");
  }

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: `Token ${token}`,
  };

  const url = API.ADMIN_NOTIFICATIONS_LIST;
  console.log("[API] Fetching admin notification history from:", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log("[API] Admin notification history response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[API] Error fetching admin notifications:", text);
      throw new Error(`Failed to fetch admin notifications (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log("[API] Admin notification history received:", Array.isArray(data) ? data.length : 0);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[API] Exception while fetching admin notifications:", error);
    throw error;
  }
}

export async function getAdminNotificationDetail(
  token: string,
  notificationId: string
): Promise<AdminNotificationDetail> {
  if (!token || token.trim() === "") {
    throw new Error("Invalid or missing authentication token");
  }

  if (!notificationId) {
    throw new Error("Notification ID is required");
  }

  const headers: HeadersInit = {
    accept: "application/json",
    Authorization: `Token ${token}`,
  };

  const url = API.ADMIN_NOTIFICATION_DETAIL(notificationId);
  console.log("[API] Fetching admin notification detail from:", url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log("[API] Admin notification detail response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[API] Error fetching admin notification detail:", text);
      throw new Error(`Failed to fetch notification detail (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log("[API] Admin notification detail received:", data);
    return data;
  } catch (error) {
    console.error("[API] Exception while fetching admin notification detail:", error);
    throw error;
  }
}

export async function createAdminNotification(
  payload: CreateAdminNotificationPayload,
  token: string
): Promise<CreateAdminNotificationResponse> {
  if (!token || token.trim() === "") {
    throw new Error("Invalid or missing authentication token");
  }

  const headers: HeadersInit = {
    accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Token ${token}`,
  };

  const url = API.ADMIN_NOTIFICATION_CREATE;
  console.log("[API] Sending admin notification:", payload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify(payload),
    });

    console.log("[API] Admin notification create response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[API] Error creating admin notification:", text);
      throw new Error(`Failed to send notification (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log("[API] Admin notification created:", data);
    return data;
  } catch (error) {
    console.error("[API] Exception while creating admin notification:", error);
    throw error;
  }
}

export type ProviderNotificationAudience = 'Provider' | 'Service' | 'Booking';

export interface ProviderNotificationCreatePayload {
  subject: string;
  message_body: string;
  target_audience_type: ProviderNotificationAudience;
  service_model?: 'busservice' | 'trainservice' | 'flightservice';
  service_object_id?: string;
  booking_id?: string;
  booking_passenger_id?: string;
}

export async function createProviderNotification(
  payload: ProviderNotificationCreatePayload,
  token: string
): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Token ${token}`,
  };

  const url = API.PROVIDER_NOTIFICATION_CREATE;
  console.log('[API] Sending provider notification to:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'omit',
      mode: 'cors',
      body: JSON.stringify(payload),
    });

    console.log('[API] Provider notification response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[API] Failed to send provider notification:', text);
      throw new Error(`Failed to send notification (${res.status}): ${text || res.statusText}`);
    }

    console.log('[API] Provider notification created successfully');
  } catch (error) {
    console.error('[API] Exception while sending provider notification:', error);
    throw error;
  }
}

export type ProviderPerformanceData = {
  name: string;
  bookings: number;
  rating: number;
}[];

export async function getProviderPerformance(token: string): Promise<ProviderPerformanceData> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_PROVIDER_PERFORMANCE;
  console.log('[API] Fetching provider performance from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Provider performance response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching provider performance:', text);
      throw new Error(`Failed to fetch provider performance (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Provider performance data received:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching provider performance:', error);
    throw error;
  }
}

export type UserStat = {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  bookings: number;
  joined_at: string;
};

export type UserStatsResponse = {
  count: number;
  results: UserStat[];
};

export async function getUserStats(token: string): Promise<UserStatsResponse> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_USER_STATS;
  console.log('[API] Fetching user stats from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] User stats response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching user stats:', text);
      throw new Error(`Failed to fetch user stats (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] User stats data received:', data);
    return data;
  } catch (error) {
    console.error('[API] Exception while fetching user stats:', error);
    throw error;
  }
}

export type ProviderData = {
  user: string;
  username: string;
  email: string;
  company_name: string;
  license_info: string;
  contact_number: string;
  status: string;
  verified: boolean;
  verified_at: string | null;
  rating: number;
  total_reviews: number;
};

export async function getProviderList(token: string): Promise<ProviderData[]> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_PROVIDER_LIST;
  console.log('[API] Fetching provider list from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Provider list response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching provider list:', text);
      throw new Error(`Failed to fetch provider list (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Provider list data received:', data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[API] Exception while fetching provider list:', error);
    throw error;
  }
}

export type ProviderStatusPayload = {
  status: string;
  verified: boolean;
  verified_at: string | null;
};

export async function updateProviderStatus(
  userId: string,
  payload: ProviderStatusPayload,
  token: string
): Promise<ProviderData> {
  if (!userId || userId.trim() === "") {
    throw new Error("Provider user id is required");
  }

  if (!token || token.trim() === "") {
    throw new Error("Invalid or missing authentication token");
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Content-Type": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.SERVICE_PROVIDER_DETAILS(userId);
  console.log("[API] Updating provider status at:", url, "payload:", payload);

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify(payload),
    });

    console.log("[API] Update provider status response status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[API] Error updating provider status:", text);
      throw new Error(`Failed to update provider status (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log("[API] Provider status updated:", data);
    return data;
  } catch (error) {
    console.error("[API] Exception while updating provider status:", error);
    throw error;
  }
}

export type FinancialSummary = {
  today_revenue: number;
  week_revenue: number;
  month_revenue: number;
  pending_settlements: {
    amount: number;
    count: number;
  };
};

export type Transaction = {
  txn_id: string;
  type: string;
  customer: string;
  amount: number;
  status: string;
  method: string;
  date: string;
};

export type FinancialOverviewResponse = {
  summary: FinancialSummary;
  transactions: Transaction[];
};

export async function getFinancialOverview(token: string): Promise<FinancialOverviewResponse> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.ADMIN_FINANCIAL_OVERVIEW;
  console.log('[API] Fetching financial overview from:', url);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
    });

    console.log('[API] Financial overview response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error fetching financial overview:', text);
      throw new Error(`Failed to fetch financial overview (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Financial overview data received:', data);
    return data;
  } catch (error) {
    console.error('[API] Exception while fetching financial overview:', error);
    throw error;
  }
}

export type SqlRunnerResponse = {
  query_type: string;
  execution_time_ms: number;
  rows_returned: number;
  columns: string[];
  data: Array<Array<string | number | boolean | null>>;
};

export async function executeAdminSqlQuery(token: string, query: string): Promise<SqlRunnerResponse> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  if (!query || query.trim() === '') {
    throw new Error('Query cannot be empty');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.ADMIN_SQL_QUERY_RUNNER;
  console.log('[API] Executing admin SQL query via:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      cache: "no-store",
      mode: "cors",
      body: JSON.stringify({ query }),
    });

    console.log('[API] SQL runner response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] SQL runner error response:', text);
      throw new Error(`Failed to execute query (${res.status}): ${text || res.statusText}`);
    }

    const data = (await res.json()) as SqlRunnerResponse;
    return data;
  } catch (error) {
    console.error('[API] Exception while executing SQL query:', error);
    throw error;
  }
}

export async function deleteBooking(bookingId: string, token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
  };

  const url = API.BOOKING_DETAILS(bookingId);
  console.log('[API] Deleting booking:', bookingId);

  const res = await fetch(url, {
    method: "DELETE",
    headers,
    credentials: "omit",
    mode: "cors",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error('[API] Error deleting booking:', text);
    throw new Error(`Failed to delete booking (${res.status}): ${text || res.statusText}`);
  }

  console.log('[API] Booking deleted successfully');
}

export async function logout(token: string): Promise<void> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  const url = API.LOGOUT;
  console.log('[API] Logging out from:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ token }),
    });

    console.log('[API] Logout response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error logging out:', text);
      // Even if logout fails on server, we should probably clear client-side session
      // throw new Error(`Failed to logout (${res.status}): ${text || res.statusText}`);
    }

    console.log('[API] Successfully logged out');
  } catch (error) {
    console.error('[API] Exception while logging out:', error);
    // throw error;
  }
}

// Smart Filter LLM Response Interface
export interface SmartFilterResponse {
  stops: string | null;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  departure_time: string | null;
  arrival_time: string | null;
  airlines: string[];
}

// Smart Filter LLM API call
export async function callSmartFilterLLM(
  smartPrompt: string,
  token: string,
  csrfToken?: string
): Promise<SmartFilterResponse> {
  if (!token || token.trim() === '') {
    throw new Error('Invalid or missing authentication token');
  }

  const headers: HeadersInit = {
    "accept": "application/json",
    "Authorization": `Token ${token}`,
    "Content-Type": "application/json",
  };

  if (csrfToken) {
    (headers as Record<string, string>)["X-CSRFToken"] = csrfToken;
  }

  const url = API.SMART_FILTER_LLM;
  console.log('[API] Calling smart filter LLM endpoint:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "omit",
      mode: "cors",
      body: JSON.stringify({ smart_prompt: smartPrompt }),
    });

    console.log('[API] Smart filter response status:', res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error('[API] Error calling smart filter:', text);
      throw new Error(`Failed to parse smart filter (${res.status}): ${text || res.statusText}`);
    }

    const data = await res.json();
    console.log('[API] Smart filter response:', data);
    return data as SmartFilterResponse;
  } catch (error) {
    console.error('[API] Exception while calling smart filter:', error);
    throw error;
  }
}

export default API;
