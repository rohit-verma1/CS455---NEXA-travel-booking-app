"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthSidebar } from "@/components/shared/auth-panel";
import { User, UserCheck, Briefcase, Users, LogOut, Menu, Bell, Github, Clock, Search } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { getAuthFromStorage, clearAuthStorage } from "@/utils/authStorage";
import { API, getNotifications, markNotificationAsRead, type RecipientNotification } from "@/app/api";

type AuthStored =
  | {
      token: string;
      user_type?: string;
      username?: string;
      email?: string;
    }
  | null;

type ForumNavbarProps = {
  activeSection: "blogs" | "forums";
  onNavigate: (section: "blogs" | "forums") => void;
  onSearch: (query: string) => void;
  searchValue?: string;
  searchPlaceholder?: string;
};

export function Navbar({
  activeSection,
  onNavigate,
  onSearch,
  searchValue = "",
  searchPlaceholder = "Search destinations...",
}: ForumNavbarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [searchQuery, setSearchQuery] = useState(searchValue);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Payment timer state
  const [paymentTimeLeft, setPaymentTimeLeft] = useState<number>(600); // 10 minutes in seconds
  const [showPaymentExpiredModal, setShowPaymentExpiredModal] = useState(false);

  // Booking progress steps
  const bookingSteps = [
    { label: "Flight Selection", path: "/booking/flight" },
    { label: "Traveller Details", path: "/booking/review" },
    { label: "Seat Selection", path: "/booking/add-on" },
    { label: "Payment", path: "/booking/payment" },
  ];

  // Find current step index
  const currentBookingStep = bookingSteps.findIndex(step => pathname.startsWith(step.path));

  useEffect(() => {
    setSearchQuery(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (searchQuery === searchValue) return;
    const handle = setTimeout(() => {
      onSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [onSearch, searchQuery, searchValue]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress);
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchQuery.trim());
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const tabOptions: Array<{ id: "blogs" | "forums"; label: string }> = [
    { id: "blogs", label: "Blogs" },
    { id: "forums", label: "Forums" },
  ];

  // Timer effect for payment page
  useEffect(() => {
    if (pathname === "/booking/payment") {
      // Reset timer when entering payment page
      setPaymentTimeLeft(600);
      
      const timer = setInterval(() => {
        setPaymentTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowPaymentExpiredModal(true);
            
            // Wait 30 seconds then redirect
            setTimeout(() => {
              router.push("/");
            }, 30000);
            
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [pathname, router]);

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

  // Payment Timer Component
  const PaymentTimer = () => {
    const minutes = Math.floor(paymentTimeLeft / 60);
    const seconds = paymentTimeLeft % 60;
    const isLowTime = paymentTimeLeft < 120; // Less than 2 minutes

    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
        isLowTime ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-blue-50 border-blue-300'
      }`}>
        <Clock className={`w-5 h-5 ${isLowTime ? 'text-red-600' : 'text-blue-600'}`} />
        <div className="flex flex-col">
          <span className="text-xs text-slate-600">Time Remaining</span>
          <span className={`text-lg font-bold ${isLowTime ? 'text-red-600' : 'text-blue-600'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    );
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<RecipientNotification[]>([]);

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


  const [authSidebarOpen, setAuthSidebarOpen] = useState(false);
  const [authSidebarInitialView, setAuthSidebarInitialView] = useState<"role" | "consumer" | "provider" | "admin" | "verify">("role");
  const [auth, setAuth] = useState<AuthStored>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const loginPromptRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    function handlePointer(e: PointerEvent) {
      if (!loginPromptRef.current) return;
      if (e.target instanceof Node && !loginPromptRef.current.contains(e.target)) setLoginPromptOpen(false);
    }
    if (loginPromptOpen) document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [loginPromptOpen]);

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

  const isBooking = pathname.startsWith("/booking");

    const goToMyTripsOrPromptLogin = () => {
    if (auth) {
      // user logged in -> go to My Trips
      router.push("/userDetails/profile?tab=trips");
    } else {
      // not logged in -> show message
      // exact message requested:
      setLoginPromptOpen((s) => !s);
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
            <Link href="/userDetails/profile?tab=profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
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

  const TabToggle = ({ className = "" }: { className?: string }) => (
    <div className={`relative flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-inner ring-1 ring-slate-100 ${className}`}>
      {tabOptions.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onNavigate(option.id)}
          className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
            activeSection === option.id
              ? "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-lg"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );

  const SearchField = ({ className = "" }: { className?: string }) => (
    <form onSubmit={handleSearchSubmit} className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder={searchPlaceholder}
        className="w-full rounded-full border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-700 shadow-inner transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
    </form>
  );

  return (
    <>
      <header className="relative sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-slate-100">
          <div
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 transition-transform duration-200"
            style={{ transform: `scaleX(${scrollProgress / 100})` }}
          />
        </div>

        <div className="flex h-20 items-center px-6">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="Nexa - Home" className="flex items-center ml-15">
              <NexaLogo className="h-10 w-auto" />
            </Link>
          </div>
          {/* Center section */}
          <div className="flex flex-1 items-center justify-center gap-6">
            {pathname.startsWith("/booking/") ? (
              <>
                <BookingProgress />
                {pathname === "/booking/payment" && <PaymentTimer />}
              </>
            ) : (
              <div className="hidden w-full max-w-2xl items-center justify-center gap-4 lg:flex">
                <TabToggle className="flex-shrink-0" />
                <SearchField className="w-full max-w-sm" />
              </div>
            )}
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
            {/* Bookings -> conditional behaviour (hidden on /booking/ pages) */}
            {!isBooking && (
              <div className="relative" ref={loginPromptRef}>
                <button
                  onClick={goToMyTripsOrPromptLogin}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors text-sm text-slate-700 border border-transparent"
                  title="Bookings"
                >
                  <Briefcase size={16} />
                  <span className="hidden sm:inline">Bookings</span>
                </button>
                {loginPromptOpen && !auth && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-lg p-3 z-50 flex items-center justify-between">
                    <div className="text-sm text-slate-700">Login to track your bookings</div>
                    <Button
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 ml-4"
                      onClick={() => {
                        setLoginPromptOpen(false);
                        setAuthSidebarInitialView("consumer");
                        setAuthSidebarOpen(true);
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                )}
              </div>
            )}

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
        {!pathname.startsWith("/booking/") && (
          <div className="flex flex-col gap-3 px-4 pb-4 pt-2 lg:hidden">
            <TabToggle />
            <SearchField />
          </div>
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

      {/* Payment Expired Modal */}
      {showPaymentExpiredModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <Clock className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Time Expired
              </h3>
              <p className="text-gray-600 mb-6">
                Your booking session has expired. The payment was not completed within the allowed time.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6">
                <Clock className="w-4 h-4" />
                <span>Redirecting to home page in a moment...</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 animate-[width-decrease_30s_linear]"
                  style={{
                    animation: 'width-decrease 30s linear forwards'
                  }}
                />
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes width-decrease {
              from {
                width: 100%;
              }
              to {
                width: 0%;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
