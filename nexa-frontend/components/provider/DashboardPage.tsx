"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Users, MapPin, Package, Layers, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const RupeeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = "" }) => (
  <span className={`font-bold ${className}`} style={{ fontSize: size }}>₹</span>
);

interface RoutePerformanceEntry {
  source_name: string;
  destination_name: string;
  total_bookings: number;
  total_revenue: string;
  avg_occupancy: number;
  bus_revenue: string;
  train_revenue: string;
  flight_revenue: string;
}

interface RevenueTrendEntry {
  month: string;
  total_revenue: number;
  total_bookings: number;
  bus_revenue: number;
  train_revenue: number;
  flight_revenue: number;
}

interface BookingDistributionBreakdown {
  bus: number;
  train: number;
  flight: number;
}

interface GrowthRates {
  bookings_growth: number;
  total_revenue_growth: number;
  bus_revenue_growth: number;
  train_revenue_growth: number;
  flight_revenue_growth: number;
  avg_occupancy_growth: number;
}

export interface ProviderDashboardAnalytics {
  total_bookings: number;
  total_revenue: number | string;
  avg_occupancy: number;
  active_routes: number;
  active_services: {
    bus_services: number;
    train_services: number;
    flight_services: number;
    total: number;
  };
  booking_distribution: BookingDistributionBreakdown;
  growth_rates: GrowthRates;
  route_performance: RoutePerformanceEntry[];
  revenue_trends: RevenueTrendEntry[];
}

type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show';

interface Booking {
  id: string;
  passengerName: string;
  route: string;
  status: BookingStatus;
  amount: number;
  date?: string;
  seats?: string;
  serviceType?: string;
}

interface ProviderTheme {
  bg: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  [key: string]: string;
}

interface DashboardPageProps {
  theme: ProviderTheme;
  isDarkMode: boolean;
  username: string;
  mockBookings: Booking[];
  dashboardData: ProviderDashboardAnalytics | null;
  isLoading: boolean;
  error: string | null;
  COLORS: string[];
  onAddService: () => void;
  onRetry?: () => void;
  recentBookings?: Booking[];
  onViewMoreBookings?: () => void;
}

interface StatCardProps {
  // allow either lucide icons (which are forwardRef exotic components) or simple functional/icon components
  icon: React.ComponentType<{ size?: number; className?: string }> | React.ElementType;
  title: string;
  value: string;
  description?: string;
  gradient: {
    light: string;
    dark: string;
  };
  theme: ProviderTheme;
  isDarkMode: boolean;
  iconColorClass?: string;
}

const StatCard = ({ icon: Icon, title, value, description, gradient, theme, isDarkMode, iconColorClass }: StatCardProps) => {
  const t = theme;
  const bgGradient = isDarkMode ? gradient.dark : gradient.light;

  return (
    <div className={`${t.card} rounded-xl p-5 border ${t.cardBorder} hover:border-sky-500 transition-all duration-300 hover:shadow-lg ${isDarkMode ? 'hover:shadow-sky-500/20' : 'hover:shadow-sky-300/40'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${bgGradient}`}>
          <Icon className={`w-6 h-6 ${iconColorClass ?? 'text-white'}`} />
        </div>
      </div>
      <div className={`${t.textSecondary} text-sm mb-1`}>{title}</div>
      <div className={`text-3xl font-bold ${t.text}`}>{value}</div>
      {description && <div className={`text-xs mt-3 leading-relaxed ${t.textSecondary}`}>{description}</div>}
    </div>
  );
};

const PageLoader = ({
  theme,
  isDarkMode,
  message,
}: {
  theme: ProviderTheme;
  isDarkMode: boolean;
  message: string;
}) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className={`${theme.card} rounded-2xl border ${theme.cardBorder} p-12 flex flex-col items-center gap-4 shadow-lg`}>
      <div className="relative">
        <div className={`w-24 h-24 rounded-full border-4 ${isDarkMode ? 'border-white/10' : 'border-sky-100'} animate-pulse`} />
        <Loader2 className="w-10 h-10 absolute inset-0 m-auto text-sky-500 animate-spin" />
      </div>
      <div className="text-center space-y-2">
        <p className={`${theme.text} text-lg font-semibold`}>Fetching live insights…</p>
        <p className={`${theme.textSecondary} text-sm`}>{message}</p>
      </div>
    </div>
  </div>
);

