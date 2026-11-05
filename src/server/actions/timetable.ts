"use server";

import { createClient } from "@/lib/supabase/server";
import { campusRepository } from "@/lib/database/campusRepository";
import { TimetableEntryDraft } from "@/features/timetable/types/timetable.types";
import { revalidatePath } from "next/cache";

/**
 * Server Action: Creates a new draft timetable version for a class group.
 * Security: Validates on server that the caller has 'cr' or 'admin' role.
 */
export async function createTimetableDraftAction(params: {
  classGroupId: string;
  entries: TimetableEntryDraft[];
  filePath?: string;
  fileName?: string;
  notes?: string;
}) {
  const supabase = await createClient();

  if (supabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      throw new Error("Unauthorized: Please sign in to upload timetables.");
    }

    // Verify role in database
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, class_group_id")
      .eq("id", user.id)
      .single();

    const p = profile as { role: string; class_group_id: string | null } | null;

    if (!p || (p.role !== "cr" && p.role !== "admin")) {
      throw new Error("Forbidden: Only authorized Class Representatives (CR) can upload timetables.");
    }

    if (p.role === "cr" && p.class_group_id !== params.classGroupId) {
      throw new Error("Forbidden: You can only upload timetables for your assigned class group.");
    }

    // Determine next version number
    const { data: versions } = await supabase
      .from("timetable_versions")
      .select("version_number")
      .eq("class_group_id", params.classGroupId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVer = ((versions as any)?.[0]?.version_number || 0) + 1;

    // Insert draft version
    const { data: newVersion, error: verErr } = await (supabase as any)
      .from("timetable_versions")
      .insert({
        class_group_id: params.classGroupId,
        version_number: nextVer,
        status: "draft",
        file_path: params.filePath || null,
        file_name: params.fileName || null,
        notes: params.notes || `Version ${nextVer} Draft`,
        uploaded_by: user.id,
      })
      .select()
      .single();

    const verData = newVersion as any;

    if (verErr || !verData) {
      throw new Error(verErr?.message || "Failed to create timetable draft");
    }

    // Insert entries
    if (params.entries.length > 0) {
      const entryRows = params.entries.map((e) => ({
        version_id: verData.id,
        weekday: e.weekday,
        subject_code: e.subjectCode,
        subject_name: e.subjectName,
        start_time: e.startTime,
        end_time: e.endTime,
        room: e.room || null,
        instructor: e.instructor || null,
        slot_type: e.slotType,
      }));

      const { error: entriesErr } = await (supabase as any).from("timetable_entries").insert(entryRows);
      if (entriesErr) {
        throw new Error(entriesErr.message);
      }
    }

    revalidatePath("/timetable");
    revalidatePath("/dashboard");
    return { success: true, versionId: verData.id };
  }

  // Fallback to offline repository
  const res = await campusRepository.createTimetableDraft({
    classGroupId: params.classGroupId,
    entries: params.entries,
    filePath: params.filePath,
    fileName: params.fileName,
    notes: params.notes,
  });

  return res;
}

/**
 * Server Action: Publishes a timetable draft version.
 * Archives existing published versions for the class group.
 */
export async function publishTimetableVersionAction(versionId: string, classGroupId: string) {
  const supabase = await createClient();

  if (supabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      throw new Error("Unauthorized");
    }

    // Check CR role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, class_group_id")
      .eq("id", user.id)
      .single();

    const p = profile as { role: string; class_group_id: string | null } | null;

    if (!p || (p.role !== "cr" && p.role !== "admin")) {
      throw new Error("Forbidden: Only CRs can publish timetables.");
    }

    // Archive current published versions for this class group
    await (supabase as any)
      .from("timetable_versions")
      .update({ status: "archived" })
      .eq("class_group_id", classGroupId)
      .eq("status", "published");

    // Publish this version
    const { error: pubErr } = await (supabase as any)
      .from("timetable_versions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", versionId);

    if (pubErr) throw new Error(pubErr.message);

    revalidatePath("/timetable");
    revalidatePath("/dashboard");
    return { success: true };
  }

  return await campusRepository.publishTimetableVersion(versionId, classGroupId);
}
