"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { getAuthFromStorage, StoredAuth } from "@/utils/authStorage";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { ElegantAlert } from "@/components/ui/elegant-alert";
import API from "@/app/api";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Trash2, MinusCircle } from "lucide-react"

interface CustomerProfile {
  user?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  secondary_email?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  mobile_number?: string;
  address?: string;
}

interface Trip {
  id: string;
  from: string;
  to: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled' | 'pending';
  price: string;
  bookingId: string;
  serviceNumber?: string;
  serviceName?: string;
  departureTime: string;
  arrivalTime: string;
  passengers: number;
  classType: string;
}

interface TripsData {
  [key: string]: Trip[];
}

type StatusType = Trip['status'];

interface Trips {
  flights: Trip[];
  trains: Trip[];
  buses: Trip[];
}

interface Traveller {
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

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface ToggleButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

type TripType = 'flights' | 'trains' | 'buses';

interface TripCardProps {
  trip: Trip;
  type: TripType;
}

interface TravellerCardProps {
  traveller: Traveller;
  onEdit: (traveller: Traveller) => void;
  onRemove: (id: string) => void;
}

interface TravellerModalProps {
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: Traveller;
  loading?: boolean;
}

interface DatePickerFieldProps {
  icon: React.ReactNode;
  label: string;
  value?: Date;
  onChange?: (date: Date) => void;
}

interface TextAreaFieldProps {
  icon: React.ReactNode;
  label: string;
  placeholder?: string;
  rows?: number;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

interface SelectFieldProps {
  icon: React.ReactNode;
  label: string;
  options: string[];
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface InputFieldProps {
  icon: React.ReactNode;
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

interface ProfilePicModalProps {
  onClose: () => void;
}

interface EditNameModalProps {
  onClose: () => void;
}

interface PasswordResetModalProps {
  onClose: () => void;
}

type ReviewCategoryKey = "punctuality" | "comfort" | "amenities" | "customerService";
type ReviewRatingOption = "NA" | 0 | 1 | 2 | 3 | 4 | 5;
type ReviewRatingValue = ReviewRatingOption | null;
type ReviewRatingsState = Record<ReviewCategoryKey, ReviewRatingValue>;

const REVIEW_CATEGORIES: Array<{ key: ReviewCategoryKey; label: string; allowNA: boolean }> = [
  { key: "punctuality", label: "Punctuality", allowNA: false },
  { key: "comfort", label: "Comfort", allowNA: false },
  { key: "amenities", label: "Amenities", allowNA: true },
  { key: "customerService", label: "Customer Service", allowNA: true },
];

const REVIEW_RATING_OPTIONS: ReviewRatingOption[] = ["NA", 0, 1, 2, 3, 4, 5];
import { 
  User, Users, Monitor, KeyRound, Mail, Phone, MapPin, 
  Calendar, Globe, Heart, Edit2, Camera, Eye, EyeOff, 
  X, Plane, Train, Bus, Clock, CheckCircle, XCircle,
  Upload, ChevronDown, UserCircle, LogOut, Save, Plus, Moon, Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Navbar } from "@/components/shared/navbar";

export default function MyAccountPage() {
  const [authData, setAuthData] = useState<StoredAuth | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthData(getAuthFromStorage());
    }
  }, []);
  // authData: { token, user_type, username, email }
  // Read tab from URL query param
  function getTabFromUrl() {
    if (typeof window === "undefined") return "profile";
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (["profile", "trips", "travellers", "devices"].includes(tab || "")) {
      return tab;
    }
    return "profile";
  }
  const [activeTab, setActiveTab] = useState(getTabFromUrl());

  // Update activeTab whenever the tab query param changes
  useEffect(() => {
    function checkTab() {
      const tab = getTabFromUrl();
      setActiveTab(tab);
    }
    window.addEventListener("popstate", checkTab);
    window.addEventListener("pushstate", checkTab);
    window.addEventListener("replacestate", checkTab);
    // Also check on every render (for SPA navigation)
    const id = setInterval(checkTab, 300);
    return () => {
      window.removeEventListener("popstate", checkTab);
      window.removeEventListener("pushstate", checkTab);
      window.removeEventListener("replacestate", checkTab);
      clearInterval(id);
    };
  }, []);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);

  // Update activeTab if URL changes (e.g. user navigates)
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getTabFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Insert computed variables inside the component function (after the opening of the component body)
  const nameParts = (authData?.username || "").replace(/[^A-Za-z]+/g, " ").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts[1] : "";

  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  // Use Next.js router for tab navigation
  const router = typeof window !== "undefined" ? require('next/navigation').useRouter() : null;

