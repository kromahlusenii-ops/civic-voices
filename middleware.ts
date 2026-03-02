import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes, API, and static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/report/") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for middleware
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated, redirect to signup (no query params for security)
  if (!session) {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  // For authenticated users accessing protected routes, check onboarding status
  // Skip onboarding check for /onboarding itself
  if (pathname !== "/onboarding") {
    try {
      const {
        data: { user: supabaseUser },
      } = await supabase.auth.getUser();

      if (supabaseUser) {
        // Check if user has completed onboarding
        const user = await prisma.user.findUnique({
          where: { supabaseUid: supabaseUser.id },
          select: { onboardingCompletedAt: true },
        });

        // If onboarding not completed, redirect to onboarding
        if (!user?.onboardingCompletedAt) {
          const onboardingUrl = new URL("/onboarding", request.url);
          return NextResponse.redirect(onboardingUrl);
        }
      }
    } catch (error) {
      console.error("Onboarding check error:", error);
      // Continue even if check fails
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*", // Require auth and onboarding (primary destination)
    "/search",           // Now protected - require auth and onboarding
    "/research/:path*",  // Require auth and onboarding
    "/onboarding",       // Require auth (but not onboarding completion)
  ],
};
