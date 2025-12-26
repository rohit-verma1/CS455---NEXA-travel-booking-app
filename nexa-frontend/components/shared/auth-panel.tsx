"use client";

import { useState, useEffect, useRef, KeyboardEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { API } from "@/app/api";
import { setAuthStorage } from "@/utils/authStorage";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { PublicClientApplication } from "@azure/msal-browser";
import {
  X,
  ArrowLeft,
  User,
  Handshake,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { ElegantAlert } from "@/components/ui/elegant-alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

/**
 * Full auth-panel.tsx
 * - Create account -> POST API.REGISTER -> if 200 => open verify view
 * - Verify view Continue -> POST API.VERIFY_OTP -> if 200 => POST API.LOGIN with email/password
 * - Normal login (when not creating account) Continue -> POST API.LOGIN
 *
 * Preserves layout and other views; only augments the flows described.
 */

/* --- Styles (your existing styles preserved) --- */
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

@keyframes buttonPulse {
  0%, 100% {
    background-color: #000000;
  }
  50% {
    background-color: #4b5563;
  }
}

.loading-button {
  animation: buttonPulse 1.5s ease-in-out infinite;
  pointer-events: none;
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
  letter-spacing: 0.05px;
}

/* Inputs with left icon */
.input-with-icon {
  position: relative;
}

.input-with-icon .left-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280; /* gray-500 */
}

/* Right icon button (eye) */
.input-with-icon .right-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
}

/* ensure the input text does not overlap icons */
.input-with-icon input {
  padding-left: 44px; /* space for left icon */
  padding-right: 44px; /* space for right button */
}

/* Adjust spacing only for email and password inputs (inside consumer view) */
.input-with-icon.email-icon .left-icon {
  left: 20px;
}

.input-with-icon.password-icon .left-icon {
  left: 20px;
}

.input-with-icon.email-icon input,
.input-with-icon.password-icon input {
  padding-left: 50px;
}

