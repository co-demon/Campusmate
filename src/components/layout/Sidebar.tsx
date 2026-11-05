"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  CalendarDays,
  CheckCheck,
  FileSpreadsheet,
  FileText,
  FolderLock,
  Settings,
  Sparkles,
  GraduationCap,
  ShieldCheck
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { campusRepository } from "@/lib/database/campusRepository";
import { getCurrentProfile, signOutAction } from "@/server/actions/auth";
import { Profile } from "@/types/database.types";
import { LogOut } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  hasNotification?: boolean;
}

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Timetable", href: "/timetable", icon: CalendarDays },
  { label: "CR Console", href: "/timetable/manage", icon: ShieldCheck, badge: "CR" },
  { label: "Attendance", href: "/attendance", icon: CheckCheck, hasNotification: true },
  { label: "Assignments", href: "/assignments", icon: FileSpreadsheet, badge: "3" },
  { label: "Question Papers", href: "/question-papers", icon: FileText },
  { label: "College Paperwork", href: "/paperwork", icon: FolderLock },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getCurrentProfile().then(setProfile);
  }, []);

  const handleSignOut = async () => {
    await signOutAction();
    window.location.href = "/login";
  };

  const isCR = profile?.role === "cr" || profile?.role === "admin";
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : isCR
    ? "CR"
    : "ST";

  return (
    <aside
      className={clsx(
        "w-60 lg:w-64 flex flex-col bg-[#202023] text-white p-5 select-none transition-all duration-300",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 py-3 mb-6">
        <div className="w-10 h-10 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center font-black shadow-sm">
          <GraduationCap className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <span className="font-extrabold text-lg tracking-tight text-white block leading-tight">
            CampusMate
          </span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-[#85858A]">
            Student OS
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {baseNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "group flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
                isActive
                  ? "bg-white text-[#202023] shadow-pill"
                  : "text-[#85858A] hover:text-white hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={clsx(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-[#202023] stroke-[2.5]"
                      : "text-[#85858A] group-hover:text-white stroke-[2]"
                  )}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>

              {/* Lime Notification Indicator or Badge */}
              <div className="flex items-center gap-1.5">
                {item.hasNotification && (
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full",
                      isActive ? "bg-[#202023]" : "bg-[#D7F45A] shadow-[0_0_8px_#D7F45A]"
                    )}
                    title="Active reminder"
                  />
                )}
                {item.badge && (
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      isActive
                        ? "bg-[#202023] text-white"
                        : "bg-[#D7F45A] text-[#202023]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Can I Bunk? / AI Shortcut Pill */}
      <div className="pt-4 mb-4">
        <Link
          href="/planner"
          className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#D7F45A]/40 hover:bg-white/10 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#D7F45A]/20 text-[#D7F45A] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-white block leading-tight">
                Can I Take a Holiday?
              </span>
              <span className="text-[9px] text-[#85858A]">
                Predictive Bunk AI
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#D7F45A] text-[#202023]">
            PRO
          </span>
        </Link>
      </div>

      {/* User Profile Footer */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 group">
          <div className="relative">
            <div
              className={clsx(
                "w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center",
                isCR ? "bg-[#D7F45A] text-[#202023]" : "bg-[#B8AAF5] text-[#202023]"
              )}
            >
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#D7F45A] border-2 border-[#202023]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">
              {profile?.full_name || (isCR ? "Class Representative" : "Student")}
            </p>
            <p className="text-[10px] text-[#85858A] truncate font-medium">
              {profile?.course
                ? `${profile.course} • ${profile.class_group || (isCR ? "CR" : "Student")}`
                : isCR
                ? "Class Representative"
                : "Student"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#85858A] hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