export default function DashboardPage({ 
  theme: t, 
  isDarkMode, 
  username, 
  mockBookings,
  recentBookings = [],
  onViewMoreBookings,
  dashboardData,
  isLoading,
  error,
  COLORS,
  onAddService,
  onRetry
}: DashboardPageProps) {
  const [animatedValues, setAnimatedValues] = useState({ bookings: 0, revenue: 0, occupancy: 0, routes: 0, services: 0 });  useEffect(() => {
    if (!dashboardData) {
      setAnimatedValues({ bookings: 0, revenue: 0, occupancy: 0, routes: 0, services: 0 });
      return;
    }

    const targets = {
      bookings: Number(dashboardData.total_bookings) || 0,
      revenue: Number(dashboardData.total_revenue) || 0,
      occupancy: Number(dashboardData.avg_occupancy) || 0,
      routes: Number(dashboardData.active_routes) || 0,
      services: Number(dashboardData.active_services?.total ?? 0) || 0,
    };

    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const progress = Math.min(step / steps, 1);
      setAnimatedValues({
        bookings: Math.round(targets.bookings * progress),
        revenue: Math.round(targets.revenue * progress),
        occupancy: Math.round(targets.occupancy * progress),
        routes: Math.round(targets.routes * progress),
        services: Math.round(targets.services * progress),
      });
      if (progress >= 1) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [dashboardData]);

  const revenueChartData = useMemo(() => {
    if (!dashboardData?.revenue_trends) return [];
    return dashboardData.revenue_trends.map((item) => ({
      month: item.month,
      total_revenue: item.total_revenue,
      total_bookings: item.total_bookings,
    }));
  }, [dashboardData]);

  const routePerformanceData = useMemo(() => {
    if (!dashboardData?.route_performance) return [];
    return dashboardData.route_performance.map((route) => ({
      route: `${route.source_name}-${route.destination_name}`,
      bookings: route.total_bookings,
    }));
  }, [dashboardData]);

  const bookingDistributionData = useMemo(() => {
    if (!dashboardData?.booking_distribution) return [];
    return [
      { name: 'Bus', value: dashboardData.booking_distribution.bus || 0 },
      { name: 'Train', value: dashboardData.booking_distribution.train || 0 },
      { name: 'Flight', value: dashboardData.booking_distribution.flight || 0 },
    ];
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className={`text-3xl font-bold ${t.text}`}>Welcome back, {username}</h1>
          <p className={`${t.textSecondary} mt-2`}>We are preparing your performance dashboard.</p>
        </div>
        <PageLoader
          theme={t}
          isDarkMode={isDarkMode}
          message="This usually takes just a couple of seconds."
        />
      </div>
    );
  }

  const totalRevenueDisplay = dashboardData
    ? `₹${Math.round(animatedValues.revenue).toLocaleString()}`
    : isLoading
      ? '₹...'
      : '₹--';

  const totalBookingsDisplay = dashboardData
    ? animatedValues.bookings.toLocaleString()
    : isLoading
      ? '...'
      : '--';

  const avgOccupancyDisplay = dashboardData
    ? `${Math.round(animatedValues.occupancy)}%`
    : isLoading
      ? '...'
      : '--';

  const activeRoutesDisplay = dashboardData
    ? animatedValues.routes.toLocaleString()
    : isLoading
      ? '...'
      : '--';

  const activeServicesDisplay = dashboardData
    ? animatedValues.services.toLocaleString()
    : isLoading
      ? '...'
      : '--';

  const revenueLineColor = isDarkMode ? '#38BDF8' : '#0EA5E9';
  const revenueDotColor = isDarkMode ? '#0EA5E9' : '#38BDF8';
  const routeBarColor = isDarkMode ? '#2DD4BF' : '#14B8A6';
  const routeBarSize = 40;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${t.text} mb-2`}>Welcome back, {username}! 👋</h1>
          <p className={t.textSecondary}>Here&apos;s what&apos;s happening with your services today.</p>
        </div>
        <button 
          onClick={onAddService}
          className={`bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 via-blue-600 to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-lg ${isDarkMode ? 'hover:shadow-sky-500/50' : 'hover:shadow-sky-300/50'}`}>
          <Plus className="w-5 h-5" />
          Add Service
        </button>
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm flex items-center justify-between gap-3 ${isDarkMode ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-600'}`}>
          <span>{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`px-3 py-1 rounded-md border ${isDarkMode ? 'border-red-400 text-red-200 hover:bg-red-500/20' : 'border-red-400 text-red-600 hover:bg-red-100'}`}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          icon={Package} 
          title="Total Bookings" 
          value={totalBookingsDisplay} 
          gradient={{
            light: 'from-blue-500 to-blue-600',
            dark: 'from-sky-600 to-sky-700',
          }}
          theme={t} 
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={RupeeIcon} 
          title="Total Revenue" 
          value={totalRevenueDisplay} 
          gradient={{
            light: 'from-rose-500 to-pink-600',
            dark: 'from-pink-600 to-pink-700',
          }}
          theme={t} 
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={Users} 
          title="Avg Occupancy" 
          value={avgOccupancyDisplay} 
          gradient={{
            light: 'from-indigo-500 to-blue-600',
            dark: 'from-blue-600 to-blue-700',
          }}
          theme={t} 
          isDarkMode={isDarkMode}
        />
        <StatCard 
          icon={MapPin} 
          title="Active Routes" 
          value={activeRoutesDisplay} 
          gradient={{
            light: 'from-emerald-500 to-teal-600',
            dark: 'from-emerald-600 to-emerald-700',
          }}
          theme={t} 
          isDarkMode={isDarkMode}
        />
        <StatCard
          icon={Layers}
          title="Active Services"
          value={activeServicesDisplay}
          gradient={{
            light: 'from-purple-500 to-fuchsia-600',
            dark: 'from-purple-600 to-purple-700',
          }}
          theme={t}
          isDarkMode={isDarkMode}
          description={
            dashboardData
              ? `Bus ${dashboardData.active_services?.bus_services ?? 0} • Train ${dashboardData.active_services?.train_services ?? 0} • Flight ${dashboardData.active_services?.flight_services ?? 0}`
              : isLoading
                ? 'Loading service mix...'
                : 'No active services found'
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <h3 className={`text-xl font-bold ${t.text} mb-4`}>Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
              <XAxis dataKey="month" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`, borderRadius: '8px', color: isDarkMode ? '#FFFFFF' : '#000000' }} />
              <Line
                type="monotone"
                dataKey="total_revenue"
                stroke={revenueLineColor}
                strokeWidth={3}
                dot={{ fill: revenueDotColor, stroke: revenueLineColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <h3 className={`text-xl font-bold ${t.text} mb-4`}>Route Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={routePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
              <XAxis dataKey="route" stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke={isDarkMode ? "#9CA3AF" : "#6B7280"} />
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`, borderRadius: '8px', color: isDarkMode ? '#FFFFFF' : '#000000' }} />
              <Bar dataKey="bookings" fill={routeBarColor} radius={[8, 8, 0, 0]} barSize={routeBarSize} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <h3 className={`text-xl font-bold ${t.text} mb-4`}>Booking Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={bookingDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                {bookingDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF', border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`, borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {bookingDistributionData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className={`text-sm ${t.textSecondary}`}>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`lg:col-span-2 ${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-xl font-bold ${t.text}`}>Recent Bookings</h3>
            {onViewMoreBookings && (
              <button
                onClick={onViewMoreBookings}
                className="text-blue-500 hover:text-blue-400 text-sm font-medium transition-colors flex items-center gap-1"
              >
                View More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(recentBookings.length > 0 ? recentBookings : mockBookings).slice(0, 5).map((booking: Booking) => (
              <div key={booking.id} className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'} rounded-lg transition-colors`}>
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
                    {booking.passengerName.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`${t.text} font-medium`}>{booking.passengerName}</div>
                    <div className={`text-sm ${t.textSecondary}`}>{booking.route}</div>
                    {booking.date && (
                      <div className={`text-xs ${t.textSecondary} mt-1`}>
                        {new Date(booking.date).toLocaleDateString()} at {new Date(booking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className={`${t.text} font-semibold mb-1`}>₹{booking.amount.toLocaleString()}</div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                    booking.status.toLowerCase() === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    booking.status.toLowerCase() === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {booking.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
