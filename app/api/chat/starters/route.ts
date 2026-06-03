import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { getRandomStarters } from "@/lib/conversation-guide";
import { handleApiError } from "@/lib/api-error";

// GET /api/chat/starters?exclude=cs1,cs2
// Returns 4 random conversation starters for the UI
export async function GET(req: Request) {
  try {
    await getOrCreateUser();
    const { searchParams } = new URL(req.url);
    const exclude = searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
    const starters = getRandomStarters(4, exclude);
    return NextResponse.json({
      starters: starters.map(s => ({ id: s.id, text: s.text, emoji: s.emoji })),
    });
  } catch (error) {
    return handleApiError(error, );
  }
}
