"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ServiceFormModal from '@/components/provider/add-service-form';
import { getAuthFromStorage, clearAuthStorage, StoredAuth } from '@/utils/authStorage';
import { useRouter } from 'next/navigation';
import API, { getProviderBookingsList, getServiceProvidersList, createProviderNotification, type ProviderBookingListItem, type ServiceProviderDetail, type ProviderNotificationCreatePayload } from '@/app/api';
import BookingsPage, { type BookingActionState } from '@/components/provider/BookingsPage';
import NotificationModal, { type NotificationModalConfig, type NotificationPayload, type NotificationAudienceType } from '@/components/shared/notification-modal';

// Import modular components
import DashboardPage, { type ProviderDashboardAnalytics } from '@/components/provider/DashboardPage';
import ServicesPage from '@/components/provider/ServicesPage';
import FinancesPage from '@/components/provider/FinancesPage';
import AnalyticsPage from '@/components/provider/AnalyticsPage';
import ReviewsPage from '@/components/provider/ReviewsPage';
import ProfilePage from '@/components/provider/ProfilePage';
import Sidebar from '@/components/provider/Sidebar';
import Header from '@/components/provider/Header';

// Types
interface Booking {
  id: string;
  passengerName: string;
  route: string;
  date: string;
  seats: string;
  status: string;
  amount: number;
  serviceType: string;
  raw?: ProviderBookingListItem;
}

interface Service {
  id: string;
  route: string;
  type: 'bus' | 'train' | 'flight';
  timing: string;
  vehicle: string;
  capacity: number;
  occupancy: number;
  status: 'active' | 'suspended';
  price: number;
}

interface ProviderFinanceSummary {
  total_earnings: number;
  pending_settlement: number;
  refunds_issued: number;
  platform_fees: number;
}

interface ProviderRevenueBreakdownEntry {
  label: string;
  value: number;
  percentage: number;
}

interface ProviderTransactionRecord {
  txn_id: string;
  type: string;
  booking_id: string;
  formatted_amount: string;
  date: string;
}

// Mock Data (used by DashboardPage only - BookingsPage uses real data)
const mockBookings: Booking[] = [
  { id: 'BK001', passengerName: 'John Doe', route: 'Mumbai → Delhi', date: '2025-10-15', seats: 'A1, A2', status: 'Confirmed', amount: 2500, serviceType: 'Bus' },
  { id: 'BK002', passengerName: 'Jane Smith', route: 'Delhi → Bangalore', date: '2025-10-16', seats: 'B3', status: 'Confirmed', amount: 3200, serviceType: 'Flight' },
  { id: 'BK003', passengerName: 'Mike Johnson', route: 'Mumbai → Goa', date: '2025-10-14', seats: 'C5, C6', status: 'Completed', amount: 1800, serviceType: 'Bus' },
  { id: 'BK004', passengerName: 'Sarah Williams', route: 'Bangalore → Chennai', date: '2025-10-13', seats: 'D1', status: 'Cancelled', amount: 1500, serviceType: 'Train' },
  { id: 'BK005', passengerName: 'Robert Brown', route: 'Delhi → Jaipur', date: '2025-10-17', seats: 'E2, E3, E4', status: 'Confirmed', amount: 4200, serviceType: 'Bus' },
];

const mockServices: Service[] = [
  { id: 'SRV001', route: 'Mumbai → Delhi', type: 'bus', timing: '08:00 AM', vehicle: 'Volvo AC', capacity: 40, occupancy: 32, status: 'active', price: 1250 },
  { id: 'SRV002', route: 'Delhi → Bangalore', type: 'flight', timing: '10:30 AM', vehicle: 'Boeing 737', capacity: 180, occupancy: 165, status: 'active', price: 3200 },
  { id: 'SRV003', route: 'Mumbai → Goa', type: 'bus', timing: '09:00 PM', vehicle: 'Sleeper AC', capacity: 32, occupancy: 28, status: 'active', price: 900 },
  { id: 'SRV004', route: 'Bangalore → Chennai', type: 'train', timing: '06:00 AM', vehicle: 'Express AC', capacity: 72, occupancy: 45, status: 'suspended', price: 750 },
];

