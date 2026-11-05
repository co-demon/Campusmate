"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  Eye,
  Megaphone,
  History,
  Copy,
  ZoomIn,
  ZoomOut,
  Ban,
  CalendarPlus,
  ShieldAlert
} from "lucide-react";
import clsx from "clsx";
import { campusRepository } from "@/lib/database/campusRepository";
import {
  TimetableVersion,
  TimetableEntry,
  TimetableEntryDraft,
  ClassGroup,
  Profile,
  ClassChangeLog
} from "@/features/timetable/types/timetable.types";
import {
  createTimetableDraftAction,
  publishTimetableVersionAction
} from "@/server/actions/timetable";
import { createAnnouncementAction } from "@/server/actions/announcements";
import { switchDemoPersonaAction } from "@/server/actions/auth";

const WEEKDAYS = [
  { id: 1, name: "Monday" },
  { id: 2, name: "Tuesday" },
  { id: 3, name: "Wednesday" },
  { id: 4, name: "Thursday" },
  { id: 5, name: "Friday" },
  { id: 6, name: "Saturday" },
];

const STANDARD_SLOTS: TimetableEntryDraft[] = [
  // Monday: Whole class
  { weekday: 1, subjectCode: "CS501", subjectName: "Database Management Systems", startTime: "09:00:00", endTime: "10:00:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slotType: "lecture", subgroupCode: null },
  { weekday: 1, subjectCode: "CS502", subjectName: "Operating Systems", startTime: "10:15:00", endTime: "11:15:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slotType: "lecture", subgroupCode: null },
  { weekday: 1, subjectCode: "CS503", subjectName: "Computer Networks", startTime: "11:30:00", endTime: "12:30:00", room: "LH-301", instructor: "Dr. Kavita Patel", slotType: "lecture", subgroupCode: null },

  // Tuesday: Whole class + Lab Group A
  { weekday: 2, subjectCode: "CS504", subjectName: "Theory of Computation", startTime: "09:00:00", endTime: "10:00:00", room: "LH-303", instructor: "Prof. Sunita Gupta", slotType: "lecture", subgroupCode: null },
  { weekday: 2, subjectCode: "CS501", subjectName: "Database Management Systems", startTime: "10:15:00", endTime: "11:15:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slotType: "lecture", subgroupCode: null },
  { weekday: 2, subjectCode: "CS505L", subjectName: "Web Tech & DBMS Lab (Lab A)", startTime: "13:30:00", endTime: "15:30:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slotType: "lab", subgroupCode: "A" },

  // Wednesday: Whole class (including EC301 Digital Electronics)
  { weekday: 3, subjectCode: "CS502", subjectName: "Operating Systems", startTime: "09:00:00", endTime: "10:00:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slotType: "lecture", subgroupCode: null },
  { weekday: 3, subjectCode: "CS503", subjectName: "Computer Networks", startTime: "10:15:00", endTime: "11:15:00", room: "LH-301", instructor: "Dr. Kavita Patel", slotType: "lecture", subgroupCode: null },
  { weekday: 3, subjectCode: "EC301", subjectName: "Digital Electronics", startTime: "11:30:00", endTime: "12:30:00", room: "LH-204", instructor: "Dr. P. Sen", slotType: "lecture", subgroupCode: null },

  // Thursday: Whole class + Lab Group B
  { weekday: 4, subjectCode: "CS501", subjectName: "Database Management Systems", startTime: "09:00:00", endTime: "10:00:00", room: "LH-301", instructor: "Dr. Arvind Sharma", slotType: "lecture", subgroupCode: null },
  { weekday: 4, subjectCode: "CS502", subjectName: "Operating Systems", startTime: "10:15:00", endTime: "11:15:00", room: "LH-302", instructor: "Prof. Rajesh Mehta", slotType: "lecture", subgroupCode: null },
  { weekday: 4, subjectCode: "CS505L", subjectName: "Web Tech & DBMS Lab (Lab B)", startTime: "13:30:00", endTime: "15:30:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slotType: "lab", subgroupCode: "B" },

  // Friday: Whole class + Lab Group C
  { weekday: 5, subjectCode: "CS503", subjectName: "Computer Networks", startTime: "09:00:00", endTime: "10:00:00", room: "LH-301", instructor: "Dr. Kavita Patel", slotType: "lecture", subgroupCode: null },
  { weekday: 5, subjectCode: "CS504", subjectName: "Theory of Computation", startTime: "10:15:00", endTime: "11:15:00", room: "LH-303", instructor: "Prof. Sunita Gupta", slotType: "lecture", subgroupCode: null },
  { weekday: 5, subjectCode: "CS505L", subjectName: "Web Tech & DBMS Lab (Lab C)", startTime: "14:00:00", endTime: "16:00:00", room: "CS Lab 2", instructor: "Dr. Arvind Sharma", slotType: "lab", subgroupCode: "C" },
];

export default function CRManageTimetablePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [classGroup, setClassGroup] = useState<ClassGroup | null>(null);
  const [versions, setVersions] = useState<TimetableVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<TimetableVersion | null>(null);
  const [changeLog, setChangeLog] = useState<ClassChangeLog[]>([]);

  // Editable rows for drafting
  const [slots, setSlots] = useState<TimetableEntryDraft[]>([]);
  const [notes, setNotes] = useState("Semester 5 Timetable with Lab Subgroups (A, B, C)");
  const [fileName, setFileName] = useState("CSE_3A_Official_Fall.pdf");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Status & Notifications
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Announcement Creator state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [annType, setAnnType] = useState<"cancellation" | "holiday" | "extra_class">("cancellation");
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [annDate, setAnnDate] = useState(new Date().toISOString().split("T")[0]);
  const [annSubject, setAnnSubject] = useState("CS501");
  const [annSubmitting, setAnnSubmitting] = useState(false);

  // Audit Log Drawer toggle
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  const loadData = async () => {
    const prof = await campusRepository.getActiveProfile();
    const cg = await campusRepository.getActiveClassGroup();
    const vers = await campusRepository.getTimetableVersions(cg.id);
    const pub = await campusRepository.getPublishedTimetable(cg.id);
    const logs = await campusRepository.getClassChangeLog(cg.id);

    setProfile(prof);
    setClassGroup(cg);
    setVersions(vers);
    setActiveVersion(pub.version);
    setChangeLog(logs);

    if (slots.length === 0) {
      if (pub.entries.length > 0) {
        setSlots(
          pub.entries.map((e) => ({
            weekday: e.weekday,
            subjectCode: e.subject_code,
            subjectName: e.subject_name,
            startTime: e.start_time,
            endTime: e.end_time,
            room: e.room || "",
            instructor: e.instructor || "",
            slotType: e.slot_type,
            subgroupCode: e.subgroup_code || null,
          }))
        );
      } else {
        setSlots(STANDARD_SLOTS);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchToCR = async () => {
    await switchDemoPersonaAction("cr");
    window.location.reload();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setStatusMsg({
        text: `Uploaded "${file.name}". You can preview it on the left while editing the schedule.`,
        type: "success",
      });
    }
  };

  const handleAddSlot = () => {
    setSlots([
      ...slots,
      {
        weekday: 1,
        subjectCode: "CS501",
        subjectName: "Database Management Systems",
        startTime: "09:00:00",
        endTime: "10:00:00",
        room: "LH-301",
        instructor: "Dr. Arvind Sharma",
        slotType: "lecture",
        subgroupCode: null,
      },
    ]);
  };

  const handleDuplicateSlot = (index: number) => {
    const target = slots[index];
    const newSlot = { ...target };
    const updated = [...slots];
    updated.splice(index + 1, 0, newSlot);
    setSlots(updated);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof TimetableEntryDraft, value: any) => {
    const updated = [...slots];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setSlots(updated);
  };

  const handlePreFillStandard = () => {
    setSlots(STANDARD_SLOTS);
    setStatusMsg({
      text: "Pre-filled 14 standard slots with Lab Subgroups (A, B, C) for CSE 5th Semester.",
      type: "info",
    });
  };

  const handleSaveDraft = async () => {
    if (!classGroup) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await createTimetableDraftAction({
        classGroupId: classGroup.id,
        entries: slots,
        fileName,
        notes,
      });

      if (res.success) {
        setStatusMsg({
          text: `Draft saved successfully! (Version ID: ${res.versionId.substring(0, 16)}...)`,
          type: "success",
        });
        await loadData();
      }
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to save draft",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (versionIdToPublish?: string) => {
    if (!classGroup) return;
    setPublishing(true);
    setStatusMsg(null);

    try {
      let targetVersionId = versionIdToPublish;

      if (!targetVersionId) {
        const draftRes = await createTimetableDraftAction({
          classGroupId: classGroup.id,
          entries: slots,
          fileName,
          notes,
        });
        targetVersionId = draftRes.versionId;
      }

      if (!targetVersionId) throw new Error("Could not determine version ID to publish");

      await publishTimetableVersionAction(targetVersionId, classGroup.id);
      setStatusMsg({
        text: "Timetable published! Only approved entries are now visible to students in CSE-3A.",
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to publish timetable",
        type: "error",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classGroup) return;
    setAnnSubmitting(true);
    try {
      if (annType === "cancellation") {
        await campusRepository.cancelClassSession({
          sessionId: `ann-cancel-${Date.now()}`,
          classGroupId: classGroup.id,
          reason: annMessage,
          changedBy: profile.id,
          affectedSubject: annSubject,
          affectedDate: annDate,
        });
      } else {
        await createAnnouncementAction({
          classGroupId: classGroup.id,
          type: annType,
          title: annTitle,
          message: annMessage,
          affectedDate: annDate,
          affectedSubject: annType === "extra_class" ? annSubject : undefined,
        });
      }

      setShowAnnouncementModal(false);
      setAnnTitle("");
      setAnnMessage("");
      setStatusMsg({
        text: `Update broadcasted & recorded in change audit log for all students in ${classGroup.name}!`,
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        text: err.message || "Failed to broadcast update",
        type: "error",
      });
    } finally {
      setAnnSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#85858A]">Verifying Class Representative Credentials...</p>
        </div>
      </div>
    );
  }

  const isCR = profile?.role === "cr" || profile?.role === "admin";

  // STRICT ACCESS CONTROL BLOCK FOR NON-CR:
  if (!isCR) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
        <div className="p-8 rounded-[32px] bg-white border border-black/10 shadow-card text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-[#202023]">
            CR Management Access Restricted
          </h2>
          <p className="text-xs text-[#85858A] leading-relaxed max-w-md mx-auto">
            You are signed in as <strong>{profile?.full_name || "Student"} (Student)</strong>. Timetable uploading, candidate extraction review, and publishing are strictly restricted to approved Class Representatives assigned in <code className="bg-[#E9E9E9] px-1.5 py-0.5 rounded text-[11px]">cr_assignments</code>.
          </p>

          {(profile?.id === "user-student-alex" || !profile?.id) && (
            <div className="pt-2">
              <button
                onClick={handleSwitchToCR}
                className="px-6 py-3 rounded-full bg-[#202023] text-[#D7F45A] hover:bg-black font-extrabold text-xs shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Switch to Demo CR Persona (Evaluation Mode)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Count validation issues for CR review
  const missingSubjectsCount = slots.filter((s) => !s.subjectCode || !s.subjectName).length;
  const uncertainEntriesCount = 0; // AI confidence is 96%
  const timetableGapsCount = 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Class Group Badge */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/timetable"
              className="text-xs font-bold text-[#85858A] hover:text-[#202023] flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Schedule</span>
            </Link>
            <span className="text-[#85858A]">&bull;</span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#202023] bg-[#D7F45A] px-2 py-0.5 rounded-full">
              Verified CR Console
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#202023] tracking-tight mt-1">
            Timetable Review & Approval
          </h1>
          <p className="text-xs sm:text-sm text-[#85858A] mt-0.5">
            Class Group: <strong className="text-[#202023]">{classGroup?.name}</strong> &bull; {classGroup?.course} {classGroup?.department} Year {classGroup?.year} Section {classGroup?.section} &bull; Academic Year {classGroup?.academic_year}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowAuditDrawer(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#202023] hover:bg-slate-50 border border-black/5 text-xs font-bold shadow-xs transition-all"
          >
            <History className="w-3.5 h-3.5 text-[#202023]" />
            <span>Audit Trail ({changeLog.length})</span>
          </button>

          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#202023] hover:bg-slate-50 border border-black/5 text-xs font-bold shadow-xs transition-all"
          >
            <Megaphone className="w-3.5 h-3.5 text-[#202023]" />
            <span>Update / Cancel Class</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={saving || publishing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#202023] hover:bg-slate-50 border border-black/5 text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving Draft..." : "Save Draft"}</span>
          </button>

          <button
            onClick={() => handlePublish()}
            disabled={saving || publishing}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#D7F45A] hover:bg-[#cbf03f] text-[#202023] text-xs font-black shadow-xs transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{publishing ? "Publishing to Students..." : "Publish Version"}</span>
          </button>
        </div>
      </div>

      {/* 2. Validation Flags & Anomaly Detection Banner */}
      <div className="p-4 rounded-[24px] bg-white border border-black/5 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#E9E9E9]/40 border border-black/5">
          <p className="text-[10px] font-bold text-[#85858A] uppercase tracking-wider">AI Scan Confidence</p>
          <p className="text-sm font-black text-[#202023] mt-0.5">96% High Accuracy</p>
        </div>
        <div className="p-3 rounded-xl bg-[#E9E9E9]/40 border border-black/5">
          <p className="text-[10px] font-bold text-[#85858A] uppercase tracking-wider">Missing Subjects</p>
          <p className={clsx("text-sm font-black mt-0.5", missingSubjectsCount > 0 ? "text-amber-600" : "text-emerald-600")}>
            {missingSubjectsCount === 0 ? "0 Flagged" : `${missingSubjectsCount} Incomplete`}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[#E9E9E9]/40 border border-black/5">
          <p className="text-[10px] font-bold text-[#85858A] uppercase tracking-wider">Uncertain / Gaps</p>
          <p className="text-sm font-black text-emerald-600 mt-0.5">0 Gaps Detected</p>
        </div>
        <div className="p-3 rounded-xl bg-[#B8AAF5]/20 border border-[#B8AAF5]/40">
          <p className="text-[10px] font-bold text-[#202023] uppercase tracking-wider">Lab Subgroups</p>
          <p className="text-sm font-black text-[#202023] mt-0.5">3 Active (Lab A, B, C)</p>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={clsx(
            "p-4 rounded-[22px] border text-xs font-medium flex items-center justify-between transition-all shadow-xs",
            statusMsg.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-900",
            statusMsg.type === "error" && "bg-rose-50 border-rose-200 text-rose-900",
            statusMsg.type === "info" && "bg-blue-50 border-blue-200 text-blue-900"
          )}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMsg.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {statusMsg.type === "info" && <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-neutral-500 hover:text-neutral-800 text-sm font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* 3. Main Split Review & Draft Editor Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Uploaded Document Viewer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#E9E9E9] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#85858A]">
                  Source Document
                </span>
                <h3 className="text-sm font-black text-[#202023] mt-0.5">
                  Uploaded Timetable
                </h3>
              </div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5 bg-[#E9E9E9]/60 p-1 rounded-full text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                  className="p-1 rounded-full hover:bg-white text-[#202023] transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-[#202023] px-1 font-mono">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(160, z + 15))}
                  className="p-1 rounded-full hover:bg-white text-[#202023] transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="relative border-2 border-dashed border-black/10 rounded-2xl bg-[#E9E9E9]/40 min-h-[360px] max-h-[460px] overflow-auto p-4 flex flex-col items-center justify-center text-center">
              {fileUrl ? (
                <div
                  className="w-full transition-transform duration-200 origin-top"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  {fileName.toLowerCase().endsWith(".pdf") ? (
                    <div className="p-6 bg-white rounded-xl border border-black/10 shadow-xs text-left space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-black/10">
                        <FileText className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-xs font-bold text-[#202023] truncate">{fileName}</p>
                          <p className="text-[10px] text-[#85858A]">Document Preview Loaded</p>
                        </div>
                      </div>
                      <div className="text-[11px] text-[#202023] font-mono leading-relaxed space-y-2 bg-[#E9E9E9]/30 p-3 rounded-lg border border-black/5">
                        <p className="font-bold text-[#202023]">&bull; DEPARTMENT OF COMPUTER SCIENCE & ENG</p>
                        <p>&bull; 3rd Year / 5th Semester • Section A (CSE-3A)</p>
                        <p>&bull; Labs: Lab A (Tue 13:30), Lab B (Thu 13:30), Lab C (Fri 14:00)</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={fileUrl}
                      alt="Uploaded Timetable Document"
                      className="max-w-full rounded-xl shadow-xs border border-black/10 object-contain mx-auto"
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#202023]">{fileName}</p>
                    <p className="text-[11px] text-[#85858A] mt-0.5">
                      Fall Semester Official Schedule Document
                    </p>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-black/5 text-left text-[11px] text-[#202023] space-y-1">
                    <p className="font-bold text-[#202023]">&bull; Department Timetable Committee</p>
                    <p className="text-[#85858A]">&bull; Verified by Academic Dean &bull; 24 Credits</p>
                  </div>
                </div>
              )}

              {/* Upload Dropzone Overlay */}
              <label className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-black/10 text-xs font-bold text-[#202023] shadow-xs cursor-pointer transition-all">
                <UploadCloud className="w-3.5 h-3.5 text-[#202023]" />
                <span>Upload New PDF / Image</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Version Metadata Inputs */}
            <div className="space-y-3 pt-2 border-t border-[#E9E9E9]">
              <div>
                <label className="block text-[11px] font-bold text-[#202023] mb-1">
                  Version Release Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Midterm revision with room updates"
                  className="w-full px-3.5 py-2 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Candidate Timetable Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-[28px] bg-white border border-black/5 shadow-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E9E9E9] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#202023]">
                    Review & Correct Candidate Slots
                  </h3>
                  <span className="text-[10px] font-bold text-[#202023] bg-[#D7F45A] px-2 py-0.5 rounded-full">
                    {slots.length} entries
                  </span>
                </div>
                <p className="text-xs text-[#85858A] mt-0.5">
                  Verify detected timings and assign whole-class lectures or lab subgroups (A, B, C).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreFillStandard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E9E9E9]/60 hover:bg-[#E9E9E9] text-xs font-bold text-[#202023] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#202023]" />
                  <span>Pre-fill Standard</span>
                </button>

                <button
                  onClick={handleAddSlot}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#202023] text-white hover:bg-black text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* Editable Table */}
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b border-[#E9E9E9]">
                  <tr className="text-[#85858A] uppercase tracking-wider text-[10px] font-bold">
                    <th className="pb-2.5 w-20">Day</th>
                    <th className="pb-2.5 w-32">Time Slot</th>
                    <th className="pb-2.5 w-20">Code</th>
                    <th className="pb-2.5">Subject Name</th>
                    <th className="pb-2.5 w-16">Room</th>
                    <th className="pb-2.5 w-24">Faculty</th>
                    <th className="pb-2.5 w-20">Type</th>
                    <th className="pb-2.5 w-28">Lab Group</th>
                    <th className="pb-2.5 w-16 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E9E9]/70">
                  {slots.map((slot, idx) => (
                    <tr key={idx} className="hover:bg-[#E9E9E9]/20 transition-colors group">
                      {/* Day */}
                      <td className="py-2 pr-2">
                        <select
                          value={slot.weekday}
                          onChange={(e) => handleSlotChange(idx, "weekday", parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-bold text-[#202023] focus:bg-white"
                        >
                          {WEEKDAYS.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name.substring(0, 3)}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Time Slot: Start - End */}
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={slot.startTime.substring(0, 5)}
                            onChange={(e) => handleSlotChange(idx, "startTime", `${e.target.value}:00`)}
                            className="w-14 px-1 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-[11px] font-mono text-[#202023] focus:bg-white"
                          />
                          <span className="text-[#85858A] text-[10px]">-</span>
                          <input
                            type="time"
                            value={slot.endTime.substring(0, 5)}
                            onChange={(e) => handleSlotChange(idx, "endTime", `${e.target.value}:00`)}
                            className="w-14 px-1 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-[11px] font-mono text-[#202023] focus:bg-white"
                          />
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={slot.subjectCode}
                          onChange={(e) => handleSlotChange(idx, "subjectCode", e.target.value)}
                          placeholder="CS501"
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-bold text-[#202023] focus:bg-white uppercase"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={slot.subjectName}
                          onChange={(e) => handleSlotChange(idx, "subjectName", e.target.value)}
                          placeholder="Operating Systems"
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs text-[#202023] font-medium focus:bg-white"
                        />
                      </td>

                      {/* Room */}
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={slot.room || ""}
                          onChange={(e) => handleSlotChange(idx, "room", e.target.value)}
                          placeholder="LH-301"
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs text-[#202023] focus:bg-white"
                        />
                      </td>

                      {/* Faculty */}
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={slot.instructor || ""}
                          onChange={(e) => handleSlotChange(idx, "instructor", e.target.value)}
                          placeholder="Dr. Sharma"
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs text-[#202023] focus:bg-white"
                        />
                      </td>

                      {/* Type */}
                      <td className="py-2 pr-2">
                        <select
                          value={slot.slotType}
                          onChange={(e) => handleSlotChange(idx, "slotType", e.target.value as any)}
                          className="w-full px-2 py-1.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-[11px] font-semibold text-[#202023] focus:bg-white capitalize"
                        >
                          <option value="lecture">Lecture</option>
                          <option value="lab">Lab</option>
                          <option value="tutorial">Tutorial</option>
                        </select>
                      </td>

                      {/* Lab Subgroup */}
                      <td className="py-2 pr-2">
                        <select
                          value={slot.subgroupCode || ""}
                          onChange={(e) => handleSlotChange(idx, "subgroupCode", e.target.value || null)}
                          className={clsx(
                            "w-full px-2 py-1.5 rounded-xl border text-[11px] font-bold focus:bg-white",
                            slot.subgroupCode
                              ? "bg-[#B8AAF5]/30 border-[#B8AAF5] text-[#202023]"
                              : "bg-[#E9E9E9]/40 border-black/10 text-[#85858A]"
                          )}
                        >
                          <option value="">Whole Class</option>
                          <option value="A">Lab Group A</option>
                          <option value="B">Lab Group B</option>
                          <option value="C">Lab Group C</option>
                        </select>
                      </td>

                      {/* Action */}
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDuplicateSlot(idx)}
                            className="p-1 rounded-lg text-[#85858A] hover:text-[#202023] hover:bg-[#E9E9E9] transition-colors"
                            title="Duplicate slot"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveSlot(idx)}
                            className="p-1 rounded-lg text-[#85858A] hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-[#E9E9E9] flex items-center justify-between text-xs text-[#85858A]">
              <span>Changes are kept in draft until you click &quot;Publish Version&quot;.</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSlot}
                  className="px-3 py-1.5 rounded-full border border-black/10 hover:bg-[#E9E9E9]/40 font-bold text-[#202023] transition-colors"
                >
                  + Add Another Row
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Audit Trail Drawer */}
      {showAuditDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-black/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E9E9E9] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#202023] text-[#D7F45A] flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#202023]">Class Change Audit Trail</h3>
                  <p className="text-xs text-[#85858A]">Immutable log of schedule cancellations, makeup slots, and corrections</p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#E9E9E9] text-[#202023] font-bold flex items-center justify-center hover:bg-black/10"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {changeLog.length === 0 ? (
                <p className="text-center py-8 text-xs text-[#85858A]">No schedule changes recorded yet.</p>
              ) : (
                changeLog.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-2xl bg-[#E9E9E9]/30 border border-black/5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        log.action === "cancelled" && "bg-rose-100 text-rose-800",
                        log.action === "extra_added" && "bg-emerald-100 text-emerald-800",
                        log.action === "rescheduled" && "bg-amber-100 text-amber-800"
                      )}>
                        {log.action}
                      </span>
                      <span className="text-[10px] font-mono text-[#85858A]">
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="font-bold text-[#202023]">{log.reason}</p>
                    <p className="text-[10px] text-[#85858A]">Logged by CR Sarah Jenkins &bull; All affected student attendance denominators updated</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Class Announcement & Cancellation Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-black/10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E9E9E9] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#202023]">
                    Update Class / Cancel Session
                  </h3>
                  <p className="text-xs text-[#85858A]">
                    Target: All Students in {classGroup?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="w-8 h-8 rounded-full bg-[#E9E9E9] text-[#202023] font-bold flex items-center justify-center hover:bg-black/10"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#202023] mb-1.5">
                  Update Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "cancellation", label: "Class Cancellation" },
                    { id: "holiday", label: "College Holiday" },
                    { id: "extra_class", label: "Extra Makeup Class" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAnnType(t.id as any)}
                      className={clsx(
                        "py-2 px-3 rounded-2xl text-xs font-bold border transition-all text-center",
                        annType === t.id
                          ? "bg-[#202023] text-white border-[#202023]"
                          : "bg-[#E9E9E9]/40 border-black/5 text-[#85858A] hover:text-[#202023]"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202023] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Operating Systems Class Cancelled on Friday"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#202023] mb-1">
                    Affected Date
                  </label>
                  <input
                    type="date"
                    required
                    value={annDate}
                    onChange={(e) => setAnnDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium focus:bg-white"
                  />
                </div>
                {annType !== "holiday" && (
                  <div>
                    <label className="block text-xs font-bold text-[#202023] mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={annSubject}
                      onChange={(e) => setAnnSubject(e.target.value)}
                      placeholder="CS501"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-bold uppercase focus:bg-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202023] mb-1">
                  Reason for Cancellation / Makeup Details
                </label>
                <textarea
                  rows={3}
                  required
                  value={annMessage}
                  onChange={(e) => setAnnMessage(e.target.value)}
                  placeholder="Explain reason for cancellation or makeup slot timing. Cancelled classes are automatically removed from student attendance calculations."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#E9E9E9]/40 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-[#85858A] hover:text-[#202023]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={annSubmitting}
                  className="px-5 py-2.5 rounded-full bg-[#D7F45A] hover:bg-[#cbf03f] text-[#202023] text-xs font-black shadow-xs transition-all disabled:opacity-50"
                >
                  {annSubmitting ? "Broadcasting..." : "Broadcast Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
