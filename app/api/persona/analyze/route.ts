import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// POST /api/persona/analyze — run full analysis pipeline (async-friendly)
// Body: { snapshot?: boolean }  — if true, forces a manual snapshot
export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json().catch(() => ({}));
    const forceSnapshot = body?.snapshot === true;

    // Dynamic imports keep openai out of the module init critical path
    const [{ analyzePersonaIncremental, createManualSnapshot }, { extractContactsIncremental }] =
      await Promise.all([
        import("@/lib/persona-engine"),
        import("@/lib/relationship-engine"),
      ]);

    await Promise.all([
      analyzePersonaIncremental(user.id),
      extractContactsIncremental(user.id),
    ]);

    if (forceSnapshot) {
      await createManualSnapshot(user.id);
    }

    const profile = await db.personaProfile.findUnique({ where: { userId: user.id } });
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    return handleApiError(error, );
  }
}
