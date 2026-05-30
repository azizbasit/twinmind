import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function POST() {
  try {
    const user = await getOrCreateUser();
    await db.integration.deleteMany({
      where: { userId: user.id, provider: "linkedin" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
