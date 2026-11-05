"use client";

import { useEffect, useState } from "react";
import { campusRepository } from "@/lib/database/campusRepository";
import { getDashboardDataAction } from "@/server/actions/dashboard";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CalendarX,
  Filter,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import clsx from "clsx";

export default function AttendancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'safe' | 'warning'>('all');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const dash = await getDashboardDataAction();
      const occs = dash.publishedVersion ? await campusRepository.getClassOccurrences() : [];
      setData(dash);
      setOccurrences(occs);
    } catch (e) {
      const dash = await campusRepository.getDashboardData();
      const occs = await campusRepository.getClassOccurrences();
      setData(dash);
      setOccurrences(occs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAttendance = async (occurrenceId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    await campusRepository.reportAttendance(occurrenceId, nextStatus);
    await loadData();
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
      </div>
    );
  }

  const { overall } = data;

  const filteredSubjects = overall.subjectSummaries.filter((s: any) => {
    if (filter === 'safe') return s.isAboveTarget;
    if (filter === 'warning') return !s.isAboveTarget;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            Attendance Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Subject-wise attendance tracking, minimum thresholds, and recovery analytics.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-black/5 rounded-full shadow-xs self-start">
          <button
            onClick={() => setFilter('all')}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
              filter === 'all'
                ? "bg-[#202023] text-white"
                : "text-[#85858A] hover:text-[#202023]"
            )}
          >
            All ({overall.subjectSummaries.length})
          </button>
          <button
            onClick={() => setFilter('safe')}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
              filter === 'safe'
                ? "bg-[#D7F45A] text-[#202023]"
                : "text-[#85858A] hover:text-[#202023]"
            )}
          >
            Safe &ge; 75%
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={clsx(
              "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
              filter === 'warning'
                ? "bg-[#202023] text-white"
                : "text-[#85858A] hover:text-[#202023]"
            )}
          >
            Action Needed
          </button>
        </div>
      </div>

      {/* Subject Cards Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-sm">
            <CalendarX className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-[#202023] tracking-tight">
              Your class timetable hasn’t been published yet.
            </h2>
            <p className="text-xs sm:text-sm text-[#85858A] leading-relaxed">
              Subject attendance and breakdown will automatically appear here once your Class Representative publishes your official class schedule.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSubjects.map((sub: any) => {
          const isExpanded = expandedSubject === sub.subjectId;
          const subjectOccurrences = occurrences
            .filter((o) => o.subject_id === sub.subjectId && o.status !== 'cancelled')
            .sort((a, b) => b.date.localeCompare(a.date));

          return (
            <div
              key={sub.subjectId}
              className="p-6 rounded-[24px] bg-white border border-black/5 shadow-card space-y-4 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl bg-[#202023] text-white font-black flex items-center justify-center text-xs shadow-xs"
                  >
                    {sub.subjectCode.substring(0, 4)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#202023]">
                      {sub.subjectCode} &bull; {sub.subjectName}
                    </h3>
                    <p className="text-xs text-[#85858A]">
                      {sub.facultyName || "Faculty Assigned"} &bull; {sub.room || "Room TBA"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-[#202023] tracking-tight">
                    {sub.attendancePercentage}%
                  </span>
                  <span className="block text-[10px] font-bold text-[#85858A] uppercase tracking-wider">
                    Target {sub.targetPercentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar with Lime Accent */}
              <div className="space-y-1">
                <div className="w-full bg-[#E9E9E9] rounded-full h-2.5 overflow-hidden relative">
                  <div
                    className="h-full rounded-full bg-[#D7F45A] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, sub.attendancePercentage))}%` }}
                  />
                  {/* Target 75% indicator line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#202023] z-10"
                    style={{ left: `${sub.targetPercentage}%` }}
                    title={`Target: ${sub.targetPercentage}%`}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-[#E9E9E9] text-xs">
                <div className="p-2.5 rounded-2xl bg-[#E9E9E9]/40">
                  <span className="text-[10px] text-[#85858A] block font-bold uppercase">Conducted</span>
                  <span className="font-extrabold text-[#202023] text-sm">{sub.classesConducted}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#F0FAC7]">
                  <span className="text-[10px] text-[#202023] block font-bold uppercase">Attended</span>
                  <span className="font-black text-[#202023] text-sm">{sub.classesAttended}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#E9E9E9]/40">
                  <span className="text-[10px] text-[#85858A] block font-bold uppercase">Absent</span>
                  <span className="font-extrabold text-[#202023] text-sm">{sub.classesAbsent}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-[#E9E9E9]/40">
                  <span className="text-[10px] text-[#85858A] block font-bold uppercase">Cancelled</span>
                  <span className="font-extrabold text-[#85858A] text-sm">{sub.classesCancelled}</span>
                </div>
              </div>

              {/* Recovery or Bunk Buffer */}
              <div className="flex items-center justify-between text-xs p-3.5 rounded-2xl bg-[#E9E9E9]/40 border border-black/5">
                {sub.isAboveTarget ? (
                  <div className="flex items-center gap-2 text-[#202023]">
                    <ShieldCheck className="w-4 h-4 text-[#202023] shrink-0" />
                    <span className="font-bold text-[11px]">
                      Safe buffer: You can miss up to {sub.maxBunkableClasses} class{sub.maxBunkableClasses === 1 ? '' : 'es'} without dropping below {sub.targetPercentage}%.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#202023]">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="font-bold text-[11px]">
                      Recovery: Attend next {sub.classesNeededForTarget} consecutive class{sub.classesNeededForTarget === 1 ? '' : 'es'} to reach {sub.targetPercentage}%.
                    </span>
                  </div>
                )}
              </div>

              {/* Expand History Button */}
              <button
                onClick={() => setExpandedSubject(isExpanded ? null : sub.subjectId)}
                className="w-full flex items-center justify-center gap-1.5 pt-1 text-xs font-bold text-[#85858A] hover:text-[#202023]"
              >
                <span>{isExpanded ? "Hide Occurrence History" : "View Recent Class Occurrences"}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Expanded Occurrences List */}
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-[#E9E9E9] max-h-60 overflow-y-auto pr-1">
                  {subjectOccurrences.slice(0, 10).map((occ: any) => {
                    const status = occ.attendanceRecord?.status || 'unconfirmed';
                    return (
                      <div
                        key={occ.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-[#E9E9E9]/40 text-xs"
                      >
                        <div>
                          <span className="font-bold text-[#202023] block">
                            {occ.date} &bull; {occ.start_time.substring(0, 5)}
                          </span>
                          <span className="text-[10px] text-[#85858A] capitalize">
                            {occ.event_type} session
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize",
                            status === 'attended' ? "bg-[#D7F45A] text-[#202023]" :
                            status === 'absent' ? "bg-[#202023] text-white" :
                            "bg-[#E9E9E9] text-[#85858A]"
                          )}>
                            {status}
                          </span>
                          <button
                            onClick={() => handleToggleAttendance(occ.id, status)}
                            className="text-[11px] font-extrabold text-[#202023] hover:underline"
                          >
                            Toggle
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}
