import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  let user;
  try { user = await getOrCreateUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: { voiceId: true, voiceCloneStatus: true },
  });

  if (!fullUser?.voiceId || fullUser.voiceCloneStatus !== "ready") {
    return NextResponse.json(
      { error: "No voice clone found. Set up your voice clone first." },
      { status: 400 }
    );
  }

  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${fullUser.voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as any)?.detail?.message || "Speech generation failed" },
      { status: 500 }
    );
  }

  const audioBuffer = await res.arrayBuffer();
  return new NextResponse(audioBuffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}
