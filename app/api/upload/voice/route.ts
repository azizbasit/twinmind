import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { batchExtractMemories } from "@/lib/memory";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const memoriesExtracted = await batchExtractMemories(user.id, transcript, "Voice journal");

    return NextResponse.json({ success: true, memoriesExtracted });
  } catch (error) {
    console.error("[UPLOAD_VOICE_ERROR]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
