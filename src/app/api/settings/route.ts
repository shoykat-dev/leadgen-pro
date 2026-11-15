import { NextRequest, NextResponse } from "next/server";
import { getUserSetting, setUserSetting } from "@/lib/db";

export async function GET() {
  try {
    const [myName, myService, portfolioLink, myPhone] = await Promise.all([
      getUserSetting("my_name", "Sabbir Hossain"),
      getUserSetting("my_service", "Full-stack Web Developer & WordPress Specialist"),
      getUserSetting("portfolio_link", "https://sabbirhossain.dev"),
      getUserSetting("my_phone", "+8801700000000"),
    ]);
    const settings = { myName, myService, portfolioLink, myPhone };
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

    if (myName !== undefined) await setUserSetting("my_name", String(myName));
    if (myService !== undefined) await setUserSetting("my_service", String(myService));
    if (portfolioLink !== undefined) await setUserSetting("portfolio_link", String(portfolioLink));
    if (myPhone !== undefined) await setUserSetting("my_phone", String(myPhone));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SAVE_SETTINGS_FAILED", message: "Failed to save settings." } },
      { status: 500 }
    );
  }
}
