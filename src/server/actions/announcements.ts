"use server";

import { createClient } from "@/lib/supabase/server";
import { campusRepository } from "@/lib/database/campusRepository";
import { revalidatePath } from "next/cache";

export interface CreateAnnouncementInput {
  classGroupId: string;
  type: "cancellation" | "holiday" | "extra_class" | "general";
  title: string;
  message: string;
  affectedDate?: string;
  affectedSubject?: string;
}

/**
 * Server Action: Create a class announcement (Cancellations, Holidays, Extra Classes)
 * Enforced on server: only CRs of the target class group can post announcements.
 */
export async function createAnnouncementAction(input: CreateAnnouncementInput) {
  const supabase = await createClient();

  if (supabase) {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, class_group_id")
      .eq("id", user.id)
      .single();

    const p = profile as { role: string; class_group_id: string | null } | null;

    if (!p || (p.role !== "cr" && p.role !== "admin")) {
      throw new Error("Forbidden: Only CRs can publish announcements.");
    }

    if (p.role === "cr" && p.class_group_id !== input.classGroupId) {
      throw new Error("Forbidden: You cannot post announcements for a different class group.");
    }

    const { data, error } = await (supabase as any)
      .from("class_announcements")
      .insert({
        class_group_id: input.classGroupId,
        type: input.type,
        title: input.title,
        message: input.message,
        affected_date: input.affectedDate || null,
        affected_subject: input.affectedSubject || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
    return { success: true, announcement: data };
  }

  // Fallback to offline repository
  return await campusRepository.createAnnouncement(input);
}
