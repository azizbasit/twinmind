import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

// GET /api/relationships — list all identified contacts
export async function GET() {
  try {
    const user = await getOrCreateUser();
    const contacts = await db.contact.findMany({
      where: { userId: user.id },
      orderBy: [{ importanceScore: "desc" }, { interactionCount: "desc" }],
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[RELATIONSHIPS_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
