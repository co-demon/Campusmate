"use server";

import { createClient } from "@/lib/supabase/server";
import { campusRepository } from "@/lib/database/campusRepository";
import { Profile } from "@/types/database.types";
import { cookies } from "next/headers";

/**
 * Server Action: Get the currently authenticated user's profile.
 * Fetches from Supabase `profiles` table using authenticated user ID.
 * If the profile row is missing, repairs it securely server-side.
 * Never falls back to a hardcoded demo user for an authenticated user.
 */
export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();

  if (supabase) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!userError && user) {
        // Fetch existing profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profile && !profileError) {
          return profile as Profile;
        }

        // Profile missing: trusted server-side creation / repair flow
        const cleanName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0].replace(".", " ") : "Campus Student");
        const cleanPhone = user.user_metadata?.phone || null;
        const cleanEmail = user.email || "";

        const { data: repaired, error: repairError } = await (supabase
          .from("profiles") as any)
          .upsert(
            {
              id: user.id,
              email: cleanEmail,
              full_name: cleanName,
              phone: cleanPhone,
              role: "student",
              class_group_id: null,
              is_onboarded: false,
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (repaired && !repairError) {
          return repaired as Profile;
        }

        // Safe authenticated fallback for this specific user
        return {
          id: user.id,
          email: cleanEmail,
          full_name: cleanName,
          phone: cleanPhone,
          role: "student",
          class_group_id: null,
          roll_number: null,
          class_roll_number: null,
          course: null,
          semester: null,
          class_group: null,
          is_onboarded: false,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
    } catch (err) {
      console.error("Error retrieving Supabase profile:", err);
    }
  }

  // Fallback to active demo persona ONLY when there is no authenticated user session
  return await campusRepository.getActiveProfile();
}

/**
 * Server Action: Sign out the user, terminate Supabase session, and clear cookies.
 */
export async function signOutAction() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // Remove demo cookie
  cookieStore.delete("campusmate_demo");

  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out from Supabase:", err);
    }
  }

  return { success: true };
}

/**
 * Server Action: Request password reset email for forgotten passwords.
 */
export async function resetPasswordAction(email: string, redirectToOrigin?: string) {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Supabase connection is not configured." };
  }

  try {
    const callbackUrl = redirectToOrigin
      ? `${redirectToOrigin}/auth/callback?next=/settings`
      : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send reset email." };
  }
}

/**
 * Server Action: Update user's full name in their profile.
 * Only authenticated users can update their own name; role changes are blocked.
 */
export async function updateProfileNameAction(fullName: string) {
  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: "Please provide a valid full name." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, error: "Supabase connection is not configured." };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const { data: updated, error } = await (supabase
    .from("profiles") as any)
    .update({ full_name: fullName.trim() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, profile: updated };
}

/**
 * Server Action: Switch persona in offline demo mode between Student and CR.
 */
export async function switchDemoPersonaAction(role: "student" | "cr") {
  const cookieStore = await cookies();
  cookieStore.set("campusmate_demo", "true", { path: "/", maxAge: 604800 });
  return await campusRepository.switchActiveUser(role);
}

/**
 * Server Action: Initialize or enter instant demo session with given role
 */
export async function setDemoSessionAction(role: "student" | "cr") {
  const cookieStore = await cookies();
  cookieStore.set("campusmate_demo", "true", { path: "/", maxAge: 604800 });
  await campusRepository.switchActiveUser(role);
  return { success: true };
}
