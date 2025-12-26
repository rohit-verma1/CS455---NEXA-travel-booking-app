"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Save,
  Package,
  CheckCircle,
  AlertCircle,
  X,
  MonitorSmartphone,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  RefreshCw,
  Loader2,
  Users,
  CalendarClock,
  Monitor,
  Clock,
  LogOut,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { getAuthFromStorage, clearAuthStorage } from "@/utils/authStorage";
import { ElegantAlert } from "@/components/ui/elegant-alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import API, {
  getActiveSessions,
  logoutAllDevices,
  deactivateAccount,
  updateAuthProfile,
  updateServiceProviderDetails,
  logoutSession,
  type ActiveSession
} from "@/app/api";

interface ProfilePageProps {
  theme: any;
  isDarkMode: boolean;
  username: string;
  profileData: any;
  setProfileData: (data: any) => void;
  passwordData: any;
  setPasswordData: (data: any) => void;
  passwordAlert: any;
  setPasswordAlert: (alert: any) => void;
  handlePasswordChange: () => void;
  serviceProviderLoading?: boolean;
  serviceProviderError?: string | null;
  refreshProviderData?: () => void;
  clearServiceProviderError?: () => void;
  providerUserId?: string | null;
}

type ProviderSentNotification = {
  notification_id: string;
  subject: string;
  target_audience_type: string;
  created_at: string;
  receipt_count: number;
};

type FormStatusType = 'idle' | 'loading' | 'success' | 'error';

interface FormStatus {
  type: FormStatusType;
  message?: string;
}

