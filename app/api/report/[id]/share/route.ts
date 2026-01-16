import { NextRequest, NextResponse } from "next/server";
import { verifySupabaseToken } from "@/lib/supabase-server";
import { getShareSettings, updateShareSettings } from "@/lib/services/reportService";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/report/[id]/share - Get current share settings (owner only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split("Bearer ")[1];
    const user = await verifySupabaseToken(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const settings = await getShareSettings(reportId, user.id);

    if (!settings) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error getting share settings:", error);
    return NextResponse.json(
      { error: "Failed to get share settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/report/[id]/share - Update share settings (owner only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: reportId } = await params;
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.split("Bearer ")[1];
    const user = await verifySupabaseToken(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const { generateToken, revokeToken } = body;

    if (generateToken && revokeToken) {
      return NextResponse.json(
        { error: "Cannot generate and revoke token simultaneously" },
        { status: 400 }
      );
    }

    const settings = await updateShareSettings(reportId, user.id, {
      generateToken,
      revokeToken,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating share settings:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update share settings" },
      { status: 500 }
    );
  }
}
