"use server";

import { createClient } from "@/lib/supabase/server";
import { Profile } from "@/types/database.types";
import { isProfileComplete, ClassGroupOption, OnboardingInput } from "@/lib/onboarding";

export type { ClassGroupOption, OnboardingInput };

/**
 * Server Action: Fetches authenticated user's current onboarding status.
 * If user has no profile row, creates an initial un-onboarded profile row safely.
 */
export async function getOnboardingStateAction() {
  const supabase = await createClient();
  if (!supabase) {
    return { authenticated: false, profile: null, isComplete: false, error: "Database client not available" };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { authenticated: false, profile: null, isComplete: false };
  }

  // Fetch user profile from Supabase
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    const typedProfile = profile as Profile;
    return {
      authenticated: true,
      profile: typedProfile,
      isComplete: isProfileComplete(typedProfile),
    };
  }

  // Auto-provision un-onboarded profile if trigger hasn't completed yet
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split("@")[0].replace(".", " ") : "Campus Student");
  const phone = user.user_metadata?.phone || null;

  const { data: newProfile } = await (supabase.from("profiles") as any)
    .upsert(
      {
        id: user.id,
        email: user.email || "",
        full_name: fullName,
        phone,
        role: "student",
        class_group_id: null,
        is_onboarded: false,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  const typed = (newProfile as Profile) || null;
  return {
    authenticated: true,
    profile: typed,
    isComplete: isProfileComplete(typed),
  };
}

/**
 * Server Action: Completes first-time student onboarding.
 * Strictly associates data with authenticated user.id.
 * Roll number is preserved as exact text with leading zeros.
 * Does not permit CR role escalation.
 */
export async function completeStudentOnboardingAction(input: OnboardingInput) {
  const { fullName, phone, course, semester, classGroup, classRollNumber } = input;

  // Validation
  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: "Please enter your valid full name." };
  }
  if (!course || course.trim().length < 2) {
    return { success: false, error: "Please enter your program/course (e.g. B.Tech CSE)." };
  }
  const parsedSemester = Number(semester);
  if (isNaN(parsedSemester) || parsedSemester < 1 || parsedSemester > 12) {
    return { success: false, error: "Semester must be a number between 1 and 12." };
  }
  if (!["Group 1", "Group 2", "Group 3"].includes(classGroup)) {
    return { success: false, error: "Please select Group 1, Group 2, or Group 3." };
  }
  const cleanRoll = classRollNumber ? String(classRollNumber).trim() : "";
  if (!cleanRoll) {
    return { success: false, error: "Please enter your class roll number." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Supabase connection is not available." };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Authentication required. Please sign in again." };
  }

  try {
    // 1. Link or provision a class_groups cohort row for this group
    const groupName = `${course.trim()} - Sem ${parsedSemester} (${classGroup})`;
    const dept = course.trim().split(" ")[0] || "General";
    const year = Math.max(1, Math.min(5, Math.ceil(parsedSemester / 2)));
    const section = classGroup.replace("Group ", "");

    let classGroupId: string | null = null;

    // Check if class group exists
    const { data: existingGroup } = await (supabase
      .from("class_groups") as any)
      .select("id")
      .eq("name", groupName)
      .maybeSingle();

    if (existingGroup) {
      classGroupId = existingGroup.id;
    } else {
      // Create new class group record
      const { data: createdGroup } = await (supabase.from("class_groups") as any)
        .insert({
          course: course.trim(),
          department: dept,
          year,
          section,
          name: groupName,
          academic_year: "2024-2025",
        })
        .select("id")
        .maybeSingle();

      if (createdGroup) {
        classGroupId = createdGroup.id;
      }
    }

    // 2. Update user's profile with onboarding fields
    const { data: updatedProfile, error: updateError } = await (supabase
      .from("profiles") as any)
      .update({
        full_name: fullName.trim(),
        phone: phone ? phone.trim() : null,
        course: course.trim(),
        semester: parsedSemester,
        class_group: classGroup,
        class_roll_number: cleanRoll,
        roll_number: cleanRoll, // Keep legacy field synchronized
        class_group_id: classGroupId,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile during onboarding:", updateError);
      return { success: false, error: updateError.message || "Failed to update profile." };
    }

    // 3. Link student into class_group_members if classGroupId is resolved
    if (classGroupId) {
      try {
        await (supabase.from("class_group_members") as any).upsert(
          {
            class_group_id: classGroupId,
            student_id: user.id,
            is_active: true,
          },
          { onConflict: "class_group_id,student_id" }
        );
      } catch (memberErr) {
        // Non-fatal if unique constraint or schema variant
        console.warn("Class group member link notice:", memberErr);
      }
    }

    return {
      success: true,
      profile: updatedProfile as Profile,
      redirect: "/dashboard",
    };
  } catch (err: any) {
    console.error("Onboarding action exception:", err);
    return { success: false, error: err?.message || "An unexpected error occurred during onboarding." };
  }
}
