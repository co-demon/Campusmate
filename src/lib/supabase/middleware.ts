import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "@/types/database.types";
import { isProfileComplete } from "@/lib/onboarding";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Supabase credentials not set, allow requests through to demo/mock layer
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/auth/callback");
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/attendance") ||
    request.nextUrl.pathname.startsWith("/timetable") ||
    request.nextUrl.pathname.startsWith("/calendar") ||
    request.nextUrl.pathname.startsWith("/planner") ||
    request.nextUrl.pathname.startsWith("/paperwork") ||
    request.nextUrl.pathname.startsWith("/assignments") ||
    request.nextUrl.pathname.startsWith("/question-papers") ||
    request.nextUrl.pathname.startsWith("/settings");

  // When user is authenticated: Real user takes absolute precedence over any demo cookies
  if (user) {
    // Check onboarding status
    let isOnboarded = false;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      isOnboarded = isProfileComplete(profile as any);
    } catch (e) {
      console.warn("Middleware profile check notice:", e);
    }

    if (!isOnboarded) {
      // Incomplete profile: must complete onboarding
      if (!isOnboardingRoute && !isCallbackRoute && (isProtectedRoute || isAuthRoute)) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    // Fully onboarded: cannot revisit onboarding, login, or signup
    if (isOnboardingRoute || isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // When user is NOT authenticated:
  const isDemo = request.cookies.get("campusmate_demo")?.value === "true";
  if (isDemo) {
    // If demo mode, allow access to protected routes, but onboarding is for real users
    if (isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Not authenticated & not demo
  if (isProtectedRoute || isOnboardingRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
