// Types for the booking review page
export interface TravellerData {
  id: number;
  saved: boolean;
  linkedProfileId: string | null;
  firstName: string; // first_name
  lastName: string;  // last_name
  gender?: string;
  nationality?: string;
  age?: string; // Age in years (max 3 digits)
  dateOfBirth?: string; // ISO date string
}

export interface ProfileData {
  id: string; // traveller_id from backend
  customerName: string; // customer_name from backend
  firstName: string;
  lastName: string;
  gender?: string;
  nationality?: string;
  dateOfBirth?: string;
  email?: string; // optional
  phoneNumber?: string; // optional, phone_number from backend
  address?: string; // optional
}

export interface OfferData {
  id: string;
  code?: string;
  label?: string;
  discount: number;
  description?: string;
  instantOff: number;
}

export interface FieldRefs {
  [key: string]: HTMLInputElement | HTMLSelectElement | null;
}

export interface ContactDetails {
  countryCode: string;
  mobile: string;
  email: string;
}

export interface BillingAddress {
  pincode: string;
  address: string;
  city: string;
  state: string;
}