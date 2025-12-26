"use client";

import { useState, useEffect } from "react";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [showPromotion, setShowPromotion] = useState(false);
  
  // Show promotion after a small delay to improve user experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPromotion(true);
    }, 2000); // 2 seconds delay
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}