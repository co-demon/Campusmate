import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/onboarding";
import { Profile } from "@/types/database.types";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user) {
        // Clear any leftover demo session cookie on real login
        try {
          const cookieStore = await cookies();
          cookieStore.delete("campusmate_demo");
        } catch (cookieErr) {
          // Ignore non-fatal cookie deletion error
        }

        let profile: Profile | null = null;
        try {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();

          profile = (existingProfile as unknown) as Profile | null;

          if (!profile) {
            const fullName =
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              (data.user.email ? data.user.email.split("@")[0].replace(".", " ") : "Campus Student");

            const { data: insertedProfile } = await (supabase.from("profiles") as any)
              .upsert(
                {
                  id: data.user.id,
                  email: data.user.email || "",
                  full_name: fullName,
                  phone: data.user.user_metadata?.phone || null,
                  role: "student",
                  class_group_id: null,
                  is_onboarded: false,
                },
                { onConflict: "id" }
              )
              .select()
              .single();

            profile = (insertedProfile as unknown) as Profile | null;
          }
        } catch (repairErr) {
          console.error("Profile auto-repair on auth callback notice:", repairErr);
        }

        // Determine destination: redirect to /onboarding if required profile fields are incomplete
        const isOnboarded = isProfileComplete(profile);
        const destination = isOnboarded ? (next ?? "/dashboard") : "/onboarding";

        const forwardedHost = request.headers.get("x-forwarded-host");
        const isLocalEnv = process.env.NODE_ENV === "development";

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${destination}`);
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${destination}`);
        } else {
          return NextResponse.redirect(`${origin}${destination}`);
        }
      }
    }
  }

  // If code exchange failed or no code present, redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
