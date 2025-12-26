"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, Award, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import API from '@/app/api';
import { getAuthFromStorage } from '@/utils/authStorage';

interface AnalyticsPageProps {
  theme: any;
  isDarkMode: boolean;
  revenueData: any[];
}

interface HeatmapEntry {
  date: string;
  occupancy: number;
}

interface RouteComparisonRow {
  route_name: string;
  bookings: number;
  revenue: number;
  occupancy: number;
  performance: string;
}

export default function AnalyticsPage({ theme, isDarkMode, revenueData }: AnalyticsPageProps) {
  const t = theme;
  const [activeTab, setActiveTab] = useState('overview');
  const [heatmapData, setHeatmapData] = useState<HeatmapEntry[]>([]);
  const [routeComparison, setRouteComparison] = useState<RouteComparisonRow[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [heatmapError, setHeatmapError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [heatmapRequested, setHeatmapRequested] = useState(false);
  const [routeRequested, setRouteRequested] = useState(false);

  useEffect(() => {
    const auth = getAuthFromStorage();
    const token = auth?.token ?? null;
    setAuthToken(token);
    if (!token) {
      setHeatmapError("Please sign in to view occupancy insights.");
      setRouteError("Please sign in to view route analytics.");
    } else {
      setHeatmapError("");
      setRouteError("");
    }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    if (!authToken) {
      setHeatmapError("Please sign in to view occupancy insights.");
      return;
    }

    setHeatmapLoading(true);
    try {
      const response = await fetch(API.PROVIDER_OCCUPANCY_HEATMAP, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Token ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load occupancy data right now.");
      }

      const data = await response.json();
      setHeatmapData(Array.isArray(data?.date_occupancy_heatmap) ? data.date_occupancy_heatmap : []);
      setHeatmapError("");
    } catch (error: any) {
      setHeatmapError(error.message || "Failed to fetch occupancy data.");
    } finally {
      setHeatmapLoading(false);
    }
  }, [authToken]);

  const fetchRouteComparison = useCallback(async () => {
    if (!authToken) {
      setRouteError("Please sign in to view route analytics.");
      return;
    }

    setRouteLoading(true);
    try {
      const response = await fetch(API.PROVIDER_ROUTE_COMPARISON, {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Token ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to load route analytics.");
      }

      const data = await response.json();
      setRouteComparison(Array.isArray(data?.routes) ? data.routes : []);
      setRouteError("");
    } catch (error: any) {
      setRouteError(error.message || "Failed to fetch route analytics.");
    } finally {
      setRouteLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (activeTab === 'overview' && !heatmapRequested && authToken) {
      setHeatmapRequested(true);
      fetchHeatmap();
    }
    if (activeTab === 'performance' && !routeRequested && authToken) {
      setRouteRequested(true);
      fetchRouteComparison();
    }
  }, [activeTab, heatmapRequested, routeRequested, authToken, fetchHeatmap, fetchRouteComparison]);

  const tabHoverClass = isDarkMode ? "hover:text-white" : "hover:text-gray-900";
  const rowHoverClass = isDarkMode ? "hover:bg-white/5" : "hover:bg-gray-50";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value || 0);

  const formatOccupancy = (value: number) => `${Number(value ?? 0).toFixed(2)}%`;

  const getPerformanceBadgeClasses = (performance: string) => {
    const normalized = performance?.toLowerCase() || "";
    if (["excellent", "good", "great", "positive", "high"].some((term) => normalized.includes(term))) {
      return "bg-green-500/15 text-green-600";
    }
    if (["poor", "bad", "critical", "low"].some((term) => normalized.includes(term))) {
      return "bg-red-500/15 text-red-600";
    }
    return "bg-yellow-500/15 text-yellow-600";
  };

  const renderLoader = (message: string) => (
    <div className="min-h-[220px] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={`w-20 h-20 rounded-full border-4 ${isDarkMode ? 'border-white/10' : 'border-sky-100'} animate-pulse`}
        />
        <Loader2 className="w-8 h-8 absolute inset-0 m-auto text-sky-500 animate-spin" />
      </div>
      <p className={`${t.textSecondary} text-sm`}>{message}</p>
    </div>
  );

  const handleExportCsv = () => {
    if (!routeComparison.length) return;
    setIsExportingCsv(true);
    try {
      const headers = ["Route", "Bookings", "Revenue", "Occupancy", "Performance"];
      const rows = routeComparison.map((route) => [
        route.route_name,
        route.bookings,
        route.revenue,
        route.occupancy,
        route.performance,
      ]);

      const csvContent = [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const safe = String(cell ?? "").replace(/"/g, '""');
              return `"${safe}"`;
            })
            .join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `route-comparison-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className={`text-3xl font-bold ${t.text}`}>Analytics & Insights</h1>

      <div className={`flex gap-2 border-b ${t.cardBorder}`}>
        {['overview', 'performance', 'forecasting', 'predictions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-sky-400 border-b-2 border-sky-400'
                : `${t.textSecondary} ${tabHoverClass}`
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
              <h3 className={`text-xl font-bold ${t.text} mb-4`}>Booking Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
              <h3 className={`text-xl font-bold ${t.text} mb-4`}>Occupancy Heatmap</h3>
              {heatmapLoading ? (
                renderLoader("Loading occupancy heatmap…")
              ) : heatmapError ? (
                <p className="text-sm text-red-500">{heatmapError}</p>
              ) : heatmapData.length === 0 ? (
                <p className={`text-sm ${t.textSecondary}`}>No occupancy data available yet.</p>
              ) : (
                <>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2.5rem, 1fr))" }}
                  >
                    {heatmapData.map((entry) => {
                      const normalized = Math.min(Math.max(entry.occupancy / 100, 0), 1);
                      const backgroundColor = `rgba(139, 92, 246, ${0.1 + normalized * 0.9})`;
                      const displayDate = new Date(entry.date);
                      const dayLabel = isNaN(displayDate.getTime())
                        ? entry.date
                        : displayDate.toLocaleDateString("en-IN", { day: "numeric" });
                      const monthLabel = isNaN(displayDate.getTime())
                        ? ""
                        : displayDate.toLocaleDateString("en-IN", { month: "short" });

                      return (
                        <div
                          key={`${entry.date}-${entry.occupancy}`}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[0.7rem] font-semibold text-white/90 transition-transform duration-150 hover:scale-105`}
                          style={{ backgroundColor }}
                          title={`${entry.date} • ${entry.occupancy.toFixed(2)}% occupancy`}
                        >
                          <span>{dayLabel}</span>
                          <span className="text-[0.6rem] uppercase tracking-wide">{monthLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <span className={`${t.textSecondary}`}>Lower</span>
                    <div className="flex gap-1">
                      {[0.2, 0.4, 0.6, 0.8, 1].map((opacity) => (
                        <div
                          key={opacity}
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: `rgba(139, 92, 246, ${opacity})` }}
                        />
                      ))}
                    </div>
                    <span className={`${t.textSecondary}`}>Higher</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h3 className={`text-xl font-bold ${t.text}`}>Route Comparison</h3>
              <button
                onClick={handleExportCsv}
                disabled={!routeComparison.length || isExportingCsv}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  !routeComparison.length || isExportingCsv
                    ? 'opacity-60 cursor-not-allowed'
                    : isDarkMode
                      ? 'border-white/20 text-white hover:bg-white/10'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isExportingCsv ? 'Preparing…' : 'Export CSV'}
              </button>
            </div>
            {routeLoading ? (
              renderLoader("Loading route analytics…")
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`border-b ${t.cardBorder}`}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${t.textSecondary}`}>Route</th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${t.textSecondary}`}>Bookings</th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${t.textSecondary}`}>Revenue</th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${t.textSecondary}`}>Occupancy</th>
                      <th className={`px-4 py-3 text-left text-sm font-semibold ${t.textSecondary}`}>Performance</th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? "divide-y divide-gray-700" : "divide-y divide-gray-200"}>
                    {routeError ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-500">
                          {routeError}
                        </td>
                      </tr>
                    ) : routeComparison.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`px-4 py-6 text-center text-sm ${t.textSecondary}`}>
                          No route data available yet.
                        </td>
                      </tr>
                    ) : (
                      routeComparison.map((route, index) => (
                        <tr key={`${route.route_name}-${index}`} className={`transition-colors ${rowHoverClass}`}>
                          <td className={`px-4 py-4 ${t.text} font-medium`}>{route.route_name}</td>
                          <td className={`px-4 py-4 ${t.textSecondary}`}>{route.bookings}</td>
                          <td className={`px-4 py-4 ${t.textSecondary}`}>{formatCurrency(route.revenue)}</td>
                          <td className={`px-4 py-4 ${t.textSecondary}`}>{formatOccupancy(route.occupancy)}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getPerformanceBadgeClasses(
                                route.performance
                              )}`}
                            >
                              {route.performance || "—"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-bold ${t.text}`}>Demand Forecast (Next 30 Days)</h3>
              <span className={`text-sm ${t.textSecondary}`}>ARIMA Model</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={[
                { day: 'Day 1', actual: 45, forecast: null },
                { day: 'Day 5', actual: 52, forecast: null },
                { day: 'Day 10', actual: 48, forecast: null },
                { day: 'Day 15', actual: null, forecast: 51 },
                { day: 'Day 20', actual: null, forecast: 55 },
                { day: 'Day 25', actual: null, forecast: 58 },
                { day: 'Day 30', actual: null, forecast: 62 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="actual" stroke="#8B5CF6" strokeWidth={3} name="Actual" />
                <Line type="monotone" dataKey="forecast" stroke="#EC4899" strokeWidth={3} strokeDasharray="5 5" name="Forecast" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-sky-600/20 to-sky-700/20 rounded-xl p-6 border border-sky-500/50">
              <AlertCircle className="w-8 h-8 text-sky-400 mb-3" />
              <h4 className={`text-lg font-bold ${t.text} mb-2`}>Peak Season Alert</h4>
              <p className={`${t.textSecondary} text-sm`}>Expected 25% increase in bookings during Nov 1-15</p>
            </div>
            <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-xl p-6 border border-green-500/50">
              <TrendingUp className="w-8 h-8 text-green-400 mb-3" />
              <h4 className={`text-lg font-bold ${t.text} mb-2`}>Growth Opportunity</h4>
              <p className={`${t.textSecondary} text-sm`}>Mumbai-Goa route showing 15% weekly growth</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-xl p-6 border border-yellow-500/50">
              <Award className="w-8 h-8 text-yellow-400 mb-3" />
              <h4 className={`text-lg font-bold ${t.text} mb-2`}>Best Performer</h4>
              <p className={`${t.textSecondary} text-sm`}>Delhi-Bangalore consistently hits 90%+ occupancy</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
            <h3 className={`text-xl font-bold ${t.text} mb-4`}>No-Show Predictions</h3>
            <div className="space-y-4">
              {[
                { route: 'Mumbai → Delhi', probability: 8, confidence: 92 },
                { route: 'Delhi → Bangalore', probability: 5, confidence: 88 },
                { route: 'Mumbai → Goa', probability: 12, confidence: 85 },
                { route: 'Bangalore → Chennai', probability: 15, confidence: 90 },
              ].map((prediction) => (
                <div key={prediction.route} className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`${t.text} font-medium`}>{prediction.route}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      prediction.probability < 10 ? 'bg-green-500/20 text-green-400' :
                      prediction.probability < 15 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {prediction.probability}% No-Show Risk
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className={`text-sm ${t.textSecondary} mb-1`}>Confidence Level</div>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${prediction.confidence}%` }}
                          />
                        </div>
                        <span className={`text-sm ${t.text}`}>{prediction.confidence}%</span>
                      </div>
                    </div>
                    <button className={`px-4 py-2 bg-sky-600 ${t.text} rounded-lg hover:bg-sky-700 transition-colors text-sm`}>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.card} rounded-xl p-6 border ${t.cardBorder}`}>
            <h3 className={`text-xl font-bold ${t.text} mb-4`}>Overbooking Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-lg p-5 border border-green-500/50">
                <CheckCircle className="w-8 h-8 text-green-400 mb-3" />
                <h4 className={`text-lg font-bold ${t.text} mb-2`}>Safe to Overbook</h4>
                <p className={`${t.textSecondary} text-sm mb-3`}>Delhi → Bangalore (Flight)</p>
                <p className={`text-sm ${t.textSecondary}`}>Recommended: 3-5 additional seats</p>
                <p className="text-xs text-gray-500 mt-2">Based on 5% historical no-show rate</p>
              </div>
              <div className="bg-gradient-to-br from-red-600/20 to-red-700/20 rounded-lg p-5 border border-red-500/50">
                <XCircle className="w-8 h-8 text-red-400 mb-3" />
                <h4 className={`text-lg font-bold ${t.text} mb-2`}>Not Recommended</h4>
                <p className={`${t.textSecondary} text-sm mb-3`}>Bangalore → Chennai (Train)</p>
                <p className={`text-sm ${t.textSecondary}`}>High show-up rate detected</p>
                <p className="text-xs text-gray-500 mt-2">Risk of customer dissatisfaction</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
