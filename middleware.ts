import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Note: With Firebase Auth, authentication state is managed on the client side.
// Protected route checking happens in the AuthContext and individual page components.
// This middleware is kept minimal and can be extended for server-side token verification if needed.

export function middleware(request: NextRequest) {
  // Currently passing through all requests
  // Client-side AuthContext will handle authentication checks and redirects
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/report/:path*",
    "/research/:path*",
  ], // Protected routes - /search is public
};
