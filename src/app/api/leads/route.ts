import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAllSavedLeads, saveLead, updateLeadStatus, deleteSavedLead } from "@/lib/db";
import { BusinessLead } from "@/lib/data-integrity";

export async function GET() {
  try {
    const leads = getAllSavedLeads();
    return NextResponse.json({ success: true, total: leads.length, leads });
  } catch (error: any) {
    console.error("[GET /api/leads error]:", error);
    return NextResponse.json(
      { error: { code: "FETCH_FAILED", message: "Failed to load saved leads." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { lead, leads } = body;

    if (Array.isArray(leads)) {
      for (const item of leads) {
        saveLead(item as BusinessLead);
      }
      return NextResponse.json({ success: true, count: leads.length });
    }

    if (lead) {
      saveLead(lead as BusinessLead);
      return NextResponse.json({ success: true, lead });
    }

    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "Provide lead or leads array to save." } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[POST /api/leads error]:", error);
    return NextResponse.json(
      { error: { code: "SAVE_FAILED", message: error.message || "Failed to save lead." } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, notes, nextFollowUpDate } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "Lead ID and status are required." } },
        { status: 400 }
      );
    }

    updateLeadStatus(id, status, notes, nextFollowUpDate);
    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error("[PUT /api/leads error]:", error);
    return NextResponse.json(
      { error: { code: "UPDATE_FAILED", message: "Failed to update lead status." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: { code: "MISSING_ID", message: "Lead ID is required to delete." } },
        { status: 400 }
      );
    }

    deleteSavedLead(id);
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("[DELETE /api/leads error]:", error);
    return NextResponse.json(
      { error: { code: "DELETE_FAILED", message: "Failed to delete lead." } },
      { status: 500 }
    );
  }
}
