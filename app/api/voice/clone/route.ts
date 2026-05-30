import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs";

export async function POST() {
  let user;
  try { user = await getOrCreateUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [samples, fullUser] = await Promise.all([
    db.voiceSample.findMany({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { voiceId: true, name: true, email: true } }),
  ]);

  if (samples.length === 0) {
    return NextResponse.json({ error: "Upload at least one voice sample first" }, { status: 400 });
  }

  await db.user.update({ where: { id: user.id }, data: { voiceCloneStatus: "cloning" } });

  // Delete previous ElevenLabs voice if one exists
  if (fullUser?.voiceId) {
    await fetch(`https://api.elevenlabs.io/v1/voices/${fullUser.voiceId}`, {
      method: "DELETE",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    }).catch(() => {});
  }

  const formData = new FormData();
  formData.append("name", `${fullUser?.name || fullUser?.email}'s Voice`);
  formData.append("description", "TwinMind user voice clone");

  for (const sample of samples) {
    const filePath = path.join(process.cwd(), "public", sample.filePath);
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = sample.fileName.split(".").pop() || "webm";
      const mimeType = ext === "mp3" ? "audio/mpeg" : ext === "wav" ? "audio/wav" : "audio/webm";
      const blob = new Blob([buffer], { type: mimeType });
      formData.append("files", blob, sample.fileName);
    } catch {
      // skip missing files
    }
  }

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    await db.user.update({ where: { id: user.id }, data: { voiceCloneStatus: "error" } });
    return NextResponse.json(
      { error: (err as any)?.detail?.message || "Voice cloning failed" },
      { status: 500 }
    );
  }

  const data = await res.json() as { voice_id: string };
  await db.user.update({
    where: { id: user.id },
    data: { voiceId: data.voice_id, voiceCloneStatus: "ready" },
  });

  return NextResponse.json({ voiceId: data.voice_id });
}
