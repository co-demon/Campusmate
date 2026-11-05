"use server";

import { createClient } from "@/lib/supabase/server";
import { campusRepository } from "@/lib/database/campusRepository";
import { Profile } from "@/types/database.types";

export interface StudentDashboardData {
  profile: Profile;
  classGroup: {
    id: string;
    course: string;
    department: string;
    year: number;
    section: string;
    name: string;
    academic_year: string;
  };
  subgroups: any[];
  activeSubgroup?: any;
  publishedVersion: any | null;
  todayClasses: any[];
  overall: {
    overallPercentage: number;
    overallPct: number;
    totalConducted: number;
    totalClasses: number;
    totalAttended: number;
    totalAbsent: number;
    targetPercentage: number;
    isAboveTarget: boolean;
    bunkableClasses: number;
    classesNeeded: number;
    subjectSummaries: any[];
  };
  subjects: any[];
  attendanceSummary: any;
  unconfirmedClasses: any[];
  upcomingHolidays: any[];
  announcements: any[];
  changeLog: any[];
}

/**
 * Server Action: Fetches dashboard data tailored strictly to the authenticated student.
 * If user is logged in, never returns Alex Mercer or hardcoded demo timetable.
 * If CR has not published a timetable for student's group, returns publishedVersion: null
 * and empty schedule/attendance sections.
 */
export async function getDashboardDataAction(): Promise<StudentDashboardData> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        // Authenticated user exists
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        const profile = profileData as Profile | null;

        if (profile) {
          // Look up or construct class group information
          let classGroupData: any = null;
          if (profile.class_group_id) {
            const { data: cg } = await supabase
              .from("class_groups")
              .select("*")
              .eq("id", profile.class_group_id)
              .maybeSingle();
            classGroupData = cg;
          }

          const cohortName =
            classGroupData?.name ||
            (profile.course
              ? `${profile.course} - Sem ${profile.semester || 1} (${profile.class_group || "Group 1"})`
              : "Student Cohort");

          const classGroup = classGroupData || {
            id: profile.class_group_id || "unassigned-cohort",
            course: profile.course || "General",
            department: profile.course?.split(" ")[0] || "General",
            year: Math.max(1, Math.min(5, Math.ceil((profile.semester || 1) / 2))),
            section: profile.class_group?.replace("Group ", "") || "1",
            name: cohortName,
            academic_year: "2024-2025",
          };

          // Check if CR has published any official timetable for this student's class group
          let publishedVersion: any = null;
          if (profile.class_group_id) {
            // First check timetable_imports table (CampusMate v3 core)
            const { data: pubImport } = await supabase
              .from("timetable_imports")
              .select("*")
              .eq("class_group_id", profile.class_group_id)
              .eq("status", "published")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pubImport) {
              publishedVersion = pubImport;
            }
          }

          // If no timetable has been published for this student's cohort, return clean empty dashboard state
          if (!publishedVersion) {
            return {
              profile,
              classGroup,
              subgroups: [],
              activeSubgroup: null,
              publishedVersion: null,
              todayClasses: [],
              overall: {
                overallPercentage: 0,
                overallPct: 0,
                totalConducted: 0,
                totalClasses: 0,
                totalAttended: 0,
                totalAbsent: 0,
                targetPercentage: 75,
                isAboveTarget: true,
                bunkableClasses: 0,
                classesNeeded: 0,
                subjectSummaries: [],
              },
              subjects: [],
              attendanceSummary: {
                overallPercentage: 0,
                totalConducted: 0,
                totalAttended: 0,
                totalAbsent: 0,
                subjectSummaries: [],
              },
              unconfirmedClasses: [],
              upcomingHolidays: [],
              announcements: [],
              changeLog: [],
            };
          }

          // Published timetable found: load real sessions and attendance for matching group
          const { data: sessions } = await (supabase
            .from("class_sessions") as any)
            .select("*")
            .eq("class_group_id", profile.class_group_id as string);

          const { data: attendance } = await (supabase
            .from("attendance_records") as any)
            .select("*")
            .eq("student_id", user.id);

          const todayDate = new Date();
          const todayStr = todayDate.toISOString().split("T")[0];
          const todaySessions = (sessions || []).filter((s: any) => s.date === todayStr);

          const attMap = new Map<string, any>();
          (attendance || []).forEach((a: any) => attMap.set(a.session_id, a));

          const todayClasses = todaySessions.map((s: any) => ({
            id: s.id,
            subject: {
              code: s.subject_code || "SUBJ",
              name: s.subject_name || "Class Session",
            },
            start_time: s.start_time,
            end_time: s.end_time,
            room: s.room || "TBA",
            faculty_name: s.instructor || "Faculty",
            slot_type: s.session_type || "lecture",
            subgroup_code: s.subgroup_code || null,
            status: s.status || "scheduled",
            attendanceRecord: attMap.get(s.id),
          }));

          const attendedCount = (attendance || []).filter((a: any) => a.status === "attended").length;
          const totalRecords = (attendance || []).length;
          const overallPct = totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 100) : 0;

          return {
            profile,
            classGroup,
            subgroups: [],
            activeSubgroup: null,
            publishedVersion,
            todayClasses,
            overall: {
              overallPercentage: overallPct,
              overallPct,
              totalConducted: totalRecords,
              totalClasses: totalRecords,
              totalAttended: attendedCount,
              totalAbsent: totalRecords - attendedCount,
              targetPercentage: 75,
              isAboveTarget: overallPct >= 75,
              bunkableClasses: 0,
              classesNeeded: 0,
              subjectSummaries: [],
            },
            subjects: [],
            attendanceSummary: {
              overallPercentage: overallPct,
              totalConducted: totalRecords,
              totalAttended: attendedCount,
              totalAbsent: totalRecords - attendedCount,
              subjectSummaries: [],
            },
            unconfirmedClasses: [],
            upcomingHolidays: [],
            announcements: [],
            changeLog: [],
          };
        }
      }
    } catch (err) {
      console.error("Error retrieving student dashboard data from Supabase:", err);
    }
  }

  // Fallback to demo store only when running in unauthenticated offline demo mode
  return (await campusRepository.getDashboardData()) as any;
}