export default function ProfilePage({
  theme,
  isDarkMode,
  username,
  profileData,
  setProfileData,
  passwordData,
  setPasswordData,
  passwordAlert,
  setPasswordAlert,
  handlePasswordChange,
  serviceProviderLoading,
  serviceProviderError,
  refreshProviderData,
  clearServiceProviderError,
  providerUserId,
}: ProfilePageProps) {
  const [activeTab, setActiveTab] =
    useState<"company" | "notifications" | "devices">("company");
  const [showResetModal, setShowResetModal] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<ProviderSentNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsFetched, setNotificationsFetched] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsFetched, setSessionsFetched] = useState(false);
  const [sessionsAlert, setSessionsAlert] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [deviceActionLoading, setDeviceActionLoading] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [identityForm, setIdentityForm] = useState({
    username,
    email: profileData.email ?? ""
  });
  const [identityStatus, setIdentityStatus] = useState<FormStatus>({ type: 'idle' });
  const [businessStatus, setBusinessStatus] = useState<FormStatus>({ type: 'idle' });
  const [loggingOutSessionToken, setLoggingOutSessionToken] = useState<string | null>(null);

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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };


  const formatNotificationTimestamp = (value: string) => {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  useEffect(() => {
    setIdentityForm({
      username,
      email: profileData.email ?? ""
    });
  }, [username, profileData.email]);

  const fetchSentNotifications = useCallback(async () => {
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setSentNotifications([]);
      setNotificationsError("Please sign in again to view notifications sent.");
      setNotificationsFetched(true);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const response = await fetch(API.PROVIDER_SENT_NOTIFICATIONS, {
        headers: {
          accept: "application/json",
          Authorization: `Token ${auth.token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "Failed to load sent notifications.");
      }

      const data: ProviderSentNotification[] = await response.json();
      setSentNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching sent notifications:", error);
      setNotificationsError(
        error instanceof Error
          ? error.message
          : "Failed to load sent notifications."
      );
    } finally {
      setNotificationsLoading(false);
      setNotificationsFetched(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "notifications" && !notificationsFetched) {
      fetchSentNotifications();
    }
  }, [activeTab, notificationsFetched, fetchSentNotifications]);

  const fetchActiveSessions = useCallback(async () => {
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setSessions([]);
      setSessionsAlert({ type: "error", message: "Please sign in again to view active sessions." });
      setSessionsFetched(true);
      return;
    }

    setSessionsLoading(true);
    setSessionsAlert(null);

    try {
      const response = await getActiveSessions(auth.token);
      setSessions(Array.isArray(response?.active_sessions) ? response.active_sessions : []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessionsAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load active sessions.",
      });
    } finally {
      setSessionsLoading(false);
      setSessionsFetched(true);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "devices" && !sessionsFetched) {
      fetchActiveSessions();
    }
  }, [activeTab, sessionsFetched, fetchActiveSessions]);

  const handleLogoutAllDevices = async () => {
    if (deviceActionLoading) return;
    if (!window.confirm("Logout from all devices? This will end every active session.")) {
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setSessionsAlert({ type: "error", message: "Authentication required. Please log in again." });
      return;
    }

    try {
      setDeviceActionLoading(true);
      await logoutAllDevices(auth.token);
      clearAuthStorage();
      window.location.href = "/";
    } catch (error) {
      console.error("Error logging out from all devices:", error);
      setSessionsAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to logout from all devices.",
      });
    } finally {
      setDeviceActionLoading(false);
    }
  };

  const handleUpdateIdentity = async () => {
    if (identityStatus.type === 'loading') return;
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setIdentityStatus({ type: 'error', message: 'Authentication required. Please sign in again.' });
      return;
    }

    const trimmedUsername = identityForm.username.trim();
    const trimmedEmail = identityForm.email.trim();
    if (!trimmedUsername) {
      setIdentityStatus({ type: 'error', message: 'Username is required.' });
      return;
    }
    if (!trimmedEmail) {
      setIdentityStatus({ type: 'error', message: 'Email is required.' });
      return;
    }

    try {
      setIdentityStatus({ type: 'loading', message: 'Updating identity...' });
      await updateAuthProfile(auth.token, {
        username: trimmedUsername,
        email: trimmedEmail,
      });
      setIdentityStatus({ type: 'success', message: 'Identity updated successfully.' });
      setProfileData((prev) => ({ ...prev, email: trimmedEmail }));
      refreshProviderData?.();
    } catch (error) {
      setIdentityStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update identity.',
      });
    }
  };

  const handleUpdateBusinessProfile = async () => {
    if (businessStatus.type === 'loading') return;
    if (!providerUserId) {
      setBusinessStatus({ type: 'error', message: 'Unable to identify your provider record.' });
      return;
    }

    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setBusinessStatus({ type: 'error', message: 'Authentication required. Please sign in again.' });
      return;
    }

    try {
      setBusinessStatus({ type: 'loading', message: 'Updating business profile...' });
      await updateServiceProviderDetails(providerUserId, {
        company_name: profileData.company_name,
        license_info: profileData.license_info,
        contact_number: profileData.contact_number,
      }, auth.token);
      setBusinessStatus({ type: 'success', message: 'Business profile updated successfully.' });
      refreshProviderData?.();
    } catch (error) {
      setBusinessStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update business details.',
      });
    }
  };

  const handleLogoutSession = async (sessionToken: string, isCurrent: boolean) => {
    if (loggingOutSessionToken) return;
    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setSessionsAlert({ type: "error", message: "Authentication required. Please sign in again." });
      return;
    }

    try {
      setLoggingOutSessionToken(sessionToken);
      await logoutSession(sessionToken, auth.token);
      if (isCurrent) {
        clearAuthStorage();
        window.location.href = "/";
        return;
      }
      setSessionsAlert({ type: "success", message: "Session logged out successfully." });
      fetchActiveSessions();
    } catch (error) {
      setSessionsAlert({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to logout the session.",
      });
    } finally {
      setLoggingOutSessionToken(null);
    }
  };

  const handleDeactivateAccount = async () => {
    if (deactivateLoading) return;

    const auth = getAuthFromStorage();
    if (!auth?.token) {
      setDeactivateError("Authentication required. Please log in again.");
      return;
    }

    try {
      setDeactivateLoading(true);
      setDeactivateError(null);
      await deactivateAccount(auth.token);
      clearAuthStorage();
      window.location.href = "/";
    } catch (error) {
      console.error("Error deactivating account:", error);
      setDeactivateError(error instanceof Error ? error.message : "Failed to deactivate account.");
    } finally {
      setDeactivateLoading(false);
    }
  };

  // Light/Dark tokens
  const pageBg = isDarkMode
    ? "bg-slate-950"
    : "bg-gradient-to-b from-slate-50 to-white";
  const cardBg = isDarkMode ? "bg-slate-900/80" : "bg-white";
  const border = isDarkMode ? "border-slate-800" : "border-slate-200";
  const textPrimary = isDarkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDarkMode ? "text-slate-400" : "text-slate-600";
  const softBg = isDarkMode ? "bg-slate-800/60" : "bg-slate-50";
  const inputBg = isDarkMode ? "bg-slate-800" : "bg-slate-50";
  const inputBorder = isDarkMode ? "border-slate-700" : "border-slate-200";
  const pillActive = isDarkMode
    ? "bg-gradient-to-r from-sky-700 to-indigo-700 text-white"
    : "bg-gradient-to-r from-slate-700 to-slate-600 text-white";

  return (
    <div className={`relative min-h-[100dvh] ${pageBg}`}>
      <div className="mx-auto max-w-7xl px-4 pt-8 pb-4">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight ${textPrimary}`}>
              My Profile
            </h1>
            <p className={`mt-1 text-sm ${textSecondary}`}>
              Manage your provider identity, notifications sent and sessions.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border ${border} ${cardBg} px-3 py-1 shadow-sm`}
          >
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className={`text-xs ${textSecondary}`}>Protected</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <aside
            className={`lg:col-span-1 rounded-2xl ${cardBg} border ${border} shadow-sm overflow-hidden`}
          >
            <div className="p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-400 to-blue-600 text-xl font-bold text-white ring-4 ring-white/10">
                  {username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className={`text-lg font-semibold ${textPrimary}`}>
                    {username}
                  </div>
                  <div className={`text-sm ${textSecondary}`}>Premium Provider</div>
                </div>
              </div>
            </div>
            <div
              className={`h-px ${isDarkMode ? "bg-slate-700" : "bg-slate-200"} mx-4`}
            />

            <nav className="p-4">
              <div className="space-y-2">
                {[
                  { id: "company", label: "My Profile", icon: Package },
                  { id: "notifications", label: "Notifications Sent", icon: Send },
                  { id: "devices", label: "Logged-in Devices", icon: MonitorSmartphone },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      activeTab === tab.id
                        ? `${pillActive} shadow`
                        : `${textPrimary} hover:${softBg}`
                    }`}
                  >
                    <tab.icon
                      className={`h-5 w-5 ${
                        isDarkMode ? "text-slate-200" : "text-slate-700"
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        activeTab === tab.id ? "text-white" : textPrimary
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Bottom: Reset Password (opens modal) */}
              <div
                className={`mt-6 pt-6 ${
                  isDarkMode ? "border-t border-slate-700" : "border-t border-slate-200"
                }`}
              >
                <button
                  onClick={() => setShowResetModal(true)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left ${softBg} hover:opacity-90 transition`}
                >
                  <KeyRound
                    className={`h-5 w-5 ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
                  />
                  <span className={`font-medium ${textPrimary}`}>Reset Password</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <section
            className={`lg:col-span-3 rounded-2xl ${cardBg} border ${border} shadow-sm overflow-hidden`}
          >
            <div className="p-6">
              {/* COMPANY */}
              {activeTab === "company" && (
                <div className="space-y-6">
                  {serviceProviderError && (
                    <div className="space-y-2">
                      <ElegantAlert
                        message={serviceProviderError}
                        type="error"
                        onClose={clearServiceProviderError}
                      />
                      {refreshProviderData && (
                        <div className="flex justify-end">
                          <button
                            onClick={refreshProviderData}
                            className="text-sm text-slate-600 hover:text-slate-900"
                          >
                            Retry loading profile data
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {serviceProviderLoading && (
                    <div className="text-sm text-slate-500">Loading provider profile details...</div>
                  )}
                  <div
                    className={`rounded-xl border ${border} ${softBg} p-4 flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-600 text-sm font-bold text-white">
                        {username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className={`${textPrimary} font-medium`}>
                          {profileData.company_name || "Company Name"}
                        </div>
                        <div className={`text-xs ${textSecondary}`}>
                          Primary identity used on invoices and listings
                        </div>
                      </div>
                    </div>
                    <div
                      className={`select-none inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs font-semibold tracking-wider ${
                        profileData.verified
                          ? "border-emerald-400 text-emerald-400"
                          : "border-amber-400 text-amber-400"
                      }`}
                      style={{ transform: "rotate(-1.5deg)" }}
                    >
                      {profileData.verified ? (
                        <>
                          <CheckCircle className="h-4 w-4" /> APPROVED
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" /> PENDING REVIEW
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className={`rounded-2xl ${cardBg} border ${border} p-6 space-y-4`}>
                      <div>
                        <h3 className={`text-base font-semibold ${textPrimary}`}>Profile Identity</h3>
                        <p className={`text-sm ${textSecondary}`}>
                          Update your username and primary email used for sign-in.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${textSecondary}`}>
                            Username
                          </label>
                          <input
                            type="text"
                            value={identityForm.username}
                            onChange={(e) =>
                              setIdentityForm((prev) => ({ ...prev, username: e.target.value }))
                            }
                            className={`w-full rounded-lg border ${inputBorder} ${inputBg} px-4 py-2 ${textPrimary} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
                          />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${textSecondary}`}>
                            Contact Email
                          </label>
                          <input
                            type="email"
                            value={identityForm.email}
                            onChange={(e) =>
                              setIdentityForm((prev) => ({ ...prev, email: e.target.value }))
                            }
                            className={`w-full rounded-lg border ${inputBorder} ${inputBg} px-4 py-2 ${textPrimary} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
                          />
                        </div>
                      </div>
                      {identityStatus.message && (
                        <p className={`text-sm ${identityStatus.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {identityStatus.message}
                        </p>
                      )}
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={handleUpdateIdentity}
                          disabled={identityStatus.type === 'loading'}
                          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 shadow ${identityStatus.type === 'loading' ? 'bg-slate-500 text-white' : isDarkMode ? 'bg-slate-200 text-slate-900 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {identityStatus.type === 'loading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {identityStatus.type === 'success' ? 'Updated' : 'Save Identity'}
                        </button>
                      </div>
                    </div>

                    <div className={`rounded-2xl ${cardBg} border ${border} p-6 space-y-4`}>
                      <div>
                        <h3 className={`text-base font-semibold ${textPrimary}`}>Business Profile</h3>
                        <p className={`text-sm ${textSecondary}`}>
                          Keep these accurate to avoid payout or compliance delays.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${textSecondary}`}>
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={profileData.company_name}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                company_name: e.target.value,
                              })
                            }
                            className={`w-full rounded-lg border ${inputBorder} ${inputBg} px-4 py-2 ${textPrimary} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
                          />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-medium ${textSecondary}`}>
                            License Number
                          </label>
                          <input
                            type="text"
                            value={profileData.license_info}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                license_info: e.target.value,
                              })
                            }
                            className={`w-full rounded-lg border ${inputBorder} ${inputBg} px-4 py-2 ${textPrimary} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={`mb-1 block text-xs font-medium ${textSecondary}`}>
                            Contact Number
                          </label>
                          <div className="flex gap-2">
                            <span className={`inline-flex items-center rounded-lg px-3 text-sm font-medium ${softBg} border ${border} ${textPrimary}`}>
                              +91
                            </span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={profileData.contact_number}
                              onChange={(e) => {
                                const onlyDigits = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 10);
                                setProfileData({
                                  ...profileData,
                                  contact_number: onlyDigits,
                                });
                              }}
                              placeholder="10-digit mobile number"
                              className={`w-full rounded-lg border ${inputBorder} ${inputBg} px-4 py-2 ${textPrimary} focus:outline-none focus:ring-2 focus:ring-sky-500/30`}
                            />
                          </div>
                          <p className={`mt-1 text-[11px] ${textSecondary}`}>
                            India numbers only. Enter 10 digits.
                          </p>
                        </div>
                      </div>
                      {businessStatus.message && (
                        <p className={`text-sm ${businessStatus.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {businessStatus.message}
                        </p>
                      )}
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={handleUpdateBusinessProfile}
                          disabled={businessStatus.type === 'loading'}
                          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 shadow ${businessStatus.type === 'loading' ? 'bg-slate-500 text-white' : isDarkMode ? 'bg-slate-200 text-slate-900 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                        >
                          {businessStatus.type === 'loading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {businessStatus.type === 'success' ? 'Updated' : 'Save Business Profile'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className={`text-2xl font-semibold ${textPrimary}`}>
                        Notifications Sent
                      </h2>
                      <p className={`text-sm ${textSecondary}`}>
                        A historical log of every broadcast shared with travellers.
                      </p>
                    </div>
                    <button
                      onClick={fetchSentNotifications}
                      disabled={notificationsLoading}
                      className={`inline-flex items-center justify-center gap-2 rounded-lg border ${border} ${cardBg} px-4 py-2 text-sm font-medium ${textPrimary} transition ${
                        notificationsLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                      }`}
                    >
                      {notificationsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Refresh
                    </button>
                  </div>

                  <div className={`rounded-2xl ${softBg} border ${border} p-6`}>
                    {notificationsError ? (
                      <div
                        className={`space-y-3 rounded-xl border ${
                          isDarkMode
                            ? "border-rose-500/60 bg-rose-500/10"
                            : "border-rose-200 bg-rose-50"
                        } p-5`}
                      >
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-semibold">
                            Unable to load notifications
                          </span>
                        </div>
                        <p className={`text-sm ${textSecondary}`}>
                          {notificationsError}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={fetchSentNotifications}
                            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                              isDarkMode
                                ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                                : "bg-rose-600 text-white hover:bg-rose-500"
                            }`}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                          </button>
                        </div>
                      </div>
                    ) : notificationsLoading && sentNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                        <p className={`text-sm ${textSecondary}`}>
                          Fetching sent notifications...
                        </p>
                      </div>
                    ) : sentNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <Send className={`h-10 w-10 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`} />
                        <p className={`text-base font-medium ${textPrimary}`}>
                          No notifications sent yet
                        </p>
                        <p className={`text-sm ${textSecondary}`}>
                          Broadcast updates from the bookings page and they will show up here.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-2">
                        {sentNotifications.map((notification) => (
                          <div
                            key={notification.notification_id}
                            className={`rounded-xl border ${border} ${cardBg} p-4 shadow-sm`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className={`text-lg font-semibold ${textPrimary}`}>
                                  {notification.subject || "Untitled notification"}
                                </p>
                                <p className={`text-sm ${textSecondary}`}>
                                  Broadcasted {formatNotificationTimestamp(notification.created_at)}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                                  isDarkMode
                                    ? "bg-sky-500/10 text-sky-200 border border-sky-500/40"
                                    : "bg-sky-100 text-sky-700 border border-sky-200"
                                }`}
                              >
                                {notification.target_audience_type || "Audience"}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                              <div className={`inline-flex items-center gap-2 ${textSecondary}`}>
                                <Users className="h-4 w-4" />
                                <span>
                                  {notification.receipt_count ?? 0} recipient
                                  {notification.receipt_count === 1 ? "" : "s"}
                                </span>
                              </div>
                              <div className={`inline-flex items-center gap-2 ${textSecondary}`}>
                                <CalendarClock className="h-4 w-4" />
                                <span>{formatNotificationTimestamp(notification.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DEVICES */}
              {activeTab === "devices" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className={`text-2xl font-semibold ${textPrimary}`}>Logged-in Devices</h2>
                      <p className={`text-sm ${textSecondary}`}>
                        Active sessions associated with your provider account
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={fetchActiveSessions}
                        disabled={sessionsLoading}
                        className={`inline-flex items-center gap-2 rounded-lg border ${border} ${cardBg} px-4 py-2 text-sm font-medium ${textPrimary} transition ${
                          sessionsLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90"
                        }`}
                      >
                        {sessionsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Refresh
                      </button>
                      {sessions.length > 0 && (
                        <button
                          onClick={handleLogoutAllDevices}
                          disabled={deviceActionLoading}
                          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow ${
                            deviceActionLoading ? "bg-red-400/80" : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {deviceActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                          Logout all devices
                        </button>
                      )}
                    </div>
                  </div>

                  {sessionsAlert && (
                    <ElegantAlert
                      message={sessionsAlert.message}
                      type={sessionsAlert.type}
                      onClose={() => setSessionsAlert(null)}
                    />
                  )}

                  <div className={`rounded-2xl ${cardBg} border ${border} p-6`}>
                    {sessionsLoading ? (
                      <div className="text-center py-16">
                        <Loader2 className="h-10 w-10 mx-auto animate-spin text-slate-500" />
                        <p className={`mt-4 text-sm ${textSecondary}`}>Loading active sessions...</p>
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                        <Monitor className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className={`text-base font-medium ${textPrimary}`}>No active devices</p>
                        <p className={`text-sm ${textSecondary} mt-1`}>You have been logged out from every device</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        {sessions.map((session) => {
                          const { deviceName, browser, os } = parseDeviceString(session.device);
                          return (
                            <div
                              key={session.session_token}
                              className={`border rounded-xl p-5 transition ${
                                session.is_current
                                  ? isDarkMode
                                    ? 'border-slate-500 bg-gray-900/40'
                                    : 'border-slate-400 bg-slate-50'
                                  : isDarkMode
                                    ? 'border-slate-700 bg-gray-900/20'
                                    : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl border ${
                                  session.is_current
                                    ? 'bg-gradient-to-br from-slate-500 to-gray-600 border-slate-500'
                                    : 'bg-slate-100 border-slate-200'
                                }`}>
                                  <Monitor className={`h-5 w-5 ${session.is_current ? 'text-white' : 'text-slate-600'}`} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className={`text-lg font-semibold ${textPrimary}`}>{deviceName}</h4>
                                    {session.is_current && (
                                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-600 text-white">
                                        Current device
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm ${textSecondary} mt-1`}>
                                    Browser: {browser} • OS: {os}
                                  </p>
                                  <p className={`text-sm ${textSecondary} flex items-center gap-2 mt-3`}>
                                    <Clock className="h-4 w-4" />
                                    Last active: {formatRelativeTime(session.created_at)}
                                  </p>
                                  <p className={`text-xs ${textSecondary} mt-1`}>
                                    Session expires:
                                    {" "}
                                    {new Date(session.expires_at).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      onClick={() => handleLogoutSession(session.session_token, session.is_current)}
                                      disabled={loggingOutSessionToken === session.session_token}
                                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow ${loggingOutSessionToken === session.session_token ? 'bg-slate-500' : 'bg-rose-500 hover:bg-rose-600'}`}
                                    >
                                      {loggingOutSessionToken === session.session_token ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <LogOut className="h-3.5 w-3.5" />
                                      )}
                                      {loggingOutSessionToken === session.session_token ? 'Ending session' : 'Logout this device'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={handleLogoutAllDevices}
                      disabled={deviceActionLoading}
                      className={`rounded-lg px-4 py-2 shadow inline-flex items-center gap-2 ${
                        isDarkMode ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-amber-600 text-white hover:bg-amber-700'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {deviceActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Log out of all devices
                    </button>
                    <button
                      onClick={() => setShowDeactivateModal(true)}
                      className={`rounded-lg px-4 py-2 shadow inline-flex items-center gap-2 ${
                        isDarkMode ? 'bg-rose-500 text-slate-900 hover:bg-rose-400' : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      <MinusCircle className="h-4 w-4" />
                      Deactivate Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl ${isDarkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'} shadow-2xl p-8 relative`}>
            <button
              onClick={() => {
                setShowDeactivateModal(false);
                setDeactivateError(null);
              }}
              className={`absolute top-4 right-4 ${isDarkMode ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-rose-100">
                <XCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className={`text-2xl font-semibold ${textPrimary}`}>Deactivate account</h3>
                <p className={`text-sm ${textSecondary}`}>This action cannot be undone.</p>
              </div>
            </div>
            {deactivateError && (
              <div className="mb-4">
                <ElegantAlert message={deactivateError} type="error" onClose={() => setDeactivateError(null)} />
              </div>
            )}
            <p className={`text-sm ${textSecondary} mb-6`}>
              Your provider profile along with all associated data will be permanently removed. Please make sure any ongoing bookings or payouts are settled before continuing.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setDeactivateError(null);
                }}
                className={`flex-1 px-5 py-3 rounded-xl border ${border} ${textPrimary} ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'} transition`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateAccount}
                disabled={deactivateLoading}
                className={`flex-1 px-5 py-3 rounded-xl text-white font-semibold shadow ${
                  deactivateLoading ? 'bg-rose-400/70 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'
                } flex items-center justify-center gap-2`}
              >
                {deactivateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Popup — exact flow from Customer UI, with dark mode */}
      {showResetModal && (
        <PasswordResetModal
          onClose={() => setShowResetModal(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

/* ---------------- RESET PASSWORD MODAL (copied flow + dark mode) ---------------- */
function PasswordResetModal({
  onClose,
  isDarkMode,
}: {
  onClose: () => void;
  isDarkMode: boolean;
}) {
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

  // Countdown
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
        body: JSON.stringify({ email: auth.email }),
      });

      if (!response.ok) throw new Error("Failed to send OTP");

      setForgotPasswordMode(true);
      setResendCountdown(60);
      setAlertType("success");
      setAlertMessage("OTP sent to your email successfully!");
    } catch (_) {
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
        body: JSON.stringify({ email: auth.email, otp_type: auth.user_type || "provider" }),
      });
      setResendCountdown(60);
      setAlertType("success");
      setAlertMessage("OTP resent successfully!");
    } catch {
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
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage(
        error.message || "Failed to change password. Please check your old password."
      );
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
        body: JSON.stringify({ email: auth.email, otp, new_password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to reset password");
      }

      setAlertType("success");
      setAlertMessage("Password reset successfully!");
      setTimeout(() => onClose(), 1500);
    } catch (error: any) {
      setAlertType("error");
      setAlertMessage(
        error.message || "Failed to reset password. Please check your OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (forgotPasswordMode) handleResetPassword();
    else handleChangePassword();
  };

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md rounded-2xl ${
            isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          } border shadow-2xl relative`}
        >
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 ${
              isDarkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-gray-400 hover:text-gray-600"
            } transition-colors`}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3 mb-2 px-6 pt-6">
            <div
              className={`${isDarkMode ? "bg-slate-800" : "bg-slate-100"} p-3 rounded-full`}
            >
              <KeyRound
                className={`${isDarkMode ? "text-slate-200" : "text-slate-600"} h-6 w-6`}
              />
            </div>
            <h3
              className={`text-2xl font-bold ${
                isDarkMode ? "text-slate-100" : "text-gray-900"
              }`}
            >
              {forgotPasswordMode ? "Reset Password" : "Change Password"}
            </h3>
          </div>

          {/* Alerts */}
          {alertMessage && (
            <div className="px-6 mb-2">
              <ElegantAlert
                message={alertMessage}
                type={alertType}
                onClose={() => setAlertMessage("")}
              />
            </div>
          )}

          <p className={`px-6 mb-4 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
            Your password must be at least 8 characters long and include upper &
            lower case letters, a number and a special character.
          </p>

          <div className="px-6 pb-6 space-y-4">
            {!forgotPasswordMode ? (
              <div className="relative">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  Old Password
                </label>
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl outline-none transition-all border ${
                    isDarkMode
                      ? "bg-slate-800 border-slate-700 text-slate-100"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:ring-2 focus:ring-slate-500 focus:border-transparent`}
                  placeholder="Enter old password"
                />
                <button
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className={`absolute right-3 top-11 ${
                    isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            ) : (
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  Enter OTP
                </label>
                <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v)}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className={`text-xs mt-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                  Enter the 6-digit OTP sent to your email
                </p>
              </div>
            )}

            <div className="relative">
              <label
                className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                New Password
              </label>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all border ${
                  isDarkMode
                    ? "bg-slate-800 border-slate-700 text-slate-100"
                    : "bg-white border-gray-300 text-gray-900"
                } focus:ring-2 focus:ring-slate-500 focus:border-transparent`}
                placeholder="Enter new password"
              />
              <button
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-11 ${
                  isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {forgotPasswordMode ? (
              <button
                onClick={handleResendOTP}
                disabled={resendCountdown > 0}
                className={`text-sm font-medium ${
                  isDarkMode
                    ? "text-slate-300 hover:text-slate-200 disabled:text-slate-600"
                    : "text-slate-600 hover:text-slate-700 disabled:text-gray-400"
                } disabled:cursor-not-allowed`}
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP"}
              </button>
            ) : (
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className={`text-sm font-medium ${
                  isDarkMode ? "text-slate-300 hover:text-slate-200" : "text-slate-600 hover:text-slate-700"
                }`}
              >
                Forgot your password?
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className={`flex-1 px-6 py-3 rounded-xl border ${
                  isDarkMode
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                } transition-all duration-200 font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-xl shadow-lg transition-all duration-200 font-medium hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode
                    ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                    : "bg-gradient-to-r from-slate-500 to-gray-600 text-white hover:shadow-xl"
                }`}
              >
                {loading
                  ? "Processing..."
                  : forgotPasswordMode
                  ? "Reset Password"
                  : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
