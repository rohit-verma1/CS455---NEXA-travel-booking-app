"use client";

import { createContext, useContext, useState } from "react";

interface SidebarContextType {
  isOrionOpen: boolean;
  setIsOrionOpen: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOrionOpen, setIsOrionOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ isOrionOpen, setIsOrionOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}