"use client";

import React from 'react';
import { BarChart3, MapPin, Calendar, Wallet, TrendingUp, Star, Settings, LogOut, Menu, X } from 'lucide-react';

interface SidebarProps {
  theme: any;
  isDarkMode: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  handleLogout: () => void;
}

export default function Sidebar({
  theme,
  isDarkMode,
  sidebarOpen,
  setSidebarOpen,
  currentPage,
  setCurrentPage,
  handleLogout
}: SidebarProps) {
  const t = theme;

  const menuItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'services', icon: MapPin, label: 'Services & Routes' },
    { id: 'bookings', icon: Calendar, label: 'Bookings' },
    { id: 'finances', icon: Wallet, label: 'Finances' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'reviews', icon: Star, label: 'Reviews' },
    { id: 'profile', icon: Settings, label: 'Profile' },
  ];

  return (
    <div className={`${sidebarOpen ? 'w-64' : 'w-20'} ${isDarkMode ? 'bg-gradient-to-b from-gray-900 to-gray-800' : 'bg-white border-r shadow-lg'} border-r ${t.cardBorder} transition-all duration-300 flex flex-col`}>
      <div className={`p-6 border-b ${t.cardBorder} flex items-center justify-between`}>
        {sidebarOpen && <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">NEXA</h2>}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`${t.textSecondary} ${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}>
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
              currentPage === item.id
                ? `bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg ${isDarkMode ? 'shadow-sky-500/50' : 'shadow-sky-300/50'}`
                : `${t.textSecondary} ${isDarkMode ? 'hover:bg-gray-800 hover:text-white' : 'hover:bg-gray-100 hover:text-gray-900'}`
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className={`p-4 border-t ${t.cardBorder}`}>
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 ${isDarkMode ? 'hover:bg-red-600/10' : 'hover:bg-red-50'} transition-colors`}>
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
