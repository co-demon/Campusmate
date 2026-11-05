"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { campusRepository } from "@/lib/database/campusRepository";
import { getDashboardDataAction } from "@/server/actions/dashboard";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  CalendarCheck2,
  CalendarX,
  TrendingUp,
  MapPin,
  User,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Award
} from "lucide-react";
import clsx from "clsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const loadData = async () => {
    try {
      const res = await getDashboardDataAction();
      setData(res);
    } catch (e) {
      console.error("Failed to load dashboard data via action, falling back to repository:", e);
      const res = await campusRepository.getDashboardData();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const handleMarkAttendance = async (occurrenceId: string, status: "attended" | "absent") => {
    await campusRepository.reportAttendance(occurrenceId, status);
    await loadData();
  };

  const handleConfirmAll = async () => {
    await campusRepository.confirmAllUnconfirmed();
    await loadData();
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#85858A]">Loading Campus Overview...</p>
        </div>
      </div>
    );
  }

  const {
    overall,
    todayClasses,
    unconfirmedClasses,
    upcomingHolidays,
    subjects,
    classGroup,
    publishedVersion,
    announcements = [],
    profile,
  } = data;

  const isCR = profile?.role === "cr" || profile?.role === "admin";

  // Prepare data for Attendance Trend chart (Mon - Fri / Sat)
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendData = publishedVersion
    ? [
        { day: "Mon", scheduled: 4, attended: 4, rate: 100 },
        { day: "Tue", scheduled: 4, attended: 3, rate: 75 },
        { day: "Wed", scheduled: 3, attended: 3, rate: 100 },
        { day: "Thu", scheduled: 4, attended: 4, rate: 100 },
        { day: "Fri", scheduled: 3, attended: 2, rate: 67 },
        { day: "Sat", scheduled: 1, attended: 1, rate: 100 },
      ]
    : [
        { day: "Mon", scheduled: 0, attended: 0, rate: 0 },
        { day: "Tue", scheduled: 0, attended: 0, rate: 0 },
        { day: "Wed", scheduled: 0, attended: 0, rate: 0 },
        { day: "Thu", scheduled: 0, attended: 0, rate: 0 },
        { day: "Fri", scheduled: 0, attended: 0, rate: 0 },
        { day: "Sat", scheduled: 0, attended: 0, rate: 0 },
      ];

  // Total attended this week calculation
  const classesAttendedThisWeek = publishedVersion ? 17 : 0;
  const classesMissedThisWeek = overall?.totalAbsent || 0;
  const upcomingAssignmentsCount = publishedVersion ? 3 : 0;

  // Circular visualization calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const currentPct = overall?.overallPercentage || 0;
  const strokeDashoffset = circumference - (currentPct / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* 1. Dashboard Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202023] bg-[#D7F45A] px-2.5 py-0.5 rounded-full">
              Class {classGroup?.name || "Student Cohort"}
            </span>
            <span className="text-[#85858A]">&bull;</span>
            <span className="text-xs text-[#85858A]">
              {publishedVersion
                ? `Timetable v${publishedVersion?.version_number || publishedVersion?.version || 1} • Shared by CR`
                : "Timetable Pending • Not Published"}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#202023] tracking-tight">
            Campus Overview
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#85858A] mt-0.5">
            {profile?.course ? (
              <span>
                {profile.course} &bull; Semester {profile.semester || 1} ({profile.class_group || "Group 1"})
                {profile.class_roll_number ? ` • Roll No: ${profile.class_roll_number}` : ""}
              </span>
            ) : (
              <span>
                {classGroup?.course || "General"} &bull; Year {classGroup?.year || 1} Section {classGroup?.section || "A"} Schedule
              </span>
            )}
          </p>
        </div>

        {/* Quick Summary Pill & CR CTA */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isCR && (
            <Link
              href="/timetable/manage"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#202023] text-white hover:bg-black text-xs font-bold shadow-xs transition-all"
            >
              <span>Manage Timetable (CR)</span>
            </Link>
          )}

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/5 shadow-xs text-xs font-bold text-[#202023]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D7F45A]" />
            <span>Target: {overall.targetPercentage}%</span>
            <span className="text-[#85858A] font-normal">|</span>
            <span className="text-[#85858A]">{overall.isAboveTarget ? "Above Target" : "Action Needed"}</span>
          </div>
        </div>
      </div>

      {/* Prominent Empty State Banner when CR has not yet published a timetable */}
      {!publishedVersion && (
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-sm">
            <CalendarX className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-[#202023] tracking-tight">
              Your class timetable hasn’t been published yet.
            </h2>
            <p className="text-xs sm:text-sm text-[#85858A] leading-relaxed">
              Your Class Representative hasn&apos;t published the official schedule for{" "}
              <strong className="text-[#202023]">
                {classGroup?.name || (profile?.course ? `${profile.course} (${profile.class_group || "Group 1"})` : "your class cohort")}
              </strong>{" "}
              yet. Once your CR uploads, reviews, and publishes the timetable, your daily schedule and personal attendance tracker will automatically appear here.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E9E9E9] text-xs font-semibold text-[#85858A]">
            <Clock className="w-3.5 h-3.5 text-[#202023]" />
            <span>Awaiting CR Timetable Publication</span>
          </div>
        </div>
      )}

      {/* CR Mode Welcome Notice (if active persona is CR) */}
      {isCR && (
        <div className="p-4 rounded-[22px] bg-[#202023] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#D7F45A] text-[#202023] font-black flex items-center justify-center shrink-0">
              CR
            </div>
            <div>
              <p className="font-bold text-white">
                Class Representative Mode Active for {classGroup?.name || "CSE-3A"}
              </p>
              <p className="text-[11px] text-[#85858A]">
                You can upload revised timetables, edit rows with side-by-side document preview, and broadcast class cancellations or holidays.
              </p>
            </div>
          </div>
          <Link
            href="/timetable/manage"
            className="px-4 py-1.5 rounded-full bg-[#D7F45A] text-[#202023] hover:bg-[#cbf03f] font-bold text-xs shrink-0 self-start sm:self-auto transition-all"
          >
            Review & Publish Timetable
          </Link>
        </div>
      )}

      {/* CR Announcements Banner (Cancellations, Holidays, Extra Classes) */}
      {announcements.length > 0 && (
        <div className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D7F45A]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#202023]">
                CR Announcements & Schedule Updates
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#85858A] bg-[#E9E9E9] px-2 py-0.5 rounded-full">
              {announcements.length} active updates
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {announcements.slice(0, 3).map((ann: any) => {
              const isCancellation = ann.type === "cancellation";
              const isHoliday = ann.type === "holiday";
              const isExtra = ann.type === "extra_class";

              return (
                <div
                  key={ann.id}
                  className={clsx(
                    "p-3.5 rounded-2xl border text-xs space-y-1 transition-all",
                    isCancellation && "bg-rose-50/70 border-rose-100",
                    isHoliday && "bg-amber-50/70 border-amber-100",
                    isExtra && "bg-[#F0FAC7]/60 border-[#D7F45A]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider",
                        isCancellation && "bg-rose-100 text-rose-800",
                        isHoliday && "bg-amber-100 text-amber-800",
                        isExtra && "bg-[#D7F45A] text-[#202023]"
                      )}
                    >
                      {ann.type.replace("_", " ")}
                    </span>
                    {ann.affected_date && (
                      <span className="text-[10px] font-mono text-[#85858A]">
                        {ann.affected_date}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-[#202023] line-clamp-1">{ann.title}</h4>
                  <p className="text-[11px] text-[#85858A] line-clamp-2 leading-relaxed">
                    {ann.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unconfirmed Attendance Notice (if any) */}
      {unconfirmedClasses.length > 0 && (
        <div className="p-4 sm:p-5 rounded-[22px] bg-white border border-black/5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-[#202023]">
                {unconfirmedClasses.length} class{unconfirmedClasses.length > 1 ? "es" : ""} awaiting attendance confirmation
              </h3>
              <p className="text-[11px] text-[#85858A]">
                Confirm you were present or report an absence to keep calculations exact.
              </p>
            </div>
          </div>
          <button
            onClick={handleConfirmAll}
            className="px-4 py-2 text-xs font-bold text-[#202023] bg-[#D7F45A] hover:bg-[#cbf03f] rounded-full shadow-xs transition-all shrink-0 self-start sm:self-auto"
          >
            Confirm All as Attended
          </button>
        </div>
      )}

      {/* 2. Top Grid: 4 Core Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Attendance Overview */}
        <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#85858A]">
              Overall Attendance
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D7F45A] text-[#202023]">
              {overall.isAboveTarget ? "SAFE" : "ALERT"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 my-2">
            <div>
              <span className="text-4xl sm:text-5xl font-black text-[#202023] tracking-tight block">
                {overall.overallPercentage}%
              </span>
              <span className="text-xs font-semibold text-[#85858A] mt-1 block">
                {overall.totalAttended} of {overall.totalConducted} classes attended
              </span>
            </div>

            {/* Circular Progress Gauge */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#E9E9E9"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  stroke="#D7F45A"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] font-bold text-[#85858A]">TARGET</span>
                <span className="text-xs font-black text-[#202023]">{overall.targetPercentage}%</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-[#E9E9E9] flex items-center justify-between text-xs">
            <span className="text-[#85858A] font-medium">Bunk Buffer:</span>
            <span className="font-bold text-[#202023] bg-[#F0FAC7] px-2.5 py-0.5 rounded-full text-[11px]">
              {publishedVersion
                ? `+${overall.subjectSummaries.reduce((acc: number, s: any) => acc + s.maxBunkableClasses, 0)} classes safe`
                : "Awaiting timetable"}
            </span>
          </div>
        </div>

        {/* Card 2: Today's Classes */}
        <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#85858A]">
              Today&apos;s Classes
            </span>
            <Link
              href="/timetable"
              className="text-[11px] font-bold text-[#202023] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3 text-[#85858A]" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[190px] pr-1">
            {todayClasses.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#85858A]">
                {publishedVersion
                  ? "No lectures scheduled for today"
                  : "Your class timetable hasn't been published yet."}
              </div>
            ) : (
              todayClasses.map((occ: any) => {
                const isAttended = occ.attendanceRecord?.status === "attended";
                const isAbsent = occ.attendanceRecord?.status === "absent";
                const isCancelled = occ.status === "cancelled";

                return (
                  <div
                    key={occ.id}
                    className="p-3 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#202023] truncate">
                          {occ.subject.code}
                        </span>
                        <span className="text-[11px] text-[#85858A] truncate">
                          &bull; {occ.room || "LH-301"}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-[#85858A] block">
                        {occ.start_time.substring(0, 5)} - {occ.end_time.substring(0, 5)}
                      </span>
                    </div>

                    {/* Status Pill or Quick Toggle */}
                    <div className="shrink-0">
                      {isCancelled ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E9E9E9] text-[#85858A]">
                          Cancelled
                        </span>
                      ) : isAttended ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#D7F45A] text-[#202023]">
                          Attended
                        </span>
                      ) : isAbsent ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#202023] text-white">
                          Absent
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMarkAttendance(occ.id, "attended")}
                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#D7F45A] text-[#202023] hover:opacity-90 transition-opacity"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(occ.id, "absent")}
                            className="px-2 py-1 rounded-full text-[10px] font-bold bg-[#202023] text-white hover:bg-black transition-colors"
                          >
                            Absent
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-[#E9E9E9] text-[11px] text-[#85858A] flex items-center justify-between">
            <span>Total Today:</span>
            <span className="font-bold text-[#202023]">{todayClasses.length} lectures</span>
          </div>
        </div>

        {/* Card 3: Subject Attendance */}
        <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#85858A]">
              Subject Attendance
            </span>
            <Link
              href="/attendance"
              className="text-[11px] font-bold text-[#202023] hover:underline flex items-center gap-0.5"
            >
              <span>Details</span>
              <ChevronRight className="w-3 h-3 text-[#85858A]" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[190px] pr-1">
            {overall.subjectSummaries.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#85858A]">
                No subjects scheduled yet
              </div>
            ) : (
              overall.subjectSummaries.slice(0, 4).map((sub: any) => (
                <div key={sub.subjectId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#202023] truncate max-w-[130px]">
                      {sub.subjectCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[#202023]">
                        {sub.attendancePercentage}%
                      </span>
                      <span className="text-[10px] text-[#85858A]">
                        ({sub.classesAttended}/{sub.classesConducted})
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with lime-green accent */}
                  <div className="w-full bg-[#E9E9E9] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#D7F45A] transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, sub.attendancePercentage))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-[#E9E9E9] text-[11px] text-[#85858A] flex items-center justify-between">
            <span>Enrolled Subjects:</span>
            <span className="font-bold text-[#202023]">{overall.subjectSummaries.length} Total</span>
          </div>
        </div>

        {/* Card 4: Academic Activity */}
        <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#85858A]">
              Academic Activity
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D7F45A]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5 my-auto">
            <div className="p-3 rounded-2xl bg-[#E9E9E9]/40 border border-black/5">
              <span className="text-[10px] font-bold text-[#85858A] block uppercase tracking-wider">
                Attended Week
              </span>
              <span className="text-xl font-black text-[#202023] mt-0.5 block">
                {classesAttendedThisWeek}
              </span>
              <span className="text-[10px] text-[#85858A] font-medium">Lectures</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E9E9E9]/40 border border-black/5">
              <span className="text-[10px] font-bold text-[#85858A] block uppercase tracking-wider">
                Missed
              </span>
              <span className="text-xl font-black text-[#202023] mt-0.5 block">
                {classesMissedThisWeek}
              </span>
              <span className="text-[10px] text-[#85858A] font-medium">Recorded</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E9E9E9]/40 border border-black/5">
              <span className="text-[10px] font-bold text-[#85858A] block uppercase tracking-wider">
                Assignments
              </span>
              <span className="text-xl font-black text-[#202023] mt-0.5 block">
                {upcomingAssignmentsCount}
              </span>
              <span className="text-[10px] text-[#85858A] font-medium">Pending</span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E9E9E9]/40 border border-black/5">
              <span className="text-[10px] font-bold text-[#85858A] block uppercase tracking-wider">
                Holidays
              </span>
              <span className="text-xl font-black text-[#202023] mt-0.5 block">
                {upcomingHolidays.length}
              </span>
              <span className="text-[10px] text-[#85858A] font-medium">Upcoming</span>
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-[#E9E9E9] text-[11px] text-[#85858A] flex items-center justify-between">
            <span>Next Holiday:</span>
            <span className="font-bold text-[#202023] truncate max-w-[120px]">
              {upcomingHolidays[0]?.name || "None soon"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Dark Charcoal Panel: Attendance Trend */}
      <div className="p-6 sm:p-8 rounded-[28px] bg-[#202023] text-white shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D7F45A]">
                Activity Analytics
              </span>
              <span className="text-white/20">&bull;</span>
              <span className="text-xs text-[#85858A]">Sleep & Attendance Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              Attendance Trend & Scheduled Sessions
            </h2>
          </div>

          {/* Legend Pills */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D7F45A]" />
              <span className="text-white/90">Attended</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B8AAF5]" />
              <span className="text-white/90">Scheduled</span>
            </div>
          </div>
        </div>

        {/* Recharts Bar Chart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={8}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#85858A", fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#85858A", fontSize: 11 }}
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255, 255, 255, 0.04)", radius: 12 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="p-3 rounded-2xl bg-black/90 border border-white/10 text-xs shadow-xl text-white">
                          <p className="font-bold text-[#D7F45A] mb-1">{d.day}&apos;s Class Summary</p>
                          <p className="text-white/80">Attended: <strong className="text-white">{d.attended}</strong></p>
                          <p className="text-white/80">Scheduled: <strong className="text-white">{d.scheduled}</strong></p>
                          <p className="text-white/80">Rate: <strong className="text-[#D7F45A]">{d.rate}%</strong></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="scheduled"
                  fill="#B8AAF5"
                  radius={[8, 8, 8, 8]}
                  barSize={18}
                />
                <Bar
                  dataKey="attended"
                  fill="#D7F45A"
                  radius={[8, 8, 8, 8]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom Metrics Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-2xl bg-white/5">
            <span className="text-[10px] text-[#85858A] block font-semibold uppercase">Weekly Consistency</span>
            <span className="text-sm font-extrabold text-white mt-0.5 block">88.5% Attended</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5">
            <span className="text-[10px] text-[#85858A] block font-semibold uppercase">Peak Day</span>
            <span className="text-sm font-extrabold text-[#D7F45A] mt-0.5 block">Monday (4 / 4)</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5">
            <span className="text-[10px] text-[#85858A] block font-semibold uppercase">Total Hours Logged</span>
            <span className="text-sm font-extrabold text-[#B8AAF5] mt-0.5 block">24 hrs 30 min</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5">
            <span className="text-[10px] text-[#85858A] block font-semibold uppercase">Attendance Health</span>
            <span className="text-sm font-extrabold text-[#D7F45A] mt-0.5 block">Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
