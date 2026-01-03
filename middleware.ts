export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/report/:path*",
    "/research/:path*",
  ], // Protected routes - /search is public
};
