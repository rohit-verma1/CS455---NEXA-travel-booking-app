"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import { getAuthFromStorage } from '@/utils/authStorage';
import { getNotifications, markNotificationAsRead, type RecipientNotification } from '@/app/api';

interface HeaderProps {
  theme: any;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  username: string;
}

export default function Header({ theme, isDarkMode, setIsDarkMode, username }: HeaderProps) {
  const t = theme;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<RecipientNotification[]>([]);
  const [auth, setAuth] = useState(getAuthFromStorage());
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter(n => n.status === 'Pending').length;

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

    setNotifications(prev =>
      prev.map(item => item.receipt_id === receiptId ? { ...item, status: 'Read' } : item)
    );

    try {
      await markNotificationAsRead(receiptId, auth.token);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.receipt_id !== receiptId));
      }, 1200);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(prev =>
        prev.map(item => item.receipt_id === receiptId ? { ...item, status: 'Pending' } : item)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!auth?.token || notifications.length === 0) return;

    const original = [...notifications];
    setNotifications(prev => prev.map(item => ({ ...item, status: 'Read' })));

    try {
      await Promise.all(
        notifications.map(item => markNotificationAsRead(item.receipt_id, auth.token))
      );
      setTimeout(() => setNotifications([]), 1200);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(original);
    }
  };

  useEffect(() => {
    setAuth(getAuthFromStorage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'auth') setAuth(getAuthFromStorage());
    };
    const onAuthChanged = () => setAuth(getAuthFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('authChanged', onAuthChanged as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('authChanged', onAuthChanged as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!auth?.token) {
        setNotifications([]);
        return;
      }

      try {
        const data = await getNotifications(auth.token);
        const pending = data.filter(item => item.status === 'Pending');
        setNotifications(pending);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setNotifications([]);
      }
    };

    loadNotifications();
  }, [auth?.token]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  return (
    <div className={`${isDarkMode ? 'bg-gray-900/50' : 'bg-white/80'} backdrop-blur-sm border-b ${t.cardBorder} px-6 py-4 flex items-center justify-between sticky top-0 z-40`}>
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 ${t.textSecondary} ${isDarkMode ? 'hover:text-white hover:bg-gray-800' : 'hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-colors`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setNotificationsOpen(prev => !prev)}
            className={`relative p-2 ${t.textSecondary} ${isDarkMode ? 'hover:text-white hover:bg-gray-800' : 'hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-colors`}
            aria-label="Provider notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-3 w-[440px] h-[500px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 flex flex-col overflow-hidden border border-slate-200/60">
                <div className="px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Notifications</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{unreadCount} unread messages</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                        <Bell className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">All clear!</p>
                      <p className="text-xs text-slate-400 mt-1">No new notifications</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notifications.map(note => (
                        <div
                          key={note.notification_id}
                          className={`relative group transition-all duration-500 ${note.status === 'Read' ? 'scale-95 opacity-0 h-0 my-0 overflow-hidden' : 'scale-100 opacity-100'}`}
                        >
                          <div className="relative bg-white rounded-xl p-4 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-200">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                                <h4 className="text-sm font-semibold text-slate-900 truncate">{note.subject}</h4>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">{formatTimeAgo(note.sent_at)}</span>
                            </div>

                            <p className="text-sm text-slate-600 leading-relaxed mb-3 pl-3.5">{note.message_body}</p>

                            <div className="flex items-center justify-between pl-3.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                  <span className="text-[10px] font-semibold text-slate-600">{note.sent_by.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className="text-xs text-slate-500 font-medium">{note.sent_by}</span>
                              </div>
                              <button
                                onClick={() => markAsRead(note.receipt_id)}
                                className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-all duration-200"
                              >
                                Mark read
                              </button>
                            </div>

                            {note.status === 'Read' && (
                              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl flex items-center justify-center border-2 border-emerald-400">
                                <div className="flex items-center gap-2.5 animate-[successPop_0.6s_ease-out]">
                                  <div className="relative">
                                    <div className="absolute inset-0 bg-emerald-400 rounded-full animate-[ripple_0.8s_ease-out]" />
                                    <div className="relative w-11 h-11 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 6L9 17L4 12" strokeDasharray="24" strokeDashoffset="24" style={{ animation: 'dash 0.5s ease-out forwards' }} />
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

        <div className={`flex items-center gap-3 pl-4 border-l ${t.cardBorder}`}>
          <div className="text-right">
            <div className={`${t.text} font-medium`}>{username}</div>
            <div className={`${t.textSecondary} text-sm`}>Provider</div>
          </div>
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-600 flex items-center justify-center ${t.text} font-bold`}>
            {username.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
