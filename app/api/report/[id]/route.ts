import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getReport, getReportStatus, getReportForSharing } from "@/lib/services/reportService";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/report/[id] - Fetch complete report data
 * Supports both authenticated (owner) and shared (public/token) access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const url = new URL(request.url);
    const shareToken = url.searchParams.get("token");
    const statusOnly = url.searchParams.get("status") === "true";

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Try authenticated access first
    const authHeader = request.headers.get("Authorization");
    console.log(`[Report API] GET ${reportId} - hasAuth: ${!!authHeader}, hasToken: ${!!shareToken}`);

    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.split("Bearer ")[1];
      console.log(`[Report API] Verifying token (length: ${accessToken?.length || 0})`);
      const user = await verifySupabaseToken(accessToken);
      console.log(`[Report API] Token verification: ${user ? 'success (user: ' + user.id.slice(0, 8) + '...)' : 'failed'}`);

      if (user) {
        // Authenticated user - use owner-only logic
        if (statusOnly) {
          const status = await getReportStatus(reportId, user.id);
          if (!status) {
            return NextResponse.json(
              { error: "Report not found or access denied" },
              { status: 404 }
            );
          }
          return NextResponse.json(status);
        }

        const report = await getReport(reportId, user.id);
        if (report) {
          console.log(`[Report API] Report found for owner, posts: ${report.posts?.length || 0}`);
          return NextResponse.json({ ...report, isOwner: true });
        }
        // If authenticated but not owner, try shared access below
        console.log(`[Report API] User ${user.id.slice(0, 8)}... is not owner of report ${reportId}`);
      }
    } else {
      console.log(`[Report API] No auth header provided`);
    }

    // Unauthenticated or not owner - try shared access
    const report = await getReportForSharing(reportId, shareToken || undefined);

    if (!report) {
      console.log(`[Report API] No shared access for report ${reportId}`);
      // If no share token, return 401 to trigger auth modal
      if (!shareToken) {
        return NextResponse.json(
          {
            error: "Unauthorized - Authentication required",
            debug: {
              hasAuthHeader: !!authHeader,
              tokenVerified: false,
              reason: authHeader ? "token_invalid" : "no_token",
            },
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Report not found or share link expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ...report, isOwner: false });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
