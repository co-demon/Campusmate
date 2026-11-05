"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowRight,
  BookOpen,
  Calendar,
  Hash,
  Phone,
  User,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import {
  getOnboardingStateAction,
  completeStudentOnboardingAction,
  ClassGroupOption,
} from "@/server/actions/onboarding";

const CLASS_GROUPS: ClassGroupOption[] = ["Group 1", "Group 2", "Group 3"];

const POPULAR_PROGRAMS = [
  "B.Tech Computer Science and Engineering",
  "B.Tech Information Technology",
  "B.Tech Electronics & Communication",
  "Bachelor of Computer Applications (BCA)",
  "B.Sc Computer Science",
  "Master of Computer Applications (MCA)",
];

export default function OnboardingPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState<number>(1);
  const [classGroup, setClassGroup] = useState<ClassGroupOption>("Group 1");
  const [classRollNumber, setClassRollNumber] = useState("");

  // UI state
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getOnboardingStateAction().then((res) => {
      if (!isMounted) return;

      if (!res.authenticated) {
        // Not authenticated with Supabase, route back to login
        router.replace("/login");
        return;
      }

      if (res.isComplete) {
        // Already onboarded, send straight to dashboard
        router.replace("/dashboard");
        return;
      }

      // Preload available data from authenticated account or existing profile draft
      if (res.profile) {
        if (res.profile.full_name) setFullName(res.profile.full_name);
        if (res.profile.email) setEmail(res.profile.email);
        if (res.profile.phone) setPhone(res.profile.phone);
        if (res.profile.course) setCourse(res.profile.course);
        if (res.profile.semester) setSemester(res.profile.semester);
        if (res.profile.class_group) setClassGroup(res.profile.class_group);
        if (res.profile.class_roll_number) setClassRollNumber(res.profile.class_roll_number);
      }

      setPageLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please provide your full legal or registered name.");
      return;
    }

    if (!course.trim() || course.trim().length < 2) {
      setError("Please specify your enrolled course / program.");
      return;
    }

    if (isNaN(semester) || semester < 1 || semester > 12) {
      setError("Please enter a valid semester number (1 to 12).");
      return;
    }

    if (!classGroup || !CLASS_GROUPS.includes(classGroup)) {
      setError("Please select either Group 1, Group 2, or Group 3.");
      return;
    }

    if (!classRollNumber.trim()) {
      setError("Please enter your class roll number.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await completeStudentOnboardingAction({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        course: course.trim(),
        semester: Number(semester),
        classGroup,
        classRollNumber: classRollNumber.trim(),
      });

      if (!res.success) {
        setError(res.error || "Failed to complete onboarding. Please try again.");
        setSubmitting(false);
        return;
      }

      // Hard redirect to clear any cached SSR middleware state and refresh user profile
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#E5F79E] p-4 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#202023] border-t-[#D7F45A] rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#202023] uppercase tracking-wider">
            Loading student onboarding...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E5F79E] p-3 sm:p-6 lg:p-10 flex items-center justify-center font-sans antialiased">
      <div className="w-full max-w-[620px] rounded-[32px] sm:rounded-[40px] bg-[#202023] text-white p-6 sm:p-10 shadow-2xl border border-black/10 relative overflow-hidden">
        {/* Glow Accent Circles */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#D7F45A]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#B8AAF5]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 space-y-3 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D7F45A] text-[#202023] flex items-center justify-center font-black shadow-sm">
              <GraduationCap className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-tight">
                CampusMate
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-[#D7F45A]">
                First-Time Student Onboarding
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Set Up Your Class Details
            </h1>
            <p className="text-xs text-[#85858A] mt-1 leading-relaxed">
              Complete your student profile to automatically sync your schedule once your Class Representative publishes the official timetable.
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <p className="font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Row 1: Full Name & Account Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Full Name <span className="text-[#D7F45A]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#85858A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D7F45A] focus:border-transparent transition-all"
                />
                <User className="w-3.5 h-3.5 text-[#85858A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Verified Account Email
              </label>
              <div className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-[#85858A] text-xs font-medium truncate select-none">
                {email || "student@college.edu"}
              </div>
            </div>
          </div>

          {/* Row 2: Phone (Contact only) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-white">
                Contact Phone Number
              </label>
              <span className="text-[10px] text-[#85858A] font-medium">
                Contact only &bull; No OTP required
              </span>
            </div>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210 (Optional)"
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#85858A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D7F45A] focus:border-transparent transition-all"
              />
              <Phone className="w-3.5 h-3.5 text-[#85858A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Row 3: Course / Program */}
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Course / Degree Program <span className="text-[#D7F45A]">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                list="programs-list"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. B.Tech Computer Science and Engineering"
                required
                className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#85858A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D7F45A] focus:border-transparent transition-all"
              />
              <BookOpen className="w-3.5 h-3.5 text-[#85858A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <datalist id="programs-list">
                {POPULAR_PROGRAMS.map((prog) => (
                  <option key={prog} value={prog} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Row 4: Semester & Class Roll Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                Current Semester <span className="text-[#D7F45A]">*</span>
              </label>
              <div className="relative">
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D7F45A] focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((s) => (
                    <option key={s} value={s} className="bg-[#202023] text-white">
                      Semester {s}
                    </option>
                  ))}
                </select>
                <Calendar className="w-3.5 h-3.5 text-[#85858A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-white">
                  Class Roll Number <span className="text-[#D7F45A]">*</span>
                </label>
                <span className="text-[10px] text-[#85858A]">Preserves 0s</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={classRollNumber}
                  onChange={(e) => setClassRollNumber(e.target.value)}
                  placeholder="e.g. 042 or 22CSE041"
                  required
                  className="w-full pl-9 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#85858A] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#D7F45A] focus:border-transparent transition-all"
                />
                <Hash className="w-3.5 h-3.5 text-[#85858A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 5: Class Group Selection (Group 1, Group 2, Group 3) */}
          <div>
            <label className="block text-xs font-bold text-white mb-2">
              Class Group <span className="text-[#D7F45A]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {CLASS_GROUPS.map((group) => {
                const isSelected = classGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setClassGroup(group)}
                    className={clsx(
                      "py-3 px-3 rounded-2xl text-xs font-bold transition-all text-center border cursor-pointer",
                      isSelected
                        ? "bg-[#D7F45A] text-[#202023] border-[#D7F45A] shadow-md shadow-[#D7F45A]/20 scale-[1.02]"
                        : "bg-white/5 text-[#85858A] border-white/10 hover:border-white/30 hover:text-white"
                    )}
                  >
                    <Layers className={clsx("w-4 h-4 mx-auto mb-1", isSelected ? "text-[#202023]" : "text-[#85858A]")} />
                    <span>{group}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#85858A] mt-2">
              Select your laboratory and tutorial cohort division. Timetable slots and notices will be filtered accordingly.
            </p>
          </div>

          {/* Notice: Role assignment info */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-[#85858A] leading-relaxed flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D7F45A] shrink-0" />
            <span>
              All registered users join as <strong>Students</strong>. Class Representative (CR) publishing access is verified and assigned securely by department administrators.
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 py-3.5 px-6 rounded-full bg-[#D7F45A] hover:bg-[#cbf03f] text-[#202023] font-black text-xs shadow-lg shadow-[#D7F45A]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#202023] border-t-transparent rounded-full animate-spin" />
                <span>Completing Setup...</span>
              </>
            ) : (
              <>
                <span>Complete Onboarding & Enter Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
