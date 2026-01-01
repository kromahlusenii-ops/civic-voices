export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"], // Only protect dashboard routes, /search is public
};
