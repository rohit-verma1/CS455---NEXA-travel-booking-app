"use client";

import React, { ChangeEvent, MouseEvent, ReactNode, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Users,
  Briefcase,
  Calendar,
  BarChart3,
  Activity,
  MessageSquare,
  Database,
  Shield,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plane,
  Train,
  Bus,
  Star,
  RefreshCw,
  Download,
  Upload,
  Plus,
  X,
  Eye,
  Edit,
  Trash2,
  Filter,
  Check,
  AlertCircle,
  Clock,
  Menu,
  FileText,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Archive,
  Play as PlayIcon,
  Sun,
  Moon,
  LogOut,
  Monitor,
  KeyRound,
  EyeOff,
} from "lucide-react";
import { getAuthFromStorage, clearAuthStorage } from "@/utils/authStorage";
import {
  getAdminDashboardStats,
  AdminDashboardResponse,
  getProviderPerformance,
  ProviderPerformanceData,
  getUserStats,
  UserStat,
  getProviderList,
  ProviderData,
  executeAdminSqlQuery,
  SqlRunnerResponse,
  getFinancialOverview,
  FinancialOverviewResponse,
  Transaction,
  getAdminBookingsList,
  AdminBookingListItem,
  deleteBooking,
  logout,
  updateProviderStatus,
  getAdminNotifications,
  AdminNotificationListItem,
  createAdminNotification,
  CreateAdminNotificationPayload,
  getNotifications,
  markNotificationAsRead,
  type RecipientNotification,
} from "@/app/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";

type Theme = "light" | "dark";


/* ===========================
   Types
   =========================== */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface User {
  id: number;
  name: string;
  email: string;
  type: "Customer" | "Provider";
  status: "Active" | "Suspended" | "Blocked";
  bookings: number;
  joined: string;
  avatar: string;
}

interface Provider {
  id: number;
  name: string;
  business: string;
  license: string;
  status: "Approved" | "Pending" | "Rejected";
  rating: number;
  bookings: number;
  documents: number;
}

type Booking = AdminBookingListItem;

interface LogEntry {
  timestamp: string;
  user: string;
  email: string;
  action: string;
  ip: string;
  location: string;
  device: string;
  status: string;
  risk: "low" | "medium" | "high";
}

/* ===========================
   Simple UI primitives
   =========================== */

const Card: React.FC<{
  className?: string;
  onClick?: (e: MouseEvent) => void;
  children?: ReactNode;
}> = ({ children, className = "", onClick }) => (
  <div
    onClick={onClick}
    className={`
      rounded-xl p-6 backdrop-blur-sm transition-all
      bg-white border border-slate-200 hover:border-slate-300 shadow-sm
      dark:bg-[#252936] dark:border-white/5 dark:hover:border-white/10
      ${className}
    `}
  >
    {children}
  </div>
);


