import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// GET /api/persona/profile — return current profile (or null if not yet analyzed)
export async function GET() {
  try {
    const user = await getOrCreateUser();
    const profile = await db.personaProfile.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, );
  }
}

// POST /api/persona/profile — trigger analysis and return updated profile
export async function POST() {
  try {
    const user = await getOrCreateUser();
    // Dynamically import persona-engine to avoid loading openai at module init time
    const { analyzePersonaIncremental } = await import("@/lib/persona-engine");
    await analyzePersonaIncremental(user.id);
    const profile = await db.personaProfile.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ profile });
  } catch (error) {
    return handleApiError(error, );
  }
}
