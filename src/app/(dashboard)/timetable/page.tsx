"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { campusRepository } from "@/lib/database/campusRepository";
import { Clock, MapPin, User, UploadCloud, ShieldCheck, CheckCircle2, Filter, AlertTriangle, CalendarX } from "lucide-react";
import clsx from "clsx";
import { TimetableVersion, ClassGroup, Profile, ClassSubgroup } from "@/features/timetable/types/timetable.types";

const DAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
];

export default function TimetablePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [subgroups, setSubgroups] = useState<ClassSubgroup[]>([]);
  const [version, setVersion] = useState<TimetableVersion | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<string>("my"); // "my" | "all" | "A" | "B" | "C"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      campusRepository.getActiveClassGroup(),
      campusRepository.getActiveProfile(),
      campusRepository.getSubjects(),
    ]).then(async ([cg, prof, subs]) => {
      setClassGroup(cg);
      setProfile(prof);
      setSubjects(subs);
      const sgs = await campusRepository.getClassSubgroups(cg.id);
      setSubgroups(sgs);

      const pub = await campusRepository.getPublishedTimetable(cg.id);
      setEntries(pub.entries);
      setVersion(pub.version);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
      </div>
    );
  }

  const isCR = profile?.role === "cr" || profile?.role === "admin";
  const studentSubgroupCode = profile?.class_group ? profile.class_group.replace("Group ", "") : "1";
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Filter entries based on active subgroup selection
  const filteredEntries = entries.filter((entry) => {
    if (selectedSubgroup === "all") return true;
    if (selectedSubgroup === "my") {
      // Show whole-class sessions (subgroup_code is null) OR student's assigned subgroup sessions
      return !entry.subgroup_code || entry.subgroup_code === studentSubgroupCode;
    }
    // Specific subgroup filter
    return !entry.subgroup_code || entry.subgroup_code === selectedSubgroup;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202023] bg-[#D7F45A] px-2.5 py-0.5 rounded-full">
              Class {classGroup?.name}
            </span>
            <span className="text-[#85858A]">&bull;</span>
            <span className="text-xs text-[#85858A]">
              v{version?.version_number || 1} Published Schedule
            </span>
            <span className="text-[#85858A]">&bull;</span>
            <span className="text-xs font-semibold text-[#85858A]">
              Lab Group B Assigned
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#202023] tracking-tight">
            Weekly Class Schedule
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            {classGroup?.course} {classGroup?.department} &bull; Year {classGroup?.year} &bull; Section {classGroup?.section} &bull; Verified by Class Representative
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* CR Manage Timetable button */}
          <Link
            href="/timetable/manage"
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-black/5 text-[#202023] text-xs font-bold shadow-xs transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-[#202023]" />
            <span>Manage & Publish (CR)</span>
          </Link>

          <Link
            href="/timetable/upload"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#202023] text-white hover:bg-black text-xs font-bold shadow-xs transition-all"
          >
            <UploadCloud className="w-4 h-4 text-[#D7F45A]" />
            <span>Upload New File</span>
          </Link>
        </div>
      </div>

      {!version && (
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-sm">
            <CalendarX className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-[#202023] tracking-tight">
              Your class timetable hasn’t been published yet.
            </h2>
            <p className="text-xs sm:text-sm text-[#85858A] leading-relaxed">
              Your Class Representative hasn&apos;t published the official schedule for your cohort yet.
              Once your CR reviews and publishes the timetable, your full weekly matrix will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Lab Subgroup Filter Tabs */}
      <div className="flex items-center justify-between gap-3 p-2 bg-white/70 rounded-2xl border border-black/5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-xs font-bold text-[#85858A] flex items-center gap-1 px-2">
            <Filter className="w-3.5 h-3.5 text-[#202023]" />
            <span>Schedule View:</span>
          </span>
          <button
            onClick={() => setSelectedSubgroup("my")}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer",
              selectedSubgroup === "my"
                ? "bg-[#202023] text-white shadow-xs"
                : "bg-white text-[#202023] hover:bg-[#E9E9E9]/60 border border-black/5"
            )}
          >
            My Schedule (Lectures + Lab B)
          </button>
          <button
            onClick={() => setSelectedSubgroup("all")}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer",
              selectedSubgroup === "all"
                ? "bg-[#202023] text-white shadow-xs"
                : "bg-white text-[#202023] hover:bg-[#E9E9E9]/60 border border-black/5"
            )}
          >
            All Subgroups
          </button>
          <button
            onClick={() => setSelectedSubgroup("A")}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer",
              selectedSubgroup === "A"
                ? "bg-[#202023] text-white shadow-xs"
                : "bg-white text-[#202023] hover:bg-[#E9E9E9]/60 border border-black/5"
            )}
          >
            Lab A Only
          </button>
          <button
            onClick={() => setSelectedSubgroup("B")}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer",
              selectedSubgroup === "B"
                ? "bg-[#202023] text-white shadow-xs"
                : "bg-white text-[#202023] hover:bg-[#E9E9E9]/60 border border-black/5"
            )}
          >
            Lab B Only
          </button>
          <button
            onClick={() => setSelectedSubgroup("C")}
            className={clsx(
              "px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer",
              selectedSubgroup === "C"
                ? "bg-[#202023] text-white shadow-xs"
                : "bg-white text-[#202023] hover:bg-[#E9E9E9]/60 border border-black/5"
            )}
          >
            Lab C Only
          </button>
        </div>

        <div className="text-[11px] text-[#85858A] font-medium px-2">
          Showing {filteredEntries.length} sessions
        </div>
      </div>

      {!version && (
        <div className="p-8 sm:p-10 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-sm">
            <CalendarX className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-[#202023] tracking-tight">
              Your class timetable hasn’t been published yet.
            </h2>
            <p className="text-xs sm:text-sm text-[#85858A] leading-relaxed">
              Your Class Representative hasn&apos;t published the official schedule for your cohort yet.
              Once your CR reviews and publishes the timetable, your full weekly matrix will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {DAYS.map((day) => {
          const dayEntries = filteredEntries
            .filter((e) => e.weekday === day.id || e.day_of_week === day.id)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div
              key={day.id}
              className="p-5 rounded-[24px] bg-white border border-black/5 shadow-card space-y-3 flex flex-col"
            >
              <div className="border-b border-[#E9E9E9] pb-3 flex items-center justify-between">
                <span className="font-black text-sm text-[#202023]">
                  {day.name}
                </span>
                <span className="text-[10px] font-bold text-[#202023] bg-[#F0FAC7] px-2 py-0.5 rounded-full">
                  {dayEntries.length} slots
                </span>
              </div>

              {dayEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#85858A]">
                  No classes scheduled
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {dayEntries.map((entry) => {
                    const sub =
                      subjectMap.get(entry.subject_id) ||
                      subjectMap.get(entry.subject_code) ||
                      {
                        code: entry.subject_code,
                        name: entry.subject_name,
                      };

                    const isLab = entry.slot_type === "lab";

                    return (
                      <div
                        key={entry.id}
                        className={clsx(
                          "p-3.5 rounded-2xl border space-y-1.5 hover:shadow-xs transition-all",
                          isLab
                            ? "bg-[#B8AAF5]/15 border-[#B8AAF5]/40"
                            : "bg-[#E9E9E9]/40 border-black/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#D7F45A] text-[#202023]">
                              {sub?.code || entry.subject_code || "SUB"}
                            </span>
                            {entry.subgroup_code && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#B8AAF5] text-[#202023]">
                                Lab {entry.subgroup_code}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#85858A]">
                            {entry.start_time.substring(0, 5)} - {entry.end_time.substring(0, 5)}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-[#202023] truncate">
                          {sub?.name || entry.subject_name || "Subject"}
                        </p>

                        <div className="text-[10px] text-[#85858A] space-y-0.5 pt-1.5 border-t border-[#E9E9E9]">
                          {entry.room && (
                            <div className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3 h-3 text-[#85858A]" />
                              <span>{entry.room}</span>
                            </div>
                          )}
                          {(entry.faculty_name || entry.instructor) && (
                            <div className="flex items-center gap-1 font-medium">
                              <User className="w-3 h-3 text-[#85858A]" />
                              <span className="truncate">
                                {entry.faculty_name || entry.instructor}
                              </span>
                            </div>
                          )}
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
    </div>
  );
}