  // Helper to switch tab and update URL
  const handleTabChange = (tab: string) => {
    if (router) {
      router.push(`/userDetails/profile?tab=${tab}`);
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-gray-50">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex gap-8">
        {/* Left Sidebar */}
        <aside className="w-80 flex-shrink-0">
          {/* User Info Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-100">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-slate-100">
                  {(() => {
                    const username = authData?.username || "User";
                    // Split by non-alphabetic chars
                    const words = username.split(/[^A-Za-z]+/).filter(Boolean);
                    let initials = "";
                    if (words.length >= 2) {
                      initials = (words[0][0] || "").toUpperCase() + (words[1][0] || "").toUpperCase();
                    } else if (words.length === 1) {
                      initials = (words[0][0] || "").toUpperCase() + (words[0][1] || "").toUpperCase();
                    } else {
                      initials = "US";
                    }
                    return initials;
                  })()}
                </div>
                <button 
                  onClick={() => setShowProfilePicModal(true)}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border-2 border-slate-100 hover:bg-slate-50 transition-all duration-200 group-hover:scale-110"
                >
                  <Camera className="h-4 w-4 text-slate-600" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <h3 className="font-bold text-xl text-gray-900">{(() => {
                  const username = authData?.username || "User";
                  return username.charAt(0).toUpperCase() + username.slice(1);
                })()}</h3>
                <button 
                  onClick={() => setShowEditNameModal(true)}
                  className="p-1 hover:bg-slate-50 rounded-lg transition-all duration-200"
                >
                  <Edit2 className="h-4 w-4 text-slate-600" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{authData?.email || ""}</p>
              <div className="mt-4 flex gap-2">
                <span className="px-3 py-1 bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 rounded-full text-xs font-medium border border-slate-200">
                  Travel Customer
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-4 space-y-2 border border-slate-100">
            <NavButton
              icon={<User className="h-5 w-5" />}
              label="My Profile"
              active={activeTab === "profile"}
              onClick={() => handleTabChange("profile")}
            />
            <NavButton
              icon={<Plane className="h-5 w-5" />}
              label="My Trips"
              active={activeTab === "trips"}
              onClick={() => handleTabChange("trips")}
            />
            <NavButton
              icon={<Users className="h-5 w-5" />}
              label="My Travellers"
              active={activeTab === "travellers"}
              onClick={() => handleTabChange("travellers")}
            />
            <NavButton
              icon={<Monitor className="h-5 w-5" />}
              label="Logged-in Devices"
              active={activeTab === "devices"}
              onClick={() => handleTabChange("devices")}
            />
            <div className="pt-2 border-t border-gray-100 mt-2">
              <NavButton
                icon={<KeyRound className="h-5 w-5" />}
                label="Reset Password"
                active={false}
                onClick={() => setShowPasswordModal(true)}
              />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-100">
          <div className="p-8 h-full overflow-y-auto">
            {activeTab === "profile" && <ProfileSection authData={authData} />}
            {activeTab === "trips" && <TripsSection />}
            {activeTab === "travellers" && <TravellersSection />}
            {activeTab === "devices" && <DevicesSection />}
          </div>
        </section>
      </main>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <PasswordResetModal onClose={() => setShowPasswordModal(false)} />
      )}

      {/* Profile Picture Modal */}
      {showProfilePicModal && (
        <ProfilePicModal onClose={() => setShowProfilePicModal(false)} />
      )}

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <EditNameModal onClose={() => setShowEditNameModal(false)} />
      )}
    </div>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      suppressHydrationWarning
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md"
          : "text-gray-700 hover:bg-slate-50 hover:translate-x-1"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface ProfileSectionProps {
  authData: StoredAuth | null;
}

function ProfileSection({ authData }: ProfileSectionProps) {
  // Initialize name state
  const [firstNameState, setFirstNameState] = useState("");
  const [lastNameState, setLastNameState] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [maritalStatus, setMaritalStatus] = useState<string>("");
  const [secondaryEmail, setSecondaryEmail] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");
  
  // API Constants
  const CSRF_TOKEN = "0FOGM80CL1PfbBkg3gLiudCBv3A2Bhsi";

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      const auth = getAuthFromStorage();
      if (!auth || !auth.user_id || !auth.token) return;

      try {
        const response = await fetch(
          API.CUSTOMER_DETAILS(auth.user_id),
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Token ${auth.token}`,
              "X-CSRFTOKEN": CSRF_TOKEN,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch profile data");
        }

        const data = await response.json();
        
        // Populate form fields
        setFirstNameState(data.first_name || "");
        setLastNameState(data.last_name || "");
        setDateOfBirth(data.date_of_birth || "");
        setGender(data.gender || "");
        setNationality(data.nationality || "");
        setMaritalStatus(data.marital_status || "");
        setSecondaryEmail(data.secondary_email || "");
        setMobileNumber(data.mobile_number || "");
        setAddress(data.address || "");
      } catch (error) {
        console.error("Error fetching profile:", error);
        setAlertType("error");
        setAlertMessage("Failed to load profile data. Please refresh the page.");
      }
    };

    fetchProfileData();
  }, []);
  
  // Load username once on mount (for backwards compatibility)
  useEffect(() => {
    const data = typeof window !== "undefined" ? getAuthFromStorage() : null;
    const parts = (data?.username || "")
      .replace(/[^A-Za-z]+/g, " ")
      .trim()
      .split(/ +/);
    // Only set if not already populated from API
    if (!firstNameState) setFirstNameState(parts[0] || "");
    if (!lastNameState) setLastNameState(parts.length > 1 ? parts[1] : "");
  }, []);
  
  // Save profile data
  const handleSaveProfile = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.user_id || !auth.token) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(
        API.CUSTOMER_DETAILS(auth.user_id),
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            Authorization: `Token ${auth.token}`,
            "Content-Type": "application/json",
            "X-CSRFTOKEN": CSRF_TOKEN,
          },
          body: JSON.stringify({
            first_name: firstNameState,
            last_name: lastNameState,
            nationality: nationality,
            gender: gender,
            marital_status: maritalStatus,
            date_of_birth: dateOfBirth,
            secondary_email: secondaryEmail,
            address: address,
            preferences: {},
            mobile_number: mobileNumber,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update profile");
      }

      setAlertType("success");
      setAlertMessage("Profile updated successfully!");
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setAlertType("error");
      setAlertMessage(error.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Load username once on mount
  useEffect(() => {
    const data = typeof window !== "undefined" ? getAuthFromStorage() : null;
    const parts = (data?.username || "")
      .replace(/[^A-Za-z]+/g, " ")
      .trim()
      .split(/ +/);
    setFirstNameState(parts[0] || "");
    setLastNameState(parts.length > 1 ? parts[1] : "");
  }, []);
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">My Profile</h2>
        <p className="text-gray-500 mt-2">Manage your personal information</p>
      </div>

      {/* Alert Message */}
      {alertMessage && (
        <div className="mb-6">
          <ElegantAlert
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage("")}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Replace static name values with dynamic ones from authData */}
        <InputField
          icon={<User className="h-5 w-5" />}
          label="First Name"
          value={firstNameState}
          onChange={(e) => setFirstNameState(e.target.value)}
          placeholder="First Name"
        />
        <InputField
          icon={<User className="h-5 w-5" />}
          label="Last Name"
          value={lastNameState}
          onChange={(e) => setLastNameState(e.target.value)}
          placeholder="Last Name"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Date of Birth <span className="text-red-500">*</span>
          </label>
          <DatePicker
            selected={dateOfBirth ? new Date(dateOfBirth) : undefined}
            onChange={(date?: Date) => {
              setDateOfBirth(date ? date.toISOString().split("T")[0] : "");
            }}
          />
        </div>
        <SelectField
          icon={<User className="h-5 w-5" />}
          label="Gender"
          options={["Select Gender", "Male", "Female", "Other", "Prefer not to say"]}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        />
        <InputField
          icon={<Globe className="h-5 w-5" />}
          label="Nationality"
          placeholder="Indian"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
        />
        <SelectField
          icon={<Heart className="h-5 w-5" />}
          label="Marital Status"
          options={["Select Status", "Single", "Married", "Divorced", "Widowed", "Other"]}
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
        />
        <div className="md:col-span-2">
          <InputField
            icon={<Mail className="h-5 w-5" />}
            label="Email Address (Primary)"
            type="email"
            placeholder="john.doe@example.com"
            value={authData?.email || ""}
            disabled={true}
          />
        </div>
        <div className="md:col-span-2">
          <InputField
            icon={<Mail className="h-5 w-5" />}
            label="Secondary Email Address"
            type="email"
            placeholder="john.secondary@example.com"
            value={secondaryEmail}
            onChange={(e) => setSecondaryEmail(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <InputField
            icon={<Phone className="h-5 w-5" />}
            label="Phone Number"
            type="tel"
            placeholder="+91 9876543210"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <TextAreaField
            icon={<MapPin className="h-5 w-5" />}
            label="Address"
            placeholder="123 Street, City, State, Country - 123456"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-gray-700"
        >
          Cancel
        </button>
        <button 
          onClick={handleSaveProfile}
          disabled={loading}
          className="px-8 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-5 w-5" />
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}



function TripsSection() {
  const [activeType, setActiveType] = useState<TripType>("flights");
  const [trips, setTrips] = useState<TripsData>({
    flights: [],
    trains: [],
    buses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Fetch bookings on mount
  useEffect(() => {
    const fetchBookings = async () => {
      const auth = getAuthFromStorage();
      if (!auth || !auth.token) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        
        // Import the getUserBookings function
        const { getUserBookings } = await import("@/app/api");
        const bookings = await getUserBookings(auth.token);
        
        // Transform bookings into trips by service type
        const flightsTrips: Trip[] = [];
        const trainsTrips: Trip[] = [];
        const busesTrips: Trip[] = [];

        bookings.forEach((booking) => {
          // Skip bookings without service details
          if (!booking.service_details) return;

          // Determine status based on booking status and date
          let status: Trip['status'] = 'pending';
          const bookingDate = new Date(booking.service_details.departure_time);
          const now = new Date();
          
          if (booking.status === 'Cancelled' || booking.status === 'Canceled') {
            status = 'cancelled';
          } else if (booking.status === 'Confirmed' || booking.status === 'Booked') {
            // Check if the trip is in the future or past
            if (bookingDate > now) {
              status = 'upcoming';
            } else {
              status = 'completed';
            }
          } else if (booking.status === 'Pending') {
            status = 'pending';
          }

          const trip: Trip = {
            id: booking.booking_id,
            bookingId: booking.booking_id,
            from: booking.service_details.source,
            to: booking.service_details.destination,
            date: booking.service_details.departure_time.split('T')[0],
            status: status,
            price: `₹${parseFloat(booking.total_amount).toLocaleString('en-IN')}`,
            serviceNumber: booking.service_details.flight_number || 
                          booking.service_details.train_number || 
                          booking.service_details.bus_number?.toString(),
            serviceName: booking.service_details.airline_name || 
                        booking.service_details.train_name || 
                        booking.service_details.bus_travels_name,
            departureTime: booking.service_details.departure_time,
            arrivalTime: booking.service_details.arrival_time,
            passengers: booking.passengers.length,
            classType: booking.class_type,
          };

          // Categorize by service type
          if (booking.service_details.type === 'FlightService') {
            flightsTrips.push(trip);
          } else if (booking.service_details.type === 'TrainService') {
            trainsTrips.push(trip);
          } else if (booking.service_details.type === 'BusService') {
            busesTrips.push(trip);
          }
        });

        // Sort trips by date (most recent first)
        const sortByDate = (a: Trip, b: Trip) => 
          new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime();

        setTrips({
          flights: flightsTrips.sort(sortByDate),
          trains: trainsTrips.sort(sortByDate),
          buses: busesTrips.sort(sortByDate),
        });
      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        setError(err.message || "Failed to load bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">My Trips</h2>
        <p className="text-gray-500 mt-2">View and manage your travel bookings</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ElegantAlert
            message={error}
            type="error"
            onClose={() => setError("")}
          />
        </div>
      )}

      {/* Travel Type Toggle */}
      <div className="flex gap-3 mb-6 bg-gradient-to-r from-gray-50 to-slate-50 p-2 rounded-xl border border-slate-100">
        <ToggleButton
          icon={<Plane className="h-5 w-5" />}
          label={`Flights (${trips.flights.length})`}
          active={activeType === "flights"}
          onClick={() => setActiveType("flights")}
        />
        <ToggleButton
          icon={<Train className="h-5 w-5" />}
          label={`Trains (${trips.trains.length})`}
          active={activeType === "trains"}
          onClick={() => setActiveType("trains")}
        />
        <ToggleButton
          icon={<Bus className="h-5 w-5" />}
          label={`Buses (${trips.buses.length})`}
          active={activeType === "buses"}
          onClick={() => setActiveType("buses")}
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your trips...</p>
        </div>
      ) : (
        <>
          {/* Trips List */}
          <div className="space-y-4">
            {trips[activeType].map((trip) => (
              <TripCard key={trip.id} trip={trip} type={activeType} />
            ))}
          </div>

          {trips[activeType].length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                {activeType === "flights" && <Plane className="h-16 w-16 mx-auto" />}
                {activeType === "trains" && <Train className="h-16 w-16 mx-auto" />}
                {activeType === "buses" && <Bus className="h-16 w-16 mx-auto" />}
              </div>
              <p className="text-gray-500 text-lg">No {activeType} trips found</p>
              <p className="text-gray-400 text-sm mt-2">Your booked {activeType} will appear here</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToggleButton({ icon, label, active, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
        active
          ? "bg-gradient-to-r from-slate-500 to-gray-600 text-white shadow-md"
          : "text-gray-600 hover:bg-white/70"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TripCard({ trip, type }: TripCardProps) {
  const statusConfig = {
    upcoming: { icon: <Clock className="h-5 w-5" />, bg: "bg-slate-50", text: "text-slate-600", label: "Upcoming" },
    completed: { icon: <CheckCircle className="h-5 w-5" />, bg: "bg-green-50", text: "text-green-600", label: "Completed" },
    cancelled: { icon: <XCircle className="h-5 w-5" />, bg: "bg-red-50", text: "text-red-600", label: "Cancelled" },
    pending: { icon: <Clock className="h-5 w-5" />, bg: "bg-yellow-50", text: "text-yellow-600", label: "Pending Payment" },
  };

  const status = statusConfig[trip.status];

  // Format time from ISO string
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true, 
        timeZone: 'UTC'
      });
    } catch {
      return '';
    }
  };

  // Use Next.js router for navigation
  const router = typeof window !== "undefined" ? require('next/navigation').useRouter() : null;

  const [showManageModal, setShowManageModal] = useState(false);
  const [manageView, setManageView] = useState<"actions" | "cancel">("actions");
  const [cancelReason, setCancelReason] = useState("");
  const [manageAlert, setManageAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [shouldReloadAfterManageClose, setShouldReloadAfterManageClose] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRatings, setReviewRatings] = useState<ReviewRatingsState>({
    punctuality: null,
    comfort: null,
    amenities: null,
    customerService: null,
  });
  const [reviewSubject, setReviewSubject] = useState("");
  const [reviewContext, setReviewContext] = useState("");
  const [reviewAlert, setReviewAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isPastTrip = (() => {
    const tripDate = new Date(trip.date);
    if (isNaN(tripDate.getTime())) return false;
    const normalizedTripDate = new Date(tripDate);
    normalizedTripDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return normalizedTripDate < today;
  })();

  const shouldShowManageButton = !isPastTrip && trip.status !== "cancelled" && trip.status !== "pending";
  const shouldShowReviewButton = isPastTrip && trip.status !== "cancelled";
  const isReasonValid = cancelReason.trim().length > 0;

  const resetManageState = () => {
    setManageView("actions");
    setCancelReason("");
    setManageAlert(null);
    setIsCancelling(false);
  };

  const closeManageModal = () => {
    setShowManageModal(false);
    const needsReload = shouldReloadAfterManageClose;
    resetManageState();
    setShouldReloadAfterManageClose(false);
    if (needsReload && typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const openManageModal = () => {
    resetManageState();
    setShouldReloadAfterManageClose(false);
    setShowManageModal(true);
  };

  const handleCancelBooking = async () => {
    const auth = typeof window !== "undefined" ? getAuthFromStorage() : null;
    if (!auth?.token) {
      setManageAlert({
        type: "error",
        message: "Please sign in again to manage this booking."
      });
      return;
    }

    setIsCancelling(true);
    setManageAlert(null);

    try {
      const response = await fetch(API.BOOKING_CANCEL(trip.bookingId), {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Unable to cancel this booking right now.");
      }

      setManageAlert({
        type: "success",
        message: "Cancellation successful, you would receive the refund amount within 24hrs.",
      });
      setShouldReloadAfterManageClose(true);

      setTimeout(() => {
        closeManageModal();
      }, 1800);
    } catch (error: any) {
      console.error("Error cancelling booking:", error);
      setManageAlert({
        type: "error",
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const resetReviewState = () => {
    setReviewRatings({
      punctuality: null,
      comfort: null,
      amenities: null,
      customerService: null,
    });
    setReviewSubject("");
    setReviewContext("");
    setReviewAlert(null);
    setIsSubmittingReview(false);
  };

  const openReviewModal = () => {
    resetReviewState();
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    resetReviewState();
  };

  const handleRatingToggle = (categoryKey: ReviewCategoryKey, option: ReviewRatingOption) => {
    if (option === "NA") {
      const category = REVIEW_CATEGORIES.find((cat) => cat.key === categoryKey);
      if (category && !category.allowNA) {
        return;
      }
    }

    setReviewRatings((prev) => ({
      ...prev,
      [categoryKey]: prev[categoryKey] === option ? null : option,
    }));
  };

  type NumericRating = Exclude<ReviewRatingValue, "NA" | null>;
  const numericRatings = Object.values(reviewRatings).filter(
    (value): value is NumericRating => typeof value === "number"
  );
  const numericValues: number[] = numericRatings as number[];
  const overallRating = numericValues.length
    ? parseFloat((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(2))
    : null;
  const roundedOverallRating = overallRating !== null ? Math.round(overallRating) : null;
  const canSubmitReview =
    numericRatings.length > 0 && reviewSubject.trim().length > 0 && reviewContext.trim().length > 0 && !isSubmittingReview;

  const handleReviewSubmit = async () => {
    if (roundedOverallRating === null) {
      setReviewAlert({
        type: "error",
        message: "Please rate at least one category before submitting.",
      });
      return;
    }

    const auth = typeof window !== "undefined" ? getAuthFromStorage() : null;
    if (!auth?.token) {
      setReviewAlert({
        type: "error",
        message: "Please sign in again to share your review.",
      });
      return;
    }

    setIsSubmittingReview(true);
    setReviewAlert(null);

    try {
      const response = await fetch(API.SERVICE_PROVIDER_ADD_REVIEW(trip.bookingId), {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: roundedOverallRating,
          comments: {
            title: reviewSubject.trim(),
            body: reviewContext.trim(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Unable to submit your review right now.");
      }

      setReviewAlert({
        type: "success",
        message: "Thanks for sharing your experience.",
      });

      setTimeout(() => {
        closeReviewModal();
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      setReviewAlert({
        type: "error",
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-slate-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-3 rounded-lg border border-slate-200">
            {type === "flights" && <Plane className="h-6 w-6 text-slate-600" />}
            {type === "trains" && <Train className="h-6 w-6 text-slate-600" />}
            {type === "buses" && <Bus className="h-6 w-6 text-slate-600" />}
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              {trip.from} → {trip.to}
            </h3>
            {trip.serviceName && (
              <p className="text-sm text-gray-600 font-medium mt-1">
                {trip.serviceName} {trip.serviceNumber && `• ${trip.serviceNumber}`}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(trip.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {trip.departureTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatTime(trip.departureTime)} - {formatTime(trip.arrivalTime)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">
                {trip.classType}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded">
                {trip.passengers} {trip.passengers === 1 ? 'Passenger' : 'Passengers'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-2 ${status.bg} ${status.text} px-3 py-1 rounded-full text-sm font-medium mb-2`}>
            {status.icon}
            {status.label}
          </div>
          <p className="text-lg font-bold text-gray-900">{trip.price}</p>
        </div>
      </div>
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <button
          className="flex-1 px-4 py-2 border border-slate-500 text-slate-600 rounded-lg hover:bg-slate-50 transition-all duration-200 font-medium"
          onClick={() => {
            if (router) {
              router.push(`/userDetails/confirm?bookingId=${trip.bookingId}`);
            } else {
              window.location.href = `/userDetails/confirm?bookingId=${trip.bookingId}`;
            }
          }}
        >
          View Details
        </button>
        {trip.status === "pending" && (
          <button className="flex-1 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium">
            Complete Payment
          </button>
        )}
        {shouldShowManageButton && (
          <button
            className="flex-1 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            onClick={openManageModal}
          >
            Manage Booking
          </button>
        )}
        {shouldShowReviewButton && (
          <button
            className="flex-1 px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            onClick={openReviewModal}
          >
            Review Booking
          </button>
        )}
      </div>
      {showManageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={closeManageModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {manageView === "actions" ? (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  Manage Booking
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Please review the options below carefully. Changes may be subject to provider approval and fare differences.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setManageView("cancel")}
                    className="w-full px-6 py-4 rounded-xl border border-gray-200 hover:border-gray-300 text-left transition-all duration-200"
                  >
                    <p className="text-base font-semibold text-gray-900">Cancel Booking</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Receive a refund as per fare rules after a short review.
                    </p>
                  </button>
                  <button
                    disabled
                    className="w-full px-6 py-4 rounded-xl border border-dashed border-gray-200 text-left transition-all duration-200 opacity-60 cursor-not-allowed"
                  >
                    <p className="text-base font-semibold text-gray-900">Reschedule Booking</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Coming soon. Reach out to support if you need urgent changes.
                    </p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Confirm Cancellation</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Cancellations are reviewed instantly and may be subject to airline or operator policies.
                  A brief reason helps us process your refund faster.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="e.g. Change in travel plans"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Refund timelines are governed by the carrier. We initiate the process as soon as you confirm.
                </p>

                {manageAlert && (
                  <div className="mt-4">
                    <ElegantAlert
                      message={manageAlert.message}
                      type={manageAlert.type}
                      onClose={() => setManageAlert(null)}
                    />
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={closeManageModal}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={!isReasonValid || isCancelling}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCancelling ? "Processing..." : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative">
            <button
              onClick={closeReviewModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Review Your Trip</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your ratings help providers stay accountable. Please keep feedback factual and professional.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border border-gray-100 rounded-xl">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="text-left px-4 py-3">Category</th>
                    {REVIEW_RATING_OPTIONS.map((option) => (
                      <th key={`head-${option}`} className="px-3 py-3 text-center font-medium">
                        {option === "NA" ? "N/A" : option}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REVIEW_CATEGORIES.map((category, rowIndex) => (
                    <tr key={category.key} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{category.label}</td>
                      {REVIEW_RATING_OPTIONS.map((option) => (
                        <td key={`${category.key}-${option}`} className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                            checked={reviewRatings[category.key] === option}
                            disabled={option === "NA" && !category.allowNA}
                            onChange={() => handleRatingToggle(category.key, option)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Overall rating:{" "}
              <span className="font-semibold text-gray-900">
                {overallRating !== null ? `${overallRating}/5` : "—"}
              </span>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-gray-400 text-xs">(max 100 characters)</span>
              </label>
              <input
                type="text"
                value={reviewSubject}
                maxLength={100}
                onChange={(event) => setReviewSubject(event.target.value)}
                placeholder="e.g. Seamless overnight journey"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 transition-all duration-200"
              />
              <div className="text-xs text-gray-400 text-right mt-1">
                {reviewSubject.length}/100
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Context <span className="text-gray-400 text-xs">(max 1200 characters)</span>
              </label>
              <textarea
                value={reviewContext}
                maxLength={1200}
                rows={4}
                onChange={(event) => setReviewContext(event.target.value)}
                placeholder="Share additional context that may help future travelers."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 transition-all duration-200"
              />
              <div className="text-xs text-gray-400 text-right mt-1">
                {reviewContext.length}/1200
              </div>
            </div>

            {reviewAlert && (
              <div className="mt-4">
                <ElegantAlert
                  message={reviewAlert.message}
                  type={reviewAlert.type}
                  onClose={() => setReviewAlert(null)}
                />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeReviewModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={!canSubmitReview}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingReview ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TravellersSection() {
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [showTravellerModal, setShowTravellerModal] = useState(false);
  const [editingTraveller, setEditingTraveller] = useState<Traveller | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");

  // Fetch travellers on mount
  useEffect(() => {
    const fetchTravellers = async () => {
      const auth = getAuthFromStorage();
      if (!auth || !auth.token) return;

      try {
        const response = await fetch(
          API.CO_TRAVELLERS,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              Authorization: `Token ${auth.token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch travellers");
        }

        const data = await response.json();
        setTravellers(data);
      } catch (error) {
        console.error("Error fetching travellers:", error);
        setAlertType("error");
        setAlertMessage("Failed to load travellers. Please refresh the page.");
      }
    };

    fetchTravellers();
  }, []);

  const handleAddTraveller = async (travellerData: any) => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(
        API.CO_TRAVELLERS,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            Authorization: `Token ${auth.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: travellerData.first_name,
            last_name: travellerData.last_name,
            gender: travellerData.gender,
            marital_status: travellerData.marital_status,
            date_of_birth: travellerData.date_of_birth,
            email: travellerData.email,
            phone_number: travellerData.phone_number,
            address: travellerData.address,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to add traveller");
      }

      const newTraveller = await response.json();
      setTravellers([...travellers, newTraveller]);
      setShowTravellerModal(false);
      setAlertType("success");
      setAlertMessage("Traveller added successfully!");
    } catch (error: any) {
      console.error("Error adding traveller:", error);
      setAlertType("error");
      setAlertMessage(error.message || "Failed to add traveller. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditTraveller = async (travellerData: any) => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token || !editingTraveller) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(
        API.CO_TRAVELLER_DETAILS(editingTraveller.traveller_id),
        {
          method: "PUT",
          headers: {
            accept: "application/json",
            Authorization: `Token ${auth.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: travellerData.first_name,
            last_name: travellerData.last_name,
            gender: travellerData.gender,
            marital_status: travellerData.marital_status,
            date_of_birth: travellerData.date_of_birth,
            email: travellerData.email,
            phone_number: travellerData.phone_number,
            address: travellerData.address,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update traveller");
      }

      const updatedTraveller = await response.json();
      setTravellers(travellers.map(t => 
        t.traveller_id === editingTraveller.traveller_id ? updatedTraveller : t
      ));
      setShowTravellerModal(false);
      setEditingTraveller(null);
      setAlertType("success");
      setAlertMessage("Traveller updated successfully!");
    } catch (error: any) {
      console.error("Error updating traveller:", error);
      setAlertType("error");
      setAlertMessage(error.message || "Failed to update traveller. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTraveller = async (id: string) => {
    if (!confirm("Are you sure you want to remove this traveller?")) {
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(
        API.CO_TRAVELLER_DETAILS(id),
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
            Authorization: `Token ${auth.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to remove traveller");
      }

      // Remove from local state on success
      setTravellers(travellers.filter(t => t.traveller_id !== id));
      setAlertType("success");
      setAlertMessage("Traveller removed successfully!");
    } catch (error: any) {
      console.error("Error removing traveller:", error);
      setAlertType("error");
      setAlertMessage(error.message || "Failed to remove traveller. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (traveller: Traveller) => {
    setEditingTraveller(traveller);
    setShowTravellerModal(true);
  };

  return (
    <div suppressHydrationWarning>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">My Travellers</h2>
          <p className="text-gray-500 mt-2">Manage frequently travelling companions</p>
        </div>
        <button 
          onClick={() => {
            setEditingTraveller(null);
            setShowTravellerModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          Add New Traveller
        </button>
      </div>

      {/* Alert Message */}
      {alertMessage && (
        <div className="mb-6">
          <ElegantAlert
            message={alertMessage}
            type={alertType}
            onClose={() => setAlertMessage("")}
          />
        </div>
      )}

      {travellers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">No travellers added yet</p>
          <p className="text-gray-400 text-sm">Add your frequently travelling companions for faster bookings</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {travellers.map((traveller) => (
            <TravellerCard 
              key={traveller.traveller_id} 
              traveller={traveller} 
              onEdit={() => openEditModal(traveller)}
              onRemove={() => handleRemoveTraveller(traveller.traveller_id)}
            />
          ))}
        </div>
      )}

      {showTravellerModal && (
        <TravellerModal 
          onClose={() => {
            setShowTravellerModal(false);
            setEditingTraveller(null);
          }}
          onSave={editingTraveller ? handleEditTraveller : handleAddTraveller}
          initialData={editingTraveller || undefined}
          loading={loading}
        />
      )}
    </div>
  );
}

function TravellerCard({ traveller, onEdit, onRemove }: TravellerCardProps) {
  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getGenderIcon = (gender: string) => {
    if (gender === "Male") {
      return <UserCircle className="h-5 w-5 text-slate-600" />;
    } else if (gender === "Female") {
      return <UserCircle className="h-5 w-5 text-pink-600" />;
    }
    return <User className="h-5 w-5 text-gray-600" />;
  };

  const getGradient = (gender: string) => {
    if (gender === "Male") {
      return "from-slate-400 to-slate-600";
    } else if (gender === "Female") {
      return "from-pink-400 to-pink-600";
    }
    return "from-gray-400 to-gray-600";
  };

  const age = calculateAge(traveller.date_of_birth);

  return (
    <div className="border border-slate-100 rounded-xl p-5 hover:shadow-lg transition-all duration-200 hover:border-slate-300">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${getGradient(traveller.gender)} flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-slate-100`}>
            {traveller.first_name[0]}{traveller.last_name[0]}
          </div>
          <div>
            <h4 className="font-bold text-lg text-gray-900">{traveller.first_name} {traveller.last_name}</h4>
            <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1">
                {getGenderIcon(traveller.gender)}
                {traveller.gender}
              </span>
              <span>•</span>
              <span>{age} years</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onEdit(traveller)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-500 text-slate-600 rounded-lg hover:bg-slate-50 transition-all duration-200 font-medium"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          <button 
            onClick={() => onRemove(traveller.traveller_id)}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function TravellerModal({ onClose, onSave, initialData, loading }: TravellerModalProps) {
  const [formData, setFormData] = useState(initialData || {
    first_name: "",
    last_name: "",
    gender: "",
    marital_status: "",
    date_of_birth: "",
    email: "",
    phone_number: "",
    address: ""
  });
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.gender || !formData.date_of_birth || !formData.email) {
      setAlertType("error");
      setAlertMessage("Please fill in all required fields (First Name, Last Name, Gender, Date of Birth, and Email)");
      return;
    }
    
    // Clear alert and save
    setAlertMessage("");
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-full">
            <Users className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {initialData ? "Edit Traveller" : "Add New Traveller"}
          </h3>
        </div>

        {/* Alert Message */}
        {alertMessage && (
          <div className="mb-4">
            <ElegantAlert
              message={alertMessage}
              type={alertType}
              onClose={() => setAlertMessage("")}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Marital Status
            </label>
            <select
              value={formData.marital_status}
              onChange={(e) => setFormData({...formData, marital_status: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              <option value="">Select Status</option>
              <option>Single</option>
              <option>Married</option>
              <option>Divorced</option>
              <option>Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>

            <DatePicker
              selected={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
              onChange={(date?: Date) => {
                setFormData({
                  ...formData,
                  date_of_birth: date ? date.toISOString().split("T")[0] : "",
                });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="traveller@example.com"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={formData.phone_number}
              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="+91 9876543210"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:border-gray-400 resize-none"
              placeholder="123 Street, City, State, Country"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-5 w-5" />
            {loading ? "Processing..." : initialData ? "Update Traveller" : "Add Traveller"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActiveSession {
  session_token: string;
  is_current: boolean;
  created_at: string;
  expires_at: string;
  device: string;
}

function DevicesSection() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  // Parse device string to extract device info
  const parseDeviceString = (deviceString?: string | null) => {
    if (!deviceString || typeof deviceString !== "string") {
      return {
        deviceName: "Unknown Device",
        browser: "Unknown Browser",
        os: "Unknown OS",
      };
    }

    let deviceName = "Unknown Device";
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    // Detect OS
    if (deviceString.includes("Windows")) {
      os = "Windows";
      deviceName = "Windows PC";
    } else if (deviceString.includes("Macintosh") || deviceString.includes("Mac OS X")) {
      os = "macOS";
      deviceName = "Mac";
    } else if (deviceString.includes("Linux") && !deviceString.includes("Android")) {
      os = "Linux";
      deviceName = "Linux PC";
    } else if (deviceString.includes("iPhone")) {
      os = "iOS";
      deviceName = "iPhone";
    } else if (deviceString.includes("iPad")) {
      os = "iOS";
      deviceName = "iPad";
    } else if (deviceString.includes("Android")) {
      os = "Android";
      deviceName = "Android Device";
    }

    // Detect Browser
    if (deviceString.includes("Chrome") && !deviceString.includes("Edg")) {
      browser = "Chrome";
    } else if (deviceString.includes("Safari") && !deviceString.includes("Chrome")) {
      browser = "Safari";
    } else if (deviceString.includes("Firefox")) {
      browser = "Firefox";
    } else if (deviceString.includes("Edg")) {
      browser = "Edge";
    } else if (deviceString.includes("Opera") || deviceString.includes("OPR")) {
      browser = "Opera";
    }

    return { deviceName, browser, os };
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      const auth = getAuthFromStorage();
      if (!auth || !auth.token) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        
        const { getActiveSessions } = await import("@/app/api");
        const response = await getActiveSessions(auth.token);
        
        setSessions(response.active_sessions || []);
      } catch (err: any) {
        console.error("Error fetching sessions:", err);
        setError(err.message || "Failed to load active sessions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleLogoutAll = async () => {
    if (!confirm("Are you sure you want to logout from all devices? You will need to login again.")) {
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const { logoutAllDevices } = await import("@/app/api");
      await logoutAllDevices(auth.token);
      
      // Clear local storage and redirect to login
      const { clearAuthStorage } = await import("@/utils/authStorage");
      clearAuthStorage();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error logging out from all devices:", err);
      setError(err.message || "Failed to logout from all devices. Please try again.");
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setError("Authentication required. Please log in.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const { deactivateAccount } = await import("@/app/api");
      await deactivateAccount(auth.token);
      
      // Clear local storage and redirect to home
      const { clearAuthStorage } = await import("@/utils/authStorage");
      clearAuthStorage();
      window.location.href = "/";
    } catch (err: any) {
      console.error("Error deactivating account:", err);
      setError(err.message || "Failed to deactivate account. Please try again.");
      setLoading(false);
      setShowDeactivateModal(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Logged-in Devices</h2>
          <p className="text-gray-500 mt-2">Manage devices with active sessions</p>
        </div>
        {sessions.length > 0 && (
          <button 
            onClick={handleLogoutAll}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/90 text-white rounded-xl 
              hover:bg-red-500 transition-all duration-200 font-medium hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="h-5 w-5" />
            Logout All Devices
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex-shrink-0">
          <ElegantAlert
            message={error}
            type="error"
            onClose={() => setError("")}
          />
        </div>
      )}

      {/* Scrollable Sessions Area */}
      <div className="flex-1 overflow-y-auto pr-2 mb-4" style={{ minHeight: '300px', maxHeight: 'calc(100vh - 500px)' }}>
        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading active sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <Monitor className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">No active devices</p>
            <p className="text-gray-400 text-sm">You have been logged out from all devices</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session, index) => {
              const { deviceName, browser, os } = parseDeviceString(session.device);
              return (
                <div
                  key={session.session_token || index}
                  className={`border rounded-xl p-6 hover:shadow-lg transition-all duration-200 ${
                    session.is_current 
                      ? 'border-slate-500 bg-slate-50' 
                      : 'border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg border ${
                        session.is_current 
                          ? 'bg-gradient-to-br from-slate-500 to-gray-600 border-slate-600' 
                          : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200'
                      }`}>
                        <Monitor className={`h-6 w-6 ${session.is_current ? 'text-white' : 'text-slate-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg text-gray-900">{deviceName}</h4>
                          {session.is_current && (
                            <span className="px-2 py-1 bg-slate-600 text-white text-xs rounded-full">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 mt-2">
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Last active: {formatRelativeTime(session.created_at)}
                          </p>
                          <p className="text-sm text-gray-500">
                            Browser: {browser} • OS: {os}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Session expires: {new Date(session.expires_at).toLocaleDateString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer - Security Tip and Deactivate Button */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 pt-3 pb-2 border-t border-gray-200">
        {/* Security Tip */}
        {sessions.length > 0 && (
          <div className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-800">
              <strong>Security Tip:</strong> If you notice any unfamiliar devices, logout from all devices immediately and change your password.
            </p>
          </div>
        )}
        
        {/* Deactivate Account Button */}
        <button
          onClick={() => setShowDeactivateModal(true)}
          className="px-4 py-4 text-xs text-red-600 border border-red-300 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap"
        >
          <MinusCircle className="w-4 h-4" />
          Deactivate Account
        </button>
      </div>

      {/* Deactivate Account Confirmation Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            <button
              onClick={() => setShowDeactivateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Confirm Account Deactivation</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4 leading-relaxed">
                You are about to permanently deactivate your account. This action is irreversible and will result in the immediate and complete deletion of all your data.
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-800 font-semibold mb-3">
                  The following data will be permanently deleted:
                </p>
                <ul className="text-sm text-gray-700 space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Your account profile and personal information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>All booking records and travel history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Saved traveler information and preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>Active sessions across all devices</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-600 mt-3 italic">
                  Please note: This action cannot be undone. You will need to create a new account to use our services again.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateAccount}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordResetModal({ onClose }: PasswordResetModalProps) {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("error");
  const [resendCountdown, setResendCountdown] = useState(0);

  const CSRF_TOKEN = "0FOGM80CL1PfbBkg3gLiudCBv3A2Bhsi";

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleForgotPassword = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.email) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(API.FORGOT_PASSWORD, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFTOKEN": CSRF_TOKEN,
        },
        body: JSON.stringify({
          email: auth.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send OTP");
      }

      setForgotPasswordMode(true);
      setResendCountdown(60);
      setAlertType("success");
      setAlertMessage("OTP sent to your email successfully!");
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.email) return;

    try {
      await fetch(API.RESEND_OTP, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          "X-CSRFTOKEN": CSRF_TOKEN,
        },
        body: JSON.stringify({
          email: auth.email,
          otp_type: "customer",
        }),
      });

      setResendCountdown(60);
      setAlertType("success");
      setAlertMessage("OTP resent successfully!");
    } catch (error) {
      setAlertType("error");
      setAlertMessage("Failed to resend OTP. Please try again.");
    }
  };

  const handleChangePassword = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    if (newPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must be at least 8 characters long.");
      return;
    }

    if (!oldPassword) {
      setAlertType("error");
      setAlertMessage("Please enter your old password.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(API.CHANGE_PASSWORD, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
          "Content-Type": "application/json",
          "X-CSRFTOKEN": CSRF_TOKEN,
        },
        body: JSON.stringify({
          token: auth.token,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to change password");
      }

      setAlertType("success");
      setAlertMessage("Password changed successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage(error.message || "Failed to change password. Please check your old password.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.email || !auth.token) {
      setAlertType("error");
      setAlertMessage("Authentication required. Please log in again.");
      return;
    }

    if (newPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must be at least 8 characters long.");
      return;
    }

    if (otp.length !== 6) {
      setAlertType("error");
      setAlertMessage("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    setAlertMessage("");

    try {
      const response = await fetch(API.RESET_PASSWORD, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
          "Content-Type": "application/json",
          "X-CSRFTOKEN": CSRF_TOKEN,
        },
        body: JSON.stringify({
          email: auth.email,
          otp: otp,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to reset password");
      }

      setAlertType("success");
      setAlertMessage("Password reset successfully!");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage(error.message || "Failed to reset password. Please check your OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (forgotPasswordMode) {
      handleResetPassword();
    } else {
      handleChangePassword();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-full">
            <KeyRound className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {forgotPasswordMode ? "Reset Password" : "Change Password"}
          </h3>
        </div>

        {alertMessage && (
          <div className="mb-4">
            <ElegantAlert
              message={alertMessage}
              type={alertType}
              onClose={() => setAlertMessage("")}
            />
          </div>
        )}

        <p className="text-gray-600 mb-6 text-sm">
          Your password must be at least 8 characters long and include both small and uppercase letters, numbers, and special characters (e.g., $!@%&)
        </p>

        <div className="space-y-4">
          {!forgotPasswordMode ? (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Old Password</label>
              <input
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter old password"
              />
              <button
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-11 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-gray-500 mt-2">
                Enter the 6-digit OTP sent to your email
              </p>
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter new password"
            />
            <button
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-11 text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {forgotPasswordMode ? (
          <button
            onClick={handleResendOTP}
            disabled={resendCountdown > 0}
            className="text-sm text-slate-600 hover:text-slate-700 mt-4 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
          </button>
        ) : (
          <button
            onClick={handleForgotPassword}
            disabled={loading}
            className="text-sm text-slate-600 hover:text-slate-700 mt-4 font-medium"
          >
            Forgot your password?
          </button>
        )}

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : forgotPasswordMode ? "Reset Password" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePicModal({ onClose }: ProfilePicModalProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-full">
            <Camera className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Update Profile Picture</h3>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive ? "border-slate-500 bg-slate-50" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-700 font-medium mb-2">
            Drag and drop your image here
          </p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <label className="px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer inline-block font-medium">
            Browse Files
            <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" />
          </label>
          <p className="text-xs text-gray-500 mt-4">
            Supported formats: JPG, PNG (Max 5MB)
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium hover:scale-105">
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

function EditNameModal({ onClose }: EditNameModalProps) {
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-100 p-3 rounded-full">
            <Edit2 className="h-6 w-6 text-slate-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Edit Name</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium hover:scale-105">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function InputField({ icon, label, type = "text", placeholder, value, onChange, disabled = false }: InputFieldProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function DatePickerField({ icon, label, value, onChange }: DatePickerFieldProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}>
            {value ? format(value, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <input
            type="date"
            className="w-full px-4 py-2 border rounded-lg"
            value={value ? format(value, "yyyy-MM-dd") : ""}
            onChange={(e) => onChange && onChange(new Date(e.target.value))}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SelectField({ icon, label, options, value, onChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <div className="relative">
        <select 
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:border-gray-400 appearance-none bg-white"
          value={value}
          onChange={onChange}
        >
          {options.map((opt, i) => (
            <option key={i} value={opt === options[0] ? "" : opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function TextAreaField({ icon, label, placeholder, rows, value, onChange }: TextAreaFieldProps) {
  return (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <textarea
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={onChange}
        className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all hover:border-gray-400 resize-none"
      />
    </div>
  );
}
