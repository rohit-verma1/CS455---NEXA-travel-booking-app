"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Eye, EyeOff } from "lucide-react";

const customStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500&family=Raleway:wght@100;200;300;400;500&display=swap');

@keyframes slideIn {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(0);
  }
}

.auth-panel {
  font-family: 'Raleway', sans-serif;
}

.auth-panel h2 {
  font-weight: 300;
  letter-spacing: -0.5px;
}

.auth-panel p, .auth-panel button, .auth-panel input {
  font-family: 'Inter', sans-serif;
  font-weight: 300;
}

.auth-panel input::placeholder {
  font-weight: 300;
  color: #888;
}
`;

export type ProviderAuthPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ProviderAuthPanel({ isOpen, onClose }: ProviderAuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = customStyles;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-lg overflow-auto auth-panel"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 z-10"
        >
          <X size={20} />
        </button>

        {/* Main content */}
        <div className="p-6 flex flex-col justify-center h-full py-20">
          <div className="mb-4">
            <h2
              className="text-3xl text-center mb-2"
              style={{ fontWeight: 580 }}
            >
                Provider Log in
            </h2>
          </div>

          <p className="text-gray-500 mb-8 text-center">
            Nexa – Experience the Next Era of Travel Booking
          </p>

          <div className="space-y-4">
            {/* Email input */}
            <div className="relative">
              <Input
                type="email"
                className="w-full h-12 pl-4 pr-10 rounded-full border-gray-300 text-lg"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password input */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                className="w-full h-12 pl-4 pr-12 rounded-full border-gray-300 text-lg"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Continue button */}
            <Button className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-full">
              Continue
            </Button>

            {/* Footer */}
            <div className="flex justify-center flex-wrap gap-3 mt-8 text-sm text-gray-600">
              <a href="#" className="hover:underline">
                Terms of Use
              </a>
              <span className="text-gray-400">|</span>
              <a href="#" className="hover:underline">
                Privacy Policy
              </a>
              <span className="text-gray-400">|</span>
              <a href="#" className="hover:underline font-medium">
                Register
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const ProviderSidebar = ProviderAuthPanel;