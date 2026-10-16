import { NextRequest, NextResponse } from "next/server";
import { getUserSetting, setUserSetting } from "@/lib/db";

export async function GET() {
  try {
    const settings = {
      myName: getUserSetting("my_name", "Sabbir Hossain"),
      myService: getUserSetting("my_service", "Full-stack Web Developer & WordPress Specialist"),
      portfolioLink: getUserSetting("portfolio_link", "https://sabbirhossain.dev"),
      myPhone: getUserSetting("my_phone", "+8801700000000"),
    };
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "FETCH_SETTINGS_FAILED", message: "Failed to load settings." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { myName, myService, portfolioLink, myPhone } = body;

    if (myName !== undefined) setUserSetting("my_name", String(myName));
    if (myService !== undefined) setUserSetting("my_service", String(myService));
    if (portfolioLink !== undefined) setUserSetting("portfolio_link", String(portfolioLink));
    if (myPhone !== undefined) setUserSetting("my_phone", String(myPhone));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SAVE_SETTINGS_FAILED", message: "Failed to save settings." } },
      { status: 500 }
    );
  }
}
