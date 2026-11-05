"use client";

import { useEffect, useState } from "react";
import { campusRepository } from "@/lib/database/campusRepository";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  CalendarX,
  Plus
} from "lucide-react";
import clsx from "clsx";

export default function CalendarPage() {
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const loadData = async () => {
    const occs = await campusRepository.getClassOccurrences();
    setOccurrences(occs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleAttendance = async (occurrenceId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'attended' ? 'absent' : 'attended';
    await campusRepository.reportAttendance(occurrenceId, nextStatus);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
      </div>
    );
  }

  // Generate calendar days for current month view
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  const selectedOccurrences = occurrences.filter((o) => o.date === selectedDate);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            Academic Calendar
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Semester class occurrences, scheduled exams, and college holidays.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-white border border-black/5 p-1.5 rounded-full shadow-xs self-start">
          <button
            onClick={prevMonth}
            className="p-1.5 text-[#202023] hover:bg-[#E9E9E9] rounded-full transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-[#202023] min-w-[120px] text-center">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-[#202023] hover:bg-[#E9E9E9] rounded-full transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Calendar Grid */}
        <div className="lg:col-span-2 p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#85858A] uppercase tracking-wider pb-2 border-b border-[#E9E9E9]">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((d, idx) => {
              const dayOccurrences = occurrences.filter((o) => o.date === d.dateStr);
              const isSelected = selectedDate === d.dateStr;
              const hasClasses = dayOccurrences.length > 0;
              const hasCancelled = dayOccurrences.some((o) => o.status === "cancelled");

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(d.dateStr)}
                  className={clsx(
                    "min-h-[70px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all",
                    isSelected
                      ? "border-[#202023] bg-[#F0FAC7] shadow-xs"
                      : d.isCurrentMonth
                      ? "border-black/5 bg-[#E9E9E9]/40 hover:bg-[#E9E9E9]"
                      : "border-transparent bg-transparent opacity-30"
                  )}
                >
                  <span className={clsx(
                    "text-xs font-black",
                    isSelected ? "text-[#202023]" : "text-[#202023]"
                  )}>
                    {d.dayNum}
                  </span>

                  {hasClasses && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hasCancelled ? (
                        <span className="w-2 h-2 rounded-full bg-[#85858A]" title="Holiday" />
                      ) : (
                        dayOccurrences.slice(0, 3).map((occ) => (
                          <span
                            key={occ.id}
                            className="w-2 h-2 rounded-full bg-[#D7F45A] border border-[#202023]/20"
                          />
                        ))
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day Schedule Detail */}
        <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E9E9E9]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#85858A]">Selected Date</span>
              <h3 className="text-sm font-black text-[#202023]">
                {selectedDate}
              </h3>
            </div>
            <span className="text-xs font-extrabold text-[#202023] bg-[#D7F45A] px-3 py-1 rounded-full">
              {selectedOccurrences.length} sessions
            </span>
          </div>

          {selectedOccurrences.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#85858A]">
              No classes scheduled on this date.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedOccurrences.map((occ: any) => {
                const status = occ.attendanceRecord?.status || (occ.status === 'cancelled' ? 'cancelled' : 'upcoming');
                return (
                  <div
                    key={occ.id}
                    className="p-3.5 rounded-2xl bg-[#E9E9E9]/40 border border-black/5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-black text-[#202023] block">
                          {occ.subject.code} &bull; {occ.subject.name}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-[#85858A] mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {occ.start_time.substring(0, 5)} - {occ.end_time.substring(0, 5)}
                          </span>
                          {occ.room && (
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3 h-3" />
                              {occ.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold capitalize",
                        status === 'attended' ? "bg-[#D7F45A] text-[#202023]" :
                        status === 'absent' ? "bg-[#202023] text-white" :
                        status === 'cancelled' ? "bg-[#E9E9E9] text-[#85858A]" :
                        "bg-[#E9E9E9] text-[#202023]"
                      )}>
                        {status}
                      </span>
                    </div>

                    {occ.status !== 'cancelled' && (
                      <div className="pt-2 border-t border-[#E9E9E9] flex items-center justify-between text-xs">
                        <span className="text-[11px] text-[#85858A]">Attendance:</span>
                        <button
                          onClick={() => handleToggleAttendance(occ.id, status)}
                          className="font-bold text-[#202023] hover:underline text-[11px]"
                        >
                          Mark as {status === 'attended' ? 'Absent' : 'Attended'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
