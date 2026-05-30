import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const integrations = await db.integration.findMany({
      where: { userId: user.id },
      select: { provider: true, createdAt: true, profileData: true, expiresAt: true },
    });
    return NextResponse.json({ integrations });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
