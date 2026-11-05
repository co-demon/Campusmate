"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowRight,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Phone,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordAction, setDemoSessionAction } from "@/server/actions/auth";

interface AuthCardProps {
  initialMode?: "signin" | "signup";
}

export function AuthCard({ initialMode = "signin" }: AuthCardProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Feedback & status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailVerificationSent, setEmailVerificationSent] = useState<string | null>(null);

  // Clear messages on mode switch
  const handleModeSwitch = (newMode: "signin" | "signup") => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setIsForgotPassword(false);
    setEmailVerificationSent(null);
  };

  // 1. Google OAuth (Optional Provider)
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase client is not configured. Please check your environment variables.");
      setLoading(false);
      return;
    }

    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to initiate Google authentication.");
      setLoading(false);
    }
  };

  // 2. Email & Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase client is not configured.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        window.location.href = "/dashboard";
        return;
      }
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Please verify your credentials.");
      setLoading(false);
    }
  };

  // 3. Email & Password Sign Up (with optional contact phone)
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase client is not configured.");
      setLoading(false);
      return;
    }

    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/dashboard`;
      const cleanPhone = phone.trim() ? phone.trim() : null;

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: cleanPhone, // Stored purely as contact info; no OTP or SMS verification
          },
          emailRedirectTo: callbackUrl,
        },
      });

      if (signUpErr) {
        setError(signUpErr.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Immediate session (email confirmation disabled in Supabase)
        window.location.href = "/dashboard";
        return;
      }

      // Email confirmation is required by Supabase project settings
      setEmailVerificationSent(email.trim());
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "Failed to register account.");
      setLoading(false);
    }
  };

  // 4. Forgot Password Submission
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const res = await resetPasswordAction(resetEmail, window.location.origin);
    if (!res.success) {
      setError(res.error || "Failed to send reset link.");
    } else {
      setSuccessMessage(res.message || "Reset link sent!");
    }
    setLoading(false);
  };

  // 5. Developer Fast-Access Action
  const handleFastDemoLogin = async (role: "student" | "cr") => {
    setLoading(true);
    await setDemoSessionAction(role);
    document.cookie = "campusmate_demo=true; path=/; max-age=604800";
    window.location.href = role === "cr" ? "/timetable/manage" : "/dashboard";
  };

  return (
    <div className="w-full max-w-md bg-white border border-black/10 rounded-[32px] p-8 shadow-panel space-y-6">
      {/* Brand Heading */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-xs font-black">
          <GraduationCap className="w-6 h-6 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-black text-[#202023] tracking-tight">
          {mode === "signin" ? "Sign In to CampusMate" : "Create Your Account"}
        </h1>
        <p className="text-xs text-[#85858A]">
          Automated timetables, verified CR updates & smart attendance
        </p>
      </div>

      {/* Mode Switcher Tabs (Sign In / Sign Up) */}
      <div className="flex p-1 bg-[#E9E9E9]/60 rounded-2xl border border-black/5">
        <button
          type="button"
          onClick={() => handleModeSwitch("signin")}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            mode === "signin"
              ? "bg-white text-[#202023] shadow-xs"
              : "text-[#85858A] hover:text-[#202023]"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("signup")}
          className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
            mode === "signup"
              ? "bg-white text-[#202023] shadow-xs"
              : "text-[#85858A] hover:text-[#202023]"
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-600 font-bold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1 leading-snug">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-lime-50 border border-lime-300 text-xs text-[#202023] font-bold flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#202023]" />
          <span className="flex-1 leading-snug">{successMessage}</span>
        </div>
      )}

      {/* Email Verification Required Banner */}
      {emailVerificationSent && (
        <div className="p-4 rounded-2xl bg-[#E5F79E]/40 border border-[#D7F45A] text-xs text-[#202023] space-y-2">
          <div className="flex items-center gap-2 font-black">
            <Mail className="w-4 h-4 text-[#202023]" />
            <span>Verify Your College Email</span>
          </div>
          <p className="leading-relaxed text-[#202023]/80">
            A confirmation link has been sent to{" "}
            <strong className="text-black font-extrabold">{emailVerificationSent}</strong>.
            Please open the link to confirm your account, then sign in.
          </p>
          <button
            type="button"
            onClick={() => handleModeSwitch("signin")}
            className="text-xs font-black underline hover:text-black cursor-pointer block pt-1"
          >
            &larr; Return to Sign In
          </button>
        </div>
      )}

      {/* Forgot Password Flow */}
      {isForgotPassword ? (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#202023]">Reset Your Password</h3>
            <p className="text-xs text-[#85858A]">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202023] mb-1.5">
              College Email
            </label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="alex.mercer@college.edu"
              className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-[#D7F45A] hover:bg-[#cbf03f] text-[#202023] text-xs font-black shadow-xs disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "Sending link..." : "Send Password Reset Link"}
          </button>

          <button
            type="button"
            onClick={() => setIsForgotPassword(false)}
            className="w-full text-center text-xs font-bold text-[#85858A] hover:text-[#202023] cursor-pointer"
          >
            Cancel and Return
          </button>
        </form>
      ) : !emailVerificationSent && (
        <>
          {/* Optional: Continue with Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl bg-white hover:bg-[#E9E9E9]/40 border border-black/10 text-xs font-bold text-[#202023] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-[#E9E9E9] w-full" />
            <span className="bg-white px-3 text-[10px] uppercase font-bold text-[#85858A] absolute">
              Or continue with email
            </span>
          </div>

          {/* Email & Password Form */}
          <form
            onSubmit={mode === "signin" ? handleEmailSignIn : handleEmailSignUp}
            className="space-y-4"
          >
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-[#202023] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                College Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.mercer@college.edu"
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                required
              />
            </div>

            {mode === "signup" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#202023]">
                    Phone Number <span className="text-[#85858A] font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-[#85858A]">Contact info only</span>
                </div>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555 123 4567 or +91 98765 43210"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                  />
                  <Phone className="w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#85858A]" />
                </div>
                <p className="text-[10px] text-[#85858A] mt-1">
                  Stored as profile contact info only. No OTP verification required.
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#202023]">
                  Password <span className="text-red-500">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="text-[11px] font-semibold text-[#85858A] hover:text-[#202023] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#85858A] hover:text-[#202023] p-1 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#D7F45A] hover:bg-[#cbf03f] text-[#202023] text-xs font-black shadow-xs disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>
                {loading
                  ? "Processing..."
                  : mode === "signin"
                  ? "Sign In with Email"
                  : "Create Account"}
              </span>
              <ArrowRight className="w-4 h-4 text-[#202023]" />
            </button>
          </form>
        </>
      )}

      {/* Developer Instant Test Access */}
      <div className="pt-2 border-t border-[#E9E9E9]/80 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#85858A] text-center">
          Instant Developer Testing
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleFastDemoLogin("student")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#202023] hover:bg-black text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <span>🎓 Student</span>
          </button>
          <button
            type="button"
            onClick={() => handleFastDemoLogin("cr")}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-[#E9E9E9]/40 border border-black/10 text-[#202023] text-[11px] font-bold transition-all shadow-xs cursor-pointer"
          >
            <Shield className="w-3 h-3" />
            <span>Approved CR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
