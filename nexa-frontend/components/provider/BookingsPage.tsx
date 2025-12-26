"use client";

import React from 'react';
import { Search, Send, Eye, Trash2, X, Download, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import type { ProviderBookingListItem } from '@/app/api';
import type { NotificationModalConfig } from '@/components/shared/notification-modal';

export type BookingActionState = {
  type: 'cancel' | 'delete' | null;
  ids: string[];
};

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

interface BookingsPageProps {
  theme: any;
  isDarkMode: boolean;
  bookings: Booking[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedBookings: string[];
  toggleBookingSelection: (id: string) => void;
  isLoading?: boolean;
  error?: string | null;
  bookingsLoaded?: boolean;
  onLoadBookings?: () => void;
  onCancelBookings?: (ids: string[]) => Promise<void> | void;
  onDeleteBookings?: (ids: string[]) => Promise<void> | void;
  bookingActionState?: BookingActionState;
  onRequestNotification: (config: NotificationModalConfig) => void;
}

export default function BookingsPage({
  theme,
  isDarkMode,
  bookings,
  searchTerm,
  setSearchTerm,
  selectedBookings,
  toggleBookingSelection,
  onRequestNotification,
  isLoading = false,
  error = null,
  bookingsLoaded = false,
  onLoadBookings,
  onCancelBookings,
  onDeleteBookings,
  bookingActionState
}: BookingsPageProps) {
  const t = theme;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Booking; direction: 'asc' | 'desc' } | null>(null);
  const [detailBooking, setDetailBooking] = React.useState<Booking | null>(null);
  const itemsPerPage = 10;
  
  const filteredBookings = bookings.filter(b =>
    b.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.route.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Apply sorting
  const sortedBookings = React.useMemo(() => {
    if (!sortConfig) return filteredBookings;

    const sorted = [...filteredBookings].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue as string);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else if (typeof aValue === 'number') {
        const comparison = (aValue as number) - (bValue as number);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      return 0;
    });

    return sorted;
  }, [filteredBookings, sortConfig]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex);

  const handleSort = (key: keyof Booking) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const formatBookingDetailValue = (field: string, rawValue: unknown): React.ReactNode => {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return '—';
    }

    if (field === 'amount') {
      const numericValue = Number(rawValue);
      return Number.isFinite(numericValue)
        ? `₹${numericValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        : String(rawValue);
    }

    const normalizedField = field.toLowerCase();
    if (normalizedField === 'date' || normalizedField.includes('at')) {
      const parsed = new Date(String(rawValue));
      return isNaN(parsed.getTime()) ? String(rawValue) : parsed.toLocaleString();
    }

    if (typeof rawValue === 'object') {
      return (
        <pre
          className={`text-sm whitespace-pre-wrap break-words rounded-md px-3 py-2 ${isDarkMode ? 'bg-gray-800/70 text-gray-100' : 'bg-gray-100 text-gray-800'}`}
        >
          {JSON.stringify(rawValue, null, 2)}
        </pre>
      );
    }

    return String(rawValue);
  };

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredBookings.length === 0) {
      alert('No bookings to export');
      return;
    }

    // CSV Headers
    const headers = ['Booking ID', 'Passenger Name', 'Route', 'Date', 'Seats', 'Amount', 'Status', 'Service Type'];
    
    // CSV Rows
    const rows = filteredBookings.map(booking => [
      booking.id,
      booking.passengerName,
      booking.route,
      new Date(booking.date).toLocaleString(),
      booking.seats,
      `₹${booking.amount}`,
      booking.status,
      booking.serviceType
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${t.text}`}>Booking Management</h1>
        <div className="flex gap-3">
          {bookingsLoaded && (
            <>
              <button 
                onClick={exportToCSV}
                disabled={isLoading || bookings.length === 0}
                className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm`}>
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button 
                onClick={() => onRequestNotification({ targetAudienceType: 'provider' })}
                className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm`}>
                <Send className="w-4 h-4" />
                Send Notification
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`${t.card} rounded-xl p-4 border ${t.cardBorder}`}>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${t.textSecondary} w-5 h-5`} />
            <input
              type="text"
              placeholder="Search by passenger, booking ID, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-lg ${t.text} ${isDarkMode ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:outline-none focus:border-blue-500 transition-colors`}
            />
          </div>
          <button
            onClick={onLoadBookings}
            disabled={isLoading}
            className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-300'} ${t.text} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title={bookingsLoaded ? 'Reload bookings' : 'Load bookings'}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {selectedBookings.length > 0 && (
          <div className={`${isDarkMode ? 'bg-sky-600/20 border-sky-500/50' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3 flex items-center justify-between`}>
            <span className={`${t.text} font-medium`}>{selectedBookings.length} booking(s) selected</span>
            <div className="flex gap-2">
              <button
                onClick={() => onCancelBookings?.(selectedBookings)}
                disabled={!onCancelBookings || bookingActionState?.type === 'cancel'}
                className={`px-4 py-2 ${isDarkMode ? 'bg-sky-600 hover:bg-sky-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {bookingActionState?.type === 'cancel' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Cancel Selected
              </button>
              <button
                onClick={() => onDeleteBookings?.(selectedBookings)}
                disabled={!onDeleteBookings || bookingActionState?.type === 'delete'}
                className={`px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {bookingActionState?.type === 'delete' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Delete Selected
              </button>
              <button
                onClick={() => onRequestNotification({ targetAudienceType: 'booking', bookingIds: selectedBookings })}
                className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors`}
              >
                Notify Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={`${t.card} rounded-xl border ${t.cardBorder} p-12 flex flex-col items-center justify-center`}>
          <Loader2 className={`w-12 h-12 ${t.textSecondary} animate-spin mb-4`} />
          <p className={`${t.textSecondary} text-lg`}>Loading bookings...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className={`${t.card} rounded-xl border border-red-500/50 bg-red-500/10 p-6 flex items-start gap-4`}>
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-semibold text-lg mb-1">Failed to load bookings</h3>
            <p className={`${t.textSecondary}`}>{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <div className={`${t.card} rounded-xl border ${t.cardBorder} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-cyan-500'}`}>
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input 
                      type="checkbox" 
                      checked={selectedBookings.length === paginatedBookings.length && paginatedBookings.length > 0}
                      onChange={() => {
                        if (selectedBookings.length === paginatedBookings.length) {
                          // Deselect all visible bookings
                          paginatedBookings.forEach(booking => {
                            if (selectedBookings.includes(booking.id)) {
                              toggleBookingSelection(booking.id);
                            }
                          });
                        } else {
                          // Select all visible bookings
                          paginatedBookings.forEach(booking => {
                            if (!selectedBookings.includes(booking.id)) {
                              toggleBookingSelection(booking.id);
                            }
                          });
                        }
                      }}
                      className={`w-4 h-4 rounded ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-white bg-white/20'} cursor-pointer`} 
                    />
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('id')} className="flex items-center gap-1">
                      Booking ID
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'id' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'id' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('passengerName')} className="flex items-center gap-1">
                      Passenger
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'passengerName' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'passengerName' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('route')} className="flex items-center gap-1">
                      Route
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'route' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'route' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('date')} className="flex items-center gap-1">
                      Date
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'date' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'date' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'}`}>Seats</th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1">
                      Amount
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'amount' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'amount' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1">
                      Status
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'status' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'status' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'} cursor-pointer hover:opacity-80 transition-opacity`}>
                    <button onClick={() => handleSort('serviceType')} className="flex items-center gap-1">
                      Service Type
                      <svg className={`w-4 h-4 ${sortConfig?.key === 'serviceType' ? 'opacity-100' : 'opacity-50'}`} fill="currentColor" viewBox="0 0 20 20">
                        {sortConfig?.key === 'serviceType' && sortConfig.direction === 'desc' ? (
                          <path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" />
                        ) : (
                          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        )}
                      </svg>
                    </button>
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${isDarkMode ? t.textSecondary : 'text-white'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className={`px-6 py-12 text-center ${t.textSecondary}`}>
                      {searchTerm ? 'No bookings found matching your search.' : 'No bookings available.'}
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((booking) => (
                <tr key={booking.id} className={`${isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50/50'} transition-colors`}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedBookings.includes(booking.id)}
                      onChange={() => toggleBookingSelection(booking.id)}
                      className={`w-4 h-4 rounded ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`} 
                    />
                  </td>
                  <td className={`px-6 py-4 ${t.text} font-medium text-sm`}>{booking.id}</td>
                  <td className={`px-6 py-4 ${t.text} text-sm`}>{booking.passengerName}</td>
                  <td className={`px-6 py-4 ${t.textSecondary} text-sm`}>{booking.route}</td>
                  <td className={`px-6 py-4 ${t.textSecondary} text-sm`}>{new Date(booking.date).toLocaleString()}</td>
                  <td className={`px-6 py-4 ${t.textSecondary} text-sm`}>{booking.seats}</td>
                  <td className={`px-6 py-4 ${t.text} font-semibold text-sm`}>₹{booking.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status.toLowerCase() === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      booking.status.toLowerCase() === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      booking.status.toLowerCase() === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 ${t.textSecondary}`}>{booking.serviceType}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDetailBooking(booking)}
                        className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} rounded-lg transition-colors`}
                        title="View details"
                      >
                        <Eye className={`w-4 h-4 ${isDarkMode ? t.textSecondary : 'text-gray-600'}`} />
                      </button>
                      <button
                        onClick={() => onRequestNotification({ targetAudienceType: 'booking', bookingId: booking.id })}
                        className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} rounded-lg transition-colors`}
                        title="Send notification"
                      >
                        <Send className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </button>
                      <button
                        onClick={() => onDeleteBookings?.([booking.id])}
                        disabled={bookingActionState?.type === 'delete' && bookingActionState.ids.includes(booking.id)}
                        className={`p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Delete booking"
                      >
                        {bookingActionState?.type === 'delete' && bookingActionState.ids.includes(booking.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className={`w-4 h-4 ${isDarkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {filteredBookings.length > 0 && (
            <div className={`px-6 py-4 border-t ${isDarkMode ? t.cardBorder : 'border-gray-200'} flex items-center justify-between ${isDarkMode ? '' : 'bg-gray-50/50'}`}>
              <div className={`text-sm ${t.textSecondary}`}>
                Showing {startIndex + 1} - {Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length} bookings
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-300'} ${t.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      if (i === 0) pageNum = 1;
                      else if (i === 6) pageNum = totalPages;
                      else if (i === 1 || i === 5) return <span key={i} className={`px-3 py-2 ${t.textSecondary}`}>...</span>;
                      else pageNum = currentPage + i - 3;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : `${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-300'} ${t.text}`
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-50 border border-gray-300'} ${t.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {detailBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${t.card} rounded-2xl max-w-2xl w-full border ${t.cardBorder} shadow-2xl`}> 
            <div className={`p-6 border-b ${t.cardBorder} flex items-center justify-between`}>
              <div>
                <p className={`text-sm uppercase tracking-wide ${t.textSecondary}`}>Booking Overview</p>
                <h2 className={`text-2xl font-bold ${t.text}`}>{detailBooking.id}</h2>
              </div>
              <button
                onClick={() => setDetailBooking(null)}
                className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                aria-label="Close booking details"
              >
                <X className={`w-5 h-5 ${t.textSecondary}`} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {detailBooking.raw ? (
                Object.entries(detailBooking.raw).map(([key, value]) => {
                  const label = key
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  const formattedValue = formatBookingDetailValue(key, value);

                  return (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pb-3 border-b border-white/5 last:border-b-0">
                      <span className={`text-sm font-medium ${t.textSecondary}`}>
                        {label}
                      </span>
                      {typeof formattedValue === 'string' ? (
                        <span className={`text-base ${t.text} font-semibold break-words sm:text-right`}>
                          {formattedValue}
                        </span>
                      ) : (
                        <div className="w-full sm:w-2/3">
                          {formattedValue}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={`text-center ${t.textSecondary} py-12`}>
                  <p>Detailed booking data is not available for this record.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
