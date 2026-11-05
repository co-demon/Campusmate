"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Bell, Plus, CalendarPlus, Menu, Search, Shield, GraduationCap, LogOut } from "lucide-react";
import { getCurrentProfile, signOutAction, switchDemoPersonaAction } from "@/server/actions/auth";
import { Profile } from "@/types/database.types";

interface HeaderProps {
  onOpenMobileMenu?: () => void;
  onOpenAbsenceModal?: () => void;
  onOpenHolidayModal?: () => void;
  onOpenExtraClassModal?: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenAbsenceModal,
  onOpenHolidayModal,
  onOpenExtraClassModal,
}: HeaderProps) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getCurrentProfile().then(setProfile);
  }, []);

  const isDemo = profile?.id === "user-student-alex" || profile?.id === "user-cr-sarah";

  const handleTogglePersona = async () => {
    if (!isDemo) return;
    const nextRole = profile?.role === "cr" ? "student" : "cr";
    await switchDemoPersonaAction(nextRole);
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOutAction();
    window.location.href = "/login";
  };

  const isCR = profile?.role === "cr";

  return (
    <header className="h-20 bg-transparent flex items-center justify-between px-6 sm:px-8 shrink-0">
      {/* Left: Mobile Menu & Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-[#202023] hover:bg-black/5 rounded-xl transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/80 border border-black/5 shadow-xs text-xs text-[#85858A] w-60 focus-within:w-68 transition-all">
          <Search className="w-3.5 h-3.5 text-[#85858A]" />
          <input
            type="text"
            placeholder="Search classes, rooms..."
            className="bg-transparent border-none outline-none text-[#202023] placeholder-[#85858A] text-xs w-full"
          />
        </div>

        {/* User Identity / Role Pill */}
        <div
          onClick={isDemo ? handleTogglePersona : undefined}
          title={isDemo ? "Click to switch persona between Student and CR (Demo Mode)" : undefined}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-black/5 shadow-xs text-xs font-bold text-[#202023] transition-all",
            isDemo && "hover:border-black/20 cursor-pointer group"
          )}
        >
          {isCR ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[#202023] text-[#D7F45A] flex items-center justify-center text-[10px]">
                <Shield className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span className="truncate max-w-[170px]">
                {profile?.full_name || "Class Representative"} (CR)
              </span>
              {isDemo && (
                <span className="text-[10px] text-[#85858A] group-hover:text-[#202023] transition-colors">
                  [Switch]
                </span>
              )}
            </>
          ) : (
            <>
              <div className="w-5 h-5 rounded-full bg-[#D7F45A] text-[#202023] flex items-center justify-center text-[10px]">
                <GraduationCap className="w-3 h-3 stroke-[2.5]" />
              </div>
              <span className="truncate max-w-[170px]">
                {profile?.full_name || "Student"} (Student)
              </span>
              {isDemo && (
                <span className="text-[10px] text-[#85858A] group-hover:text-[#202023] transition-colors">
                  [Switch]
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Quick Action Buttons & User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onOpenHolidayModal && (
          <button
            onClick={onOpenHolidayModal}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-white text-[#202023] hover:bg-white/90 border border-black/5 shadow-xs transition-all cursor-pointer"
          >
            <span>Declare Holiday</span>
          </button>
        )}

        {onOpenExtraClassModal && (
          <button
            onClick={onOpenExtraClassModal}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-full bg-white text-[#202023] hover:bg-white/90 border border-black/5 shadow-xs transition-all cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#85858A]" />
            <span>Extra Class</span>
          </button>
        )}

        {onOpenAbsenceModal && (
          <button
            onClick={onOpenAbsenceModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-full bg-[#D7F45A] text-[#202023] hover:bg-[#cbf03f] shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Report Absence</span>
          </button>
        )}

        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#202023] shadow-xs border border-black/5 relative cursor-pointer hover:bg-slate-50 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D7F45A] border-2 border-white" />
        </div>

        {/* Sign Out Action Button */}
        <button
          onClick={handleSignOut}
          title="Sign Out of CampusMate"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full bg-white text-[#85858A] hover:text-red-600 hover:bg-red-50 border border-black/5 shadow-xs transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

