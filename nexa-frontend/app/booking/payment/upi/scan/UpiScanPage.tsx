"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import API from '@/app/api';

const youtubeRedirectUrl = 'https://youtu.be/Acjf66Qdj2U?si=IYK4JRIUnBaE3e8N&t=9';

type Status = 'loading' | 'success' | 'error';

const statusCopy: Record<Status, { title: string; tone: string }> = {
  loading: { title: 'Processing your payment', tone: 'Please hold on while we confirm this transaction.' },
  success: { title: 'Payment confirmed', tone: 'Almost done. Redirecting you back to the verification clip.' },
  error: { title: 'Something went wrong', tone: 'We could not confirm this payment session.' }
};

const triggerRedirect = (redirect?: string) => {
  const target = redirect || youtubeRedirectUrl;
  if (typeof window !== 'undefined') {
    window.location.replace(target);
  }
};

const UpiScanPage = () => {
  const searchParams = useSearchParams();
  const payloadParam = searchParams.get('payload');

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState(statusCopy.loading.tone);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!payloadParam) {
      setStatus('error');
      setErrorDetail('Missing QR payload. Please regenerate the code from the Nexa payment portal.');
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(atob(payloadParam));
    } catch (error) {
      console.error('Failed to parse QR payload', error);
      setStatus('error');
      setErrorDetail('Corrupted QR payload. Please start a fresh payment attempt.');
      return;
    }

    const { bookingIds, token, redirect, method } = payload || {};

    if (!token || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      setStatus('error');
      setErrorDetail('Invalid booking context. Please restart the checkout flow.');
      return;
    }

    const confirmPayment = async () => {
      try {
        for (const bookingId of bookingIds) {
          const response = await fetch(API.PAYMENT_CONFIRM, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Token ${token}`
            },
            body: JSON.stringify({ booking_id: bookingId, method: method || 'upi' })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Payment confirmation failed');
          }
        }

        setStatus('success');
        setMessage(statusCopy.success.tone);
        setTimeout(() => triggerRedirect(redirect), 1200);
      } catch (error) {
        console.error('UPI QR confirmation error', error);
        setStatus('error');
        setErrorDetail('Unable to confirm the payment. Please regenerate the QR session from the Nexa checkout.');
      }
    };

    setMessage(statusCopy.loading.tone);
    confirmPayment();
  }, [payloadParam]);

  const Icon = {
    loading: Loader2,
    success: CheckCircle2,
    error: AlertTriangle
  }[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
          <Shield className="w-4 h-4" />
          Nexa Secure Pay
        </div>

        <Icon className={`mx-auto h-14 w-14 ${status === 'loading' ? 'animate-spin' : ''} ${status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-amber-300' : 'text-white'}`} />

        <div>
          <h1 className="text-2xl font-semibold">{statusCopy[status].title}</h1>
          <p className="mt-2 text-sm text-white/70">{status === 'error' ? errorDetail : message}</p>
        </div>

        {status === 'error' && (
          <div className="space-y-3">
            <button
              type="button"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={() => triggerRedirect()}
            >
              Watch the verification clip
            </button>
            <p className="text-xs text-white/60">
              Head back to Nexa on your primary device to regenerate a fresh QR session.
            </p>
          </div>
        )}

        {status === 'success' && (
          <p className="text-xs text-white/60">You will be redirected automatically. You may safely close this tab afterwards.</p>
        )}
      </div>
    </div>
  );
};

export default UpiScanPage;
