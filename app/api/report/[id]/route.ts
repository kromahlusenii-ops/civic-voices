import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getReport, getReportStatus } from "@/lib/services/reportService";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/report/[id] - Fetch complete report data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;

    // Get Supabase access token from Authorization header
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split("Bearer ")[1];

    // Verify Supabase access token
    const user = await verifySupabaseToken(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const userId = user.id;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in token" },
        { status: 400 }
      );
    }

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Check if request is for status only
    const url = new URL(request.url);
    const statusOnly = url.searchParams.get("status") === "true";

    if (statusOnly) {
      // Return just the status for polling
      const status = await getReportStatus(reportId, userId);

      if (!status) {
        return NextResponse.json(
          { error: "Report not found or access denied" },
          { status: 404 }
        );
      }

      return NextResponse.json(status);
    }

    // Get full report data
    const report = await getReport(reportId, userId);

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
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