const Button: React.FC<{
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: (e: MouseEvent) => void;
  icon?: ReactNode;
  disabled?: boolean;
}> = ({ children, variant = "primary", size = "md", className = "", onClick, icon, disabled = false }) => {
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-[#6366f1] to-[#0ea5e9] hover:from-[#4f46e5] hover:to-[#0284c7] text-white shadow-lg shadow-indigo-500/20",
    secondary:
      "bg-slate-900 text-white border border-slate-800 hover:bg-slate-800 dark:bg-[#2a2f3f] dark:hover:bg-[#353b4f] dark:border-white/10",
    ghost:
      "hover:bg-slate-100 text-slate-700 dark:hover:bg-white/5 dark:text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all flex items-center gap-2 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};


const Badge: React.FC<{ children?: ReactNode; variant?: BadgeVariant; className?: string }> = ({
  children,
  variant = "default",
  className = "",
}) => {
  const variants: Record<BadgeVariant, string> = {
    default:
      "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
    success:
      "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    warning:
      "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    danger:
      "bg-red-50 text-red-700 border-red-100 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
    info:
      "bg-sky-50 text-sky-700 border-sky-100 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

const escapeCsvValue = (value: unknown) => {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  const stringValue = String(value).replace(/"/g, '""');
  return /[",\n]/.test(stringValue) ? `"${stringValue}"` : stringValue;
};

const exportToCsv = (
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>,
  mimeType: string = "text/csv;charset=utf-8;"
) => {
  if (typeof window === "undefined") {
    console.warn("CSV export is only available in the browser context.");
    return;
  }

  const csvRows = [headers.map(escapeCsvValue).join(","), ...rows.map((row) => row.map(escapeCsvValue).join(","))];
  const blob = new Blob([csvRows.join("\n")], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const SQL_KEYWORDS = [
  "SELECT",
  "FROM",
  "WHERE",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "JOIN",
  "ON",
  "GROUP BY",
  "ORDER BY",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "UNION",
  "UNION ALL",
  "INTERSECT",
  "EXCEPT",
  "AND",
  "OR",
  "WHEN",
  "THEN",
  "ELSE",
];

const formatSqlText = (query: string) => {
  const trimmedQuery = query.replace(/\s+/g, " ").trim();
  if (!trimmedQuery) return "";

  const sortedKeywords = [...SQL_KEYWORDS].sort((a, b) => b.length - a.length);
  let formatted = trimmedQuery;

  sortedKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    formatted = formatted.replace(regex, () => `\n${keyword}`);
  });

  const lines = formatted
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      if (index === 0) {
        return line;
      }
      if (/^(AND|OR|WHEN|THEN|ELSE|ON)/i.test(line)) {
        return `  ${line}`;
      }
      if (/^(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN/i.test(line)) {
        return `  ${line}`;
      }
      return line;
    });

  return lines.join("\n").replace(/\n{2,}/g, "\n");
};


const Input: React.FC<{
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}> = ({ placeholder, icon = null, className = "", type = "text", value, defaultValue, onChange }) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange as any}
        className={`w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 ${
          icon ? "pl-10" : ""
        } text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors ${className}`}
      />
    </div>
  );
};



const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}> = ({ isOpen, onClose, title, children, size = "md" }) => {
  if (!isOpen) return null;
  const sizes: Record<string, string> = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-white dark:bg-[#1a1d29] rounded-2xl ${
          sizes[size]
        } w-full max-h-[90vh] overflow-auto border border-slate-200 dark:border-white/10 shadow-2xl`}
      >
        <div className="sticky top-0 bg-white dark:bg-[#1a1d29] border-b border-slate-200 dark:border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};


/* ===========================
   Dummy data
   =========================== */

const dummyUsers: User[] = [
  { id: 1, name: "John Smith", email: "john@example.com", type: "Customer", status: "Active", bookings: 12, joined: "2024-01-15", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" },
  { id: 2, name: "Sarah Johnson", email: "sarah@example.com", type: "Customer", status: "Active", bookings: 8, joined: "2024-02-20", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
  { id: 3, name: "Mike Davis", email: "mike@example.com", type: "Customer", status: "Suspended", bookings: 3, joined: "2024-03-10", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike" },
  { id: 4, name: "Emily Chen", email: "emily@example.com", type: "Provider", status: "Active", bookings: 45, joined: "2023-11-05", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily" },
  { id: 5, name: "Alex Rodriguez", email: "alex@example.com", type: "Customer", status: "Blocked", bookings: 1, joined: "2024-04-22", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
];

const dummyProviders: Provider[] = [
  { id: 1, name: "SkyJet Airlines", business: "Commercial Aviation", license: "AV-2024-001", status: "Approved", rating: 4.8, bookings: 1250, documents: 5 },
  { id: 2, name: "FastTrack Railways", business: "Rail Transport", license: "RT-2024-045", status: "Pending", rating: 4.6, bookings: 890, documents: 4 },
  { id: 3, name: "ComfortBus Services", business: "Bus Transport", license: "BT-2024-089", status: "Approved", rating: 4.5, bookings: 650, documents: 5 },
];

const dummyTransactions: Transaction[] = [
  { txn_id: "TXN-89012", type: "Booking", customer: "John Smith", amount: 850, status: "Success", method: "Credit Card", date: "2024-10-12 14:23" },
  { txn_id: "TXN-89013", type: "Refund", customer: "Mike Davis", amount: -45, status: "Processed", method: "Wallet", date: "2024-10-12 15:10" },
  { txn_id: "TXN-89014", type: "Booking", customer: "Sarah Johnson", amount: 120, status: "Success", method: "Debit Card", date: "2024-10-12 16:45" },
];

const dummyLogs: LogEntry[] = [
  { timestamp: "2024-10-12 14:23:45", user: "John Smith", email: "john@example.com", action: "Login", ip: "192.168.1.100", location: "New York, US", device: "Chrome/Win", status: "Success", risk: "low" },
  { timestamp: "2024-10-12 14:25:12", user: "Admin User", email: "admin@nexa.com", action: "User Update", ip: "10.0.0.50", location: "Kanpur, IN", device: "Firefox/Mac", status: "Success", risk: "low" },
  { timestamp: "2024-10-12 14:26:33", user: "Unknown", email: "hacker@test.com", action: "Failed Login", ip: "45.12.34.56", location: "Unknown", device: "Python", status: "Failed", risk: "high" },
];

/* Small helper PlaySVG (in case you prefer inline) */
const PlaySVG: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const RupeeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <span className={`font-bold ${className}`} style={{ fontSize: size }}>₹</span>
);

type ReportFormat = "PDF" | "Excel" | "CSV";

type AdminAudience =
  | "ALL_USERS"
  | "ALL_PROVIDERS"
  | "ALL_ADMINS"
  | "SERVICE_CUSTOMERS"
  | "PROVIDER_CUSTOMERS"
  | "SPECIFIC_PROVIDER"
  | "SPECIFIC_CUSTOMER";

const adminAudienceOptions: Array<{
  value: AdminAudience;
  label: string;
  description: string;
  requiresProvider?: boolean;
  requiresService?: boolean;
  requiresCustomer?: boolean;
}> = [
  {
    value: "ALL_USERS",
    label: "All Users",
    description: "Broadcast to everyone registered on the platform.",
  },
  {
    value: "ALL_PROVIDERS",
    label: "All Providers",
    description: "Send announcements to every service provider.",
  },
  {
    value: "ALL_ADMINS",
    label: "All Admins",
    description: "Notify the admin staff about urgent updates.",
  },
  {
    value: "SERVICE_CUSTOMERS",
    label: "Service Customers",
    description: "Target passengers who booked a specific service.",
    requiresService: true,
  },
  {
    value: "PROVIDER_CUSTOMERS",
    label: "Provider Customers",
    description: "Notify all passengers tied to a particular provider.",
    requiresProvider: true,
  },
  {
    value: "SPECIFIC_PROVIDER",
    label: "Specific Provider",
    description: "Reach a single provider with a targeted message.",
    requiresProvider: true,
  },
  {
    value: "SPECIFIC_CUSTOMER",
    label: "Specific Customer",
    description: "Send a one-to-one message to a known customer.",
    requiresCustomer: true,
  },
];
/* ===========================
   Missing small page stub
   =========================== */
const AnalyticsPage: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
      Analytics & Reports
    </h2>
    <Card>
      <div className="text-gray-400">
        (Analytics charts placeholder — implement with your charting library)
      </div>
    </Card>
  </div>
);

/* ===========================
   Main component
   =========================== */

const NexaAdminPortal: React.FC = () => {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light"); // default to light
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [authData, setAuthData] = useState<ReturnType<typeof getAuthFromStorage> | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderData | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [providerPerformance, setProviderPerformance] = useState<ProviderPerformanceData>([]);
  const [alertNotifications, setAlertNotifications] = useState<RecipientNotification[]>([]);
  const [alertLoading, setAlertLoading] = useState<boolean>(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(true);
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardResponse | null>(null);
  const [isLoadingDashboardStats, setIsLoadingDashboardStats] = useState<boolean>(true);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [providerList, setProviderList] = useState<ProviderData[]>([]);
  const [isLoadingProvidersPage, setIsLoadingProvidersPage] = useState<boolean>(true);
  const [financialOverview, setFinancialOverview] = useState<FinancialOverviewResponse | null>(null);
  const [isLoadingFinancial, setIsLoadingFinancial] = useState<boolean>(true);
  const [transactionPage, setTransactionPage] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [bookingsView, setBookingsView] = useState<"list" | "calendar">("list");
  const [bookingSearchTerm, setBookingSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [providerActionLoading, setProviderActionLoading] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const BOOKINGS_PER_PAGE = 10;
  const statusOptions = ["Confirmed", "Completed", "Cancelled", "Pending"];
  const serviceTypeOptions = ["Flight", "Train", "Bus"];
  const [audience, setAudience] = useState<AdminAudience>("ALL_USERS");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationChannel, setNotificationChannel] = useState<"Email">("Email");
  const [providerTargetId, setProviderTargetId] = useState("");
  const [serviceTargetId, setServiceTargetId] = useState("");
  const [customerTargetId, setCustomerTargetId] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationFormError, setNotificationFormError] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<AdminNotificationListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<AdminAudience | "ALL">("ALL");
  
  // Admin account management modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const loadNotificationHistory = useCallback(async () => {
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setNotificationHistory([]);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const data = await getAdminNotifications(auth.token);
      setNotificationHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load admin notifications:", error);
      setHistoryError("Unable to load notifications.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchAlertNotifications = useCallback(async () => {
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setAlertNotifications([]);
      setAlertError(null);
      setAlertLoading(false);
      return;
    }

    setAlertLoading(true);
    setAlertError(null);

    try {
      const data = await getNotifications(auth.token);
      const pending = data.filter((notification) => notification.status === "Pending");
      setAlertNotifications(pending);
    } catch (error) {
      console.error("Failed to load alert notifications:", error);
      setAlertError("Unable to load alerts.");
    } finally {
      setAlertLoading(false);
    }
  }, []);

  const handleMarkAlertAsRead = async (receiptId: string) => {
    if (!receiptId) return;
    const auth = getAuthFromStorage();
    if (!auth?.token) return;
    try {
      await markNotificationAsRead(receiptId, auth.token);
      setAlertNotifications((prev) => prev.filter((notification) => notification.receipt_id !== receiptId));
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };
  const [reportFromDate, setReportFromDate] = useState<string>("");
  const [reportToDate, setReportToDate] = useState<string>("");
  const [reportFormat, setReportFormat] = useState<ReportFormat>("CSV");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const getBookingDateOnly = (iso: string) => {
    if (!iso) return "";
    return iso.split("T")[0] ?? iso;
  };

  const formatCurrency = (amount: string) => {
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount)) {
      return amount || "—";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDateParts = (iso: string) => {
    if (!iso) {
      return { dateLabel: "—", timeLabel: "" };
    }
    const dateInstance = new Date(iso);
    if (Number.isNaN(dateInstance.getTime())) {
      return { dateLabel: iso, timeLabel: "" };
    }
    return {
      dateLabel: dateInstance.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      timeLabel: dateInstance.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getServiceMeta = (serviceType: string) => {
    const normalized = (serviceType || "").toLowerCase();
    if (normalized === "flight") {
      return { icon: Plane, bg: "bg-blue-500/20", color: "text-blue-500" };
    }
    if (normalized === "train") {
      return { icon: Train, bg: "bg-purple-500/20", color: "text-purple-500" };
    }
    if (normalized === "bus") {
      return { icon: Bus, bg: "bg-amber-500/20", color: "text-amber-500" };
    }
    return { icon: Activity, bg: "bg-slate-200", color: "text-slate-500" };
  };

  const getStatusVariant = (status: string): BadgeVariant => {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("confirm") || normalized.includes("active")) return "default";
    if (normalized.includes("complete") || normalized.includes("success")) return "success";
    if (normalized.includes("pending") || normalized.includes("progress")) return "warning";
    if (normalized.includes("cancel") || normalized.includes("fail")) return "danger";
    return "info";
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const formatMetricValue = (value?: number | string, isCurrency = false) => {
    if (value === undefined || value === null || value === "") {
      return "—";
    }
    if (typeof value === "number") {
      if (isCurrency) {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
      }
      return value.toLocaleString();
    }
    if (!isCurrency) {
      return value.toString();
    }
    const parsed = Number(value.toString().replace(/[^0-9.-]/g, ""));
    if (Number.isNaN(parsed)) {
      return value.toString();
    }
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(parsed);
  };

  const getMetricGrowthVariant = (growth?: string): BadgeVariant => {
    if (!growth) {
      return "info";
    }
    const trimmed = growth.trim();
    if (trimmed.startsWith("-")) {
      return "danger";
    }
    return "success";
  };

  const getMetricGrowthLabel = (growth?: string) => {
    return growth || "—";
  };

  const normalizedDateFilter = useMemo(() => {
    if (!dateFilter) return null;
    const year = dateFilter.getFullYear();
    const month = String(dateFilter.getMonth() + 1).padStart(2, "0");
    const day = String(dateFilter.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [dateFilter]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return 0;
      }
      return bTime - aTime;
    });
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const search = bookingSearchTerm.trim().toLowerCase();
    return sortedBookings.filter((bookingEntry) => {
      const bookingDateOnly = getBookingDateOnly(bookingEntry.date);
      const matchesDate = !normalizedDateFilter || bookingDateOnly === normalizedDateFilter;
      const matchesStatus =
        statusFilters.length === 0 ||
        statusFilters.some((status) => status.toLowerCase() === (bookingEntry.status || "").toLowerCase());
      const matchesService =
        serviceFilters.length === 0 ||
        serviceFilters.some((service) => service.toLowerCase() === (bookingEntry.service_type || "").toLowerCase());
      const matchesSearch =
        search === "" ||
        [
          bookingEntry.passenger_name,
          bookingEntry.route,
          bookingEntry.service_provider,
          bookingEntry.service_type,
          bookingEntry.seats,
          bookingEntry.booking_id,
          bookingEntry.service_id,
        ].some((field) => (field || "").toString().toLowerCase().includes(search));
      return matchesDate && matchesStatus && matchesService && matchesSearch;
    });
  }, [sortedBookings, bookingSearchTerm, normalizedDateFilter, statusFilters, serviceFilters]);

  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / BOOKINGS_PER_PAGE));

  const paginatedBookings = useMemo(() => {
    const start = (bookingsPage - 1) * BOOKINGS_PER_PAGE;
    return filteredBookings.slice(start, start + BOOKINGS_PER_PAGE);
  }, [filteredBookings, bookingsPage]);

  useEffect(() => {
    setBookingsPage(1);
  }, [bookingSearchTerm, normalizedDateFilter, statusFilters, serviceFilters]);

  useEffect(() => {
    if (bookingsPage > totalBookingPages) {
      setBookingsPage(Math.max(1, totalBookingPages));
    }
  }, [bookingsPage, totalBookingPages]);

  const groupedBookingsByDate = useMemo(() => {
    return filteredBookings.reduce<Record<string, Booking[]>>((acc, bookingEntry) => {
      const dateKey = getBookingDateOnly(bookingEntry.date) || "Undated";
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(bookingEntry);
      return acc;
    }, {});
  }, [filteredBookings]);

  const dashboardRecentBookings = useMemo(() => sortedBookings.slice(0, 4), [sortedBookings]);
  const calendarDateKeys = useMemo(() => {
    return Object.keys(groupedBookingsByDate).sort((a, b) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      const aTime = new Date(a).getTime();
      const bTime = new Date(b).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return a.localeCompare(b);
      }
      return bTime - aTime;
    });
  }, [groupedBookingsByDate]);

  const toggleStatusFilter = (value: string) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((status) => status !== value) : [...prev, value]
    );
  };

  const toggleServiceFilter = (value: string) => {
    setServiceFilters((prev) =>
      prev.includes(value) ? prev.filter((service) => service !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setStatusFilters([]);
    setServiceFilters([]);
    setDateFilter(null);
  };

  const activeFiltersCount = statusFilters.length + serviceFilters.length + (dateFilter ? 1 : 0);

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingId) return;

    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      console.error("No auth token found");
      // Maybe show a toast notification to the user
      return;
    }

    if (window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
      setIsDeleting(bookingId);
      try {
        await deleteBooking(bookingId, auth.token);
        // On success, remove the booking from the state
        setBookings((prevBookings) => prevBookings.filter((b) => b.booking_id !== bookingId));
        // Maybe show a success toast
      } catch (error) {
        console.error("Failed to delete booking:", error);
        // Maybe show an error toast
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleProviderStatusChange = async (provider: ProviderData, status: "Approved" | "Rejected") => {
    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      console.error("No auth token available to update provider status.");
      return;
    }

    if (providerActionLoading) {
      return;
    }

    const timestamp = new Date().toISOString();

    setProviderActionLoading(provider.user);
    try {
      await updateProviderStatus(
        provider.user,
        {
          status,
          verified: status === "Approved",
          verified_at: timestamp,
        },
        auth.token
      );

      setProviderList((prev) =>
        prev.map((item) =>
          item.user === provider.user
            ? { ...item, status, verified: status === "Approved", verified_at: timestamp }
            : item
        )
      );

      setSelectedProvider((prev) =>
        prev?.user === provider.user
          ? { ...prev, status, verified: status === "Approved", verified_at: timestamp }
          : prev
      );
    } catch (error) {
      console.error("Failed to update provider status:", error);
    } finally {
      setProviderActionLoading(null);
    }
  };

  const getAudienceMeta = () => {
    return adminAudienceOptions.find((option) => option.value === audience);
  };

  const getAudienceLabel = (value: string) => {
    return adminAudienceOptions.find((option) => option.value === value)?.label ?? value;
  };

  const handlePreviewNotification = () => {
    if (!notificationSubject.trim() && !notificationMessage.trim()) {
      setNotificationFormError("Add both a subject and message to preview.");
      return;
    }

    if (!notificationSubject.trim()) {
      setNotificationFormError("Subject is required to preview.");
      return;
    }
    if (!notificationMessage.trim()) {
      setNotificationFormError("Message body is required to preview.");
      return;
    }

    setNotificationFormError(null);
    setIsPreviewOpen(true);
  };

  const handleSendNotification = async () => {
    const trimmedSubject = notificationSubject.trim();
    const trimmedMessage = notificationMessage.trim();
    const trimmedProvider = providerTargetId.trim();
    const trimmedService = serviceTargetId.trim();
    const trimmedCustomer = customerTargetId.trim();

    setNotificationStatus(null);
    setNotificationFormError(null);

    if (!trimmedSubject || !trimmedMessage) {
      setNotificationFormError("Subject and message body cannot be empty.");
      return;
    }

    const audienceMeta = adminAudienceOptions.find((option) => option.value === audience);
    if (audienceMeta?.requiresProvider && !trimmedProvider) {
      setNotificationFormError("Provider ID is required for the selected audience.");
      return;
    }
    if (audienceMeta?.requiresService && !trimmedService) {
      setNotificationFormError("Service ID is required for the selected audience.");
      return;
    }
    if (audienceMeta?.requiresCustomer && !trimmedCustomer) {
      setNotificationFormError("Customer ID is required for the selected audience.");
      return;
    }

    const payload: CreateAdminNotificationPayload = {
      subject: trimmedSubject,
      message_body: trimmedMessage,
      channel: notificationChannel,
      target_audience_type: audience,
    };

    if (trimmedProvider) payload.provider_id = trimmedProvider;
    if (trimmedService) payload.service_id = trimmedService;
    if (trimmedCustomer) payload.customer_id = trimmedCustomer;

    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setNotificationFormError("You must be signed in as admin to send notifications.");
      return;
    }

    setIsSendingNotification(true);
    try {
      await createAdminNotification(payload, auth.token);
      setNotificationStatus({ type: "success", text: "✅ Notification sent successfully." });
      setNotificationSubject("");
      setNotificationMessage("");
      setProviderTargetId("");
      setServiceTargetId("");
      setCustomerTargetId("");
      await loadNotificationHistory();
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      setNotificationStatus({ type: "error", text: "Failed to send notification. Please try again." });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuthFromStorage();
    if (auth && auth.token) {
      try {
        await logout(auth.token);
      } catch (error) {
        console.error("Logout failed", error);
      } finally {
        clearAuthStorage();
        router.push('/'); // Redirect to home page
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!confirm("Are you sure you want to logout from all devices? You will need to login again.")) {
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth || !auth.token) {
      alert("Authentication required. Please log in again.");
      return;
    }

    try {
      const { logoutAllDevices } = await import("@/app/api");
      await logoutAllDevices(auth.token);
      
      // Clear local storage and redirect to home page
      clearAuthStorage();
      window.location.href = "/";
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error logging out from all devices:", error);
      alert(error.message || "Failed to logout from all devices. Please try again.");
    }
  };

  // Load auth data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthData(getAuthFromStorage());
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const auth = getAuthFromStorage();
      setIsLoadingDashboardStats(true);
      if (auth && auth.token) {
        try {
          const dashboardData = await getAdminDashboardStats(auth.token);
          setDashboardStats(dashboardData);
        } catch (error) {
          console.error("Failed to fetch dashboard stats:", error);
        } finally {
          setIsLoadingDashboardStats(false);
        }
        try {
          const providerData = await getProviderPerformance(auth.token);
          setProviderPerformance(providerData);
        } catch (error) {
          console.error("Failed to fetch provider performance:", error);
        } finally {
          setIsLoadingProviders(false);
        }

        try {
          const userData = await getUserStats(auth.token);
          setUserStats(userData.results);
        } catch (error) {
          console.error("Failed to fetch user stats:", error);
        } finally {
          setIsLoadingUsers(false);
        }

        try {
          const providerListData = await getProviderList(auth.token);
          setProviderList(providerListData);
        } catch (error) {
          console.error("Failed to fetch provider list:", error);
        } finally {
          setIsLoadingProvidersPage(false);
        }

        try {
          const financialData = await getFinancialOverview(auth.token);
          setFinancialOverview(financialData);
        } catch (error) {
          console.error("Failed to fetch financial overview:", error);
        } finally {
          setIsLoadingFinancial(false);
        }

        try {
          setBookingsError(null);
          const bookingListData = await getAdminBookingsList(auth.token);
          setBookings(bookingListData);
        } catch (error) {
          console.error("Failed to fetch bookings list:", error);
          setBookingsError(error instanceof Error ? error.message : "Failed to load bookings");
        } finally {
          setIsLoadingBookings(false);
        }
      } else {
        setIsLoadingDashboardStats(false);
        setIsLoadingProviders(false);
        setIsLoadingUsers(false);
        setIsLoadingProvidersPage(false);
        setIsLoadingFinancial(false);
        setIsLoadingBookings(false);
      }
      await loadNotificationHistory();
    };

    fetchData();
  }, [loadNotificationHistory]);


  useEffect(() => {
    if (showNotifications) {
      fetchAlertNotifications();
    }
  }, [showNotifications, fetchAlertNotifications]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const menuItems = [
    { id: "dashboard", icon: Home, label: "Dashboard" },
    { id: "users", icon: Users, label: "User Management" },
    { id: "providers", icon: Briefcase, label: "Provider Management" },
    { id: "bookings", icon: Calendar, label: "Bookings & Operations" },
    { id: "financial", icon: RupeeIcon, label: "Financial Center" },
    { id: "communications", icon: MessageSquare, label: "Communications" },
    { id: "database", icon: Database, label: "Database Query Runner" },
  ];

  /* ---------------------------
     Page renderers (kept as functions for readability)
     --------------------------- */

  const DashboardPage: React.FC = () => {
    const activeUsersMetric = dashboardStats?.total_active_users;
    const bookingsTodayMetric = dashboardStats?.bookings_today;
    const revenueTodayMetric = dashboardStats?.revenue_today;
    const providerCountValue = providerPerformance.length;
    const providerCountDisplay = isLoadingProviders ? "—" : providerCountValue.toLocaleString();

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="text-blue-400" size={24} />
            </div>
            <Badge variant={getMetricGrowthVariant(activeUsersMetric?.growth)}>
              {activeUsersMetric?.growth ?? (isLoadingDashboardStats ? "Loading..." : "—")}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {isLoadingDashboardStats ? "—" : formatMetricValue(activeUsersMetric?.value)}
          </div>
          <div className="text-gray-400 text-sm">{activeUsersMetric?.label ?? "Total Active Users"}</div>
        </Card>

        <Card className="hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-lg">
              <Calendar className="text-emerald-400" size={24} />
            </div>
            <Badge variant={getMetricGrowthVariant(bookingsTodayMetric?.growth)}>
              {bookingsTodayMetric?.growth ?? (isLoadingDashboardStats ? "Loading..." : "—")}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {isLoadingDashboardStats ? "—" : formatMetricValue(bookingsTodayMetric?.value)}
          </div>
          <div className="text-gray-400 text-sm">{bookingsTodayMetric?.label ?? "Bookings Today"}</div>
        </Card>

        <Card className="hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[#6366f1]/15 rounded-lg">
              <RupeeIcon className="text-[#6366f1]" size={24} />
            </div>
            <Badge variant={getMetricGrowthVariant(revenueTodayMetric?.growth)}>
              {revenueTodayMetric?.growth ?? (isLoadingDashboardStats ? "Loading..." : "—")}
            </Badge>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {isLoadingDashboardStats ? "—" : formatMetricValue(revenueTodayMetric?.value, true)}
          </div>
          <div className="text-gray-400 text-sm">{revenueTodayMetric?.label ?? "Revenue Today"}</div>
        </Card>

        <Card className="hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Briefcase className="text-purple-400" size={24} />
            </div>
            <Badge variant="info">{isLoadingProviders ? "Loading" : "Providers"}</Badge>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{providerCountDisplay}</div>
          <div className="text-gray-400 text-sm">Providers tracked</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Recent Bookings</h3>
            <Button variant="ghost" size="sm" onClick={() => setCurrentPage("bookings")}>
              View All <ChevronRight size={16} />
            </Button>
          </div>
          <div className="space-y-3">
            {isLoadingBookings ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`booking-skeleton-${index}`}
                  className="rounded-lg p-4 border border-dashed border-slate-200 dark:border-white/10 animate-pulse bg-white/40 dark:bg-white/5"
                >
                  <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
              ))
            ) : bookingsError ? (
              <div className="text-sm text-red-500">{bookingsError}</div>
            ) : dashboardRecentBookings.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-gray-400">No bookings found.</div>
            ) : (
              dashboardRecentBookings.map((booking) => {
                const meta = getServiceMeta(booking.service_type);
                const Icon = meta.icon;
                const { dateLabel, timeLabel } = formatDateParts(booking.date);
                return (
                  <div
                    key={booking.booking_id}
                    className="
                      rounded-lg p-4 transition-colors cursor-pointer
                      bg-slate-50 hover:bg-slate-100 border border-slate-200
                      dark:bg-[#1a1d29] dark:hover:bg-[#1f2330] dark:border-white/5
                    "
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${meta.bg}`}>
                          <Icon size={16} className={meta.color} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{booking.passenger_name}</div>
                          <div className="text-sm text-slate-500 dark:text-gray-400">{booking.service_provider || "—"}</div>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                      <span className="text-slate-500 dark:text-gray-400">{booking.route}</span>
                      <span className="text-slate-500 dark:text-gray-400">
                        {dateLabel}
                        {timeLabel ? ` • ${timeLabel}` : ""}
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">{formatCurrency(booking.amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Provider Performance Overview</h3>
          <ScrollArea className="flex-grow">
            <div className="space-y-4">
              {isLoadingProviders ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-gray-200 dark:border-t-blue-400 dark:border-gray-700"></div>
                </div>
              ) : providerPerformance.length > 0 ? (
                providerPerformance.map((provider, index) => (
                  <div key={index} className="rounded-lg p-4 bg-slate-50 border border-slate-200 dark:bg-[#1a1d29] dark:border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] rounded-full flex items-center justify-center text-white font-bold">
                          {provider.name.length > 1 ? provider.name.substring(0, 2).toUpperCase() : provider.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{provider.name}</div>
                          <div className="text-sm text-slate-500 dark:text-gray-400">{provider.bookings} bookings</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="text-yellow-400 fill-yellow-400" size={16} />
                        <span className="text-slate-900 dark:text-white font-semibold">{provider.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-2 bg-slate-200 dark:bg-[#252936] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#ff6b35] to-[#d4af37]" style={{ width: `${(provider.rating / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p className="text-slate-500 dark:text-gray-400">No provider data available.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>


    </div>
  );
  };

  const UsersPage: React.FC = () => {
    const filteredUsers = userStats.filter(
      (user) =>
        searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExportUsers = () => {
      if (!userStats.length) {
        console.warn('No users to export');
        return;
      }

      exportToCsv(
        "users.csv",
        ["Name", "Email", "Type", "Status", "Bookings", "Joined"],
        userStats.map((user) => [
          user.name,
          user.email,
          user.type,
          user.status,
          user.bookings,
          new Date(user.joined_at).toISOString(),
        ])
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h2>
            <p className="text-slate-500 dark:text-gray-400">{userStats.length} total users</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={<Download size={18} />} onClick={handleExportUsers}>
              Export Data
            </Button>
          </div>
        </div>

        <Card>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search users by name, email, or ID..."
                icon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingUsers ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-gray-200 dark:border-t-blue-400 dark:border-gray-700"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">User</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Email</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Type</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Bookings</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Joined</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1a1d29] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-900 dark:text-white font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{user.email}</td>
                      <td className="py-4 px-4">
                        <Badge variant={user.type === "customer" ? "default" : "info"}>{user.type}</Badge>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={user.status === "Active" ? "success" : user.status === "Pending" ? "warning" : "danger"}>{user.status}</Badge>
                      </td>
                      <td className="py-4 px-4 text-slate-900 dark:text-white">{user.bookings}</td>
                      <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{new Date(user.joined_at).toLocaleDateString()}</td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <button
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <Eye size={16} className="text-blue-400" />
                          </button>
                          <button className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Edit size={16} className="text-indigo-500" />
                          </button>
                          <button className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    );
  };


  const ProvidersPage: React.FC = () => {
    const pendingProviders = providerList.filter((p) => p.status === "Pending");
    const handleExportProviders = () => {
      if (!providerList.length) {
        console.warn("No providers to export");
        return;
      }

      exportToCsv(
        "providers.csv",
        ["Username", "Company", "License", "Status", "Rating", "Reviews", "Verified"],
        providerList.map((provider) => [
          provider.username,
          provider.company_name || "",
          provider.license_info || "",
          provider.status,
          provider.rating,
          provider.total_reviews,
          provider.verified ? "Yes" : "No",
        ])
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Provider Management</h2>
        </div>

        <div className="flex gap-4 border-b border-slate-200 dark:border-white/10">
          <button className="pb-3 px-4 border-b-2 border-indigo-500 text-slate-900 dark:text-white font-medium">All Providers</button>
          <button className="pb-3 px-4 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            Pending Approvals <Badge variant="warning" className="ml-2">{pendingProviders.length}</Badge>
          </button>
        </div>

        {isLoadingProvidersPage ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-gray-200 dark:border-t-blue-400 dark:border-gray-700"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingProviders.map((provider) => (
                <Card key={provider.user} className="hover:scale-105 transition-transform" onClick={() => setSelectedProvider(provider)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#ff6b35] to-[#d4af37] rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                      {provider.username.charAt(0).toUpperCase()}
                    </div>
                    <Badge variant="warning">{provider.status}</Badge>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{provider.username}</h3>
                  <p className="text-slate-600 dark:text-gray-400 text-sm mb-4">{provider.company_name || 'N/A'}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-gray-400">License:</span>
                      <span className="text-slate-900 dark:text-white">{provider.license_info || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      icon={<Check size={16} />}
                      className="flex-1"
                      disabled={providerActionLoading === provider.user}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderStatusChange(provider, "Approved");
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<X size={16} />}
                      className="flex-1"
                      disabled={providerActionLoading === provider.user}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProviderStatusChange(provider, "Rejected");
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Providers</h3>
                <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleExportProviders}>
                  Export CSV
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Provider</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Company Name</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">License</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Status</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Rating</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Total Reviews</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Verified</th>
                      <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerList.map((provider) => (
                      <tr key={provider.user} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1a1d29] transition-colors cursor-pointer" onClick={() => setSelectedProvider(provider)}>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] rounded-full flex items-center justify-center text-white font-bold">
                              {provider.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-slate-900 dark:text-white font-medium">{provider.username}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{provider.company_name || 'N/A'}</td>
                        <td className="py-4 px-4 text-slate-900 dark:text-white">{provider.license_info || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <Badge variant={provider.status === "Approved" ? "success" : provider.status === "Pending" ? "warning" : "danger"}>{provider.status}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Star className="text-yellow-400 fill-yellow-400" size={16} />
                            <span className="text-slate-900 dark:text-white">{provider.rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-900 dark:text-white">{provider.total_reviews}</td>
                        <td className="py-4 px-4">
                          <Badge variant={provider.verified ? "success" : "danger"}>{provider.verified ? 'Yes' : 'No'}</Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProvider(provider);
                              }}
                            >
                              <Eye size={16} className="text-blue-400" />
                            </button>
                            <button className="p-2 hover:bg-indigo-500/20 rounded-lg transition-colors" onClick={(e) => e.stopPropagation()}>
                              <Edit size={16} className="text-indigo-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    );
  };

  const renderBookingsPage = () => {
    const handleExportBookings = () => {
      if (!filteredBookings.length) {
        console.warn('No bookings to export');
        return;
      }

      exportToCsv(
        'bookings.csv',
        ['Booking ID', 'Service ID', 'Passenger Name', 'Route', 'Date', 'Seats', 'Amount', 'Status', 'Service Type', 'Service Provider'],
        filteredBookings.map((booking) => [
          booking.booking_id,
          booking.service_id || '—',
          booking.passenger_name,
          booking.route,
          booking.date,
          booking.seats,
          booking.amount,
          booking.status,
          booking.service_type,
          booking.service_provider || '—',
        ])
      );
    };

    const handlePrevPage = () => {
      if (bookingsPage > 1) {
        setBookingsPage(bookingsPage - 1);
      }
    };

    const handleNextPage = () => {
      if (bookingsPage < totalBookingPages) {
        setBookingsPage(bookingsPage + 1);
      }
    };

    const lightActionClasses =
      theme === 'light'
        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
        : '';

    const pageStart = filteredBookings.length === 0 ? 0 : (bookingsPage - 1) * BOOKINGS_PER_PAGE + 1;
    const pageEnd =
      filteredBookings.length === 0 ? 0 : Math.min(pageStart + BOOKINGS_PER_PAGE - 1, filteredBookings.length);

    const spinner = (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-indigo-500 border-gray-200 dark:border-t-indigo-400 dark:border-gray-700"></div>
      </div>
    );

    const listViewContent = () => {
      if (isLoadingBookings) {
        return spinner;
      }

      if (bookingsError) {
        return <div className="py-16 text-center text-red-500">{bookingsError}</div>;
      }

      return (
        <>
          {filteredBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-gray-400">
              No bookings match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Passenger</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Route</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Date & Time</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Seats</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Amount</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Service Type</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Service Provider</th>
                    <th className="text-left py-4 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => {
                    const meta = getServiceMeta(booking.service_type);
                    const Icon = meta.icon;
                    const { dateLabel, timeLabel } = formatDateParts(booking.date);
                    return (
                      <tr
                        key={booking.booking_id}
                        className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1a1d29] transition-colors cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${meta.bg}`}>
                              <Icon size={16} className={meta.color} />
                            </div>
                            <div>
                              <div className="text-slate-900 dark:text-white font-medium">{booking.passenger_name}</div>
                              <div className="text-xs text-slate-500 dark:text-gray-400">#{booking.booking_id?.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-900 dark:text-white">{booking.route}</td>
                        <td className="py-4 px-4">
                          <div className="text-slate-900 dark:text-white">{dateLabel}</div>
                          <div className="text-slate-500 dark:text-gray-400 text-sm">{timeLabel || '—'}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{booking.seats || '—'}</td>
                        <td className="py-4 px-4 text-slate-900 dark:text-white font-semibold">{formatCurrency(booking.amount)}</td>
                        <td className="py-4 px-4">
                          <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                        </td>
                        <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{booking.service_type || '—'}</td>
                        <td className="py-4 px-4 text-slate-600 dark:text-gray-400">{booking.service_provider || '—'}</td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <button
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBooking(booking);
                              }}
                            >
                              <Eye size={16} className="text-blue-400" />
                            </button>
                            <button
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (booking.booking_id) {
                                  handleDeleteBooking(booking.booking_id);
                                }
                              }}
                              disabled={isDeleting === booking.booking_id}
                            >
                              {isDeleting === booking.booking_id ? (
                                <RefreshCw size={16} className="text-red-400 animate-spin" />
                              ) : (
                                <Trash2 size={16} className="text-red-400" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-4 border-t border-slate-200 dark:border-white/10 pt-4">
            <div className="text-sm text-slate-500 dark:text-gray-400">
              {filteredBookings.length === 0
                ? 'Showing 0 of 0 bookings'
                : `Showing ${pageStart}-${pageEnd} of ${filteredBookings.length} bookings`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPage();
                }}
                disabled={bookingsPage === 1 || filteredBookings.length === 0}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPage();
                }}
                disabled={bookingsPage === totalBookingPages || filteredBookings.length === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      );
    };

    const calendarViewContent = () => {
      if (isLoadingBookings) {
        return spinner;
      }

      if (bookingsError) {
        return <div className="py-16 text-center text-red-500">{bookingsError}</div>;
      }

      if (!filteredBookings.length) {
        return <div className="py-16 text-center text-slate-500 dark:text-gray-400">No bookings match your criteria.</div>;
      }

      return (
        <div className="space-y-4">
          {calendarDateKeys.map((dateKey) => {
            const items = groupedBookingsByDate[dateKey] || [];
            if (!items.length) return null;
            const readableDate = dateKey === 'Undated' ? 'Undated' : formatDateParts(dateKey).dateLabel;
            return (
              <div key={dateKey} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-[#0f1624]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{readableDate}</p>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      {items.length} booking{items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {items.map((booking) => {
                    const meta = getServiceMeta(booking.service_type);
                    const Icon = meta.icon;
                    const dateParts = formatDateParts(booking.date);
                    const timeDisplay = dateParts.timeLabel || dateParts.dateLabel;
                    return (
                      <div
                        key={`${dateKey}-${booking.booking_id}`}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-[#1a1d29] cursor-pointer"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${meta.bg}`}>
                            <Icon size={16} className={meta.color} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white">{booking.passenger_name}</div>
                            <div className="text-sm text-slate-500 dark:text-gray-400">{booking.route}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400 flex-wrap">
                          <span>{timeDisplay}</span>
                          <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(booking.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bookings & Operations</h2>
          <p className="text-slate-500 dark:text-gray-400">Search, filter, and monitor every reservation in real time.</p>
        </div>

        <Card>
          <div className="space-y-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">Search</label>
                <Input
                  placeholder="Search passenger, route, service..."
                  icon={<Search size={18} />}
                  className="mt-2"
                  value={bookingSearchTerm}
                  onChange={(e) => setBookingSearchTerm((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="w-full lg:w-64">
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">Travel date</label>
                <div className="mt-2">
                  <DatePicker selected={dateFilter ?? undefined} onChange={(date) => setDateFilter(date ?? null)} />
                  {dateFilter && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-indigo-500 hover:text-indigo-600"
                      onClick={() => setDateFilter(null)}
                    >
                      Clear date
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full lg:w-56">
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400">View</label>
                <div className="mt-2 grid grid-cols-2 bg-slate-100 dark:bg-white/5 rounded-2xl p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => setBookingsView('list')}
                    className={`px-3 py-2 rounded-xl transition-all font-medium ${
                      bookingsView === 'list'
                        ? 'bg-white shadow dark:bg-slate-900 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookingsView('calendar')}
                    className={`px-3 py-2 rounded-xl transition-all font-medium ${
                      bookingsView === 'calendar'
                        ? 'bg-white shadow dark:bg-slate-900 text-indigo-600 dark:text-indigo-300'
                        : 'text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    Calendar
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/60 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Status</p>
                  {statusFilters.length > 0 && (
                    <button className="text-xs text-indigo-500" onClick={() => setStatusFilters([])}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => {
                    const active = statusFilters.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-gray-300 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/60 dark:bg-white/[0.03]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Service type</p>
                  {serviceFilters.length > 0 && (
                    <button className="text-xs text-indigo-500" onClick={() => setServiceFilters([])}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {serviceTypeOptions.map((service) => {
                    const active = serviceFilters.includes(service);
                    const meta = getServiceMeta(service);
                    const IconComponent = meta.icon;
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => toggleServiceFilter(service)}
                        className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-2 transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-gray-300 border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <IconComponent size={14} className={active ? 'text-white' : meta.color} />
                        {service}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-gray-400">
              <div>
                {activeFiltersCount === 0 ? 'No filters active' : `${activeFiltersCount} filter${activeFiltersCount > 1 ? 's' : ''} active`}
              </div>
              {(statusFilters.length > 0 || serviceFilters.length > 0 || dateFilter) && (
                <button className="text-indigo-500 hover:text-indigo-600 font-medium" onClick={clearFilters}>
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Bookings Overview</h3>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={16} />}
              className={lightActionClasses}
              onClick={handleExportBookings}
            >
              Export CSV
            </Button>
          </div>

          {bookingsView === 'list' ? listViewContent() : calendarViewContent()}
        </Card>
      </div>
    );
  };


  const FinancialPage: React.FC = () => {
    const TRANSACTIONS_PER_PAGE = 7;

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const transactionHeaders = ["Transaction ID", "Type", "Customer", "Amount", "Status", "Method", "Date"];

    const reportFormatConfig: Record<ReportFormat, { extension: string; mimeType: string }> = {
      PDF: { extension: "pdf", mimeType: "application/pdf" },
      Excel: { extension: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      CSV: { extension: "csv", mimeType: "text/csv;charset=utf-8;" },
    };

    const buildTransactionRows = (transactions: Transaction[]) =>
      transactions.map((txn) => [
        txn.txn_id,
        txn.type,
        txn.customer,
        formatCurrency(txn.amount),
        txn.status,
        txn.method,
        new Date(txn.date).toLocaleString(),
      ]);

    const downloadTransactions = (transactions: Transaction[], filenamePrefix: string, format: ReportFormat) => {
      if (!transactions.length) {
        if (typeof window !== "undefined") {
          window.alert("No transactions available for the selected report.");
        }
        return;
      }
      const config = reportFormatConfig[format];
      exportToCsv(`${filenamePrefix}.${config.extension}`, transactionHeaders, buildTransactionRows(transactions), config.mimeType);
    };

    const getTransactionsBetweenDates = (from: string, to: string) => {
      if (!from || !to || !financialOverview) {
        return [];
      }
      let startDate = new Date(from);
      let endDate = new Date(to);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return [];
      }
      if (startDate.getTime() > endDate.getTime()) {
        [startDate, endDate] = [endDate, startDate];
      }
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return financialOverview.transactions.filter((txn) => {
        const txnDate = new Date(txn.date);
        if (Number.isNaN(txnDate.getTime())) {
          return false;
        }
        return txnDate >= startDate && txnDate <= endDate;
      });
    };

    const getWeekNumber = (date: Date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDays = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
      return Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    };

    const referenceDate = new Date();
    const currentMonthLabel = referenceDate.toLocaleString("default", { month: "short" });
    const currentWeekLabel = `W${getWeekNumber(referenceDate)}`;

    const handleGenerateReport = () => {
      if (!reportFromDate || !reportToDate) {
        if (typeof window !== "undefined") {
          window.alert("Please select both From and To dates before generating a report.");
        }
        return;
      }
      const filtered = getTransactionsBetweenDates(reportFromDate, reportToDate);
      if (!filtered.length) {
        if (typeof window !== "undefined") {
          window.alert("No transactions found for the selected date range.");
        }
        return;
      }
      setIsGeneratingReport(true);
      try {
        downloadTransactions(filtered, `transactions-${reportFromDate}-${reportToDate}`, reportFormat);
      } finally {
        setIsGeneratingReport(false);
      }
    };

    const handleDownloadMonthlyReport = () => {
      if (!financialOverview) return;
      const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      const endOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthlyTransactions = financialOverview.transactions.filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= startOfMonth && txnDate <= endOfMonth;
      });
      const monthIdentifier = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
      downloadTransactions(monthlyTransactions, `monthly-report-${monthIdentifier}`, "CSV");
    };

    const handleDownloadWeeklyReport = () => {
      if (!financialOverview) return;
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      const weeklyTransactions = financialOverview.transactions.filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= startOfWeek && txnDate <= endOfWeek;
      });
      const weekIdentifier = `${today.getFullYear()}-${currentWeekLabel}`;
      downloadTransactions(weeklyTransactions, `weekly-report-${weekIdentifier}`, "CSV");
    };

    if (isLoadingFinancial) {
      return (
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-500 border-gray-200 dark:border-t-blue-400 dark:border-gray-700"></div>
        </div>
      );
    }

    if (!financialOverview) {
      return <div className="text-center text-slate-500 dark:text-gray-400">No financial data available.</div>;
    }

    const totalTransactions = financialOverview.transactions.length;
    const totalPages = Math.ceil(totalTransactions / TRANSACTIONS_PER_PAGE);
    const startIndex = (transactionPage - 1) * TRANSACTIONS_PER_PAGE;
    const endIndex = Math.min(startIndex + TRANSACTIONS_PER_PAGE, totalTransactions);
    const currentTransactions = financialOverview.transactions.slice(startIndex, endIndex);

    const handleNextPage = () => {
      if (transactionPage < totalPages) {
        setTransactionPage(transactionPage + 1);
      }
    };

    const handlePrevPage = () => {
      if (transactionPage > 1) {
        setTransactionPage(transactionPage - 1);
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Financial Center</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="hover:scale-105 transition-transform">
            <div className="text-slate-600 dark:text-gray-400 text-sm mb-2">Today&apos;s Revenue</div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{formatCurrency(financialOverview.summary.today_revenue)}</div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <TrendingUp size={16} />
              <span>vs yesterday</span>
            </div>
          </Card>

          <Card className="hover:scale-105 transition-transform">
            <div className="text-slate-600 dark:text-gray-400 text-sm mb-2">This Week</div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{formatCurrency(financialOverview.summary.week_revenue)}</div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <TrendingUp size={16} />
              <span>vs last week</span>
            </div>
          </Card>

          <Card className="hover:scale-105 transition-transform">
            <div className="text-slate-600 dark:text-gray-400 text-sm mb-2">This Month</div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{formatCurrency(financialOverview.summary.month_revenue)}</div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <TrendingUp size={16} />
              <span>vs last month</span>
            </div>
          </Card>

          <Card className="hover:scale-105 transition-transform bg-gradient-to-br from-amber-500/20 to-[#ff6b35]/20 border-amber-500/30">
            <div className="text-slate-600 dark:text-gray-400 text-sm mb-2">Pending Settlements</div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">{formatCurrency(financialOverview.summary.pending_settlements.amount)}</div>
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <Clock size={16} />
              <span>{financialOverview.summary.pending_settlements.count} pending</span>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Transaction History</h3>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={16} />}
                onClick={() =>
                  downloadTransactions(
                    financialOverview.transactions,
                    `transaction-history-${new Date().toISOString().slice(0, 10)}`,
                    "CSV"
                  )
                }
              >
                Export
              </Button>
            </div>
            <div className="flex-grow overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Transaction ID</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Type</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Customer</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Amount</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Method</th>
                    <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map((txn) => (
                    <tr key={txn.txn_id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-[#1a1d29] transition-colors">
                      <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{txn.txn_id}</td>
                      <td className="py-3 px-4">
                        <Badge variant={txn.type === "Booking" ? "default" : "warning"}>{txn.type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{txn.customer}</td>
                      <td className="py-3 px-4">
                        {(() => {
                          const statusStr = (txn.status || "").toString().toLowerCase();
                          const typeStr = (txn.type || "").toString().toLowerCase();
                          const isRefunded = statusStr.includes("refund") || typeStr.includes("refund") || statusStr.includes("refunded");
                          const sign = isRefunded ? "-" : txn.amount > 0 ? "+" : "";
                          const colorClass = isRefunded ? "text-red-400" : txn.amount > 0 ? "text-emerald-400" : "text-red-400";
                          const displayAmount = Math.abs(Number(txn.amount)) || 0;
                          return (
                            <span className={`font-semibold ${colorClass}`}>{sign}{formatCurrency(displayAmount)}</span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={txn.status === "Success" ? "success" : "danger"}>{txn.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{txn.method}</td>
                      <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{new Date(txn.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <div className="text-slate-600 dark:text-gray-400 text-sm">Showing {startIndex + 1}-{endIndex} of {totalTransactions} transactions</div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handlePrevPage} disabled={transactionPage === 1}>
                  Previous
                </Button>
                <Button variant="primary" size="sm" onClick={handleNextPage} disabled={transactionPage === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Generate Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="lg:col-span-1">
                    <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">From Date</label>
                    <Input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate((e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">To Date</label>
                    <Input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate((e.target as HTMLInputElement).value)}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Format</label>
                    <select
                      className="w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
                      value={reportFormat}
                      onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
                    >
                      <option>PDF</option>
                      <option>Excel</option>
                      <option>CSV</option>
                    </select>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full lg:w-auto"
                    icon={<Download size={18} />}
                    onClick={handleGenerateReport}
                    disabled={isGeneratingReport || !reportFromDate || !reportToDate}
                  >
                    {isGeneratingReport ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 pt-6 lg:pt-0 lg:pl-6">
                <h4 className="text-slate-900 dark:text-white font-semibold mb-3">Recent Reports</h4>
                <div className="space-y-2">
                  <div className="rounded-lg p-3 transition-colors bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#1a1d29] dark:hover:bg-[#1f2330] dark:border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-blue-400" />
                        <div>
                          <div className="text-slate-900 dark:text-white text-sm">Monthly Report - {currentMonthLabel}</div>
                          <div className="text-slate-600 dark:text-gray-400 text-xs">CSV • Latest data</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadMonthlyReport}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Download size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 transition-colors bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#1a1d29] dark:hover:bg-[#1f2330] dark:border-white/5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-emerald-400" />
                        <div>
                          <div className="text-slate-900 dark:text-white text-sm">Weekly Report - {currentWeekLabel}</div>
                          <div className="text-slate-600 dark:text-gray-400 text-xs">CSV • Weekly summary</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadWeeklyReport}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      >
                        <Download size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderCommunicationsPage = useMemo(() => {
    const filteredHistory =
      historyFilter === "ALL"
        ? notificationHistory
        : notificationHistory.filter((item) => item.target_audience_type === historyFilter);
    const audienceMeta = getAudienceMeta();

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Communications Center</h2>

        <Card className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Compose Notification</h3>
            <span className="text-sm text-slate-500 dark:text-gray-400">Channel: {notificationChannel}</span>
          </div>

          {notificationStatus && (
            <div
              className={`px-4 py-2 rounded-lg text-sm ${
                notificationStatus.type === "success"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10"
                  : "bg-red-50 text-red-700 dark:bg-red-500/10"
              }`}
            >
              {notificationStatus.text}
            </div>
          )}

          {notificationFormError && (
            <div className="text-sm text-red-500">{notificationFormError}</div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-400 mb-2 block">Recipient Type</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AdminAudience)}
                className="w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
              >
                {adminAudienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {audienceMeta?.description ?? "Choose the audience you want to reach."}
              </p>
            </div>

            <div>
              <label className="text-sm text-slate-600 dark:text-gray-400 mb-2 block">Subject</label>
              <Input
                placeholder="Enter message subject..."
                value={notificationSubject}
                onChange={(e) => setNotificationSubject((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm text-slate-600 dark:text-gray-400 mb-2 block">Message</label>
              <textarea
                className="w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 min-h-48 resize-none"
                placeholder="Type your message here..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {audienceMeta?.requiresProvider && (
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 mb-2 block">
                  Provider ID
                </label>
                <Input
                  value={providerTargetId}
                  onChange={(e) => setProviderTargetId((e.target as HTMLInputElement).value)}
                  placeholder="UUID"
                />
              </div>
            )}

            {audienceMeta?.requiresService && (
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 mb-2 block">
                  Service ID
                </label>
                <Input
                  value={serviceTargetId}
                  onChange={(e) => setServiceTargetId((e.target as HTMLInputElement).value)}
                  placeholder="UUID"
                />
              </div>
            )}

            {audienceMeta?.requiresCustomer && (
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 mb-2 block">
                  Customer ID
                </label>
                <Input
                  value={customerTargetId}
                  onChange={(e) => setCustomerTargetId((e.target as HTMLInputElement).value)}
                  placeholder="UUID"
                />
              </div>
            )}

            <div className="md:col-span-3">
              <label className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 mb-2 block">
                Channel
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="admin-channel"
                    className="w-4 h-4"
                    value="Email"
                    checked={notificationChannel === "Email"}
                    onChange={() => setNotificationChannel("Email")}
                  />
                  <span>Email</span>
                </label>
                <label className="flex items-center gap-2 text-slate-400 cursor-not-allowed">
                  <input type="radio" name="admin-channel" className="w-4 h-4" disabled />
                  <span>SMS (coming soon)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" icon={<Eye size={16} />} onClick={handlePreviewNotification}>
              Preview
            </Button>
            <Button
              variant="primary"
              icon={<MessageSquare size={18} />}
              onClick={handleSendNotification}
              disabled={isSendingNotification}
            >
              {isSendingNotification ? "Sending..." : "Send Now"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Notification History</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400">{filteredHistory.length} record(s)</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={historyFilter}
                onChange={(e) =>
                  setHistoryFilter((e.target as HTMLSelectElement).value as AdminAudience | "ALL")
                }
                className="bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
              >
                <option value="ALL">All audiences</option>
                {adminAudienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="sm" icon={<RefreshCw size={16} />} onClick={loadNotificationHistory}>
                Refresh
              </Button>
            </div>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-10 w-10 rounded-full border-4 border-t-blue-500 border-slate-200" />
            </div>
          ) : historyError ? (
            <div className="py-6 text-sm text-red-500">{historyError}</div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-6 text-sm text-slate-500 dark:text-gray-400">No history found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 dark:text-gray-400">
                    <th className="py-3 px-3 font-medium">Subject</th>
                    <th className="py-3 px-3 font-medium">Audience</th>
                    <th className="py-3 px-3 font-medium">Channel</th>
                    <th className="py-3 px-3 font-medium">Created At</th>
                    <th className="py-3 px-3 font-medium">Recipients</th>
                    <th className="py-3 px-3 font-medium">Sent Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((notification) => (
                    <tr
                      key={notification.notification_id}
                      className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-3 text-slate-900 dark:text-white max-w-[180px] truncate">{notification.subject}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-gray-400">
                        {getAudienceLabel(notification.target_audience_type)}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-gray-400">{notification.channel}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-gray-400">
                        {new Date(notification.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">
                        {notification.total_recipients}
                      </td>
                      <td className="py-3 px-3 text-slate-900 dark:text-white font-semibold">
                        {notification.sent_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    );
  }, [
    historyFilter,
    notificationHistory,
    audience,
    notificationStatus,
    notificationFormError,
    notificationSubject,
    notificationMessage,
    providerTargetId,
    serviceTargetId,
    customerTargetId,
    isSendingNotification,
    isPreviewOpen,
    historyLoading,
    historyError,
  ]);


  const defaultSqlQuery = `SELECT u.id,
       u.name,
       u.email,
       u.status,
       COUNT(b.id) AS total_bookings
FROM users u
LEFT JOIN bookings b ON u.id = b.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email, u.status
ORDER BY total_bookings DESC
LIMIT 10;`;

  const DatabasePage: React.FC = () => {
    const [sqlQuery, setSqlQuery] = useState<string>(defaultSqlQuery);
    const [isRunningQuery, setIsRunningQuery] = useState<boolean>(false);
    const [sqlResult, setSqlResult] = useState<SqlRunnerResponse | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [isEditorReadOnly, setIsEditorReadOnly] = useState<boolean>(false);
    const [resultPage, setResultPage] = useState<number>(1);

    const columns = sqlResult?.columns ?? [];
    const totalRows = sqlResult?.data.length ?? 0;
    const rowsPerPage = 10;
    const totalPages = totalRows ? Math.ceil(totalRows / rowsPerPage) : 1;
    const startIndex = totalRows ? (resultPage - 1) * rowsPerPage : 0;
    const endIndex = totalRows ? Math.min(startIndex + rowsPerPage, totalRows) : 0;
    const visibleRows = sqlResult ? sqlResult.data.slice(startIndex, endIndex) : [];
    const hasResults = columns.length > 0;
    const hasRows = totalRows > 0;

    useEffect(() => {
      setResultPage(1);
    }, [sqlResult]);

    useEffect(() => {
      if (resultPage > totalPages) {
        setResultPage(totalPages || 1);
      }
    }, [totalPages, resultPage]);

    const formatCellValue = (value: unknown) => {
      if (value === null || typeof value === 'undefined') {
        return 'NULL';
      }
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (error) {
          console.warn('Failed to stringify cell value', error);
          return '[object]';
        }
      }
      return String(value);
    };

    const handleExportCsv = () => {
      if (!sqlResult || !hasResults) return;

      exportToCsv(
        'sql-results.csv',
        columns,
        sqlResult.data.map((row) => columns.map((_, index) => row?.[index] ?? ''))
      );
    };

    const handleRunQuery = async () => {
      if (!sqlQuery.trim() || isRunningQuery) return;

      setQueryError(null);
      setIsRunningQuery(true);

      try {
        const auth = getAuthFromStorage();
        if (!auth?.token) {
          throw new Error('Authentication token missing. Please log in again.');
        }

        const result = await executeAdminSqlQuery(auth.token, sqlQuery);
        setSqlResult(result);
        setResultPage(1);
      } catch (error) {
        if (error instanceof Error) {
          setQueryError(error.message);
        } else {
          setQueryError('Failed to execute query. Please try again.');
        }
      } finally {
        setIsRunningQuery(false);
      }
    };

    const handleFormatQuery = () => {
      setSqlQuery((prev) => formatSqlText(prev));
    };

    const handleClearEditor = () => {
      setSqlQuery('');
      setQueryError(null);
    };

    const handleUseSuggestedQuery = (query: string) => {
      setSqlQuery(formatSqlText(query));
      setIsEditorReadOnly(false);
    };

    const handlePageChange = (direction: 'prev' | 'next') => {
      setResultPage((prev) => {
        if (direction === 'prev') {
          return Math.max(1, prev - 1);
        }
        return Math.min(totalPages, prev + 1);
      });
    };

    const suggestedQueries = [
      {
        title: 'Active users with bookings',
        description: 'Shows the top active users with their booking counts since January.',
        query: defaultSqlQuery,
      },
      {
        title: 'Revenue by provider (30d)',
        description: 'Aggregates total booking revenue for each provider over the last 30 days.',
        query: `SELECT sp.company_name AS provider,
       SUM(b.amount) AS total_revenue
FROM service_providers sp
JOIN bookings b ON b.provider_id = sp.user
WHERE b.created_at >= NOW() - INTERVAL '30 days'
GROUP BY sp.company_name
ORDER BY total_revenue DESC
LIMIT 10;`,
      },
      {
        title: 'Failed logins in last day',
        description: 'Captures recent authentication failures for quick auditing.',
        query: `SELECT user_email, ip_address, user_agent, occurred_at
FROM security_logs
WHERE action = 'FAILED_LOGIN'
  AND occurred_at >= NOW() - INTERVAL '1 day'
ORDER BY occurred_at DESC;`,
      },
      {
        title: 'Top routes by bookings',
        description: 'Ranks travel routes by number of completed bookings.',
        query: `SELECT route, COUNT(*) AS total_bookings
FROM bookings
WHERE status = 'Completed'
GROUP BY route
ORDER BY total_bookings DESC
LIMIT 15;`,
      },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Database Query Runner</h2>
        </div>

        <Card>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-600 dark:text-gray-400 text-sm">SQL Query Editor</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleFormatQuery} disabled={!sqlQuery.trim()}>
                  Format
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearEditor} disabled={!sqlQuery.length}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-[#0d0f14] rounded-lg p-4 font-mono text-sm">
              <textarea
                className={`w-full bg-transparent text-slate-900 dark:text-white focus:outline-none resize-none min-h-64 transition-opacity ${
                  isEditorReadOnly ? 'cursor-not-allowed opacity-80' : ''
                }`}
                placeholder={`-- Enter your SQL query here\nSELECT * FROM users WHERE status = 'active' LIMIT 10;`}
                value={sqlQuery}
                onChange={(event) => setSqlQuery(event.target.value)}
                readOnly={isEditorReadOnly}
                spellCheck={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center gap-3 text-slate-600 dark:text-gray-400 text-sm">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={isEditorReadOnly}
                onChange={(event) => setIsEditorReadOnly(event.target.checked)}
              />
              <span>Read-only mode (locks editor)</span>
            </label>
            <Button
              variant="primary"
              icon={isRunningQuery ? <RefreshCw size={18} className="animate-spin" /> : <PlaySVG size={18} />}
              onClick={handleRunQuery}
              disabled={isRunningQuery || !sqlQuery.trim()}
            >
              {isRunningQuery ? 'Running...' : 'Run Query'}
            </Button>
          </div>

          <div className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Query Results</h3>
                <p className="text-slate-600 dark:text-gray-400 text-sm">
                  {sqlResult
                    ? `Executed in ${sqlResult.execution_time_ms ?? 0}ms • ${sqlResult.rows_returned ?? totalRows} rows returned`
                    : 'Run a query to see results'}
                </p>
              </div>
              <Button variant="secondary" size="sm" icon={<Download size={16} />} onClick={handleExportCsv} disabled={!hasResults}>
                Export CSV
              </Button>
            </div>

            {queryError && (
              <div className="rounded-lg border border-red-200 bg-red-500/10 text-red-600 dark:border-red-500/40 dark:text-red-300 p-4 text-sm">
                {queryError}
              </div>
            )}

            {sqlResult && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-gray-400">
                <Badge variant="info">Query Type: {sqlResult.query_type || 'UNKNOWN'}</Badge>
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10">{sqlResult.execution_time_ms ?? 0} ms execution time</div>
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10">{totalRows} rows</div>
                <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10">{columns.length} columns</div>
              </div>
            )}

            {!sqlResult && (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-slate-600 dark:text-gray-400">
                Construct your SQL query and click <span className="font-semibold text-slate-900 dark:text-white">Run Query</span> to see the output here.
              </div>
            )}

            {sqlResult && hasResults && (
              <div className="space-y-4">
                <div className="relative w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="min-w-max w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-white/5">
                      <tr>
                        {columns.map((column) => (
                          <th key={column} className="py-3 px-4 font-medium text-slate-600 dark:text-gray-300 border-b border-slate-200/80 dark:border-white/5 whitespace-nowrap">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hasRows ? (
                        visibleRows.map((row, rowIndex) => (
                          <tr key={`${rowIndex}-${startIndex}`} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                            {columns.map((column, columnIndex) => (
                              <td key={`${rowIndex}-${column}`} className="py-3 px-4 text-slate-900 dark:text-white whitespace-nowrap">
                                {formatCellValue(row?.[columnIndex])}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="py-6 px-4 text-center text-slate-600 dark:text-gray-400">
                            Query executed successfully but returned no rows.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-600 dark:text-gray-400">
                  <span>
                    {totalRows
                      ? `Showing ${startIndex + 1}-${endIndex} of ${totalRows} rows`
                      : 'No rows to display'}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handlePageChange('prev')} disabled={resultPage === 1}>
                      Previous
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => handlePageChange('next')} disabled={resultPage >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {sqlResult && !hasResults && (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-6 text-sm text-slate-600 dark:text-gray-400">
                Query executed successfully. No tabular data was returned for this {sqlResult.query_type || 'operation'} command.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Suggested Queries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestedQueries.map((template) => (
              <div key={template.title} className="rounded-lg p-4 transition-colors bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-[#1a1d29] dark:hover:bg-[#1f2330] dark:border-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-slate-900 dark:text-white font-medium">{template.title}</div>
                    <p className="text-slate-600 dark:text-gray-400 text-sm mt-1">{template.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleUseSuggestedQuery(template.query)}>
                    Use Query
                  </Button>
                </div>
                <pre className="mt-3 text-xs text-slate-600 dark:text-gray-400 font-mono bg-white dark:bg-white/5 rounded-lg p-3 overflow-x-auto max-h-32">{template.query}</pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };


  const SettingsPage: React.FC = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <nav className="space-y-2">
            {["General", "Payment", "Email Templates", "Policies", "System", "Admin Accounts", "API"].map((item) => (
              <button key={item} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${item === "General" ? "bg-indigo-500 text-white" : "text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#1a1d29] hover:text-slate-900 dark:hover:text-white"}`}>
                {item}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="lg:col-span-3">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">General Settings</h3>
          <div className="space-y-6">
            <div>
              <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Platform Name</label>
              <Input defaultValue="Nexa Travel" />
              <p className="text-slate-500 dark:text-gray-500 text-xs mt-1">The name displayed across the platform</p>
            </div>

            <div>
              <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Platform Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#ff6b35] to-[#d4af37] rounded-lg flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">N</span>
                </div>
                <Button variant="secondary" size="sm" icon={<Upload size={16} />}>
                  Upload New Logo
                </Button>
              </div>
            </div>

            <div>
              <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Support Email</label>
              <Input type="email" defaultValue="support@nexa.travel" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Timezone</label>
                <select className="w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400">
                  <option>UTC +5:30 (IST)</option>
                  <option>UTC +0:00 (GMT)</option>
                  <option>UTC -5:00 (EST)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-gray-400 text-sm mb-2 block">Currency</label>
                <select className="w-full bg-white dark:bg-[#1a1d29] border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400">
                  <option>USD ($)</option>
                  <option>INR (₹)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-white/10">
              <Button variant="primary" icon={<Check size={18} />}>
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  /* ---------------------------
     Password Reset Modal
     --------------------------- */
  
  const PasswordResetModal: React.FC = () => {
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
        const API = await import("@/app/api");
        const response = await fetch(API.default.FORGOT_PASSWORD, {
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
      } catch (error: unknown) {
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
        const API = await import("@/app/api");
        await fetch(API.default.RESEND_OTP, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-CSRFTOKEN": CSRF_TOKEN,
          },
          body: JSON.stringify({
            email: auth.email,
            otp_type: "admin",
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
        const API = await import("@/app/api");
        const response = await fetch(API.default.CHANGE_PASSWORD, {
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
          setShowPasswordModal(false);
        }, 1500);
      } catch (error: unknown) {
        const err = error as Error;
        setAlertType("error");
        setAlertMessage(err.message || "Failed to change password. Please check your old password.");
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
        const API = await import("@/app/api");
        const response = await fetch(API.default.RESET_PASSWORD, {
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
          setShowPasswordModal(false);
        }, 1500);
      } catch (error: unknown) {
        const err = error as Error;
        setAlertType("error");
        setAlertMessage(err.message || "Failed to reset password. Please check your OTP.");
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

    if (!showPasswordModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#252936] rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
          <button
            onClick={() => setShowPasswordModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">
              <KeyRound className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {forgotPasswordMode ? "Reset Password" : "Change Password"}
            </h3>
          </div>

          {alertMessage && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              alertType === "success" 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}>
              {alertMessage}
            </div>
          )}

          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Your password must be at least 8 characters long and include both small and uppercase letters, numbers, and special characters (e.g., $!@%&)
          </p>

          <div className="space-y-4">
            {!forgotPasswordMode ? (
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Old Password</label>
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 dark:bg-[#1a1d29] rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                  placeholder="Enter old password"
                />
                <button
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-11 text-gray-400 hover:text-gray-600"
                >
                  {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 dark:bg-[#1a1d29] rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest text-slate-900 dark:text-white"
                  placeholder="000000"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter the 6-digit OTP sent to your email
                </p>
              </div>
            )}

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 dark:bg-[#1a1d29] rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                placeholder="Enter new password"
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-11 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {forgotPasswordMode ? (
            <button
              onClick={handleResendOTP}
              disabled={resendCountdown > 0}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-4 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
            </button>
          ) : (
            <button
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mt-4 font-medium"
            >
              Forgot your password?
            </button>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 font-medium"
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
  };

  /* ---------------------------
     detail modals
     --------------------------- */

  const UserDetailModal: React.FC = () => (
    <Modal isOpen={selectedUser !== null} onClose={() => setSelectedUser(null)} title="User Details" size="lg">
      {selectedUser && (
        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <img src={selectedUser.avatar} alt={selectedUser.name} className="w-24 h-24 rounded-full" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedUser.name}</h3>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={selectedUser.status === "Active" ? "success" : selectedUser.status === "Suspended" ? "warning" : "danger"}>{selectedUser.status}</Badge>
                <Badge variant={selectedUser.type === "Customer" ? "default" : "info"}>{selectedUser.type}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Email</div>
                  <div className="text-slate-900 dark:text-white flex items-center gap-2">
                    <PlayIcon size={16} className="text-gray-400" />
                    {selectedUser.email}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Total Bookings</div>
                  <div className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {selectedUser.bookings}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Joined</div>
                  <div className="text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    {selectedUser.joined}
                  </div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">User ID</div>
                  <div className="text-slate-900 dark:text-white">#{selectedUser.id}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-white/10 pt-6">
            <div className="flex gap-3">
              <Button variant="primary" icon={<Edit size={18} />}>
                Edit Profile
              </Button>
              <Button variant="secondary" icon={<RefreshCw size={18} />}>
                Reset Password
              </Button>
              {selectedUser.status === "Active" ? (
                <Button variant="warning" icon={<AlertCircle size={18} />}>
                  Suspend Account
                </Button>
              ) : (
                <Button variant="success" icon={<Check size={18} />}>
                  Activate Account
                </Button>
              )}
              <Button variant="danger" icon={<Trash2 size={18} />}>
                Delete User
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );

  const ProviderDetailModal: React.FC = () => (
    <Modal isOpen={selectedProvider !== null} onClose={() => setSelectedProvider(null)} title="Provider Details" size="xl">
      {selectedProvider && (
        <div className="space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-[#ff6b35] to-[#d4af37] rounded-xl flex items-center justify-center text-white text-4xl font-bold">
              {selectedProvider.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedProvider.username}</h3>
              <p className="text-slate-600 dark:text-gray-400 mb-4">{selectedProvider.company_name || "No company name"}</p>
              <div className="flex items-center gap-3 mb-4">
                <Badge variant={selectedProvider.status === "Approved" ? "success" : selectedProvider.status === "Pending" ? "warning" : "danger"}>{selectedProvider.status}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="text-yellow-400 fill-yellow-400" size={18} />
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedProvider.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Business Information</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">License Number</div>
                  <div className="text-slate-900 dark:text-white">{selectedProvider.license_info || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Contact Number</div>
                  <div className="text-slate-900 dark:text-white">{selectedProvider.contact_number || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Email</div>
                  <div className="text-slate-900 dark:text-white">{selectedProvider.email}</div>
                </div>
              </div>
            </Card>

            <Card>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Verification & Stats</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Verification Status</div>
                  <Badge variant={selectedProvider.verified ? "success" : "warning"}>{selectedProvider.verified ? 'Verified' : 'Not Verified'}</Badge>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Verified At</div>
                  <div className="text-slate-900 dark:text-white">{selectedProvider.verified_at ? new Date(selectedProvider.verified_at).toLocaleString() : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Total Reviews</div>
                  <div className="text-slate-900 dark:text-white">{selectedProvider.total_reviews}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="border-t border-slate-200 dark:border-white/10 pt-6">
            <div className="flex gap-3">
              {selectedProvider.status === "Pending" && (
                <>
                  <Button variant="success" icon={<Check size={18} />}>
                    Approve Provider
                  </Button>
                  <Button variant="danger" icon={<X size={18} />}>
                    Reject Application
                  </Button>
                </>
              )}
              <Button variant="secondary" icon={<Edit size={18} />}>
                Edit Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );

  const BookingDetailModal: React.FC = () => (
    <Modal isOpen={selectedBooking !== null} onClose={() => setSelectedBooking(null)} title="Booking Details" size="lg">
      {selectedBooking && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedBooking.booking_id}</h3>
              <Badge variant={getStatusVariant(selectedBooking.status)}>{selectedBooking.status}</Badge>
            </div>
            {(() => {
              const meta = getServiceMeta(selectedBooking.service_type);
              const Icon = meta.icon;
              return (
                <div className={`p-4 rounded-xl ${meta.bg}`}>
                  <Icon size={32} className={meta.color} />
                </div>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Passenger Information</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Name</div>
                  <div className="text-slate-900 dark:text-white">{selectedBooking.passenger_name}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Seats</div>
                  <div className="text-slate-900 dark:text-white">{selectedBooking.seats || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Service Provider</div>
                  <div className="text-slate-900 dark:text-white">{selectedBooking.service_provider || '—'}</div>
                </div>
              </div>
            </Card>

            <Card>
              <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Journey Details</h4>
              <div className="space-y-3">
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Route</div>
                  <div className="text-slate-900 dark:text-white flex items-center gap-2">{selectedBooking.route}</div>
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Date & Time</div>
                  {(() => {
                    const { dateLabel, timeLabel } = formatDateParts(selectedBooking.date);
                    return (
                      <div className="text-slate-900 dark:text-white">
                        {dateLabel}
                        {timeLabel ? ` at ${timeLabel}` : ''}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Service Type</div>
                  <div className="text-slate-900 dark:text-white">{selectedBooking.service_type || '—'}</div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Payment Information</h4>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-slate-600 dark:text-gray-400 text-sm mb-1">Total Amount</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(selectedBooking.amount)}</div>
              </div>
              <Badge variant="success">Paid</Badge>
            </div>
          </Card>

          <Card>
            <h4 className="text-slate-900 dark:text-white font-semibold mb-4">Booking Identifiers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-gray-400">Booking ID</div>
                <div className="text-slate-900 dark:text-white font-mono">{selectedBooking.booking_id}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-gray-400">Service ID</div>
                <div className="text-slate-900 dark:text-white font-mono">{selectedBooking.service_id || '—'}</div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Modal>
  );

  /* ---------------------------
     topbar / sidebar / render
     --------------------------- */

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "users":
        return <UsersPage />;
      case "providers":
        return <ProvidersPage />;
      case "bookings":
        return renderBookingsPage();
      case "financial":
        return <FinancialPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "monitoring":
        return <MonitoringPage />;
      case "communications":
        return renderCommunicationsPage;
      case "database":
        return <DatabasePage />;
      case "security":
        return <SecurityPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#1a1d29] dark:text-white">
        {/* Top Navigation */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-[#252936] backdrop-blur border-b border-slate-200 dark:border-white/10 z-40 flex items-center px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen((s) => !s)}>
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-[#0ea5e9] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-xl font-bold">Nexa</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-auto px-8">
            <Input
              placeholder="Search users, bookings, providers..."
              icon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery((e.target as HTMLInputElement).value)
              }
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon size={18} className="text-slate-700" />
              ) : (
                <Sun size={18} className="text-yellow-300" />
              )}
            </button>

            <button
              className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              onClick={() => setShowNotifications((s) => !s)}
            >
              <Bell size={20} />
              {alertNotifications.length > 0 && (
                <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full w-5 h-5">
                  {Math.min(alertNotifications.length, 99)}
                </span>
              )}
            </button>

            <div className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${authData?.username || 'Admin'}`}
                alt={authData?.username || 'Admin'}
                className="w-8 h-8 rounded-full"
              />
              <div className="hidden md:block">
                <div className="text-sm font-medium">
                  {authData?.username ? authData.username.charAt(0).toUpperCase() + authData.username.slice(1) : 'Admin User'}
                </div>
                <div className="text-xs text-gray-400">Super Admin</div>
              </div>
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={`fixed top-16 left-0 bottom-0 w-70 bg-white dark:bg-[#252936] border-r border-slate-200 dark:border-white/10 z-30 transition-transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 flex flex-col`}
        >
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    active
                      ? "bg-gradient-to-r from-[#6366f1] to-[#0ea5e9] text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-white/10 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
            <button
              onClick={handleLogoutAllDevices}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all"
            >
              <Monitor size={20} />
              <span className="font-medium">Logout All Devices</span>
            </button>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all"
            >
              <KeyRound size={20} />
              <span className="font-medium">Reset Password</span>
            </button>
          </div>
        </div>


        {/* Main Content */}
        <div className={`pt-16 transition-all ${sidebarOpen ? "lg:pl-64" : ""}`}>
          <div className="p-8">{renderPage()}</div>
        </div>

        {/* Modals */}
        <PasswordResetModal />
        <UserDetailModal />
        <ProviderDetailModal />
        <BookingDetailModal />

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="fixed top-20 right-6 w-96 bg-white dark:bg-[#252936] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50">
            <div className="p-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Alerts</h3>
                <span className="text-xs text-slate-500">Inbox</span>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              {alertLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-blue-500 border-slate-200"></div>
                </div>
              ) : alertError ? (
                <div className="px-4 py-6 text-sm text-red-500">{alertError}</div>
              ) : alertNotifications.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-500 dark:text-gray-400">No pending alerts.</div>
              ) : (
                alertNotifications.slice(0, 4).map((notification) => (
                  <div
                    key={notification.receipt_id}
                    className="px-4 py-4 border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-900 dark:text-white font-medium truncate">
                          {notification.subject || notification.message_body || "New alert"}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400">
                          {formatTimeAgo(notification.sent_at)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-indigo-500 hover:text-indigo-600"
                        onClick={() => handleMarkAlertAsRead(notification.receipt_id)}
                      >
                        Mark as read
                      </button>
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-gray-400">
                      {notification.message_body}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-white/10 p-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNotifications(false);
                }}
              >
                View communications
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NexaAdminPortal;
