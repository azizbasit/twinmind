import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// GET /api/persona/snapshots — return full snapshot history
export async function GET() {
  try {
    const user = await getOrCreateUser();
    const snapshots = await db.personaSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { version: "asc" },
    });
    return NextResponse.json({ snapshots });
  } catch (error) {
    return handleApiError(error, );
  }
}
