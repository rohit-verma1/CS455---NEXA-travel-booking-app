"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

// CSS styles definition
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

.country-dropdown {
  position: fixed;
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 100;
  border: 1px solid #e5e7eb;
}
`;

export type AuthPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function UserAuthPanel({ isOpen, onClose }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [isPhoneMode, setIsPhoneMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Refs for positioning dropdown
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Add global styles on client-side only
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = customStyles;
    document.head.appendChild(styleEl);
    
    return () => {
      // Clean up the style element when component unmounts
      styleEl.remove();
    };
  }, []);
  
  // Comprehensive list of international calling codes
  const countryCodes = [
    { code: "+1", country: "United States" },
    { code: "+1", country: "Canada" },
    { code: "+7", country: "Russia" },
    { code: "+20", country: "Egypt" },
    { code: "+27", country: "South Africa" },
    { code: "+30", country: "Greece" },
    { code: "+31", country: "Netherlands" },
    { code: "+32", country: "Belgium" },
    { code: "+33", country: "France" },
    { code: "+34", country: "Spain" },
    { code: "+36", country: "Hungary" },
    { code: "+39", country: "Italy" },
    { code: "+40", country: "Romania" },
    { code: "+41", country: "Switzerland" },
    { code: "+43", country: "Austria" },
    { code: "+44", country: "United Kingdom" },
    { code: "+45", country: "Denmark" },
    { code: "+46", country: "Sweden" },
    { code: "+47", country: "Norway" },
    { code: "+48", country: "Poland" },
    { code: "+49", country: "Germany" },
    { code: "+51", country: "Peru" },
    { code: "+52", country: "Mexico" },
    { code: "+53", country: "Cuba" },
    { code: "+54", country: "Argentina" },
    { code: "+55", country: "Brazil" },
    { code: "+56", country: "Chile" },
    { code: "+57", country: "Colombia" },
    { code: "+58", country: "Venezuela" },
    { code: "+60", country: "Malaysia" },
    { code: "+61", country: "Australia" },
    { code: "+62", country: "Indonesia" },
    { code: "+63", country: "Philippines" },
    { code: "+64", country: "New Zealand" },
    { code: "+65", country: "Singapore" },
    { code: "+66", country: "Thailand" },
    { code: "+81", country: "Japan" },
    { code: "+82", country: "South Korea" },
    { code: "+84", country: "Vietnam" },
    { code: "+86", country: "China" },
    { code: "+90", country: "Turkey" },
    { code: "+91", country: "India" },
    { code: "+92", country: "Pakistan" },
    { code: "+93", country: "Afghanistan" },
    { code: "+94", country: "Sri Lanka" },
    { code: "+95", country: "Myanmar" },
    { code: "+98", country: "Iran" },
    { code: "+212", country: "Morocco" },
    { code: "+213", country: "Algeria" },
    { code: "+216", country: "Tunisia" },
    { code: "+218", country: "Libya" },
    { code: "+220", country: "Gambia" },
    { code: "+221", country: "Senegal" },
    { code: "+222", country: "Mauritania" },
    { code: "+223", country: "Mali" },
    { code: "+234", country: "Nigeria" },
    { code: "+237", country: "Cameroon" },
    { code: "+254", country: "Kenya" },
    { code: "+255", country: "Tanzania" },
    { code: "+256", country: "Uganda" },
    { code: "+260", country: "Zambia" },
    { code: "+263", country: "Zimbabwe" },
    { code: "+351", country: "Portugal" },
    { code: "+352", country: "Luxembourg" },
    { code: "+353", country: "Ireland" },
    { code: "+354", country: "Iceland" },
    { code: "+355", country: "Albania" },
    { code: "+358", country: "Finland" },
    { code: "+359", country: "Bulgaria" },
    { code: "+370", country: "Lithuania" },
    { code: "+371", country: "Latvia" },
    { code: "+372", country: "Estonia" },
    { code: "+380", country: "Ukraine" },
    { code: "+381", country: "Serbia" },
    { code: "+385", country: "Croatia" },
    { code: "+386", country: "Slovenia" },
    { code: "+420", country: "Czech Republic" },
    { code: "+421", country: "Slovakia" },
    { code: "+880", country: "Bangladesh" },
    { code: "+886", country: "Taiwan" },
    { code: "+971", country: "United Arab Emirates" },
    { code: "+972", country: "Israel" },
    { code: "+977", country: "Nepal" },
    { code: "+966", country: "Saudi Arabia" },
    { code: "+968", country: "Oman" },
    { code: "+961", country: "Lebanon" },
  ];

  // Position dropdown when button is clicked
  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isCountryDropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.top - 250, // Position above the button
        left: rect.left
      });
    }
    
    setIsCountryDropdownOpen(!isCountryDropdownOpen);
  };
  
  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {      
      if (
        isCountryDropdownOpen && 
        dropdownRef.current && 
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay - dimmed without blur */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Country dropdown portal (outside sidebar to avoid overflow issues) */}
      {isCountryDropdownOpen && (
        <div 
          ref={dropdownRef}
          className="country-dropdown"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: '272px',
          }}
        >
          <div className="py-1">
            {countryCodes.map((country) => (
              <div 
                key={`${country.code}-${country.country}`} 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                onClick={() => {
                  setCountryCode(country.code);
                  setIsCountryDropdownOpen(false);
                }}
              >
                <span className="font-medium">{country.code}</span> 
                <span className="text-gray-500">{country.country}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Sidebar with animation */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-lg overflow-auto transform transition-transform duration-500 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"} auth-panel`}
        style={{animation: isOpen ? "slideIn 0.5s ease-in-out" : ""}}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 z-10"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 flex flex-col justify-center h-full py-20">
          <div className="mb-4">
            <h2 className="text-3xl text-center mb-2" style={{ fontWeight: 580 }}>Log in or sign up</h2>
          </div>
          
          <p className="text-gray-500 mb-8 text-center">
            Nexa – Experience the Next Era of Travel Booking
          </p>

          <div className="space-y-4">
            {/* Google login */}
            <Button 
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            {/* Microsoft login */}
            <Button 
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                <path fill="#7fba00" d="M12 1h10v10H12z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              Continue with Microsoft
            </Button>
            
            {/* Apple login */}
            <Button 
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.4-1.09-.41-2.09-.42-3.25 0-1.44.56-2.45.35-3.28-.47-2.42-2.41-3.5-8.36-1.38-12.04 1.06-1.82 2.68-2.88 4.25-2.88 1.32 0 2.44.86 3.22.86.75 0 2.19-.91 3.81-.78 1.84.15 3.26.98 4.11 2.51-3.64 2.2-3.05 6.45.35 8.38-.54 1.17-1.23 2.28-2.13 3.26-1.32 1.46-2.64 2.05-2.62.76z" />
                <path fill="currentColor" d="M12.03 6.3c-.83-1.17-.76-2.8.03-3.92.9-1.26 2.4-2.12 3.66-2.18.14 1.4-.41 2.75-1.3 3.71-.94 1-2.26 1.69-2.39 2.39z" />
              </svg>
              Continue with Apple
            </Button>
            
            {/* Phone/Email login toggle */}
            <Button 
              variant="outline"
              className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
              onClick={() => setIsPhoneMode(!isPhoneMode)}
            >
              {isPhoneMode ? (
                <>
                  {/* Email icon when in phone mode */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Continue with email
                </>
              ) : (
                <>
                  {/* Phone icon when in email mode */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Continue with phone
                </>
              )}
            </Button>
            
            {/* Divider */}
            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink-0 mx-4 text-gray-500">OR</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            {/* Email/Phone input */}
            {isPhoneMode ? (
              <div className="relative">
                <div className="flex rounded-full border border-gray-300 overflow-hidden">
                  <button 
                    ref={triggerRef}
                    type="button"
                    className="h-12 px-2 flex items-center justify-center gap-1 bg-gray-50 border-r border-gray-300 text-sm"
                    onClick={handleToggleDropdown}
                  >
                    {countryCode} <span className="ml-1">▼</span>
                  </button>
                  <input 
                    type="tel"
                    className="flex-1 h-12 pl-2 focus:outline-none text-lg"
                    placeholder="Phone number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => {
                      // Only allow numbers and restrict to 10 digits
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      if (value.length <= 10) {
                        setPhone(value);
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="relative">
                <Input 
                  type="email"
                  className="w-full h-12 pl-4 pr-10 rounded-full border-gray-300 text-lg"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {email && (
                  <span className="absolute right-3 top-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0066FF" strokeWidth="2" />
                      <path d="M12 2V12L17 17" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>
            )}
            
            {/* Continue button */}
            <Button 
              className="w-full h-12 bg-black hover:bg-gray-800 text-white rounded-full"
            >
              Continue
            </Button>
            
            {/* Terms and Privacy */}
            <div className="flex justify-center space-x-4 mt-8 text-sm">
              <a href="#" className="text-gray-600 hover:underline">Terms of Use</a>
              <span className="text-gray-400">|</span>
              <a href="#" className="text-gray-600 hover:underline">Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Also export the component with the original name for backward compatibility
export const UserAuthSidebar = UserAuthPanel;
