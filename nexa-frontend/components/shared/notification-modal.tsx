"use client";

import React from 'react';
import { Send, X, Loader2, Check } from 'lucide-react';

export type NotificationAudienceType = 'service' | 'provider' | 'booking';
export type NotificationServiceModel = 'busservice' | 'trainservice' | 'flightservice';
export type NotificationServiceModelOption = NotificationServiceModel | 'all-services';

export interface NotificationModalConfig {
  targetAudienceType: NotificationAudienceType;
  serviceModel?: NotificationServiceModel;
  serviceId?: string;
  bookingId?: string;
  bookingIds?: string[];
}

export interface NotificationPayload extends NotificationModalConfig {
  subject: string;
  messageBody: string;
}

interface NotificationModalProps {
  isOpen: boolean;
  config: NotificationModalConfig | null;
  theme: {
    card: string;
    cardBorder: string;
    text: string;
    textSecondary: string;
    input: string;
    hover: string;
  };
  isDarkMode: boolean;
  onClose: () => void;
  onSend: (payload: NotificationPayload) => void;
  sendStatus?: 'idle' | 'loading' | 'success';
}

const AUDIENCE_LABELS: Record<NotificationAudienceType, string> = {
  service: 'Service',
  provider: 'Provider-wide',
  booking: 'Booking',
};

const SERVICE_MODEL_OPTIONS: { value: NotificationServiceModelOption; label: string }[] = [
  { value: 'all-services', label: 'All services' },
  { value: 'busservice', label: 'Bus service' },
  { value: 'trainservice', label: 'Train service' },
  { value: 'flightservice', label: 'Flight service' }
];

const SERVICE_MODEL_LABELS: Record<NotificationServiceModelOption, string> = {
  'all-services': 'All services',
  busservice: 'Bus service',
  trainservice: 'Train service',
  flightservice: 'Flight service'
};

export default function NotificationModal({
  isOpen,
  config,
  theme,
  isDarkMode,
  onClose,
  onSend,
  sendStatus = 'idle'
}: NotificationModalProps) {
  const [subject, setSubject] = React.useState('');
  const [messageBody, setMessageBody] = React.useState('');
  const [serviceModelSelection, setServiceModelSelection] = React.useState<NotificationServiceModelOption>('all-services');

  React.useEffect(() => {
    if (!isOpen || !config) return;
    setSubject('');
    setMessageBody('');
    if (config.targetAudienceType === 'provider') {
      setServiceModelSelection(config.serviceModel ?? 'all-services');
    } else {
      setServiceModelSelection(config.serviceModel ?? 'busservice');
    }
  }, [config, isOpen]);

  if (!isOpen || !config) return null;

  const { targetAudienceType, serviceId, bookingId, bookingIds } = config;
  const isProviderWide = targetAudienceType === 'provider';
  const targetLabel = AUDIENCE_LABELS[targetAudienceType];

  const detailRows: string[] = [
    `Target audience: ${targetLabel}`
  ];

  if (serviceId) {
    detailRows.push(`Service ID: ${serviceId}`);
  }

  if (isProviderWide) {
    detailRows.push(`Service model: ${SERVICE_MODEL_LABELS[serviceModelSelection]}`);
  } else if (config.serviceModel) {
    detailRows.push(`Service model: ${SERVICE_MODEL_LABELS[config.serviceModel]}`);
  }

  if (bookingId) {
    detailRows.push(`Booking ID: ${bookingId}`);
  }

  if (bookingIds && bookingIds.length > 0) {
    detailRows.push(`Booking IDs: ${bookingIds.join(', ')}`);
  }

  const trimmedSubject = subject.trim();
  const trimmedMessage = messageBody.trim();
  const sendDisabled = !trimmedSubject || !trimmedMessage;
  const isSubmitting = sendStatus === 'loading';
  const isSuccess = sendStatus === 'success';

  const handleSend = () => {
    if (sendDisabled || isSubmitting || isSuccess) return;
    const payload: NotificationPayload = {
      ...config,
      subject: trimmedSubject,
      messageBody: trimmedMessage
    };

    if (isProviderWide) {
      if (serviceModelSelection === 'all-services') {
        delete payload.serviceModel;
      } else {
        payload.serviceModel = serviceModelSelection;
      }
    }
    onSend(payload);
  };

  const buttonDisabled = sendDisabled || isSubmitting || isSuccess;
  const buttonBaseClass = 'flex-1 px-6 py-3 rounded-lg text-white flex items-center justify-center gap-2 transition-all duration-200';
  const buttonStateClass = isSuccess
    ? 'bg-emerald-500 hover:bg-emerald-600'
    : buttonDisabled
      ? 'opacity-60 cursor-not-allowed bg-slate-500'
      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-lg rounded-2xl border ${theme.cardBorder} ${theme.card} shadow-2xl`}> 
        <div className={`p-6 border-b ${theme.cardBorder} flex items-center justify-between`}>
          <div>
            <p className={`text-xs uppercase tracking-wide ${theme.textSecondary}`}>Notifications</p>
            <h2 className={`text-2xl font-bold ${theme.text}`}>Send notification</h2>
          </div>
          <button onClick={onClose} className={`${theme.textSecondary} hover:${theme.text}`}
            aria-label="Close notification form">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className={`space-y-1 text-sm ${theme.textSecondary}`}>
            {detailRows.map(row => (
              <div key={row}>{row}</div>
            ))}
          </div>
          {isProviderWide && (
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Service model</label>
            <select
              value={serviceModelSelection}
              onChange={(event) => setServiceModelSelection(event.target.value as NotificationServiceModelOption)}
              className={`w-full px-4 py-2 ${theme.input} border ${theme.cardBorder} rounded-lg ${theme.text} focus:outline-none focus:border-sky-500`}
            >
              {SERVICE_MODEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
              <p className="text-xs text-slate-400 mt-2">Choose which service segment the broadcast should target.</p>
            </div>
          )}
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Add a short catchy subject"
              className={`w-full px-4 py-2 ${theme.input} border ${theme.cardBorder} rounded-lg ${theme.text} focus:outline-none focus:border-sky-500`}
              type="text"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>Message body</label>
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              rows={4}
              placeholder="Write the notification you want travellers to see"
              className={`w-full px-4 py-2 ${theme.input} border ${theme.cardBorder} rounded-lg ${theme.text} focus:outline-none focus:border-sky-500`}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${theme.text} ${theme.hover} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={buttonDisabled}
              className={`${buttonBaseClass} ${buttonStateClass}`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? 'Sending...' : isSuccess ? 'Notification Sent' : 'Send notification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
