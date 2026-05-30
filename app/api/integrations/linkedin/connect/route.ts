import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { getLinkedInAuthUrl } from "@/lib/integrations/linkedin";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    await getOrCreateUser();
    const state = randomBytes(16).toString("hex");
    const url = getLinkedInAuthUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=auth`);
  }
}
