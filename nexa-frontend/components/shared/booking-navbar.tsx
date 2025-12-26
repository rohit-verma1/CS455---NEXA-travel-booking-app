"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthSidebar } from "@/components/shared/auth-panel";
import { Calendar, User, UserCheck, Briefcase, Users, LogOut, Menu, Bell, Github, ChevronDown } from "lucide-react";
import { getAuthFromStorage, clearAuthStorage } from "@/utils/authStorage";
import { API, getNotifications, markNotificationAsRead, type RecipientNotification } from "@/app/api";
import { createPortal } from "react-dom";
import {
  TRAIN_CLASS_DISPLAY_LIST,
  mapDisplayClassToApiClassType,
  mapApiClassTypeToDisplay,
} from "./train-class-utils";

type AuthStored =
  | {
      token: string;
      user_type?: string;
      username?: string;
      email?: string;
    }
  | null;

interface FlightSearchBarProps {
  tripType?: "oneWay" | "roundTrip";
  onModify?: () => void;
}


interface Station {
  station_id?: string;
  name: string;
  code: string;
  city: string;
  state?: string;
  points?: { name: string; code: string }[];
}

/* ---------- sample station data (replace with your API/DB) ---------- */
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


const TRAIN_STATIONS: Station[] = [
  { name: 'New Delhi Railway Station', code: 'NDLS', city: 'Delhi', state: 'Delhi' },
  { name: 'Lucknow Junction', code: 'LJN', city: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur Central', code: 'CNB', city: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Chhatrapati Shivaji Terminus', code: 'CSMT', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Pune Junction', code: 'PUNE', city: 'Pune', state: 'Maharashtra' },
  { name: 'Ahmedabad Junction', code: 'ADI', city: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Indore Junction', code: 'INDB', city: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Jaipur Junction', code: 'JP', city: 'Jaipur', state: 'Rajasthan' },
  { name: 'Madgaon Railway Station', code: 'MAO', city: 'Goa', state: 'Goa' },
  { name: 'Chennai Central', code: 'MAS', city: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Bengaluru City Junction', code: 'SBC', city: 'Bengaluru', state: 'Karnataka' },
  { name: 'Hyderabad Deccan', code: 'HYB', city: 'Hyderabad', state: 'Telangana' },
  { name: 'Howrah Junction', code: 'HWH', city: 'Kolkata', state: 'West Bengal' },
  { name: 'Guwahati Railway Station', code: 'GHY', city: 'Guwahati', state: 'Assam' },
  { name: 'Bhubaneswar Railway Station', code: 'BBS', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Ernakulam Junction', code: 'ERS', city: 'Kochi', state: 'Kerala' },
  { name: 'Patna Junction', code: 'PNBE', city: 'Patna', state: 'Bihar' },
  { name: 'Agra Cantt', code: 'AGC', city: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Visakhapatnam Junction', code: 'VSKP', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Chandigarh Railway Station', code: 'CDG', city: 'Chandigarh', state: 'Chandigarh' },
];



export function Navbar({
  tripType: propTripType = "roundTrip",
  onModify,
}: FlightSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  // Segmented control for Flights, Trains, Buses
  const options = ["Flights", "Trains", "Buses"];
  // Determine initial selected option based on pathname
  const getInitialSelected = () => {
    if (pathname.includes('/booking/flight')) return 'Flights';
    if (pathname.includes('/booking/train')) return 'Trains';
    if (pathname.includes('/booking/bus')) return 'Buses';
    return 'Flights';
  };
  const [selected, setSelected] = useState<string>(getInitialSelected());
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Keep segmented control in sync with route
  useEffect(() => {
    if (pathname.includes('/booking/flight')) setSelected('Flights');
    else if (pathname.includes('/booking/train')) setSelected('Trains');
    else if (pathname.includes('/booking/bus')) setSelected('Buses');
  }, [pathname]);

  useEffect(() => {
    const el = btnRefs.current[selected];
    if (el) {
      const { offsetLeft, offsetWidth } = el;
      setIndicatorStyle({ left: offsetLeft, width: offsetWidth });
    }
  }, [selected]);

  // Booking progress steps
  const bookingSteps = [
    { label: "Flight Selection", path: "/booking/flight" },
    { label: "Traveller Details", path: "/booking/review" },
    { label: "Seat Selection", path: "/booking/add-on" },
    { label: "Payment", path: "/booking/payment" },
  ];

  // Find current step index
  const currentBookingStep = bookingSteps.findIndex(step => pathname.startsWith(step.path));

  // Booking progress bar component
  const BookingProgress = () => (
    <div className="hidden md:flex flex-1 justify-center items-center h-full">
      <div className="flex items-center gap-8 h-16 px-2">
        {bookingSteps.map((step, idx) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center justify-center h-full">
              <div
                className={
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 " +
                  (idx < currentBookingStep
                    ? "bg-gradient-to-br from-blue-500 to-blue-400 text-white border-2 border-blue-400 shadow"
                    : idx === currentBookingStep
                    ? "bg-white text-blue-600 border-2 border-blue-400 shadow ring-2 ring-blue-200"
                    : "bg-slate-200 text-slate-400 border-2 border-slate-200")
                }
                style={{ fontWeight: 600, fontSize: 18 }}
              >
                {idx < currentBookingStep ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="10" r="8" fill="white" />
                    <path d="M6 10.5L9 13.5L14 8.5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={
                  "mt-2 text-sm font-medium transition-colors duration-300 " +
                  (idx < currentBookingStep
                    ? "text-blue-600"
                    : idx === currentBookingStep
                    ? "text-blue-700"
                    : "text-slate-400")
                }
                style={{ maxWidth: 110, textAlign: "center" }}
              >
                {step.label}
              </span>
            </div>
            {idx < bookingSteps.length - 1 && (
              <div className="flex items-center mx-2" style={{ alignSelf: "center" }}>
                <div
                  className={
                    "h-1 w-10 rounded-full transition-all duration-300 " +
                    (idx < currentBookingStep
                      ? "bg-blue-400"
                      : "bg-slate-200")
                  }
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<RecipientNotification[]>([]);

  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarInitialView, setAuthSidebarInitialView] = useState<"role" | "consumer" | "provider" | "admin" | "verify">("role");
  const [auth, setAuth] = useState<AuthStored>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAuth(getAuthFromStorage());
    const onStorage = (e: StorageEvent) => e.key === "auth" && setAuth(getAuthFromStorage());
    const onAuthChanged = () => setAuth(getAuthFromStorage());
    window.addEventListener("storage", onStorage);
    window.addEventListener("authChanged", onAuthChanged as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("authChanged", onAuthChanged as EventListener);
    };
  }, []);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth?.token) {
        setNotifications([]);
        return;
      }

      try {
        const data = await getNotifications(auth.token);
        // Only show notifications with status "Pending"
        const pendingNotifications = data.filter(n => n.status === "Pending");
        setNotifications(pendingNotifications);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
      }
    };

    fetchNotifications();
  }, [auth?.token]);

  useEffect(() => {
    function handlePointer(e: PointerEvent) {
      if (!menuRef.current) return;
      if (e.target instanceof Node && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [menuOpen]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const markAsRead = async (receiptId: string) => {
    if (!auth?.token) return;

    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.receipt_id === receiptId ? { ...n, status: "Read" as const } : n)
    );

    try {
      // Call API to mark as read
      await markNotificationAsRead(receiptId, auth.token);
      
      // Remove from list after animation
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.receipt_id !== receiptId));
      }, 1200);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // Revert optimistic update on error
      setNotifications(prev => 
        prev.map(n => n.receipt_id === receiptId ? { ...n, status: "Pending" as const } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!auth?.token || notifications.length === 0) return;

    // Optimistically update UI
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, status: "Read" as const })));

    try {
      // Call API for each notification
      await Promise.all(
        notifications.map(n => markNotificationAsRead(n.receipt_id, auth.token))
      );
      
      // Clear list after animation
      setTimeout(() => {
        setNotifications([]);
      }, 1200);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      // Revert on error
      setNotifications(originalNotifications);
    }
  };

  const unreadCount = notifications.filter(n => n.status === "Pending").length;

  const handleLogout = async () => {
    try {
      const token = getAuthFromStorage()?.token;
      if (token) {
        try {
          await fetch(API.LOGOUT, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        } catch (err) {
          console.warn("Logout API failed:", err);
        }
      }

      clearAuthStorage();
      window.dispatchEvent(new Event("authChanged"));
      setAuth(null);
      setMenuOpen(false);
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ========== DROPDOWN STATE FOR SEARCH BAR ==========
  // Airport/Station data
  // Use the station data from the top of the file
  const airports = FLIGHT_STATIONS;
  const stations = TRAIN_STATIONS;
  const busStations = BUS_STATIONS;

  // Initialize states from URL params
  const initializeFromParams = () => {
    const isFlightPage = pathname.startsWith("/booking/flight");
    const isTrainPage = pathname.startsWith("/booking/train");
    const isBusPage = pathname.startsWith("/booking/bus");

    if (isFlightPage) {
      const fromCode = searchParams.get('source') || searchParams.get('from') || 'HYD';
      const toCode = searchParams.get('destination') || searchParams.get('to') || 'DEL';
      
      return {
        tripType: (searchParams.get('tripType') as 'oneWay' | 'roundTrip') || propTripType,
        fromFlight: airports.find(a => a.code === fromCode) || airports.find(a => a.code === 'HYD') || null,
        toFlight: airports.find(a => a.code === toCode) || airports.find(a => a.code === 'DEL') || null,
        departure: searchParams.get('departure_date') || searchParams.get('departureDate') ? new Date(searchParams.get('departure_date') || searchParams.get('departureDate')!) : new Date(),
        returnDate: searchParams.get('return_date') || searchParams.get('returnDate') ? new Date(searchParams.get('return_date') || searchParams.get('returnDate')!) : null,
        adults: parseInt(searchParams.get('adults') || '1', 10),
        children: parseInt(searchParams.get('children') || '0', 10),
        infants: parseInt(searchParams.get('infants') || '0', 10),
        travelClass: (searchParams.get('class') || 'Economy') as "Economy" | "Premium" | "Business",
      };
    } else if (isTrainPage) {
      const fromCode = searchParams.get('source') || 'NDLS';
      const toCode = searchParams.get('destination') || 'HYB';
      
      return {
        tripType: propTripType,
        fromTrain: stations.find(s => s.code === fromCode) || stations.find(s => s.code === 'NDLS') || null,
        toTrain: stations.find(s => s.code === toCode) || stations.find(s => s.code === 'HYB') || null,
        departure: searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date(),
        trainClass: mapApiClassTypeToDisplay(searchParams.get('class_type')),
      };
    } else if (isBusPage) {
      const fromCode = searchParams.get('source') || 'DEL';
      const toCode = searchParams.get('destination') || 'BOM';
      
      return {
        tripType: propTripType,
        fromBus: busStations.find(s => s.code === fromCode) || busStations.find(s => s.code === 'DEL') || null,
        toBus: busStations.find(s => s.code === toCode) || busStations.find(s => s.code === 'BOM') || null,
        departure: searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date(),
      };
    }
    
    return {
      tripType: propTripType,
      fromFlight: airports.find(a => a.code === 'HYD') || null,
      toFlight: airports.find(a => a.code === 'DEL') || null,
      fromTrain: stations.find(s => s.code === 'NDLS') || null,
      toTrain: stations.find(s => s.code === 'HYB') || null,
      fromBus: busStations.find(s => s.code === 'DEL') || null,
      toBus: busStations.find(s => s.code === 'BOM') || null,
      departure: new Date(),
      returnDate: null,
      adults: 1,
      children: 0,
      infants: 0,
      travelClass: "Economy" as const,
      trainClass: "All Class",
    };
  };

  const initialState = initializeFromParams();

  // Dropdown states
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showDepartureCal, setShowDepartureCal] = useState(false);
  const [showReturnCal, setShowReturnCal] = useState(false);
  const [showTravellersDropdown, setShowTravellersDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  // Search states
  const [fromSearch, setFromSearch] = useState("");
  const [toSearch, setToSearch] = useState("");
  // tripType is determined dynamically based on returnDateState, not stored in state
  const [selectedFromFlight, setSelectedFromFlight] = useState<Station | null>(initialState.fromFlight || null);
  const [selectedToFlight, setSelectedToFlight] = useState<Station | null>(initialState.toFlight || null);
  const [selectedFromTrain, setSelectedFromTrain] = useState<Station | null>(initialState.fromTrain || null);
  const [selectedToTrain, setSelectedToTrain] = useState<Station | null>(initialState.toTrain || null);
  const [selectedFromBus, setSelectedFromBus] = useState<Station | null>(initialState.fromBus || null);
  const [selectedToBus, setSelectedToBus] = useState<Station | null>(initialState.toBus || null);

  // Date states
  const [departureDate, setDepartureDate] = useState<Date>(initialState.departure || new Date());
  const [returnDateState, setReturnDateState] = useState<Date | null>(
    initialState.tripType === 'roundTrip' && initialState.returnDate 
      ? initialState.returnDate 
      : null
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Travellers state (for flights)
  const [adults, setAdults] = useState(initialState.adults || 1);
  const [children, setChildren] = useState(initialState.children || 0);
  const [infants, setInfants] = useState(initialState.infants || 0);
  const [travelClass, setTravelClass] = useState<"Economy" | "Premium" | "Business">(initialState.travelClass || "Economy");

  // Train class
  const [trainClass, setTrainClass] = useState(initialState.trainClass);

  // Error states for validation
  const [sameLocationError, setSameLocationError] = useState(false);
  const [returnBeforeDepartureError, setReturnBeforeDepartureError] = useState(false);
  const [maxTravellersError, setMaxTravellersError] = useState(false);

  // Refs for dropdowns
  const fromFieldRef = useRef<HTMLDivElement>(null);
  const toFieldRef = useRef<HTMLDivElement>(null);
  const departureFieldRef = useRef<HTMLDivElement>(null);
  const returnFieldRef = useRef<HTMLDivElement>(null);
  const travellersFieldRef = useRef<HTMLDivElement>(null);
  const classFieldRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showFromDropdown && !target.closest('[data-dropdown="from"]') && !fromFieldRef.current?.contains(target as Node)) {
        setShowFromDropdown(false);
      }
      if (showToDropdown && !target.closest('[data-dropdown="to"]') && !toFieldRef.current?.contains(target as Node)) {
        setShowToDropdown(false);
      }
      if (showDepartureCal && !target.closest('[data-dropdown="departure"]') && !departureFieldRef.current?.contains(target as Node)) {
        setShowDepartureCal(false);
      }
      if (showReturnCal && !target.closest('[data-dropdown="return"]') && !returnFieldRef.current?.contains(target as Node)) {
        setShowReturnCal(false);
      }
      if (showTravellersDropdown && !target.closest('[data-dropdown="travellers"]') && !travellersFieldRef.current?.contains(target as Node)) {
        setShowTravellersDropdown(false);
      }
      if (showClassDropdown && !target.closest('[data-dropdown="class"]') && !classFieldRef.current?.contains(target as Node)) {
        setShowClassDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFromDropdown, showToDropdown, showDepartureCal, showReturnCal, showTravellersDropdown, showClassDropdown]);

  // Validation: Check same location
  useEffect(() => {
    if (selected === "Flights") {
      if (selectedFromFlight && selectedToFlight && selectedFromFlight.code === selectedToFlight.code) {
        setSameLocationError(true);
        setTimeout(() => setSameLocationError(false), 3000);
      }
    } else if (selected === "Trains") {
      if (selectedFromTrain && selectedToTrain && selectedFromTrain.code === selectedToTrain.code) {
        setSameLocationError(true);
        setTimeout(() => setSameLocationError(false), 3000);
      }
    } else if (selected === "Buses") {
      if (selectedFromBus && selectedToBus && selectedFromBus.code === selectedToBus.code) {
        setSameLocationError(true);
        setTimeout(() => setSameLocationError(false), 3000);
      }
    }
  }, [selected, selectedFromFlight, selectedToFlight, selectedFromTrain, selectedToTrain, selectedFromBus, selectedToBus]);

  // Validation: Check return date (only if return date is set)
  useEffect(() => {
    if (selected === "Flights" && returnDateState) {
      if (returnDateState < departureDate) {
        setReturnBeforeDepartureError(true);
        setTimeout(() => setReturnBeforeDepartureError(false), 3000);
      }
    }
  }, [selected, departureDate, returnDateState]);

  // Validation: Check max travellers
  useEffect(() => {
    const total = adults + children + infants;
    if (total > 10) {
      setMaxTravellersError(true);
      setTimeout(() => setMaxTravellersError(false), 3000);
    }
  }, [adults, children, infants]);

  // Helper functions
  const formatDisplayDate = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  };

  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysArray: (Date | null)[] = [];
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      daysArray.push(null);
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      daysArray.push(new Date(year, month, day));
    }
    const remainingCells = 42 - daysArray.length;
    for (let i = 0; i < remainingCells; i++) {
      daysArray.push(null);
    }
    return daysArray;
  };

  const getTravellerSummary = () => {
    const total = adults + children + infants;
    return `${total}, ${travelClass}`;
  };

  const getFromDisplay = () => {
    if (selected === "Flights") return selectedFromFlight ? `${selectedFromFlight.code} - ${selectedFromFlight.city}` : "Select";
    if (selected === "Trains") return selectedFromTrain ? selectedFromTrain.name : "Select";
    if (selected === "Buses") return selectedFromBus ? selectedFromBus.name : "Select";
    return "";
  };

  const getToDisplay = () => {
    if (selected === "Flights") return selectedToFlight ? `${selectedToFlight.code} - ${selectedToFlight.city}` : "Select";
    if (selected === "Trains") return selectedToTrain ? selectedToTrain.name : "Select";
    if (selected === "Buses") return selectedToBus ? selectedToBus.name : "Select";
    return "";
  };

  // Helper function to format date as YYYY-MM-DD
  const formatDateForURL = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle Modify button click
  const handleModify = () => {
    // Validate before modifying
    if (selected === "Flights") {
      if (!selectedFromFlight || !selectedToFlight) {
        alert("Please select departure and arrival airports");
        return;
      }
      if (selectedFromFlight.code === selectedToFlight.code) {
        alert("Departure and arrival airports cannot be the same");
        return;
      }
      const total = adults + children + infants;
      if (total > 10) {
        alert("Maximum 10 travellers allowed");
        return;
      }
      // Determine tripType dynamically based on whether return date is set
      const determinedTripType = returnDateState ? "roundTrip" : "oneWay";
      if (returnDateState && returnDateState < departureDate) {
        alert("Return date must be after departure date");
        return;
      }

      // Build URL params for flight - using same format as search form
      const params = new URLSearchParams({
        source: selectedFromFlight.code,
        destination: selectedToFlight.code,
        departure_date: formatDateForURL(departureDate),
        tripType: determinedTripType,
        adults: String(adults),
        children: String(children),
        infants: String(infants),
        class: travelClass,
      });

      if (determinedTripType === "roundTrip" && returnDateState) {
        params.append("return_date", formatDateForURL(returnDateState));
      }

      router.push(`/booking/flight?${params.toString()}`);
    } else if (selected === "Trains") {
      if (!selectedFromTrain || !selectedToTrain) {
        alert("Please select source and destination stations");
        return;
      }
      if (selectedFromTrain.code === selectedToTrain.code) {
        alert("Source and destination cannot be the same");
        return;
      }

      // Build URL params for train - use station codes
      const params = new URLSearchParams({
        source: selectedFromTrain.code,
        destination: selectedToTrain.code,
        date: formatDateForURL(departureDate),
      });

      const apiClassType = mapDisplayClassToApiClassType(trainClass);
      if (apiClassType) {
        params.append("class_type", apiClassType);
      }

      router.push(`/booking/train?${params.toString()}`);
    } else if (selected === "Buses") {
      if (!selectedFromBus || !selectedToBus) {
        alert("Please select source and destination");
        return;
      }
      if (selectedFromBus.code === selectedToBus.code) {
        alert("Source and destination cannot be the same");
        return;
      }

      // Build URL params for bus - use station codes
      const params = new URLSearchParams({
        source: selectedFromBus.code,
        destination: selectedToBus.code,
        date: formatDateForURL(departureDate),
      });

      router.push(`/booking/bus?${params.toString()}`);
    }

    // Call the onModify callback if provided
    if (onModify) {
      onModify();
    }
  };

  /* ---------- SVG Nexa Logo (approximation of the provided image) ---------- */
  const NexaLogo = ({ className = "h-10 w-auto", alt = "Nexa logo" }: { className?: string; alt?: string }) => {
  // using public path
    return (
        <div className={className} style={{ display: "inline-block", lineHeight: 0, transform: "translateY(-20px) scale(0.6)", transformOrigin: "left center" }}>
            <Image
                src="/images/nexa.jpg"
                alt={alt}
                width={160}
                height={48}
                priority={true}
                quality={90}
                style={{ objectFit: "contain" }}
            />
        </div>
    );
};

  /* ---------- Small presentational components ---------- */
  const UserMenu = () => (
    <div className="relative" ref={menuRef}>
      <button
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((s) => !s)}
        className="flex items-center gap-3 px-3 py-2 rounded-full border border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow"
      >
        <div className="rounded-full bg-slate-100 w-8 h-8 flex items-center justify-center">
          <UserCheck size={16} className="text-slate-600" />
        </div>
        <div className="hidden sm:block text-sm text-slate-800 truncate max-w-[10rem]">{auth?.username ?? auth?.email ?? "Account"}</div>
          <ChevronDown size={16} className="text-slate-400" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-100 rounded-2xl shadow-lg p-3 z-50">
          <div className="flex flex-col gap-2">
            <Link href="/userDetails/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center">
                <User size={16} className="text-slate-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-800">My Profile</div>
                <div className="text-xs text-slate-400">View & edit profile</div>
              </div>
            </Link>

            <Link href="/userDetails/profile?tab=trips" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center">
                <Briefcase size={16} className="text-slate-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-800">My Trips</div>
                <div className="text-xs text-slate-400">View & manage bookings</div>
              </div>
            </Link>

            <Link href="/userDetails/profile?tab=travellers" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
              <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center">
                <Users size={16} className="text-slate-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-slate-800">My Travellers</div>
                <div className="text-xs text-slate-400">Saved travellers</div>
              </div>
            </Link>

            <div className="border-t border-slate-100 my-1" />

            <button onClick={handleLogout} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 w-full text-left">
              <div className="w-9 h-9 rounded-md bg-slate-50 flex items-center justify-center">
                <LogOut size={16} className="text-slate-600" />
              </div>
              <div className="text-sm font-medium text-slate-800">Log out</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-white border-b border-slate-100">
        <div className="flex items-center h-20 px-6">
          {/* Left section: Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="Nexa - Home" className="flex items-center ml-15">
              <NexaLogo className="h-10 w-auto" />
            </Link>
          </div>
          {/* Center section: Segmented control bar */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-2xl ml-30">
              <div className="relative">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg relative overflow-hidden">
                  {/* Sliding indicator (absolute) */}
                  <div
                    aria-hidden
                    className="absolute top-0 h-full rounded-lg shadow-sm"
                    style={{
                      left: indicatorStyle.left,
                      width: indicatorStyle.width,
                      transform: `translateX(0)`,
                      transition: 'left 360ms cubic-bezier(.2,.9,.25,1), width 320ms ease',
                      willChange: 'left,width',
                      pointerEvents: 'none',
                      background: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  />
                  {options.map((opt) => (
                    <button
                      key={opt}
                      ref={el => { btnRefs.current[opt] = el; }}
                      onClick={() => setSelected(opt)}
                      className={`relative z-10 flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-colors focus:outline-none ${
                        selected === opt ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Right section: Always right-aligned */}
          <div className="flex items-center gap-3 justify-end" style={{ minWidth: 0 }}>
            {/* About Us -> external GitHub, rendered as a button for consistency */}
            <button
              type="button"
              onClick={() => window.open("https://github.com/CS455-Software-Engineering/cs455-project-arcade-nation", "_blank", "noopener,noreferrer")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm text-slate-700 border border-transparent"
              title="About Us - GitHub"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 bg-white/80 text-slate-700">
                <Github size={18} />
              </span>
              <span className="hidden sm:inline">About Us</span>
            </button>

            {auth && (
              <div className="relative">
                <button
                  aria-label="alerts"
                  title="Notifications"
                  className="relative inline-flex items-center justify-center p-2 rounded-md hover:bg-slate-50"
                  onClick={() => setNotificationsOpen((s) => !s)}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-red-500 text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 mt-3 w-[440px] h-[500px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 flex flex-col overflow-hidden border border-slate-200/60">
                      
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Notifications</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{unreadCount} unread messages</p>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Content */}
                      <div className="flex-1 overflow-y-auto px-4 py-3" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e1 transparent'
                      }}>
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                              <Bell size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">All clear!</p>
                            <p className="text-xs text-slate-400 mt-1">No new notifications</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {notifications.map((note) => (
                              <div
                                key={note.notification_id}
                                className={`relative group transition-all duration-500 ${
                                  note.status === "Read" ? 'scale-95 opacity-0 h-0 my-0 overflow-hidden' : 'scale-100 opacity-100'
                                }`}
                              >
                                <div className="relative bg-white rounded-xl p-4 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-200">
                                  
                                  {/* Header Row */}
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                                        {note.subject}
                                      </h4>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">
                                      {formatTimeAgo(note.sent_at)}
                                    </span>
                                  </div>

                                  {/* Message Body */}
                                  <p className="text-sm text-slate-600 leading-relaxed mb-3 pl-3.5">
                                    {note.message_body}
                                  </p>

                                  {/* Footer Row */}
                                  <div className="flex items-center justify-between pl-3.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                        <span className="text-[10px] font-semibold text-slate-600">
                                          {note.sent_by.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="text-xs text-slate-500 font-medium">
                                        {note.sent_by}
                                      </span>
                                    </div>

                                    {/* Mark as Read Button */}
                                    <button
                                      onClick={() => markAsRead(note.receipt_id)}
                                      className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all duration-200"
                                    >
                                      Mark read
                                    </button>
                                  </div>

                                  {/* Success Overlay */}
                                  {note.status === "Read" && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl flex items-center justify-center border-2 border-emerald-400">
                                      <div className="flex items-center gap-2.5 animate-[successPop_0.6s_ease-out]">
                                        <div className="relative">
                                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-[ripple_0.8s_ease-out]" />
                                          <div className="relative w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                            <svg 
                                              className="w-6 h-6 text-white" 
                                              viewBox="0 0 24 24" 
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="3"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M20 6L9 17L4 12" strokeDasharray="24" strokeDashoffset="24" style={{animation: 'dash 0.5s ease-out forwards'}} />
                                            </svg>
                                          </div>
                                        </div>
                                        <span className="text-base font-semibold text-emerald-700">Done</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end flex-shrink-0 bg-slate-50/50">
                          <button
                            onClick={markAllAsRead}
                            className="px-5 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm"
                          >
                            Mark all as read
                          </button>
                        </div>
                      )}

                      <style>{`
                        @keyframes successPop {
                          0% { transform: scale(0.3); opacity: 0; }
                          50% { transform: scale(1.05); }
                          100% { transform: scale(1); opacity: 1; }
                        }
                        
                        @keyframes ripple {
                          0% { transform: scale(1); opacity: 0.5; }
                          100% { transform: scale(1.8); opacity: 0; }
                        }
                        
                        @keyframes dash {
                          to { strokeDashoffset: 0; }
                        }
                      `}</style>
                    </div>
                  </>
                )}
              </div>
            )}
            {!auth ? (
              <Button
                variant="outline"
                onClick={() => setAuthSidebarOpen(true)}
                className="inline-flex items-center gap-2 border-red-500 text-red-600 hover:bg-red-50"
              >
                <User size={16} />
                Log in / Sign up
              </Button>
            ) : (
              <UserMenu />
            )}
            <div className="sm:hidden">
              <button
                onClick={() => (!auth ? setAuthSidebarOpen(true) : setMenuOpen((s) => !s))}
                aria-label="open menu"
                className="inline-flex items-center justify-center p-2 rounded-md border border-slate-100 bg-white shadow-sm"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar below segmented control */}
        <div className="w-full bg-white">
          <div className="max-w-7xl mx-auto px-6 pb-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4">
                {/* FROM Field */}
                <div 
                  ref={fromFieldRef}
                  className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative"
                  onClick={() => setShowFromDropdown(!showFromDropdown)}
                >
                  <div>
                    <div className="text-xs text-gray-500 font-medium">From</div>
                    <div className="font-semibold text-gray-800">{getFromDisplay()}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {/* Swap Arrow */}
                <div className="p-2 bg-blue-50 rounded-full">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>

                {/* TO Field */}
                <div 
                  ref={toFieldRef}
                  className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative"
                  onClick={() => setShowToDropdown(!showToDropdown)}
                >
                  <div>
                    <div className="text-xs text-gray-500 font-medium">To</div>
                    <div className="font-semibold text-gray-800">{getToDisplay()}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                <div className="h-12 w-px bg-gray-300 mx-2" />

                {/* DEPARTURE Field */}
                <div 
                  ref={departureFieldRef}
                  className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative"
                  onClick={() => setShowDepartureCal(!showDepartureCal)}
                >
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500 font-medium">Departure</div>
                    <div className="font-semibold text-gray-800">{formatDisplayDate(departureDate)}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>

                {/* RETURN Field - Only for Flights, always shown with clear option */}
                {selected === "Flights" && (
                  <div 
                    ref={returnFieldRef}
                    className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl transition-colors relative"
                  >
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => setShowReturnCal(!showReturnCal)}
                    >
                      <div className="text-xs text-gray-500 font-medium">Return</div>
                      <div className="font-semibold text-gray-800">
                        {returnDateState ? formatDisplayDate(returnDateState) : 'Add return date'}
                      </div>
                    </div>
                    {returnDateState ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReturnDateState(null);
                        }}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                        title="Clear return date (One-way)"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                )}

                {/* TRAVELERS Field - Only for Flights */}
                {selected === "Flights" && (
                  <div 
                    ref={travellersFieldRef}
                    className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative"
                    onClick={() => setShowTravellersDropdown(!showTravellersDropdown)}
                  >
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Travelers</div>
                      <div className="font-semibold text-gray-800">{getTravellerSummary()}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                )}

                {/* CLASS Field - Only for Trains */}
                {selected === "Trains" && (
                  <div 
                    ref={classFieldRef}
                    className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors relative"
                    onClick={() => setShowClassDropdown(!showClassDropdown)}
                  >
                    <div>
                      <div className="text-xs text-gray-500 font-medium">Class</div>
                      <div className="font-semibold text-gray-800">{trainClass}</div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                )}

                <button
                  className="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md"
                  onClick={handleModify}
                >
                  Modify
                </button>
              </div>
            </div>

            {/* Error Messages */}
            {sameLocationError && (
              <div className="mt-2 text-center">
                <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  Source and destination cannot be the same!
                </span>
              </div>
            )}
            {returnBeforeDepartureError && (
              <div className="mt-2 text-center">
                <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  Return date must be after departure date!
                </span>
              </div>
            )}
            {maxTravellersError && (
              <div className="mt-2 text-center">
                <span className="inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                  Maximum 10 travellers allowed!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ========== DROPDOWNS (Portals) ========== */}
        {/* FROM Dropdown */}
        {showFromDropdown && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="from"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[9999]"
            style={{
              top: fromFieldRef.current ? fromFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: fromFieldRef.current ? fromFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: fromFieldRef.current ? Math.max(320, fromFieldRef.current.getBoundingClientRect().width) : 320,
            }}
          >
            <input
              type="text"
              placeholder={selected === "Flights" ? "Search airports..." : "Search stations..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fromSearch}
              onChange={(e) => setFromSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto">
              {selected === "Flights" && airports
                .filter(a => 
                  fromSearch === "" || 
                  a.city.toLowerCase().includes(fromSearch.toLowerCase()) || 
                  a.code.toLowerCase().includes(fromSearch.toLowerCase())
                )
                .map((airport) => {
                  const isSameAsTo = selectedToFlight && airport.code === selectedToFlight.code;
                  return (
                    <div
                      key={airport.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsTo 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsTo) {
                          setSelectedFromFlight(airport);
                          setShowFromDropdown(false);
                          setFromSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{airport.code} - {airport.city}</div>
                      <div className="text-xs text-gray-500">{airport.name}</div>
                      {isSameAsTo && <div className="text-xs text-red-500 mt-1">Same as destination</div>}
                    </div>
                  );
                })}
              {selected === "Trains" && stations
                .filter(s => 
                  fromSearch === "" || 
                  s.name.toLowerCase().includes(fromSearch.toLowerCase()) || 
                  s.code.toLowerCase().includes(fromSearch.toLowerCase()) ||
                  s.city.toLowerCase().includes(fromSearch.toLowerCase())
                )
                .map((station) => {
                  const isSameAsTo = selectedToTrain && station.code === selectedToTrain.code;
                  return (
                    <div
                      key={station.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsTo 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsTo) {
                          setSelectedFromTrain(station);
                          setShowFromDropdown(false);
                          setFromSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{station.code} - {station.city}</div>
                      <div className="text-xs text-gray-500">{station.name}</div>
                      {isSameAsTo && <div className="text-xs text-red-500 mt-1">Same as destination</div>}
                    </div>
                  );
                })}
              {selected === "Buses" && busStations
                .filter(s => 
                  fromSearch === "" || 
                  s.name.toLowerCase().includes(fromSearch.toLowerCase()) || 
                  s.code.toLowerCase().includes(fromSearch.toLowerCase()) ||
                  s.city.toLowerCase().includes(fromSearch.toLowerCase())
                )
                .map((station) => {
                  const isSameAsTo = selectedToBus && station.code === selectedToBus.code;
                  return (
                    <div
                      key={station.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsTo 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsTo) {
                          setSelectedFromBus(station);
                          setShowFromDropdown(false);
                          setFromSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{station.code} - {station.city}</div>
                      <div className="text-xs text-gray-500">{station.state}</div>
                      {isSameAsTo && <div className="text-xs text-red-500 mt-1">Same as destination</div>}
                    </div>
                  );
                })}
            </div>
          </div>,
          document.body
        )}

        {/* TO Dropdown */}
        {showToDropdown && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="to"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[9999]"
            style={{
              top: toFieldRef.current ? toFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: toFieldRef.current ? toFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: toFieldRef.current ? Math.max(320, toFieldRef.current.getBoundingClientRect().width) : 320,
            }}
          >
            <input
              type="text"
              placeholder={selected === "Flights" ? "Search airports..." : "Search stations..."}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={toSearch}
              onChange={(e) => setToSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto">
              {selected === "Flights" && airports
                .filter(a => 
                  toSearch === "" || 
                  a.city.toLowerCase().includes(toSearch.toLowerCase()) || 
                  a.code.toLowerCase().includes(toSearch.toLowerCase())
                )
                .map((airport) => {
                  const isSameAsFrom = selectedFromFlight && airport.code === selectedFromFlight.code;
                  return (
                    <div
                      key={airport.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsFrom 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsFrom) {
                          setSelectedToFlight(airport);
                          setShowToDropdown(false);
                          setToSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{airport.code} - {airport.city}</div>
                      <div className="text-xs text-gray-500">{airport.name}</div>
                      {isSameAsFrom && <div className="text-xs text-red-500 mt-1">Same as departure</div>}
                    </div>
                  );
                })}
              {selected === "Trains" && stations
                .filter(s => 
                  toSearch === "" || 
                  s.name.toLowerCase().includes(toSearch.toLowerCase()) || 
                  s.code.toLowerCase().includes(toSearch.toLowerCase()) ||
                  s.city.toLowerCase().includes(toSearch.toLowerCase())
                )
                .map((station) => {
                  const isSameAsFrom = selectedFromTrain && station.code === selectedFromTrain.code;
                  return (
                    <div
                      key={station.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsFrom 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsFrom) {
                          setSelectedToTrain(station);
                          setShowToDropdown(false);
                          setToSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{station.code} - {station.city}</div>
                      <div className="text-xs text-gray-500">{station.name}</div>
                      {isSameAsFrom && <div className="text-xs text-red-500 mt-1">Same as source</div>}
                    </div>
                  );
                })}
              {selected === "Buses" && busStations
                .filter(s => 
                  toSearch === "" || 
                  s.name.toLowerCase().includes(toSearch.toLowerCase()) || 
                  s.code.toLowerCase().includes(toSearch.toLowerCase()) ||
                  s.city.toLowerCase().includes(toSearch.toLowerCase())
                )
                .map((station) => {
                  const isSameAsFrom = selectedFromBus && station.code === selectedFromBus.code;
                  return (
                    <div
                      key={station.code}
                      className={`px-3 py-2 rounded-lg ${
                        isSameAsFrom 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isSameAsFrom) {
                          setSelectedToBus(station);
                          setShowToDropdown(false);
                          setToSearch("");
                        }
                      }}
                    >
                      <div className="font-medium text-gray-800">{station.code} - {station.city}</div>
                      <div className="text-xs text-gray-500">{station.state}</div>
                      {isSameAsFrom && <div className="text-xs text-red-500 mt-1">Same as source</div>}
                    </div>
                  );
                })}
            </div>
          </div>,
          document.body
        )}

        {/* DEPARTURE Calendar */}
        {showDepartureCal && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="departure"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[9999]"
            style={{
              top: departureFieldRef.current ? departureFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: departureFieldRef.current ? departureFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: 320,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((day, idx) => {
                const isSelected = day && day.toDateString() === departureDate.toDateString();
                const isPast = day && day < new Date(new Date().setHours(0, 0, 0, 0));
                const isDisabled = !day || !!isPast;
                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => {
                      if (day) {
                        setDepartureDate(day);
                        setShowDepartureCal(false);
                      }
                    }}
                    className={`h-9 w-9 rounded-lg text-sm ${
                      !day ? 'invisible' :
                      isPast ? 'text-gray-300 cursor-not-allowed' :
                      isSelected ? 'bg-blue-600 text-white font-semibold' :
                      'hover:bg-blue-50'
                    }`}
                  >
                    {day?.getDate()}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

        {/* RETURN Calendar */}
        {showReturnCal && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="return"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[9999]"
            style={{
              top: returnFieldRef.current ? returnFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: returnFieldRef.current ? returnFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: 320,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="font-semibold">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentMonth).map((day, idx) => {
                const isSelected = day && returnDateState && day.toDateString() === returnDateState.toDateString();
                const isPast = day && day < new Date(new Date().setHours(0, 0, 0, 0));
                const isBeforeDeparture = day && day < departureDate;
                const isDisabled = !day || !!isPast || !!isBeforeDeparture;
                return (
                  <button
                    key={idx}
                    disabled={isDisabled}
                    onClick={() => {
                      if (day) {
                        setReturnDateState(day);
                        setShowReturnCal(false);
                      }
                    }}
                    className={`h-9 w-9 rounded-lg text-sm ${
                      !day ? 'invisible' :
                      isDisabled ? 'text-gray-300 cursor-not-allowed' :
                      isSelected ? 'bg-blue-600 text-white font-semibold' :
                      'hover:bg-blue-50'
                    }`}
                  >
                    {day?.getDate()}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}

        {/* TRAVELLERS Dropdown */}
        {showTravellersDropdown && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="travellers"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-[9999]"
            style={{
              top: travellersFieldRef.current ? travellersFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: travellersFieldRef.current ? travellersFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: travellersFieldRef.current ? Math.max(320, travellersFieldRef.current.getBoundingClientRect().width) : 320,
            }}
          >
            <div className="space-y-4">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">Adults</div>
                  <div className="text-xs text-gray-500">12+ years</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <span className="w-6 text-center font-semibold">{adults}</span>
                  <button
                    onClick={() => {
                      const total = adults + children + infants;
                      if (total < 10) {
                        setAdults(adults + 1);
                      }
                    }}
                    disabled={adults + children + infants >= 10}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">Children</div>
                  <div className="text-xs text-gray-500">2-12 years</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <span className="w-6 text-center font-semibold">{children}</span>
                  <button
                    onClick={() => {
                      const total = adults + children + infants;
                      if (total < 10) {
                        setChildren(children + 1);
                      }
                    }}
                    disabled={adults + children + infants >= 10}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">Infants</div>
                  <div className="text-xs text-gray-500">Under 2 years</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setInfants(Math.max(0, infants - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                  >
                    <span className="text-lg">−</span>
                  </button>
                  <span className="w-6 text-center font-semibold">{infants}</span>
                  <button
                    onClick={() => {
                      const total = adults + children + infants;
                      if (total < 10) {
                        setInfants(infants + 1);
                      }
                    }}
                    disabled={adults + children + infants >= 10}
                    className="w-8 h-8 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">+</span>
                  </button>
                </div>
              </div>

              {/* Total Count Warning */}
              {adults + children + infants >= 10 && (
                <div className="text-center text-xs text-red-600 font-medium">
                  Maximum 10 travellers allowed
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Travel Class</div>
                <div className="flex gap-2">
                  {(["Economy", "Premium", "Business"] as const).map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setTravelClass(cls)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        travelClass === cls
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowTravellersDropdown(false)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* TRAIN CLASS Dropdown */}
        {showClassDropdown && typeof window !== 'undefined' && createPortal(
          <div 
            data-dropdown="class"
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-[9999]"
            style={{
              top: classFieldRef.current ? classFieldRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
              left: classFieldRef.current ? classFieldRef.current.getBoundingClientRect().left + window.scrollX : 0,
              width: classFieldRef.current ? Math.max(200, classFieldRef.current.getBoundingClientRect().width) : 200,
            }}
          >
            {TRAIN_CLASS_DISPLAY_LIST.map((cls) => (
              <div
                key={cls}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  trainClass === cls
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setTrainClass(cls);
                  setShowClassDropdown(false);
                }}
              >
                {cls}
              </div>
            ))}
          </div>,
          document.body
        )}

      </header>

      {/* Render AuthSidebar in a top-level fixed container so it appears above the navbar and any backdrop-blur stacking contexts. */}
      {authSidebarOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <AuthSidebar
            isOpen={authSidebarOpen}
            onClose={() => {
              setAuthSidebarOpen(false);
              setAuthSidebarInitialView("role");
            }}
            initialView={authSidebarInitialView}
          />
        </div>
      )}
    </>
  );
}
