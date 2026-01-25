import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getReport, getReportForSharing } from "@/lib/services/reportService";
import { generateReportPDF, generatePDFFilename } from "@/lib/services/pdfService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/report/[id]/pdf - Download report as PDF
 *
 * Generates a pixel-perfect PDF report using Playwright to render
 * an HTML template at 1920x1080 resolution.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const url = new URL(request.url);
    const shareToken = url.searchParams.get("token");

    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      );
    }

    // Validate reportId format (CUID) to prevent resource exhaustion attacks
    const cuidRegex = /^c[a-z0-9]{24,}$/;
    if (!cuidRegex.test(reportId)) {
      return NextResponse.json(
        { error: "Invalid report ID format" },
        { status: 400 }
      );
    }

    console.log(`[PDF] Request for report ${reportId}, shareToken: ${shareToken ? "present" : "none"}`);

    // Authenticate user
    const authHeader = request.headers.get("Authorization");
    let accessToken: string | null = null;
    let reportData = null;

    if (authHeader?.startsWith("Bearer ")) {
      accessToken = authHeader.split("Bearer ")[1];
      console.log(`[PDF] Auth header present, verifying token...`);
      const user = await verifySupabaseToken(accessToken);

      if (user) {
        console.log(`[PDF] Token valid, user ID: ${user.id}, fetching report as owner...`);
        reportData = await getReport(reportId, user.id);
        if (reportData) {
          console.log(`[PDF] Report found for owner`);
        } else {
          console.log(`[PDF] Report not found for owner, will try shared access`);
        }
      } else {
        console.log(`[PDF] Token verification failed`);
      }
    } else {
      console.log(`[PDF] No auth header present`);
    }

    // Fall back to shared access
    if (!reportData) {
      console.log(`[PDF] Trying shared access with token: ${shareToken ? "present" : "none"}`);
      reportData = await getReportForSharing(reportId, shareToken || undefined);
      // For shared access, we still need a token for the template fetch
      // Use a placeholder since the template also supports shared access
      accessToken = shareToken || "shared";
      if (reportData) {
        console.log(`[PDF] Report found via shared access`);
      } else {
        console.log(`[PDF] Report not found via shared access`);
      }
    }

    if (!reportData) {
      console.log(`[PDF] Report not found by any method, returning 404. Auth header: ${!!authHeader}, Share token: ${!!shareToken}`);
      return NextResponse.json(
        {
          error: "Report not found or access denied",
          debug: {
            hasAuth: !!authHeader,
            hasShareToken: !!shareToken,
          }
        },
        { status: 404 }
      );
    }

    // Check report status
    if (reportData.report.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Report is not yet completed" },
        { status: 400 }
      );
    }

    console.log(`[PDF] Generating PDF for report ${reportId}`);
    const startTime = Date.now();

    // Generate PDF
    const pdfBuffer = await generateReportPDF(reportId, accessToken!, {
      reportId,
    });

    const duration = Date.now() - startTime;
    console.log(`[PDF] Generated PDF in ${duration}ms (${pdfBuffer.length} bytes)`);

    // Generate filename
    const filename = generatePDFFilename(reportData);

    // Return PDF as download - convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[PDF] Error generating PDF:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
