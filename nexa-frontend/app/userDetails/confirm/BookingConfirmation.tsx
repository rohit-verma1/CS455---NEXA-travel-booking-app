"use client";   

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useParams } from 'next/navigation';
import { CheckCircle, Download, Mail, Calendar, MapPin, Clock, Users, CreditCard, FileText, Share2, Phone, MessageSquare, ArrowRight, Ticket, Info } from 'lucide-react';
import { Navbar } from '@/components/shared/navbar';
import QRCode from 'react-qr-code';
import API from '../../api';
import { useSearchParams } from "next/navigation";
import { getAuthFromStorage } from '@/utils/authStorage';

const BookingConfirmation = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [qrTxn, setQrTxn] = useState<string>("");
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  useEffect(() => {
    if (!bookingId) {
      setError("No booking ID found in URL");
      setLoading(false);
      return;
    }
    const auth = getAuthFromStorage();
    const token = auth?.token;
    const csrf = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    fetch(`${API.BOOKING_DATA}${bookingId}/`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        ...(token ? { "Authorization": `Token ${token}` } : {}),
        ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
      },
    })
      .then(res => res.json())
      .then((data: any) => {
        setBooking(data);
        console.log("Booking Data:", data);
        const txnLog = data.status_logs?.find((log: any) => log.remarks?.includes("txn "));
        if (txnLog) {
          const match = txnLog.remarks.match(/txn ([a-zA-Z0-9\-]+)/);
          if (match) setQrTxn(match[1]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch booking data");
        setLoading(false);
      });
  }, [bookingId]);

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading booking details...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center">No booking found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Navbar />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-8 text-white shadow-xl animate-fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 animate-bounce-slow">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Booking Confirmed!</h2>
                <p className="text-emerald-50 text-lg">
                  Your journey is all set. We've sent the confirmation to your email.
                </p>
                <p className="text-white font-semibold mt-3 text-xl">
                  Booking ID: {booking.booking_id}
                </p>
              </div>
            </div>
          
          </div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Booking Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Journey Details Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Journey Details
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Route */}
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                        <div>
                          <p className="text-sm text-slate-500">Departure</p>
                          <p className="font-bold text-xl text-slate-900">{booking.service_details?.source}</p>
                          <p className="text-slate-600 mt-1">{formatDate(booking.service_details?.departure_time)}</p>
                          <p className="text-blue-600 font-semibold text-lg">{formatTime(booking.service_details?.departure_time)}</p>
                        </div>
                      </div>
                      <div className="ml-1.5 my-4 border-l-2 border-dashed border-slate-300 h-16 pl-6 flex items-center">
                        <div className="bg-slate-100 rounded-lg px-4 py-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 inline mr-2" />
                          {booking.service_details?.arrival_time && booking.service_details?.departure_time ?
                            (() => {
                              const dep = new Date(booking.service_details.departure_time);
                              const arr = new Date(booking.service_details.arrival_time);
                              const diffMs = arr.getTime() - dep.getTime();
                              const diffH = Math.floor(diffMs / 3600000);
                              const diffM = Math.floor((diffMs % 3600000) / 60000);
                              return `${diffH}h ${diffM}m`;
                            })() : ""}
                          • {booking.service_details?.source} to {booking.service_details?.destination}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-600"></div>
                        <div>
                          <p className="text-sm text-slate-500">Arrival</p>
                          <p className="font-bold text-xl text-slate-900">{booking.service_details?.destination}</p>
                          <p className="text-slate-600 mt-1">{formatDate(booking.service_details?.arrival_time)}</p>
                          <p className="text-emerald-600 font-semibold text-lg">{formatTime(booking.service_details?.arrival_time)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Passengers */}
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Passenger Details
                  </h4>
                  <div className="space-y-2">
                    {booking.passengers?.map((passenger: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                            {passenger.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{passenger.name}</p>
                            <p className="text-sm text-slate-500">{passenger.age} years • {passenger.gender}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Seat</p>
                          <p className="font-bold text-blue-600">{passenger.seat_no || passenger.seat?.seat_no}</p>
                          <p className="text-xs text-slate-500">{passenger.seat_class || passenger.seat?.seat_class}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Policies */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                  <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Important Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <p className="font-semibold text-amber-900 mb-2">Cancellation Policy</p>
                      <p className="text-amber-800">Free cancellation up to {booking.policy?.cancellation_window} hours before departure</p>
                      <p className="text-amber-700 mt-1 text-xs">Fee: ₹{booking.policy?.cancellation_fee} after that</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="font-semibold text-blue-900 mb-2">Reschedule Policy</p>
                      <p className="text-blue-800">
                        {booking.policy?.reschedule_allowed ? 'Rescheduling allowed' : 'Rescheduling not allowed'}
                      </p>
                      <p className="text-blue-700 mt-1 text-xs">Fee: ₹{booking.policy?.reschedule_fee}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Summary
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Paid</span>
                  <span className="text-2xl font-bold text-violet-600">₹{booking.total_amount}</span>
                </div>
                <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2 flex items-center justify-center gap-2 border border-emerald-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">Payment Successful</span>
                </div>
              </div>
            </div>

            {/* Ticket QR */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 text-center">Your E-Ticket</h3>
              <div className="bg-slate-100 rounded-xl p-6 flex items-center justify-center">
                <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border-4 border-slate-200">
                  <div className="text-center">
                    {/* QR code from TXN */}
                    {qrTxn ? <QRCode value={qrTxn} size={128} /> : <div className="w-32 h-32 bg-slate-900 rounded-lg mb-2"></div>}
                    <p className="text-xs text-slate-500 font-mono">{booking.ticket?.ticket_no}</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-slate-500 mt-3">
                Show this QR code at the boarding point
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingConfirmation;
