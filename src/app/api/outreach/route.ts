import { NextRequest, NextResponse } from "next/server";
import { logOutreach, getOutreachLogs } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId") || undefined;
    const logs = getOutreachLogs(leadId);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "FETCH_LOGS_FAILED", message: "Failed to retrieve outreach logs." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { leadId, channel, message } = body;

    if (!leadId || !channel) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "leadId and channel are required." } },
        { status: 400 }
      );
    }

    logOutreach(leadId, channel, message);
    return NextResponse.json({ success: true, leadId, channel });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "LOG_FAILED", message: "Failed to log outreach." } },
      { status: 500 }
    );
  }
}
