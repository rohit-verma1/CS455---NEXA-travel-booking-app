// API Configuration for Service Management
// Centralized configuration for all service-related API calls

const BASE_URL = "http://127.0.0.1:8000";

// Service API Endpoints
export const SERVICE_API = {
  BUS_SERVICES: `${BASE_URL}/services/bus-services/`,
  TRAIN_SERVICES: `${BASE_URL}/services/train-services/`,
  FLIGHT_SERVICES: `${BASE_URL}/services/flight-services/`,
};

// API Configuration
export const API_CONFIG = {
  BASE_URL: BASE_URL,
  // TODO: Replace with actual token from login (stored in localStorage/cookies)
  // This is a placeholder token - should be retrieved from authentication
  TOKEN: 'GtH4VqAaDQaaoQn16RqDJKoyCLUSTlNbAfcMhbI2',
  CSRF_TOKEN: '0FOGM80CL1PfbBkg3gLiudCBv3A2Bhsi',
};

/**
 * Generate API headers for service requests
 * @param includeAuth - Whether to include authentication headers (default: true)
 * @returns Headers object for fetch requests
 */
export const getServiceAPIHeaders = (includeAuth = true): Record<string, string> => {
  const headers: Record<string, string> = {
    'accept': 'application/json',
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    // TODO: In production, get token from localStorage or authentication context
    headers['Authorization'] = `Token ${API_CONFIG.TOKEN}`;
    headers['X-CSRFTOKEN'] = API_CONFIG.CSRF_TOKEN;
  }

  return headers;
};