/* Elegant OTP input styling */
.otp-input {
  width: 60px;
  height: 64px;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  background: linear-gradient(145deg, #ffffff, #f9fafb);
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  font-family: 'Inter', monospace;
  letter-spacing: 0.05em;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.otp-input:focus {
  border-color: #3b82f6;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}
.otp-input:not(:placeholder-shown) {
  border-color: #10b981;
  background: linear-gradient(145deg, #f0fdf4, #ffffff);
}
`;

/* --- Helpers --- */

// Read csrf token from cookies (Django default name: csrftoken)
function getCsrfTokenFromCookies(): string | null {
  if (typeof document === "undefined") return null;
  const name = "csrftoken=";
  const raw = document.cookie.split(";").map((c) => c.trim());
  for (const part of raw) {
    if (part.startsWith(name)) {
      return decodeURIComponent(part.slice(name.length));
    }
  }
  return null;
}

/* --- Types --- */
export type AuthPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  initialView?: "role" | "consumer" | "provider" | "admin" | "verify";
};

export function AuthPanel({ isOpen, onClose }: AuthPanelProps) {
  // customer registration
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [username, setUsername] = useState("");
  // initialView support
  const initialView = arguments[0]?.initialView;

  // expansion / register transition state
  const [isExpanding, setIsExpanding] = useState(false);
  const [showRegLayer, setShowRegLayer] = useState(false);
  const router = useRouter();

  // Admin-specific state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminShowPassword, setAdminShowPassword] = useState(false);
    // Admin 2FA state
    const [adminOtp, setAdminOtp] = useState("");
    const [adminOtpError, setAdminOtpError] = useState("");
    const [isAdminOtpLoading, setIsAdminOtpLoading] = useState(false);
    const [isAdminOtpStep, setIsAdminOtpStep] = useState(false);

  // Provider-specific state
  const [providerEmail, setProviderEmail] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [providerShowPassword, setProviderShowPassword] = useState(false);

  // Alert state (unified for all views)
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success" | "warning">("error");

  // --- Shared state used by the consumer login UI (EMAIL + PASSWORD) ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // keep password so we can login after verify
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // submit lock

  // view state: 'role' | 'consumer' | 'provider' | 'admin' | 'verify'
  const [view, setView] = useState<
    "role" | "consumer" | "provider" | "admin" | "verify"
  >(initialView ?? "role");

  // If initialView changes while open, update view
  useEffect(() => {
    if (isOpen && initialView && initialView !== view) {
      setView(initialView);
    }
  }, [initialView, isOpen]);

  // OTP / verification
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(30);
  const [isResendAllowed, setIsResendAllowed] = useState(false);
  
  // Loading states for buttons
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [isVerifyLoading, setIsVerifyLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordView, setForgotPasswordView] = useState<"consumer" | "provider" | "admin" | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  // refs
  const resendIntervalRef = useRef<number | null>(null);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null);
  const consumerSubmitButtonRef = useRef<HTMLButtonElement | null>(null);

  // inject styles client-side
  useEffect(() => {
    const el = document.createElement("style");
    el.innerHTML = customStyles;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, []);

  // reset view when closed
  useEffect(() => {
    if (!isOpen) {
      setView("role");
    }
  }, [isOpen]);

  // cleanup resend interval on unmount
  useEffect(() => {
    return () => {
      if (resendIntervalRef.current) {
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Start resend timer safely (used after registration or on manual resend)
  const startResendTimer = (seconds = 60) => {
    setResendSeconds(seconds);
    setIsResendAllowed(false);
    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
    resendIntervalRef.current = window.setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          if (resendIntervalRef.current) {
            clearInterval(resendIntervalRef.current);
            resendIntervalRef.current = null;
          }
          setIsResendAllowed(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // resend OTP (calls backend; adjust endpoint as necessary)
  const resendOtp = async () => {
    if (!isResendAllowed) return;
    try {
      const csrf = getCsrfTokenFromCookies();
      
      // Determine the OTP type based on context
      let otpType = "customer";
      if (isForgotPassword) {
        // For forgot password, send to forgot-password endpoint instead
        const res = await fetch(API.FORGOT_PASSWORD, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
          },
          body: JSON.stringify({ email: pendingEmail }),
        });

        if (res.ok) {
          setShowResendConfirmation(true);
          setTimeout(() => setShowResendConfirmation(false), 5000);
          startResendTimer(60);
        }
        return;
      }
      
      // For registration, use resend-otp endpoint
      const res = await fetch(API.RESEND_OTP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: pendingEmail, otp_type: otpType }),
      });

      if (res.ok) {
        // Show "Sent New OTP" confirmation
        setShowResendConfirmation(true);
        
        // Reset to "Resend OTP" after 5 seconds
        setTimeout(() => {
          setShowResendConfirmation(false);
        }, 5000);
        
        // Start fresh 60-second timer
        startResendTimer(60);
      }
    } catch (err) {
      console.error("resend error", err);
    }
  };

  // Handle register transition for provider/admin
  const handleRegisterTransition = (path: string, delay: number) => {
    setIsExpanding(true);
    setTimeout(() => {
      onClose();
      router.push(path);
    }, delay);
  };

  // Handle forgot password - validates email and calls API
  const handleForgotPassword = async (viewType: "consumer" | "provider" | "admin") => {
    setAlertMessage(""); // clear previous alerts
    
    let emailToUse = "";
    if (viewType === "provider") {
      emailToUse = providerEmail;
    } else if (viewType === "admin") {
      emailToUse = adminEmail;
    } else {
      emailToUse = email;
    }

    // Validation: check if email is filled
    if (!emailToUse) {
      setAlertType("error");
      setAlertMessage("Please enter your email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const csrf = getCsrfTokenFromCookies();
      
      const res = await fetch(API.FORGOT_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAlertType("error");
        setAlertMessage(data?.detail || "Failed to send reset code. Try again.");
        setIsSubmitting(false);
        return;
      }

      // Success - OTP sent to email
      setPendingEmail(emailToUse);
      setIsForgotPassword(true);
      setForgotPasswordView(viewType);
      setOtpValue("");
      setOtpError("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setView("verify");

      // start resend timer
      startResendTimer(60);

      setIsSubmitting(false);
    } catch (err) {
      console.error("Forgot password error:", err);
      setAlertType("error");
      setAlertMessage("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Unified login handler - stores token and redirects based on user_type
  const unifiedLogin = async (emailVal: string, passwordVal: string) => {
    try {
      setIsSubmitting(true);
      setIsLoginLoading(true);
      setAlertMessage(""); // clear any previous alerts
      
      const csrf = getCsrfTokenFromCookies();
      const res = await fetch(API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAlertType("error");
        setAlertMessage(data?.detail || "Login failed. Check your credentials.");
        setIsSubmitting(false);
        setIsLoginLoading(false);
        return;
      }

      // Success: store auth data
      setAuthStorage({
        token: data.token,
        user_id: data.user_id,
        user_type: data.user_type,
        username: data.username,
        email: data.email,
      }, 30);

      // notify same-tab listeners (Navbar listens for this)
      window.dispatchEvent(new Event("authChanged"));

      // Redirect based on user_type
      const redirectMap: Record<string, string> = {
        customer: "/",
        provider: "/provider",
        admin: "/admin",
      };
      
      const redirectPath = redirectMap[data.user_type] || "/";
      
      setIsSubmitting(false);
      setIsLoginLoading(false);
      onClose();
      router.push(redirectPath);
    } catch (err) {
      console.error("login error", err);
      setAlertType("error");
      setAlertMessage("Network error. Please try again.");
      setIsSubmitting(false);
      setIsLoginLoading(false);
    }
  };

  // Provider login handler
  const handleProviderLogin = async () => {
    setAlertMessage(""); // clear previous alerts
    
    // Validation: check if fields are filled
    if (!providerEmail || !providerPassword) {
      setAlertType("error");
      setAlertMessage("Please fill in all fields");
      return;
    }

    // Validation: check password length
    if (providerPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password contains aleast 8 characters");
      return;
    }

    await unifiedLogin(providerEmail, providerPassword);
  };

  // Password blur handler for provider
  const handleProviderPasswordBlur = () => {
    if (providerPassword && providerPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password contains atleast 8 characters");
    }
  };

  // Admin login handler
  const handleAdminLogin = async () => {
    setAlertMessage(""); // clear previous alerts
    
    // Validation: check if fields are filled
    if (!adminEmail || !adminPassword) {
      setAlertType("error");
      setAlertMessage("Please fill in all fields");
      return;
    }

    // Validation: check password length
    if (adminPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must contain at least 8 characters");
      return;
    }

      // Admin 2FA flow
      setIsSubmitting(true);
      setIsLoginLoading(true);
      setAlertMessage("");
      setAdminOtp("");
      setAdminOtpError("");
      try {
        const csrf = getCsrfTokenFromCookies();
        const res = await fetch("http://127.0.0.1:8000/auth/login/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
          },
          body: JSON.stringify({ email: adminEmail, password: adminPassword }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setAlertType("error");
          setAlertMessage(data?.detail || "Login failed. Check your credentials.");
          setIsSubmitting(false);
          setIsLoginLoading(false);
          return;
        }
        // If 2FA required, show OTP input
        if (data?.message?.includes("2FA OTP sent")) {
          setIsAdminOtpStep(true);
          setIsSubmitting(false);
          setIsLoginLoading(false);
          return;
        }
        // If login succeeded without 2FA (should not happen for admin)
        if (data?.token) {
          setAuthStorage({
            token: data.token,
            user_id: data.user_id,
            user_type: data.user_type,
            username: data.username,
            email: data.email,
          }, 30);
          window.dispatchEvent(new Event("authChanged"));
          setIsSubmitting(false);
          setIsLoginLoading(false);
          onClose();
          router.push("/admin");
          return;
        }
        setAlertType("error");
        setAlertMessage("Unexpected response. Please try again.");
        setIsSubmitting(false);
        setIsLoginLoading(false);
      } catch (err) {
        console.error("admin login error", err);
        setAlertType("error");
        setAlertMessage("Network error. Please try again.");
        setIsSubmitting(false);
        setIsLoginLoading(false);
      }
    try {
      setIsSubmitting(true);
      setIsLoginLoading(true);
      const csrf = getCsrfTokenFromCookies();
      
      const res = await fetch(API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAlertType("error");
        setAlertMessage(data?.detail || "Login failed. Check your credentials.");
        setIsSubmitting(false);
        setIsLoginLoading(false);
        return;
      }

      // Check if 2FA OTP is required (admin-specific)
      if (data.message && data.message.includes("2FA OTP sent to email")) {
        // Admin 2FA flow - go to verify view
        setPendingEmail(adminEmail);
        setPassword(adminPassword); // Store password for potential use
        setOtpValue("");
        setOtpError("");
        setView("verify");
        startResendTimer(60);
        setIsSubmitting(false);
        setIsLoginLoading(false);
        return;
      }

      // Regular login flow (non-admin or no 2FA)
      setAuthStorage({
        token: data.token,
        user_id: data.user_id,
        user_type: data.user_type,
        username: data.username,
        email: data.email,
      }, 30);

      window.dispatchEvent(new Event("authChanged"));

      const redirectMap: Record<string, string> = {
        customer: "/",
        provider: "/provider",
        admin: "/admin",
      };
      
      const redirectPath = redirectMap[data.user_type] || "/";
      
      setIsSubmitting(false);
      setIsLoginLoading(false);
      onClose();
      router.push(redirectPath);
    } catch (err) {
      console.error("Admin login error:", err);
      setAlertType("error");
      setAlertMessage("Network error. Please try again.");
      setIsSubmitting(false);
      setIsLoginLoading(false);
    }
  };

  // Password blur handler for admin
  const handleAdminPasswordBlur = () => {
    if (adminPassword && adminPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password contains atleast 8 characters");
    }
  };

  const getConsumerInputOrder = () => {
    const orderedRefs: Array<RefObject<HTMLInputElement>> = [];
    if (isCreatingAccount) {
      orderedRefs.push(usernameInputRef);
    }
    orderedRefs.push(emailInputRef, passwordInputRef);
    if (isCreatingAccount) {
      orderedRefs.push(confirmPasswordInputRef);
    }
    return orderedRefs;
  };

  const areConsumerFieldsFilled = () => {
    const hasBasicFields = email.trim().length > 0 && password.trim().length > 0;
    if (!isCreatingAccount) return hasBasicFields;
    return (
      hasBasicFields &&
      username.trim().length > 0 &&
      confirmPassword.trim().length > 0
    );
  };

  const handleConsumerInputEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (!event.currentTarget.value.trim()) return;
    event.preventDefault();
    const orderedRefs = getConsumerInputOrder();
    const currentIndex = orderedRefs.findIndex(
      (ref) => ref.current === event.currentTarget
    );

    if (currentIndex === -1) return;

    const nextRef = orderedRefs.slice(currentIndex + 1).find((ref) => ref.current);

    if (nextRef?.current) {
      nextRef.current.focus();
      return;
    }

    if (areConsumerFieldsFilled()) {
      consumerSubmitButtonRef.current?.click();
    }
  };
    // Admin OTP verify handler
    const handleAdminOtpVerify = async () => {
      setAdminOtpError("");
      if (adminOtp.length < 6) {
        setAdminOtpError("Please enter the 6-digit OTP");
        return;
      }
      setIsAdminOtpLoading(true);
      setIsSubmitting(true);
      try {
        const csrf = getCsrfTokenFromCookies();
        const res = await fetch("http://127.0.0.1:8000/auth/verify-otp/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
          },
          body: JSON.stringify({ email: adminEmail, otp: adminOtp }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setAdminOtpError(data?.detail || "OTP verification failed. Try again.");
          setIsAdminOtpLoading(false);
          setIsSubmitting(false);
          return;
        }
        // Success: store credentials and login
        setAuthStorage({
          token: data.token,
          user_id: data.user_id,
          user_type: data.user_type,
          username: data.username,
          email: data.email,
        }, 30);
        window.dispatchEvent(new Event("authChanged"));
        setIsAdminOtpLoading(false);
        setIsSubmitting(false);
        setIsAdminOtpStep(false);
        onClose();
        router.push("/admin/home");
      } catch (err) {
        console.error("admin otp verify error", err);
        setAdminOtpError("Network error. Please try again.");
        setIsAdminOtpLoading(false);
        setIsSubmitting(false);
      }
    };

const handleGoogleLogin = async (credentialResponse: any) => {
  const token = credentialResponse?.credential;
  if (!token) return;

  try {
    const res = await fetch("http://127.0.0.1:8000/auth/google-login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Google login failed", data);
      alert(data?.error || "Google login failed");
      return;
    }

    const { email, username, user_type, user_id, token: sessionToken } = data;

    // Always log in directly, no OTP verification
    setAuthStorage(
      { token: sessionToken, email, username, user_type, user_id },
      30 // expiry in minutes
    );
    window.dispatchEvent(new Event("authChanged"));
    onClose();
    router.push("/");

  } catch (err) {
    console.error("Google login network error", err);
    alert("Network error during Google login");
  }
};


const msalInstance = new PublicClientApplication({
  auth: {
    clientId: "1e2cd3e9-8bb1-4651-aa16-c9af8fcec247",
    redirectUri: "http://localhost:3000",
  },
});

const handleMicrosoftLogin = async () => {
  try {
    // Initialize MSAL if not yet initialized
    await msalInstance.initialize?.();

    // Trigger popup login
    const loginResponse = await msalInstance.loginPopup({
      scopes: ["User.Read"],
    });

    const accessToken = loginResponse.accessToken;

    // Send token to backend
    const res = await fetch(API.MICROSOFT_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: accessToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Microsoft login failed:", data);
      alert(data?.detail || "Microsoft login failed");
      return;
    }

    if (!data.created) {
      // Existing user → log them in directly
      setAuthStorage({
        token: data.token,
        user_id: data.user_id,
        user_type: data.user_type,
        username: data.username,
        email: data.email,
      }, 30);

      window.dispatchEvent(new Event("authChanged"));
      router.push("/");
      onClose();
    } else {
      // New user → start OTP verification
      setPendingEmail(data.email);
      setView("verify");
      startResendTimer(); // optional: start resend OTP timer
    }
  } catch (err) {
    console.error("Microsoft login error:", err);
    alert("Microsoft login error. Check console for details.");
  }
};

// const handleGithubLogin = async () => {
//   try {
//     const clientId = "Ov23liwnlUiV4INZuhgd";
//     const redirectUri = "http://localhost:3000"; // must match GitHub app & backend
//     const backendUrl = "http://127.0.0.1:8000/auth/github-login/";

//     // 1️⃣ Detect if we came back from GitHub
//     const urlParams = new URLSearchParams(window.location.search);
//     const code = urlParams.get("code");

//     if (!code) {
//       // 2️⃣ Redirect user to GitHub OAuth page
//       const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
//       window.location.href = githubAuthUrl;
//       return;
//     }

//     // 3️⃣ Code exists → call backend
//     const res = await fetch(backendUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ code }),
//     });

//     if (!res.ok) {
//       const text = await res.text();
//       throw new Error(text || "GitHub login failed");
//     }

//     const data = await res.json();
//     const { created, email, username, user_type, token: sessionToken } = data;

//     if (created) {
//       // New user → OTP/verification flow
//       setPendingEmail(email);
//       setView("verify");
//       startResendTimer(60);
//     } else {
//       // Existing user → login directly
//       setAuthStorage({ token: sessionToken, email, username, user_type }, 30);
//       window.dispatchEvent(new Event("authChanged"));
//       onClose();
//       router.push("/");
//     }

//     // 4️⃣ Clean URL (?code removed)
//     window.history.replaceState({}, document.title, window.location.pathname);

//   } catch (err: any) {
//     console.error("GitHub login error", err);
//     alert(err.message || "Network error during GitHub login");
//   }
// };

const handleGithubLogin = () => {
  const clientId = "Ov23liwnlUiV4INZuhgd";
  const redirectUri = "http://localhost:3000/github-popup";
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;

  const width = 600, height = 700;
  const left = Math.round(window.screen.width / 2 - width / 2);
  const top = Math.round(window.screen.height / 2 - height / 2);

  const popup = window.open(
    githubAuthUrl,
    "GitHubLogin",
    `width=${width},height=${height},top=${top},left=${left}`
  );

  const listener = (event: MessageEvent) => {
  if (event.origin !== window.location.origin) return;

  const { token, email, username, user_type, user_id, error } = event.data || {}; // ✅ added user_id

  if (token) {
    console.log("✅ GitHub login success:", event.data);
    setAuthStorage({ token, email, username, user_type, user_id }, 30); // ✅ now defined
    window.dispatchEvent(new Event("authChanged"));
    onClose();
    router.push("/");
  } else {
    console.error("❌ GitHub login failed:", error || event.data);
    alert("GitHub login failed. Check console for details.");
  }

  window.removeEventListener("message", listener);
};

  window.addEventListener("message", listener);
};






  // Verify OTP endpoint: if success, then login the user automatically
  const verifyOtpAndLogin = async () => {
    setOtpError("");
    if (otpValue.length < 6) {
      setOtpError("Please enter the 6-digit code");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsVerifyLoading(true);
      const csrf = getCsrfTokenFromCookies();
      const res = await fetch(API.VERIFY_OTP, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: pendingEmail, otp: otpValue }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setOtpError(data?.detail || "OTP verification failed. Try again.");
        setIsSubmitting(false);
        setIsVerifyLoading(false);
        return;
      }

      // Check if this is an admin 2FA completion (has token in response)
      if (data.token && data.user_type === "admin") {
        // Admin 2FA completion - store auth data directly from verify response
        setAuthStorage({
          token: data.token,
          user_id: data.user_id,
          user_type: data.user_type,
          username: data.username,
          email: data.email,
        }, 30);

        // notify same-tab listeners
        window.dispatchEvent(new Event("authChanged"));

        // Close sidebar and navigate to admin home
        setIsSubmitting(false);
        setIsVerifyLoading(false);
        onClose();
        router.push("/admin/home");
        return;
      }

      // Regular customer registration flow - OTP verified, now login
      // Use the password that the user supplied during registration (we kept it in state)
      const loginRes = await fetch(API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email: pendingEmail, password }),
      });

      const loginData = await loginRes.json().catch(() => null);

      if (!loginRes.ok) {
        // OTP verified but login failed — show an error and return to consumer view
        alert(loginData?.detail || "OTP verified but login failed. Try signing in.");
        setView("consumer");
        setIsSubmitting(false);
        setIsVerifyLoading(false);
        return;
      }

      // Successfully logged in — store auth data and notify Navbar
      setAuthStorage({
        token: loginData.token,
        user_id: loginData.user_id,
        user_type: loginData.user_type,
        username: loginData.username,
        email: loginData.email,
      }, /*ttlDays=*/ 30); // set TTL days as you like

      // notify same-tab listeners
      window.dispatchEvent(new Event("authChanged"));

      // Close sidebar and navigate
      setIsSubmitting(false);
      setIsVerifyLoading(false);
      onClose();
      router.push("/");
    } catch (err) {
      console.error("verify+login error", err);
      setOtpError("Network error. Please try again.");
      setIsSubmitting(false);
      setIsVerifyLoading(false);
    }
  };

  // Handle reset password - validates passwords and calls API
  const handleResetPassword = async () => {
    setOtpError("");
    
    // Validation: check OTP
    if (otpValue.length < 6) {
      setOtpError("Please enter the 6-digit code");
      return;
    }

    // Validation: check if passwords are filled
    if (!resetNewPassword || !resetConfirmPassword) {
      setOtpError("Please fill in all password fields");
      return;
    }

    // Validation: check password length
    if (resetNewPassword.length < 8) {
      setOtpError("Password must contain at least 8 characters");
      return;
    }

    // Validation: check if passwords match
    if (resetNewPassword !== resetConfirmPassword) {
      setOtpError("Passwords do not match");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsVerifyLoading(true);
      const csrf = getCsrfTokenFromCookies();
      
      const res = await fetch(API.RESET_PASSWORD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ 
          email: pendingEmail, 
          otp: otpValue,
          new_password: resetNewPassword 
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOtpError(data?.detail || "Password reset failed. Try again.");
        setIsSubmitting(false);
        setIsVerifyLoading(false);
        return;
      }

      // Success - password reset
      setAlertType("success");
      setAlertMessage("Password reset successful! Please log in with your new password.");
      
      // Reset states
      setIsSubmitting(false);
      setIsVerifyLoading(false);
      setIsForgotPassword(false);
      setOtpValue("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      
      // Redirect back to the view they came from
      setTimeout(() => {
        setAlertMessage(""); // clear success message
        if (forgotPasswordView) {
          setView(forgotPasswordView);
        } else {
          setView("consumer");
        }
        setForgotPasswordView(null);
      }, 3000); // Show success message for 3 seconds
      
    } catch (err) {
      console.error("Reset password error:", err);
      setOtpError("Network error. Please try again.");
      setIsSubmitting(false);
      setIsVerifyLoading(false);
    }
  };

  // Standard login flow (when not creating account)
  const handleLogin = async () => {
    setPasswordError("");
    setAlertMessage(""); // clear previous alerts
    
    // Validation: check if fields are filled
    if (!email || !password) {
      setAlertType("error");
      setAlertMessage("Please fill in all fields");
      return;
    }

    // Validation: check password length
    if (password.length < 8) {
      setAlertType("error");
      setAlertMessage("Password contains at least 8 characters");
      return;
    }

    await unifiedLogin(email, password);
  };

  // Password blur handler for consumer (password field)
  const handleConsumerPasswordBlur = () => {
    if (password && password.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must contain at least 8 characters");
    }
  };

  // Password blur handler for consumer (confirm password field)
  const handleConfirmPasswordBlur = () => {
    if (confirmPassword && confirmPassword.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must contain at least 8 characters");
    }
  };

  // Username change handler - restrict to alphanumeric, 6-15 characters
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, ""); // Remove special chars and spaces
    if (value.length <= 15) {
      setUsername(value);
      if (alertMessage) setAlertMessage("");
    }
  };

  // Initiate registration (+opening verify view if 200)
  const handleRegister = async () => {
    setPasswordError("");
    setAlertMessage(""); // clear previous alerts

    // 1. Check if all fields are filled
    if (!username || !email || !password || !confirmPassword) {
      setAlertType("error");
      setAlertMessage("Please fill in all fields");
      return;
    }

    // 2. Check password length and match
    if (password.length < 8) {
      setAlertType("error");
      setAlertMessage("Password must contain at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setAlertType("error");
      setAlertMessage("Password and Confirm Password do not match");
      return;
    }

    // 3. Check username length (min 6 characters)
    if (username.length < 6) {
      setAlertType("error");
      setAlertMessage("Username must be at least 6 characters long");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsRegisterLoading(true);
      const csrf = getCsrfTokenFromCookies();

      // 3. Check if username is available
      const usernameCheckRes = await fetch(API.CHECK_USERNAME, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ username }),
      });

      const usernameData = await usernameCheckRes.json().catch(() => ({}));

      if (!usernameData.available) {
        setAlertType("error");
        setAlertMessage("Provided Username Already Exists");
        setIsSubmitting(false);
        setIsRegisterLoading(false);
        return;
      }

      // 4. Check if email is available
      const emailCheckRes = await fetch(API.CHECK_EMAIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ email }),
      });

      const emailData = await emailCheckRes.json().catch(() => ({}));

      if (!emailData.available) {
        setAlertType("error");
        setAlertMessage("Provided Email ID has already been registered");
        setIsSubmitting(false);
        setIsRegisterLoading(false);
        return;
      }

      // All validations passed, proceed with registration
      const res = await fetch(API.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRFTOKEN": csrf } : {}),
        },
        body: JSON.stringify({ username, email, password, user_type: "customer" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Registration failed:", data);
        setAlertType("error");
        setAlertMessage(data?.detail || "Registration failed. Try again.");
        setIsSubmitting(false);
        setIsRegisterLoading(false);
        return;
      }

      // Registration OK (200). Backend should send OTP to email.
      setPendingEmail(email);
      // keep `password` intact so we can login after OTP verification
      setOtpValue("");
      setOtpError("");
      setIsCreatingAccount(false);
      setView("verify");

      // start resend timer
      startResendTimer(60);

      setIsSubmitting(false);
      setIsRegisterLoading(false);
    } catch (err) {
      console.error("Registration error:", err);
      setAlertType("error");
      setAlertMessage("Network error. Please try again.");
      setIsSubmitting(false);
      setIsRegisterLoading(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <>
      {!isExpanding && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 h-full bg-white z-50 shadow-lg overflow-hidden auth-panel transition-[max-width] duration-[1000ms] ease-[cubic-bezier(0.77,0,0.175,1)] ${
          isExpanding ? "right-0 max-w-[100vw] w-full" : "right-0 max-w-[430px] w-full"
        }`}
        style={{
          willChange: "max-width",
          animation: isOpen && !isExpanding ? "slideIn 0.5s ease-in-out" : "none",
        }}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 z-10">
          <X size={20} />
        </button>

        {/* Back arrow when not role */}
        {view !== "role" && (
          <button
            onClick={() => setView("role")}
            className="absolute left-4 top-4 p-2 rounded-full hover:bg-gray-100 z-10 flex items-center gap-2"
            aria-label="Back to role selection"
          >
            <ArrowLeft size={18} /> Back
          </button>
        )}

        <div
          className={`p-4 flex flex-col justify-center h-full py-20 transition-opacity duration-500 ease-in-out mx-auto max-w-md w-full ${
            isExpanding ? "opacity-0" : "opacity-100"
          }`}
        >
          {view === "role" ? (
            <div className="p-6 flex flex-col justify-center h-full py-20">
              <div className="mb-4">
                <h2 className="text-3xl text-center mb-2" style={{ fontWeight: 580 }}>Log in or sign up</h2>
              </div>

              <p className="text-gray-500 mb-8 text-center">
                Nexa – Experience the Next Era of Travel Booking
              </p>

              <div className="space-y-4 px-6">
                <Button
                  variant="outline"
                  className="w-[calc(100%+4rem)] -mx-8 h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
                  onClick={() => setView("consumer")}
                >
                  <User size={18} />
                  Continue as Traveller
                </Button>

                <Button
                  variant="outline"
                  className="w-[calc(100%+4rem)] -mx-8 h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
                  onClick={() => setView("provider")}
                >
                  <Handshake size={18} />
                  Continue as Provider
                </Button>

                <Button
                  variant="outline"
                  className="w-[calc(100%+4rem)] -mx-8 h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
                  onClick={() => setView("admin")}
                >
                  <ShieldCheck size={18} />
                  Continue as Admin
                </Button>

                <div className="flex justify-center space-x-4 mt-8 text-sm">
                  <a href="#" className="text-gray-600 hover:underline">Terms of Use</a>
                  <span className="text-gray-400">|</span>
                  <a href="#" className="text-gray-600 hover:underline">Privacy Policy</a>
                </div>
              </div>
            </div>
          ) : view === "consumer" ? (
            <div className="p-6 flex flex-col justify-center h-full py-20">
              <div className="mb-4">
                <h2 className="text-3xl text-center mb-2" style={{ fontWeight: 580 }}>Log in or sign up</h2>
              </div>

              <p className="text-gray-500 mb-8 text-center">
                Nexa – Experience the Next Era of Travel Booking
              </p>

              <div className="space-y-4">
                {/* Alert Display */}
                {alertMessage && (
                  <ElegantAlert
                    message={alertMessage}
                    type={alertType}
                    onClose={() => setAlertMessage("")}
                  />
                )}

                {/* Social buttons unchanged */}


<GoogleLogin
  onSuccess={handleGoogleLogin}
  onError={() => console.error("Google login failed")}
  text="continue_with"
/>


                <Button
                  variant="outline"
                  className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
                  onClick={handleMicrosoftLogin}
                >
                  {/* Microsoft */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 23 23">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M1 12h10v10H1z"/>
                    <path fill="#7fba00" d="M12 1h10v10H12z"/>
                    <path fill="#ffb900" d="M12 12h10v10H12z"/>
                  </svg>
                  Continue with Microsoft
                </Button>


                <Button
  variant="outline"
  className="w-full h-12 border-gray-300 text-gray-700 flex items-center justify-center gap-3 rounded-full"
  onClick={handleGithubLogin}
>
  {/* GitHub SVG */}
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
    <path fill="#181717" d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.5-1.3-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1 .1 1.7.7 2 .9.1-.7.4-1.3.7-1.7-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1.7.9 1.2 2 1.2 3.2 0 4.6-2.7 5.5-5.3 5.9.4.3.7.9.7 1.8v2.6c0 .4.2.7.8.6A12 12 0 0 0 12 .3"/>
  </svg>
  Continue with GitHub
</Button>

                {/* Divider */}
                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-500">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* USERNAME (for create account) */}
                {isCreatingAccount && (
                  <div className="relative input-with-icon username-icon">
                    <div className="left-icon" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>

                    <input
                      type="text"
                      className="w-full h-12 rounded-full border border-gray-300 text-gray-700 text-lg"
                      placeholder="Username (6-15 characters)"
                      value={username}
                      onChange={handleUsernameChange}
                      onKeyDown={handleConsumerInputEnter}
                      aria-label="Username"
                      maxLength={15}
                      ref={usernameInputRef}
                    />
                  </div>
                )}

                {/* EMAIL */}
                <div className="relative input-with-icon email-icon">
                  <div className="left-icon" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <input
                    type="email"
                    className="w-full h-12 rounded-full border border-gray-300 text-gray-700 text-lg"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (alertMessage) setAlertMessage("");
                    }}
                    onKeyDown={handleConsumerInputEnter}
                    aria-label="Email address"
                    ref={emailInputRef}
                  />
                </div>

                {/* PASSWORD */}
                <div className="relative input-with-icon password-icon">
                  <div className="left-icon" aria-hidden>
                    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="10" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 10V7a5 5 0 0110 0v3"></path>
                      <circle cx="12" cy="15.5" r="1"></circle>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full h-12 rounded-full border border-gray-300 text-gray-700 text-lg"
                    placeholder={isCreatingAccount ? "Password (min 8 characters)" : "Password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                      if (alertMessage) setAlertMessage("");
                    }}
                    onKeyDown={handleConsumerInputEnter}
                    onBlur={handleConsumerPasswordBlur}
                    aria-label="Password"
                    autoComplete={isCreatingAccount ? "new-password" : "current-password"}
                    ref={passwordInputRef}
                  />
                  <button
                    type="button"
                    className="right-btn"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* CONFIRM PASSWORD (for create account only) */}
                {isCreatingAccount && (
                  <div className="relative input-with-icon password-icon">
                    <div className="left-icon" aria-hidden>
                      <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="10" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 10V7a5 5 0 0110 0v3"></path>
                        <circle cx="12" cy="15.5" r="1"></circle>
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="w-full h-12 rounded-full border border-gray-300 text-gray-700 text-lg"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (alertMessage) setAlertMessage("");
                      }}
                      onKeyDown={handleConsumerInputEnter}
                      onBlur={handleConfirmPasswordBlur}
                      aria-label="Confirm Password"
                      autoComplete="new-password"
                      ref={confirmPasswordInputRef}
                    />
                    <button
                      type="button"
                      className="right-btn"
                      onClick={() => setShowConfirmPassword((s) => !s)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {passwordError && (
                  <p className="text-red-500 text-sm mt-1 ml-3">{passwordError}</p>
                )}

                {/* Continue / Create account button */}
                <Button
                  ref={consumerSubmitButtonRef}
                  disabled={isSubmitting}
                  className={`w-full h-12 border-gray-300 text-white flex items-center justify-center gap-3 rounded-full ${
                    isRegisterLoading && isCreatingAccount 
                      ? "loading-button" 
                      : isLoginLoading && !isCreatingAccount
                      ? "loading-button"
                      : "bg-black hover:bg-gray-800"
                  }`}
                  onClick={async () => {
                    // if creating account -> register
                    if (isCreatingAccount) {
                      await handleRegister();
                    } else {
                      // normal login
                      await handleLogin();
                    }
                  }}
                >
                  {isRegisterLoading && isCreatingAccount 
                    ? "Creating New Account..." 
                    : isLoginLoading && !isCreatingAccount
                    ? "Logging In..."
                    : isCreatingAccount 
                    ? "Create account" 
                    : "Continue"}
                </Button>

                {/* Footer links */}
                <div className="flex justify-center space-x-4 mt-8 text-sm">
                  {isCreatingAccount ? (
                    <button
                      onClick={() => router.push("/user-manual")}
                      className="hover:underline font-medium text-gray-600"
                    >
                      User manual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleForgotPassword("consumer")}
                      className="hover:underline font-medium text-gray-600"
                    >
                      Forgot password?
                    </button>
                  )}
                  <span className="text-gray-400">|</span>
                  {isCreatingAccount ? (
                    <button
                      onClick={() => setIsCreatingAccount(false)}
                      className="hover:underline font-medium text-gray-600"
                    >
                      Have an account?
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsCreatingAccount(true)}
                      className="hover:underline font-medium text-gray-600"
                    >
                      Create account
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : view === "provider" ? (
            <div className="p-6 flex flex-col justify-center h-full py-20">
              <div className="mb-4">
                <h2 className="text-3xl text-center mb-2" style={{ fontWeight: 580 }}>
                  Log in or sign up
                </h2>
              </div>

              <p className="text-gray-500 mb-8 text-center">
                Nexa – Experience the Next Era of Travel Booking
              </p>

              <div className="space-y-4">
                {/* Alert Display */}
                {alertMessage && (
                  <ElegantAlert
                    message={alertMessage}
                    type={alertType}
                    onClose={() => setAlertMessage("")}
                  />
                )}

                <div className="relative">
                  <Input
                    type="email"
                    className="w-full h-12 pl-4 pr-10 rounded-full border-gray-300 text-lg"
                    placeholder="Email address"
                    value={providerEmail}
                    onChange={(e) => {
                      setProviderEmail(e.target.value);
                      if (alertMessage) setAlertMessage("");
                    }}
                  />
                </div>

                <div className="relative">
                  <Input
                    type={providerShowPassword ? "text" : "password"}
                    className="w-full h-12 pl-4 pr-12 rounded-full border-gray-300 text-lg"
                    placeholder="Password"
                    value={providerPassword}
                    onChange={(e) => {
                      setProviderPassword(e.target.value);
                      if (alertMessage) setAlertMessage("");
                    }}
                    onBlur={handleProviderPasswordBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setProviderShowPassword((s) => !s)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    aria-label={providerShowPassword ? "Hide password" : "Show password"}
                  >
                    {providerShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <Button
                  disabled={isSubmitting}
                  className={`w-full h-12 text-white rounded-full ${isLoginLoading ? "loading-button" : "bg-black hover:bg-gray-800"}`}
                  onClick={handleProviderLogin}
                >
                  {isLoginLoading ? "Logging In..." : "Continue"}
                </Button>

                <div className="flex justify-center flex-wrap gap-3 mt-8 text-sm text-gray-600">
                  <button
                    onClick={() => handleForgotPassword("provider")}
                    className="hover:underline font-medium text-gray-600"
                  >
                    Forgot Password?
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => handleRegisterTransition("/provider/register", 700)}
                    className="hover:underline font-medium"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>
          ) : view === "verify" ? (
            <div className="p-8 flex flex-col justify-center h-full py-20">
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-3xl text-center mb-3" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
                  Verify Your Email
                </h2>
                <p className="text-gray-500 text-base" style={{ fontWeight: 300 }}>
                  Enter the 6-digit code sent to
                </p>
                <p className="text-gray-800 font-medium mt-1">{pendingEmail}</p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center mb-6">
                <InputOTP 
                  maxLength={6} 
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    setOtpError("");
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Password fields for forgot password flow */}
              {isForgotPassword && (
                <div className="space-y-4 px-6 mb-6">
                  {/* New Password */}
                  <div className="relative">
                    <Input
                      type={showResetPassword ? "text" : "password"}
                      className="w-full h-12 pl-4 pr-12 rounded-full border-gray-300 text-lg"
                      placeholder="New Password (min 8 characters)"
                      value={resetNewPassword}
                      onChange={(e) => {
                        setResetNewPassword(e.target.value);
                        if (otpError) setOtpError("");
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((s) => !s)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                      aria-label={showResetPassword ? "Hide password" : "Show password"}
                    >
                      {showResetPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Confirm Password */}
                  <div className="relative">
                    <Input
                      type={showResetConfirmPassword ? "text" : "password"}
                      className="w-full h-12 pl-4 pr-12 rounded-full border-gray-300 text-lg"
                      placeholder="Confirm Password"
                      value={resetConfirmPassword}
                      onChange={(e) => {
                        setResetConfirmPassword(e.target.value);
                        if (otpError) setOtpError("");
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword((s) => !s)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                      aria-label={showResetConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showResetConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* resend / timer */}
              <div className="text-center mb-6 text-sm">
                {showResendConfirmation ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Sent New OTP
                  </div>
                ) : isResendAllowed ? (
                  <button 
                    onClick={resendOtp} 
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
                  >
                    Didn&apos;t receive the OTP? <span className="font-semibold">Resend</span>
                  </button>
                ) : (
                  <span className="text-gray-600">
                    Didn&apos;t receive the OTP? Resend in <span className="font-semibold text-orange-500">{resendSeconds}s</span>
                  </span>
                )}
              </div>

              {/* show otp error */}
              {otpError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-red-600 text-sm text-center font-medium">{otpError}</p>
                </div>
              )}

              {/* Verify button with loading animation */}
              <div className="px-6 mb-6">
                <Button
                  disabled={isSubmitting}
                  className={`w-full h-12 text-white rounded-full font-medium transition-all ${isVerifyLoading ? "loading-button" : "bg-black hover:bg-gray-800"}`}
                  onClick={isForgotPassword ? handleResetPassword : verifyOtpAndLogin}
                >
                  {isVerifyLoading ? "Verifying..." : "Verify & Continue"}
                </Button>
              </div>

              {/* Back button */}
              <div className="flex justify-center text-sm">
                <button 
                  onClick={() => {
                    // Reset forgot password states when going back
                    if (isForgotPassword) {
                      setIsForgotPassword(false);
                      setForgotPasswordView(null);
                      setResetNewPassword("");
                      setResetConfirmPassword("");
                      if (forgotPasswordView) {
                        setView(forgotPasswordView);
                      } else {
                        setView("consumer");
                      }
                    } else {
                      setView("consumer");
                    }
                  }} 
                  className="text-gray-600 hover:text-gray-800 hover:underline transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to sign in
                </button>
              </div>
            </div>
          ) : view === "admin" ? (
            <div className="p-6 flex flex-col justify-center h-full py-20">
              <div className="mb-4">
                <h2 className="text-3xl text-center mb-2" style={{ fontWeight: 580 }}>
                  Log in or sign up
                </h2>
              </div>

              <p className="text-gray-500 mb-8 text-center">
                Nexa – Experience the Next Era of Travel Booking
              </p>

              <div className="space-y-4">
                {/* Alert Display */}
                {alertMessage && (
                  <ElegantAlert
                    message={alertMessage}
                    type={alertType}
                    onClose={() => setAlertMessage("")}
                  />
                )}

                    {!isAdminOtpStep ? (
                      <>
                        <div className="relative">
                          <Input
                            type="email"
                            className="w-full h-12 pl-4 pr-10 rounded-full border-gray-300 text-lg"
                            placeholder="Email address"
                            value={adminEmail}
                            onChange={(e) => {
                              setAdminEmail(e.target.value);
                              if (alertMessage) setAlertMessage("");
                            }}
                          />
                        </div>
                        <div className="relative">
                          <Input
                            type={adminShowPassword ? "text" : "password"}
                            className="w-full h-12 pl-4 pr-12 rounded-full border-gray-300 text-lg"
                            placeholder="Password"
                            value={adminPassword}
                            onChange={(e) => {
                              setAdminPassword(e.target.value);
                              if (alertMessage) setAlertMessage("");
                            }}
                            onBlur={handleAdminPasswordBlur}
                          />
                          <button
                            type="button"
                            onClick={() => setAdminShowPassword((s) => !s)}
                            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                            aria-label={adminShowPassword ? "Hide password" : "Show password"}
                          >
                            {adminShowPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        <Button
                          disabled={isSubmitting}
                          className={`w-full h-12 text-white rounded-full ${isLoginLoading ? "loading-button" : "bg-black hover:bg-gray-800"}`}
                          onClick={handleAdminLogin}
                        >
                          {isLoginLoading ? "Logging In..." : "Continue"}
                        </Button>
                        <div className="flex justify-center flex-wrap gap-3 mt-8 text-sm text-gray-600">
                          <button
                            onClick={() => handleForgotPassword("admin")}
                            className="hover:underline font-medium tex-gray-600"
                          >
                            Forgot Password?
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleRegisterTransition("/admin/register", 1000)}
                            className="hover:underline font-medium"
                          >
                            Register
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 text-center">
                          <h2 className="text-2xl font-semibold mb-2">Enter OTP</h2>
                          <p className="text-gray-600">A 6-digit code was sent to your email.</p>
                        </div>
                        <div className="flex justify-center mb-4">
                          <InputOTP
                            maxLength={6}
                            value={adminOtp}
                            onChange={(value) => {
                              setAdminOtp(value);
                              setAdminOtpError("");
                            }}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        {adminOtpError && (
                          <div className="mb-2 p-2 rounded bg-red-50 border border-red-200">
                            <p className="text-red-600 text-sm text-center font-medium">{adminOtpError}</p>
                          </div>
                        )}
                        <Button
                          disabled={isAdminOtpLoading}
                          className={`w-full h-12 text-white rounded-full font-medium transition-all ${isAdminOtpLoading ? "loading-button" : "bg-black hover:bg-gray-800"}`}
                          onClick={handleAdminOtpVerify}
                        >
                          {isAdminOtpLoading ? "Verifying..." : "Verify & Login"}
                        </Button>
                        <div className="flex justify-center mt-6">
                          <button
                            className="text-gray-600 hover:text-gray-800 hover:underline transition-colors flex items-center gap-1"
                            onClick={() => {
                              setIsAdminOtpStep(false);
                              setAdminOtp("");
                              setAdminOtpError("");
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to login
                          </button>
                        </div>
                      </>
                    )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// Export alias
export const AuthSidebar = AuthPanel;
