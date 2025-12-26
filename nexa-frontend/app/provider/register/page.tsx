// ProviderRegisterPage.api.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { setAuthStorage } from "@/utils/authStorage";
import API from "@/app/api";

type ApiCheckResponse = { exists: boolean; available: boolean };
type RegisterResponse = { message: string; email: string };
type VerifyResponse = { message: string; email: string };
type LoginResponse = {
  token: string;
  user_type: string;
  username: string;
  email: string;
  user_id: string;
};

export default function ProviderRegisterPage() {
  // form fields
  const [company, setCompany] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [license, setLicense] = useState("");
  const [phone, setPhone] = useState(""); // 10 digits only
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // flow / otp
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpValue, setOtpValue] = useState("");
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [showSentLabel, setShowSentLabel] = useState(false);

  // refs for enter navigation and focus
  const refs = {
    company: useRef<HTMLInputElement | null>(null),
    username: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    license: useRef<HTMLInputElement | null>(null),
    phone: useRef<HTMLInputElement | null>(null),
    password: useRef<HTMLInputElement | null>(null),
    confirm: useRef<HTMLInputElement | null>(null),
    otp: useRef<HTMLInputElement | null>(null),
    createBtn: useRef<HTMLButtonElement | null>(null),
  };

  // validators
  const isUsernameValid = (v: string) => /^[A-Za-z0-9]+$/.test(v);
  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isPhoneValid = (v: string) => /^\d{10}$/.test(v);
  const isLicenseValid = (v: string) => /^\d{1,12}$/.test(v);

  // sanitizers
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, ""));
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
  const handleLicenseChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLicense(e.target.value.replace(/\D/g, "").slice(0, 12));

  // enlarge password bullets by increasing font-size for the input
  const passwordClass =
    "h-12 pr-10 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-lg";

  // ENTER navigation
  const handleEnterNav =
    (currentKey: keyof typeof refs) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const order: Array<keyof typeof refs> = [
        "company",
        "username",
        "email",
        "license",
        "phone",
        "password",
        "confirm",
      ];

      const idx = order.indexOf(currentKey);
      if (idx >= 0 && idx < order.length - 1) {
        refs[order[idx + 1]].current?.focus();
        return;
      }
      if (currentKey === "confirm") {
        refs.createBtn.current?.click();
      }
    };

  const handleOtpKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  // countdown effect for resend
  useEffect(() => {
    let timer: number | undefined;
    if (resendCountdown > 0) {
      timer = window.setInterval(() => {
        setResendCountdown((s) => {
          if (s <= 1) {
            clearInterval(timer);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  // Helper - set CSRF token for endpoints
  // Replace this with your app's actual CSRF retrieval method if needed.
  const CSRF_TOKEN = "0FOGM80CL1PfbBkg3gLiudCBv3A2Bhsi"; // <-- replace

  // API helpers
  async function apiCheckEmail(emailToCheck: string): Promise<ApiCheckResponse> {
    const res = await fetch(API.CHECK_EMAIL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({ email: emailToCheck }),
    });
    return res.json();
  }

  async function apiCheckUsername(usernameToCheck: string): Promise<ApiCheckResponse> {
    const res = await fetch(API.CHECK_USERNAME, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({ username: usernameToCheck }),
    });
    return res.json();
  }

  async function apiRegister(usernameVal: string, emailVal: string, passwordVal: string): Promise<RegisterResponse> {
    const res = await fetch(API.REGISTER, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({
        username: usernameVal,
        email: emailVal,
        password: passwordVal,
        user_type: "provider",
      }),
    });
    if (!res.ok) throw res;
    return res.json();
  }

  async function apiResendOtp(emailVal: string) {
    await fetch(API.RESEND_OTP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({ email: emailVal, otp_type: "provider" }),
    });
  }

  async function apiVerifyOtp(emailVal: string, otp: string): Promise<VerifyResponse> {
    const res = await fetch(API.VERIFY_OTP, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({ email: emailVal, otp }),
    });
    if (!res.ok) throw res;
    return res.json();
  }

  async function apiLogin(emailVal: string, passwordVal: string) {
    const res = await fetch(API.LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRFTOKEN": CSRF_TOKEN,
      },
      body: JSON.stringify({ email: emailVal, password: passwordVal }),
    });
    if (!res.ok) throw res;
    return res.json();
  }

  // password blur check for length >= 8 (requirement 3)
  const handlePasswordBlur = () => {
    if (password && password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      // keep focus on password? we show inline error per your requirement
    } else {
      setFormError("");
    }
  };

  // Main submit flow (ordered checks):
  // 1) all filled
  // 2) password length >= 8
  // 3) password === confirm
  // 4) check-email API (if available false => show registered)
  // 5) check-username API
  // 6) register API -> on success -> move to OTP step, lock fields
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (loading) return;
    setLoading(true);

    try {
      // 1 - required fields
      if (!company.trim() || !username.trim() || !email.trim() || !license.trim() || !phone.trim() || !password || !confirmPassword) {
        setFormError("Please fill in all fields before continuing.");
        setLoading(false);
        return;
      }

      // 2 - password length
      if (password.length < 8) {
        setFormError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }

      // 3 - passwords match
      if (password !== confirmPassword) {
        setFormError("Password and Confirm Password do not match.");
        setLoading(false);
        return;
      }

      // 4 - email check
      const emailResp = await apiCheckEmail(email);
      if (!emailResp.available) {
        setFormError("This email is already registered. Please login or use a different email.");
        setLoading(false);
        return;
      }

      // 5 - username check
      const usernameResp = await apiCheckUsername(username);
      if (!usernameResp.available) {
        setFormError("This username is already taken. Choose another username.");
        setLoading(false);
        return;
      }

      // 6 - register
      const regResp = await apiRegister(username, email, password);
      // Expecting 200 and message -> proceed to OTP step
      setSuccessMessage(regResp.message || "Registered. Verify OTP sent to email.");
      setStep("otp");

      // lock inputs by leaving step === 'otp' — UI uses that to disable inputs.
      // start countdown and focus OTP input.
      setResendCountdown(60);
      setTimeout(() => refs.otp.current?.focus(), 150);
    } catch (err: any) {
      // If fetch returned non-200, parse body if possible
      try {
        if (err && typeof err.json === "function") {
          const ebody = await err.json();
          setFormError(ebody?.error || ebody?.detail || "Registration failed.");
        } else {
          setFormError("Network error. Try again.");
        }
      } catch {
        setFormError("An error occurred. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // resend OTP handler (60s countdown + 5s "Sent New OTP")
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      setShowSentLabel(true);
      await apiResendOtp(email); // best-effort
      // show Sent New OTP for 5s
      setTimeout(() => setShowSentLabel(false), 5000);
      // restart countdown
      setResendCountdown(60);
    } catch {
      setFormError("Failed to resend OTP. Try again.");
    }
  };

  // Continue: verify OTP -> on success call login -> redirect
  const handleContinue = async () => {
    setFormError("");
    if (loading) return;
    if (otpValue.length !== 6) {
      setFormError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    setLoading(true);
    try {
      await apiVerifyOtp(email, otpValue);
      setSuccessMessage("OTP verified successfully. Logging you in...");
      // login
      const loginResp = await apiLogin(email, password);
      const { token, username, email: respEmail, user_type, user_id } = loginResp;
      
      // store auth data
      setAuthStorage({
        token,
        user_id,
        username,
        email: respEmail,
        user_type,
      });
      
      // redirect to provider home
      window.location.href = "/provider";
    } catch (err: any) {
      // parse error
      try {
        if (err && typeof err.json === "function") {
          const body = await err.json();
          setFormError(body?.error || body?.detail || "OTP verification failed.");
        } else {
          setFormError("OTP verification failed.");
        }
      } catch {
        setFormError("OTP verification failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-legacy min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-start justify-center py-20 px-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-slate-900 to-slate-800">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Create Provider Account</h1>
              <p className="text-sm text-slate-300 mt-1">Register your travel service on Nexa.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-300">Enterprise</div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">✓ NEXA</div>
            </div>
          </div>

          <form onSubmit={(e) => handleSubmit(e)} className="p-8">
            {formError && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 py-3 px-4 text-rose-700">{formError}</div>}
            {successMessage && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 py-3 px-4 text-emerald-700">{successMessage}</div>}

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Company Name</label>
                <Input
                  ref={refs.company}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Sunrise Travels Pvt Ltd"
                  disabled={step === "otp"}
                  onKeyDown={handleEnterNav("company")}
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">User Name</label>
                <Input
                  ref={refs.username}
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="singleword123"
                  disabled={step === "otp"}
                  onKeyDown={handleEnterNav("username")}
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Email Address</label>
                <Input
                  ref={refs.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="provider@example.com"
                  disabled={step === "otp"}
                  onKeyDown={handleEnterNav("email")}
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* License and Contact side-by-side */}
              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">License Number</label>
                <Input
                  ref={refs.license}
                  value={license}
                  onChange={handleLicenseChange}
                  placeholder="Digits only (max 12)"
                  maxLength={12}
                  disabled={step === "otp"}
                  onKeyDown={handleEnterNav("license")}
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Contact Number</label>
                <div className="mt-2 flex gap-3">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">+91</span>
                  </div>
                  <Input
                    ref={refs.phone}
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="9876543210"
                    maxLength={10}
                    disabled={step === "otp"}
                    onKeyDown={handleEnterNav("phone")}
                    className="flex-1 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Password</label>
                <div className="relative mt-2">
                  <Input
                    ref={refs.password}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    type={showPassword ? "text" : "password"}
                    disabled={step === "otp"}
                    onKeyDown={handleEnterNav("password")}
                    onBlur={handlePasswordBlur}
                    className={passwordClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-100 shadow-sm hover:bg-slate-50 transition"
                  >
                    {showPassword ? <Eye className="w-4 h-4 text-slate-700" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              <div>
                {step === "form" ? (
                  <>
                    <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Confirm Password</label>
                    <div className="relative mt-2">
                      <Input
                        ref={refs.confirm}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type password"
                        type={showConfirmPassword ? "text" : "password"}
                        onKeyDown={handleEnterNav("confirm")}
                        className={passwordClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-100 shadow-sm hover:bg-slate-50 transition"
                      >
                        {showConfirmPassword ? <Eye className="w-4 h-4 text-slate-700" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Verify OTP</label>
                    <div className="relative mt-2">
                      <Input
                        ref={refs.otp}
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="••••••"
                        maxLength={6}
                        onKeyDown={handleOtpKey}
                        className="h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-lg tracking-widest text-center"
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">We sent a 6-digit code to <span className="font-medium">{email || "your email"}</span>.</div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="text-sm text-slate-500">By continuing you agree to our <a className="underline" href="#">Terms</a>.</div>

              <div className="flex items-center gap-3">
                {step === "otp" && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCountdown > 0}
                    className={`text-sm ${resendCountdown > 0 ? "text-slate-400" : "text-indigo-600 hover:underline"}`}
                  >
                    {showSentLabel ? "Sent New OTP" : (resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP")}
                  </button>
                )}

                <Button
                  ref={refs.createBtn}
                  type="button"
                  onClick={() => (step === "form" ? handleSubmit() : handleContinue())}
                  className="inline-flex items-center gap-3 rounded-full h-12 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg"
                >
                  {loading ? "Please wait..." : step === "form" ? "Create account" : "Continue"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">Need help? Contact support@nexa.example</div>
      </div>
    </div>
  );
}