const COLORS = ['#8B5CF6', '#EC4899', '#F59E0B'];

// Mock revenue data for analytics (TODO: implement real API)
const revenueData = [
  { name: 'Jan', revenue: 45000 },
  { name: 'Feb', revenue: 52000 },
  { name: 'Mar', revenue: 48000 },
  { name: 'Apr', revenue: 61000 },
  { name: 'May', revenue: 55000 },
  { name: 'Jun', revenue: 67000 },
];

// Main App Component
export default function ProviderPortal() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [services, setServices] = useState(mockServices);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [notificationModalConfig, setNotificationModalConfig] = useState<NotificationModalConfig | null>(null);
  const [notificationSendStatus, setNotificationSendStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [bookingActionState, setBookingActionState] = useState<BookingActionState>({ type: null, ids: [] });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dashboardData, setDashboardData] = useState<ProviderDashboardAnalytics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [financeSummary, setFinanceSummary] = useState<ProviderFinanceSummary | null>(null);
  const [financeBreakdown, setFinanceBreakdown] = useState<ProviderRevenueBreakdownEntry[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<ProviderTransactionRecord[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState<string | null>(null);
  
  // Auth state
  const [authData, setAuthData] = useState<StoredAuth | null>(null);
  const [username, setUsername] = useState('TransportCo');
  
  // Bookings state
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [bookingsLoaded, setBookingsLoaded] = useState(false);
  
  // Recent bookings for dashboard (top 5)
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  
  // Profile data state
  const [profileData, setProfileData] = useState({
    company_name: '',
    license_info: '',
    email: '',
    contact_number: '',
    status: '',
    verified: false
  });
  const [serviceProviderUserId, setServiceProviderUserId] = useState<string | null>(null);

  const [serviceProviderData, setServiceProviderData] = useState<ServiceProviderDetail | null>(null);
  const [serviceProviderLoading, setServiceProviderLoading] = useState(false);
  const [serviceProviderError, setServiceProviderError] = useState<string | null>(null);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordAlert, setPasswordAlert] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const handleServiceSubmit = () => {
    // TODO: Implement API call to save service
    console.log('Service submitted');
    setShowServiceModal(false);
  };

  const openNotificationModal = (config: NotificationModalConfig) => {
    setNotificationModalConfig(config);
    setNotificationSendStatus('idle');
  };

  const closeNotificationModal = () => {
    setNotificationModalConfig(null);
    setNotificationSendStatus('idle');
  };

  const handleSendNotification = async (payload: NotificationPayload) => {
    if (notificationSendStatus === 'loading') return;

    const token = authData?.token || getAuthFromStorage()?.token;
    if (!token) {
      alert('Please sign in to send notifications.');
      return;
    }

    const targetAudienceMap: Record<NotificationAudienceType, ProviderNotificationCreatePayload['target_audience_type']> = {
      service: 'Service',
      provider: 'Provider',
      booking: 'Booking'
    };

    const apiPayload: ProviderNotificationCreatePayload = {
      subject: payload.subject,
      message_body: payload.messageBody,
      target_audience_type: targetAudienceMap[payload.targetAudienceType]
    };

    if (payload.serviceModel) {
      apiPayload.service_model = payload.serviceModel;
    }

    if (payload.serviceId) {
      apiPayload.service_object_id = payload.serviceId;
    }

    const bookingId = payload.bookingId ?? payload.bookingIds?.[0];
    if (bookingId) {
      apiPayload.booking_id = bookingId;
    }

    try {
      setNotificationSendStatus('loading');
      await createProviderNotification(apiPayload, token);
      setNotificationSendStatus('success');
    } catch (error) {
      console.error('Failed to send notification:', error);
      alert(`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setNotificationSendStatus('idle');
    }
  };

  // Load auth data on mount
  useEffect(() => {
    const auth = getAuthFromStorage();
    if (auth) {
      setAuthData(auth);
      setUsername(auth.username || 'TransportCo');
    }
  }, []);

  // Read CSRF token from cookies (Django default name: csrftoken)
  const getCsrfTokenFromCookies = (): string | null => {
    if (typeof document === "undefined") return null;
    const name = "csrftoken=";
    const raw = document.cookie.split(";").map((c) => c.trim());
    for (const part of raw) {
      if (part.startsWith(name)) {
        return decodeURIComponent(part.slice(name.length));
      }
    }
    return null;
  };

  const handlePasswordChange = async () => {
    const auth = getAuthFromStorage();
    if (!auth) {
      setPasswordAlert({ type: 'error', message: 'Authentication required' });
      return;
    }

    // Validation 1: All fields must be at least 8 characters
    if (passwordData.currentPassword.length < 8 || 
        passwordData.newPassword.length < 8 || 
        passwordData.confirmPassword.length < 8) {
      setPasswordAlert({ type: 'error', message: 'All password fields must be at least 8 characters long' });
      return;
    }

    // Validation 2: New password and confirm password must match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'New password and confirm password do not match' });
      return;
    }

    // Validation 3: Old password shouldn't be same as new password
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordAlert({ type: 'error', message: 'New password must be different from current password' });
      return;
    }

    const csrf = getCsrfTokenFromCookies();

    try {
      const response = await fetch(API.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Token ${auth.token}`,
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRFTOKEN': csrf } : {})
        },
        body: JSON.stringify({
          token: auth.token,
          old_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordAlert({ type: 'success', message: data.message || 'Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setPasswordAlert({ type: 'error', message: errorData.message || 'Failed to change password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordAlert({ type: 'error', message: 'Network error occurred' });
    }
  };

  const handleLogout = () => {
    clearAuthStorage();
    router.push('/');
  };

  const fetchDashboardAnalytics = useCallback(async () => {
    if (!authData?.token) {
      setDashboardError('Authentication required');
      return;
    }

    const csrf = getCsrfTokenFromCookies();
    setDashboardLoading(true);
    setDashboardError(null);

    try {
      // Fetch both dashboard analytics and recent bookings
      const [analyticsResponse, bookingsData] = await Promise.all([
        fetch(API.PROVIDER_DASHBOARD_ANALYTICS, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Token ${authData.token}`,
            ...(csrf ? { 'X-CSRFTOKEN': csrf } : {})
          }
        }),
        getProviderBookingsList(authData.token)
      ]);

      if (!analyticsResponse.ok) {
        const errorText = await analyticsResponse.text().catch(() => '');
        throw new Error(errorText || `Failed to load dashboard data (${analyticsResponse.status})`);
      }

      const analyticsData: ProviderDashboardAnalytics = await analyticsResponse.json();
      setDashboardData(analyticsData);

      // Transform and set recent bookings (top 5)
      const transformedBookings: Booking[] = bookingsData.slice(0, 5).map((item: ProviderBookingListItem) => ({
        id: item.booking_id,
        passengerName: item.passenger_name,
        route: item.route,
        date: item.date,
        seats: item.seats,
        status: item.status,
        amount: parseFloat(item.amount),
        serviceType: item.service_type,
        raw: item,
      }));
      setRecentBookings(transformedBookings);
    } catch (error) {
      console.error('Error fetching provider dashboard analytics:', error);
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      setDashboardError(message);
    } finally {
      setDashboardLoading(false);
    }
  }, [authData]);

  const fetchServiceProviderData = useCallback(async () => {
    if (!authData?.token) {
      setServiceProviderError('Authentication required to load your profile.');
      return;
    }

    setServiceProviderError(null);
    setServiceProviderLoading(true);

    try {
      const data = await getServiceProvidersList(authData.token);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No provider data was returned.');
      }

      const match = data.find(item => item.user === authData.user_id || item.username === authData.username) ?? data[0];
      setServiceProviderData(match);
      setServiceProviderUserId(match.user);
      setProfileData({
        company_name: match.company_name ?? '',
        license_info: match.license_info ?? '',
        email: match.email ?? '',
        contact_number: match.contact_number ?? '',
        status: match.status ?? '',
        verified: !!match.verified
      });
      if (match.username) {
        setUsername(match.username);
      }
    } catch (error) {
      console.error('Error fetching service provider data:', error);
      setServiceProviderError(error instanceof Error ? error.message : 'Failed to load provider data.');
    } finally {
      setServiceProviderLoading(false);
    }
  }, [authData]);

  const fetchProviderFinances = useCallback(async () => {
    if (!authData?.token) {
      setFinanceError('Authentication required');
      return;
    }

    const csrf = getCsrfTokenFromCookies();
    setFinanceLoading(true);
    setFinanceError(null);

    const headers: Record<string, string> = {
      accept: 'application/json',
      Authorization: `Token ${authData.token}`,
      ...(csrf ? { 'X-CSRFTOKEN': csrf } : {}),
    };

    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        fetch(API.PROVIDER_FINANCES_OVERVIEW, { headers }),
        fetch(API.PROVIDER_FINANCE_TRANSACTIONS, { headers }),
      ]);

      if (!summaryRes.ok) {
        const text = await summaryRes.text().catch(() => '');
        throw new Error(text || `Failed to load finances summary (${summaryRes.status})`);
      }

      if (!transactionsRes.ok) {
        const text = await transactionsRes.text().catch(() => '');
        throw new Error(text || `Failed to load transaction history (${transactionsRes.status})`);
      }

      const summaryJson = await summaryRes.json();
      const transactionsJson: ProviderTransactionRecord[] = await transactionsRes.json();

      setFinanceSummary(summaryJson?.summary ?? null);
      setFinanceBreakdown(Array.isArray(summaryJson?.revenue_breakdown) ? summaryJson.revenue_breakdown : []);
      setFinanceTransactions(Array.isArray(transactionsJson) ? transactionsJson : []);
    } catch (error) {
      console.error('Error fetching provider finances:', error);
      const message = error instanceof Error ? error.message : 'Failed to load finances data';
      setFinanceError(message);
    } finally {
      setFinanceLoading(false);
    }
  }, [authData]);

  const fetchBookings = useCallback(async () => {
    if (!authData?.token) {
      setBookingsError('Authentication required');
      return;
    }

    setBookingsLoading(true);
    setBookingsError(null);

    try {
      const data = await getProviderBookingsList(authData.token);
      // Transform API response to match our Booking interface
      const transformedBookings: Booking[] = data.map((item: ProviderBookingListItem) => ({
        id: item.booking_id,
        passengerName: item.passenger_name,
        route: item.route,
        date: item.date,
        seats: item.seats,
        status: item.status,
        amount: parseFloat(item.amount),
        serviceType: item.service_type,
        raw: item,
      }));
      setBookings(transformedBookings);
      setSelectedBookings(prev => prev.filter(id => transformedBookings.some(booking => booking.id === id)));
      setBookingsLoaded(true);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      const message = error instanceof Error ? error.message : 'Failed to load bookings';
      setBookingsError(message);
    } finally {
      setBookingsLoading(false);
    }
  }, [authData]);

  const handleBookingAction = useCallback(async (bookingIds: string[], action: 'cancel' | 'delete') => {
    if (!authData?.token || bookingIds.length === 0) {
      return;
    }

    const uniqueIds = Array.from(new Set(bookingIds));
    setBookingActionState({ type: action, ids: uniqueIds });

    const headers: HeadersInit = {
      accept: 'application/json',
      Authorization: `Token ${authData.token}`,
    };

    try {
      for (const bookingId of uniqueIds) {
        if (action === 'delete') {
          const response = await fetch(API.BOOKING_DETAILS(bookingId), {
            method: 'DELETE',
            headers,
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(errorText || `Failed to delete booking ${bookingId}`);
          }
        } else {
          const response = await fetch(API.BOOKING_CANCEL(bookingId), {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'Cancelled by provider dashboard' }),
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(errorText || `Failed to cancel booking ${bookingId}`);
          }
        }
      }

      await fetchBookings();
      setSelectedBookings(prev => prev.filter(id => !uniqueIds.includes(id)));
    } catch (error) {
      console.error('Error performing booking action:', error);
      if (typeof window !== 'undefined') {
        alert(error instanceof Error ? error.message : 'Unable to process booking action.');
      }
    } finally {
      setBookingActionState({ type: null, ids: [] });
    }
  }, [authData, fetchBookings]);

  // Fetch profile data when profile page is opened
  useEffect(() => {
    if (currentPage !== 'dashboard') return;
    if (!authData?.token) return;

    fetchDashboardAnalytics();
  }, [currentPage, authData, fetchDashboardAnalytics]);

  useEffect(() => {
    if (currentPage !== 'finances') return;
    if (!authData?.token) return;

    fetchProviderFinances();
  }, [currentPage, authData, fetchProviderFinances]);

  useEffect(() => {
    if (!['profile', 'reviews'].includes(currentPage)) return;
    if (serviceProviderData) return;
    if (serviceProviderLoading) return;
    if (serviceProviderError) return;

    fetchServiceProviderData();
  }, [currentPage, serviceProviderData, serviceProviderLoading, serviceProviderError, fetchServiceProviderData]);

  // Remove auto-fetch for bookings - only fetch on button click
  // useEffect(() => {
  //   if (currentPage !== 'bookings') return;
  //   if (!authData?.token) return;
  //   fetchBookings();
  // }, [currentPage, authData, fetchBookings]);

  // Theme colors
  const theme = {
    dark: {
      bg: 'bg-gray-950',
      card: 'bg-gradient-to-br from-gray-800 to-gray-900',
      cardBorder: 'border-gray-700',
      text: 'text-white',
      textSecondary: 'text-gray-400',
      input: 'bg-gray-700 border-gray-600 text-white',
      hover: 'hover:bg-gray-700',
      sidebar: 'bg-gradient-to-b from-gray-900 to-gray-800',
    },
    light: {
      bg: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50',
      card: 'bg-white',
      cardBorder: 'border-gray-200',
      text: 'text-gray-900',
      textSecondary: 'text-gray-600',
      input: 'bg-white border-gray-300 text-gray-900',
      hover: 'hover:bg-gray-100',
      sidebar: 'bg-white',
    }
  };

  const t = isDarkMode ? theme.dark : theme.light;

  const toggleBookingSelection = (id: string) => {
    setSelectedBookings(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddServiceClick = () => {
    setSelectedService(null);
    setShowServiceModal(true);
  };

  const handleEditServiceClick = (service: Service) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleViewMoreBookings = () => {
    setCurrentPage('bookings');
    // Trigger bookings fetch when navigating
    if (!bookingsLoaded && authData?.token) {
      fetchBookings();
    }
  };

  const providerReviewsData = serviceProviderData ? {
    average_rating: Number(serviceProviderData.rating ?? 0),
    total_reviews: Number(serviceProviderData.total_reviews ?? 0),
    ratings_dict: serviceProviderData.ratings_dict ?? {},
    comments: Array.isArray(serviceProviderData.comments) ? serviceProviderData.comments : [],
  } : null;

  return (
    <div className={`flex h-screen ${t.bg} overflow-hidden`}>
      <Sidebar 
        theme={t}
        isDarkMode={isDarkMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        handleLogout={handleLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          theme={t}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          username={username}
        />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {currentPage === 'dashboard' && (
              <DashboardPage 
                theme={t}
                isDarkMode={isDarkMode}
                username={username}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockBookings={mockBookings as any}
                dashboardData={dashboardData}
                isLoading={dashboardLoading}
                error={dashboardError}
                COLORS={COLORS}
                onAddService={handleAddServiceClick}
                onRetry={fetchDashboardAnalytics}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recentBookings={recentBookings as any}
                onViewMoreBookings={handleViewMoreBookings}
              />
            )}
            {currentPage === 'services' && (
              <ServicesPage 
                theme={t}
                isDarkMode={isDarkMode}
                services={services}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onAddService={handleAddServiceClick}
                onEditService={handleEditServiceClick}
                showServiceModal={showServiceModal}
                ServiceFormModal={ServiceFormModal}
                selectedService={selectedService}
                setShowServiceModal={setShowServiceModal}
                handleServiceSubmit={handleServiceSubmit}
                onRequestNotification={openNotificationModal}
              />
            )}
            {currentPage === 'bookings' && (
              <BookingsPage 
                theme={t}
                isDarkMode={isDarkMode}
                bookings={bookings}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedBookings={selectedBookings}
                toggleBookingSelection={toggleBookingSelection}
                onRequestNotification={openNotificationModal}
                isLoading={bookingsLoading}
                error={bookingsError}
                bookingsLoaded={bookingsLoaded}
                onLoadBookings={fetchBookings}
                onCancelBookings={(ids) => handleBookingAction(ids, 'cancel')}
                onDeleteBookings={(ids) => handleBookingAction(ids, 'delete')}
                bookingActionState={bookingActionState}
              />
            )}
            {currentPage === 'finances' && (
              <FinancesPage 
                theme={t}
                isDarkMode={isDarkMode}
                COLORS={COLORS}
                summary={financeSummary}
                revenueBreakdown={financeBreakdown}
                transactions={financeTransactions}
                loading={financeLoading}
                error={financeError}
                onRetry={fetchProviderFinances}
              />
            )}
            {currentPage === 'analytics' && (
              <AnalyticsPage 
                theme={t}
                isDarkMode={isDarkMode}
                revenueData={revenueData}
              />
            )}
            {currentPage === 'reviews' && (
              <ReviewsPage 
                theme={t}
                isDarkMode={isDarkMode}
                reviewsData={providerReviewsData}
                serviceProviderLoading={serviceProviderLoading}
                serviceProviderError={serviceProviderError}
                refreshProviderData={fetchServiceProviderData}
              />
            )}
            {currentPage === 'profile' && (
              <ProfilePage 
                theme={t}
                isDarkMode={isDarkMode}
                username={username}
                profileData={profileData}
                setProfileData={setProfileData}
                providerUserId={serviceProviderUserId}
                passwordData={passwordData}
                setPasswordData={setPasswordData}
                passwordAlert={passwordAlert}
                setPasswordAlert={setPasswordAlert}
                handlePasswordChange={handlePasswordChange}
                serviceProviderLoading={serviceProviderLoading}
                serviceProviderError={serviceProviderError}
                refreshProviderData={fetchServiceProviderData}
                clearServiceProviderError={() => setServiceProviderError(null)}
              />
            )}
          </div>
        </div>
      </div>
      <NotificationModal
        isOpen={Boolean(notificationModalConfig)}
        config={notificationModalConfig}
        theme={t}
        isDarkMode={isDarkMode}
        onClose={closeNotificationModal}
        onSend={handleSendNotification}
        sendStatus={notificationSendStatus}
      />

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1F2937' : '#E5E7EB'};
        }
        ::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4B5563' : '#9CA3AF'};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6B7280' : '#6B7280'};
        }
      `}</style>
    </div>
  );
}
