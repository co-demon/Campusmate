"use server";

import { createClient } from "@/lib/supabase/server";
import { campusRepository } from "@/lib/database/campusRepository";
import { revalidatePath } from "next/cache";

/**
 * Server Action: Record or update student attendance.
 * Security: Enforced that the caller can ONLY insert/update their own attendance.
 */
export async function markStudentAttendanceAction(params: {
  timetableEntryId: string;
  classGroupId: string;
  date: string; // YYYY-MM-DD
  status: "attended" | "absent";
  remarks?: string;
}) {
  const supabase = await createClient();

  if (supabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized: Please sign in to record attendance.");

    // Upsert personal attendance record using unique constraint on (student_id, timetable_entry_id, date)
    const { data, error } = await (supabase as any)
      .from("attendance_records")
      .upsert(
        {
          student_id: user.id,
          class_group_id: params.classGroupId,
          timetable_entry_id: params.timetableEntryId,
          date: params.date,
          status: params.status,
          remarks: params.remarks || null,
        },
        { onConflict: "student_id,timetable_entry_id,date" }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    revalidatePath("/attendance");
    return { success: true, record: data };
  }

  // Fallback to offline repository
  return await campusRepository.markStudentAttendance(params);
}
