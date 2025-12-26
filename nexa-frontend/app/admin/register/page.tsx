// AdminRegisterPage.tsx
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

export default function AdminRegisterPage() {
  // fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

  // refs for enter navigation & focus
  const refs = {
    username: useRef<HTMLInputElement | null>(null),
    email: useRef<HTMLInputElement | null>(null),
    password: useRef<HTMLInputElement | null>(null),
    confirm: useRef<HTMLInputElement | null>(null),
    otp: useRef<HTMLInputElement | null>(null),
    createBtn: useRef<HTMLButtonElement | null>(null),
  };

  // validators / sanitizers
  const isUsernameValid = (v: string) => /^[A-Za-z0-9]+$/.test(v);
  const isEmailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setUsername(e.target.value.replace(/[^A-Za-z0-9]/g, ""));
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setEmail(e.target.value);

  // enlarge password dots by increasing font-size
  const passwordClass = "h-12 pr-10 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-lg";

  // ENTER navigation helper (moves to next field; on last triggers create)
  const handleEnterNav =
    (current: keyof typeof refs) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const order: Array<keyof typeof refs> = ["username", "email", "password", "confirm"];
      const idx = order.indexOf(current);
      if (idx >= 0 && idx < order.length - 1) {
        refs[order[idx + 1]].current?.focus();
        return;
      }
      if (current === "confirm") refs.createBtn.current?.click();
    };

  const handleOtpKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onContinue();
    }
  };

  // resend countdown effect
  useEffect(() => {
    let t: number | undefined;
    if (resendCountdown > 0) {
      t = window.setInterval(() => {
        setResendCountdown((s) => {
          if (s <= 1) {
            clearInterval(t);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (t) clearInterval(t);
    };
  }, [resendCountdown]);

  // CSRF placeholder - replace with your real retrieval
  const CSRF_TOKEN = "0FOGM80CL1PfbBkg3gLiudCBv3A2Bhsi";

  // API helpers (same endpoints, user_type = "admin")
  async function apiCheckUsername(usernameToCheck: string): Promise<ApiCheckResponse> {
    const r = await fetch(API.CHECK_USERNAME, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ username: usernameToCheck }),
    });
    return r.json();
  }

  async function apiCheckEmail(emailToCheck: string): Promise<ApiCheckResponse> {
    const r = await fetch(API.CHECK_EMAIL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ email: emailToCheck }),
    });
    return r.json();
  }

  async function apiRegister(usernameVal: string, emailVal: string, passwordVal: string) {
    const r = await fetch(API.REGISTER, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ username: usernameVal, email: emailVal, password: passwordVal, user_type: "admin" }),
    });
    if (!r.ok) throw r;
    return r.json() as Promise<RegisterResponse>;
  }

  async function apiResendOtp(emailVal: string) {
    const r = await fetch(API.RESEND_OTP, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ email: emailVal, otp_type: "admin" }),
    });
    if (!r.ok) throw r;
    return r;
  }

  async function apiVerifyOtp(emailVal: string, otp: string) {
    const r = await fetch(API.VERIFY_OTP, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ email: emailVal, otp }),
    });
    if (!r.ok) throw r;
    return r.json() as Promise<VerifyResponse>;
  }

  async function apiLogin(emailVal: string, passwordVal: string) {
    const r = await fetch(API.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFTOKEN": CSRF_TOKEN },
      body: JSON.stringify({ email: emailVal, password: passwordVal }),
    });
    if (!r.ok) throw r;
    return r.json() as Promise<LoginResponse>;
  }

  // password blur check for min length
  const onPasswordBlur = () => {
    if (password && password.length < 8) setFormError("Password must be at least 8 characters long.");
    else setFormError("");
  };

  // Main submit flow:
  // 1) required
  // 2) password >=8
  // 3) password == confirm
  // 4) check-email -> available?
  // 5) check-username -> available?
  // 6) register (user_type=admin) -> on 200 go to OTP step
  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError("");
    setSuccessMessage("");
    if (loading) return;
    setLoading(true);

    try {
      // required
      if (!username.trim() || !email.trim() || !password || !confirmPassword) {
        setFormError("Please complete all required fields.");
        setLoading(false);
        return;
      }

      // password length
      if (password.length < 8) {
        setFormError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }

      // passwords match
      if (password !== confirmPassword) {
        setFormError("Password and Confirm Password do not match.");
        setLoading(false);
        return;
      }

      // check email
      const emailResp = await apiCheckEmail(email);
      if (!emailResp.available) {
        setFormError("This email is already registered. Please login or use a different email.");
        setLoading(false);
        return;
      }

      // check username
      const usernameResp = await apiCheckUsername(username);
      if (!usernameResp.available) {
        setFormError("This username is already taken. Choose another username.");
        setLoading(false);
        return;
      }

      // register
      const reg = await apiRegister(username, email, password);
      setSuccessMessage(reg.message || "Registered. Verify OTP sent to email.");
      setStep("otp");
      setResendCountdown(60);
      setTimeout(() => refs.otp.current?.focus(), 120);
    } catch (err: any) {
      try {
        if (err && typeof err.json === "function") {
          const body = await err.json();
          setFormError(body?.error || body?.detail || "Registration failed.");
        } else {
          setFormError("Network error. Try again.");
        }
      } catch {
        setFormError("Registration failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP: show 'Sent New OTP' for 5s then restart 60s countdown
  const onResend = async () => {
    if (resendCountdown > 0) return;
    try {
      setShowSentLabel(true);
      await apiResendOtp(email);
      setTimeout(() => setShowSentLabel(false), 5000);
      setResendCountdown(60);
    } catch {
      setFormError("Failed to resend OTP. Try again.");
    }
  };

  // Continue when in OTP step:
  // verify-otp -> login -> setAuthStorage -> redirect to admin home
  const onContinue = async () => {
    setFormError("");
    if (loading) return;
    if (otpValue.length !== 6) {
      setFormError("Please enter the 6-digit OTP sent to your email.");
      return;
    }
    setLoading(true);

    try {
      await apiVerifyOtp(email, otpValue);

      const loginResp = await apiLogin(email, password);
      const { token, username: respUsername, email: respEmail, user_type, user_id } = loginResp;

      // store via util
      try {
        setAuthStorage({
          token,
          user_id,
          username: respUsername,
          email: respEmail,
          user_type,
        });
      } catch {
        console.warn("setAuthStorage failed");
      }

      // redirect to admin home
      window.location.href = "admin/home";
    } catch (err: any) {
      try {
        if (err && typeof err.json === "function") {
          const body = await err.json();
          setFormError(body?.error || body?.detail || "OTP verification / login failed.");
        } else {
          setFormError("OTP verification / login failed.");
        }
      } catch {
        setFormError("OTP verification / login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-legacy min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-start justify-center py-20 px-6">
      <div className="w-full max-w-xl">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 bg-white/90 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-slate-900 to-slate-800">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">Create Admin Account</h1>
              <p className="text-sm text-slate-300 mt-1">Admin registration for Nexa.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">Admin</div>
          </div>

          <form className="p-8" onSubmit={(e) => onSubmit(e)}>
            {formError && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 py-3 px-4 text-rose-700">{formError}</div>}
            {successMessage && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 py-3 px-4 text-emerald-700">{successMessage}</div>}

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
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

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Email Address</label>
                <Input
                  ref={refs.email}
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="admin@example.com"
                  disabled={step === "otp"}
                  onKeyDown={handleEnterNav("email")}
                  className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300"
                />
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
                    onBlur={onPasswordBlur}
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
                <label className="block text-xs font-medium text-slate-600 uppercase tracking-wider">Confirm Password</label>
                <div className="relative mt-2">
                  <Input
                    ref={refs.confirm}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    type={showConfirmPassword ? "text" : "password"}
                    disabled={step === "otp"}
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
              </div>
            </div>

            {/* Footer row: OTP (to the left) + Create/Continue button on right + Resend */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* OTP input appears on the left of the CTA when in otp step */}
                {step === "otp" ? (
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-500 uppercase tracking-wider">OTP</label>
                    <Input
                      ref={refs.otp}
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      maxLength={6}
                      onKeyDown={handleOtpKey}
                      className="mt-2 h-12 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-indigo-300 text-lg tracking-widest text-center w-36"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      {showSentLabel ? "Sent New OTP" : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "You can resend OTP"}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                {/* show resend button when otp step */}
                {step === "otp" && (
                  <button
                    type="button"
                    onClick={onResend}
                    disabled={resendCountdown > 0}
                    className={`text-sm ${resendCountdown > 0 ? "text-slate-400" : "text-indigo-600 hover:underline"}`}
                  >
                    {showSentLabel ? "Sent New OTP" : (resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : "Resend OTP")}
                  </button>
                )}

                <Button
                  ref={refs.createBtn}
                  type="button"
                  onClick={() => (step === "form" ? onSubmit() : onContinue())}
                  className="inline-flex items-center gap-3 rounded-full h-12 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg"
                >
                  {loading ? "Please wait..." : step === "form" ? "Create account" : "Continue"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">Need help? Contact admin-support@nexa.example</div>
      </div>
    </div>
  );
}
