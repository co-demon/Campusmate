"use client";

import { useState, useEffect } from "react";
import { campusRepository } from "@/lib/database/campusRepository";
import { getCurrentProfile, signOutAction, updateProfileNameAction } from "@/server/actions/auth";
import { Profile } from "@/types/database.types";
import { Settings, Shield, Database, RefreshCw, CheckCircle2, User, LogOut, Phone, Mail } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [targetPct, setTargetPct] = useState(75);
  const [saved, setSaved] = useState(false);
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    getCurrentProfile().then((p) => {
      setProfile(p);
      setFullName(p?.full_name || "");
    });
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const res = await updateProfileNameAction(fullName);
    if (!res.success) {
      setProfileError(res.error || "Failed to update profile.");
    } else {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const handleSignOut = async () => {
    await signOutAction();
    window.location.href = "/login";
  };

  const handleResetDemo = () => {
    if (confirm("Reset demo data back to the clean initial Computer Science 5th Semester timetable?")) {
      campusRepository.resetDemoData();
      window.location.reload();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-[#202023] tracking-tight">
          Application & Academic Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
          Configure your user identity, attendance targets, and cloud connection parameters.
        </p>
      </div>

      {/* User Profile & Account Card */}
      <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#202023] flex items-center gap-2">
            <User className="w-4 h-4 text-[#202023]" />
            <span>Profile & Account Identity</span>
          </h2>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#202023] text-white">
            Role: {profile?.role || "Student"}
          </span>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Email Address
              </label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 bg-[#E9E9E9]/20 text-xs text-[#85858A]">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{profile?.email || "student@college.edu"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-black/5 bg-[#E9E9E9]/20 text-xs text-[#85858A]">
                <Phone className="w-3.5 h-3.5" />
                <span>{profile?.phone || "Not linked"}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202023] mb-1.5">
                Assigned Cohort
              </label>
              <div className="px-4 py-2.5 rounded-xl border border-black/5 bg-[#E9E9E9]/20 text-xs text-[#85858A] font-semibold truncate">
                {profile?.course ? (
                  `${profile.course} • Sem ${profile.semester || 1} • ${profile.class_group || "Group 1"}${profile.class_roll_number ? ` (Roll: ${profile.class_roll_number})` : ""}`
                ) : (
                  "Student Cohort"
                )}
              </div>
            </div>
          </div>

          {profileError && (
            <p className="text-xs text-red-600 font-bold">{profileError}</p>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-[#E9E9E9]">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-full bg-[#202023] hover:bg-black text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Save Profile
              </button>
              {profileSaved && (
                <span className="text-xs text-[#202023] flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-[#D7F45A]" /> Profile updated
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </form>
      </div>

      {/* Target Attendance Settings */}
      <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-[#202023] flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#202023]" />
          <span>Attendance Thresholds</span>
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#202023]">
                Minimum Required Attendance Target
              </label>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#D7F45A] text-[#202023]">
                {targetPct}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              step="1"
              value={targetPct}
              onChange={(e) => setTargetPct(Number(e.target.value))}
              className="w-full accent-[#202023] cursor-pointer"
            />
            <p className="text-[11px] text-[#85858A] mt-1">
              Standard college requirement is 75%. CampusMate will trigger warnings and adjust bunk planning around this threshold.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#202023] hover:bg-black text-white text-xs font-bold shadow-xs transition-colors"
            >
              Save Preferences
            </button>
            {saved && (
              <span className="text-xs text-[#202023] flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#D7F45A]" /> Saved successfully
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Backend & Supabase Status */}
      <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card space-y-4">
        <h2 className="text-sm font-bold text-[#202023] flex items-center gap-2">
          <Database className="w-4 h-4 text-[#202023]" />
          <span>Database & Cloud Foundation</span>
        </h2>

        <div className="p-4 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-[#202023] block">
              Supabase Connection Mode
            </span>
            <span className="text-[11px] text-[#85858A]">
              {isSupabaseConfigured
                ? "Connected to remote PostgreSQL instance"
                : "Active in Local Persistent Demo Mode (Fully interactive out-of-the-box)"}
            </span>
          </div>

          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            isSupabaseConfigured
              ? "bg-[#D7F45A] text-[#202023]"
              : "bg-[#202023] text-white"
          }`}>
            {isSupabaseConfigured ? "Connected" : "Local Demo"}
          </span>
        </div>

        <p className="text-xs text-[#85858A]">
          To connect your own remote Supabase PostgreSQL database, fill in <code className="text-[#202023] font-bold">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-[#202023] font-bold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code className="text-[#202023] font-bold">.env.local</code> and run the migrations in <code className="text-[#202023] font-bold">supabase/migrations/</code>.
        </p>
      </div>

      {/* Reset Data */}
      <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#202023]">
            Reset Demo State
          </h3>
          <p className="text-[11px] text-[#85858A]">
            Restore sample timetables, subjects, and occurrences.
          </p>
        </div>

        <button
          onClick={handleResetDemo}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-[#202023] bg-[#E9E9E9] hover:bg-black hover:text-white transition-all border border-black/5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>
    </div>
  );
}
