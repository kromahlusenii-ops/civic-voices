import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { startReport } from "@/lib/services/reportService";

interface StartReportRequest {
  searchId: string;
}

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body: StartReportRequest = await request.json();
    const { searchId } = body;

    // Validate required fields
    if (!searchId) {
      return NextResponse.json(
        { error: "Missing required field: searchId" },
        { status: 400 }
      );
    }

    // Start the report generation
    const { reportId } = await startReport(searchId, userId);

    return NextResponse.json(
      {
        success: true,
        reportId,
        message: "Report generation completed",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error starting report:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message === "Search not found or access denied") {
        return NextResponse.json(
          { error: "Search not found or access denied" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
