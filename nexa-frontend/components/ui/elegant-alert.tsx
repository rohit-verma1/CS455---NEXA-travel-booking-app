"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface ElegantAlertProps {
  message: string;
  type?: "error" | "success" | "warning";
  onClose?: () => void;
  duration?: number; // auto-close after this many ms (0 = no auto-close)
}

export function ElegantAlert({ 
  message, 
  type = "error", 
  onClose,
  duration = 0 
}: ElegantAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // wait for fade-out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const colors = {
    error: {
      bg: "bg-rose-50/95",
      border: "border-rose-200",
      text: "text-rose-700",
      icon: "text-rose-500"
    },
    success: {
      bg: "bg-emerald-50/95",
      border: "border-emerald-200",
      text: "text-emerald-700",
      icon: "text-emerald-500"
    },
    warning: {
      bg: "bg-amber-50/95",
      border: "border-amber-200",
      text: "text-amber-700",
      icon: "text-amber-500"
    }
  };

  const style = colors[type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg transition-all duration-300 w-[90%] mx-auto ${
        style.bg
      } ${style.border} ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {type === "success" ? (
          <CheckCircle size={20} />
        ) : (
          <AlertCircle size={20} />
        )}
      </div>
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
      {onClose && (
        <button
          onClick={handleClose}
          className={`flex-shrink-0 p-1 rounded-md hover:bg-white/50 transition-colors ${style.icon}`}
          aria-label="Close alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
