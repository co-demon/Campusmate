"use client";

import { useEffect, useState } from "react";
import { campusRepository } from "@/lib/database/campusRepository";
import { getDashboardDataAction } from "@/server/actions/dashboard";
import { simulateBunkOnDate } from "@/features/attendance/services/attendanceEngine";
import {
  Sparkles,
  Calendar,
  CalendarX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from "lucide-react";
import clsx from "clsx";

export default function BunkPlannerPage() {
  const [data, setData] = useState<any>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const dash = await getDashboardDataAction();
        const occs = dash.publishedVersion ? await campusRepository.getClassOccurrences() : [];
        setData(dash);
        setOccurrences(occs);
      } catch (e) {
        const [dash, occs] = await Promise.all([
          campusRepository.getDashboardData(),
          campusRepository.getClassOccurrences(),
        ]);
        setData(dash);
        setOccurrences(occs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!data || !occurrences.length || !targetDate) return;

    const subjectsInfo = data.subjects.map((s: any) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      minAttendancePct: s.min_attendance_pct,
    }));

    const engineOccurrences = occurrences.map((o: any) => ({
      id: o.id,
      subjectId: o.subject_id,
      date: o.date,
      startTime: o.start_time,
      endTime: o.end_time,
      eventType: o.event_type,
      status: o.status,
      attendanceStatus: o.attendanceRecord?.status,
    }));

    const result = simulateBunkOnDate(targetDate, subjectsInfo, engineOccurrences, 75.0);
    setSimulation(result);
  }, [data, occurrences, targetDate]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D7F45A] text-[#202023]">
            Attendance Simulation Engine
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#202023] tracking-tight mt-1.5 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-[#202023]" />
          <span>Can I Take a Holiday?</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#85858A] mt-1">
          Pick any future date. CampusMate will inspect your timetable, simulate missing those classes, and calculate the exact mathematical impact on your attendance.
        </p>
      </div>

      {!data.publishedVersion && (
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-sm">
            <CalendarX className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-[#202023] tracking-tight">
              Your class timetable hasn’t been published yet.
            </h2>
            <p className="text-xs sm:text-sm text-[#85858A] leading-relaxed">
              Predictive attendance calculation and holiday simulations require an official published timetable for your cohort.
            </p>
          </div>
        </div>
      )}

      {/* Date Selector Box */}
      <div className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label className="block text-xs font-bold text-[#202023] uppercase tracking-wider mb-1">
            Select Target Date to Test
          </label>
          <p className="text-xs text-[#85858A]">
            Simulate being absent for all scheduled classes on this day
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="px-4 py-2.5 rounded-full border border-black/10 bg-[#E9E9E9]/40 text-xs font-bold text-[#202023] focus:outline-none focus:ring-2 focus:ring-[#D7F45A]"
          />
        </div>
      </div>

      {/* Simulation Result Card */}
      {simulation && (
        <div className={clsx(
          "p-6 sm:p-8 rounded-[28px] border border-black/5 shadow-card space-y-6 transition-all",
          simulation.canSafelyBunk
            ? "bg-white text-[#202023]"
            : "bg-[#202023] text-white"
        )}>
          {/* Top Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center font-bold shadow-xs",
                simulation.canSafelyBunk ? "bg-[#D7F45A] text-[#202023]" : "bg-white/10 text-[#D7F45A]"
              )}>
                {simulation.canSafelyBunk ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
              </div>
              <div>
                <span className={clsx(
                  "text-xs font-bold uppercase tracking-wider block",
                  simulation.canSafelyBunk ? "text-[#85858A]" : "text-[#D7F45A]"
                )}>
                  {simulation.canSafelyBunk ? "Safe to Take Off" : "High Risk / Bunk Warning"}
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                  {simulation.summaryMessage}
                </h2>
              </div>
            </div>

            <div className={clsx(
              "text-right p-4 rounded-2xl border shadow-xs shrink-0",
              simulation.canSafelyBunk
                ? "bg-[#E9E9E9]/40 border-black/5"
                : "bg-white/5 border-white/10"
            )}>
              <span className="text-[10px] uppercase font-bold text-[#85858A] block">Overall Projected</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-semibold text-[#85858A] line-through">
                  {simulation.overallCurrentPercentage}%
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#85858A]" />
                <span className={clsx(
                  "text-2xl font-black",
                  simulation.overallProjectedPercentage >= 75 ? "text-[#D7F45A]" : "text-rose-400"
                )}>
                  {simulation.overallProjectedPercentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown per Subject on that Date */}
          {simulation.totalClassesOnDate > 0 ? (
            <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/10">
              <h3 className={clsx(
                "text-xs font-bold uppercase tracking-wider",
                simulation.canSafelyBunk ? "text-[#85858A]" : "text-[#D7F45A]"
              )}>
                Scheduled Classes on {targetDate} ({simulation.totalClassesOnDate} classes affected)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simulation.subjectsAffected.map((sub: any) => (
                  <div
                    key={sub.subjectId}
                    className={clsx(
                      "p-4 rounded-2xl border shadow-xs space-y-2",
                      simulation.canSafelyBunk
                        ? "bg-[#E9E9E9]/40 border-black/5"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs">
                        {sub.subjectCode} &bull; {sub.subjectName}
                      </span>
                      <span className="text-[11px] font-semibold text-[#85858A]">
                        {sub.classesScheduledOnDate} class(es)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-[#85858A]">Current: {sub.currentPercentage}%</span>
                        <ArrowRight className="w-3 h-3 text-[#85858A]" />
                        <span className={clsx(
                          "font-bold",
                          sub.projectedPercentage >= 75 ? "text-[#D7F45A]" : "text-rose-400"
                        )}>
                          {sub.projectedPercentage}%
                        </span>
                      </div>

                      <div>
                        {sub.isAboveTargetAfter ? (
                          <span className="text-[11px] font-bold text-[#D7F45A]">
                            Stays &ge; 75%
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-400">
                            Need {sub.recoveryClassesNeeded} to recover
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 text-xs text-[#85858A]">
              No classes are scheduled on this date in your timetable or the day has already been marked as a college holiday.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
