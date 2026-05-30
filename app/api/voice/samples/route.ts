import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  let user;
  try { user = await getOrCreateUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [samples, fullUser] = await Promise.all([
    db.voiceSample.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    db.user.findUnique({ where: { id: user.id }, select: { voiceId: true, voiceCloneStatus: true } }),
  ]);

  return NextResponse.json({
    samples,
    voiceId: fullUser?.voiceId ?? null,
    voiceCloneStatus: fullUser?.voiceCloneStatus ?? "none",
  });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await getOrCreateUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  if (!audio) return NextResponse.json({ error: "No audio file provided" }, { status: 400 });

  const fileId = crypto.randomUUID();
  const ext = audio.name.split(".").pop() || "webm";
  const fileName = `${fileId}.${ext}`;
  const userDir = path.join(process.cwd(), "public", "voice-samples", user.id);

  await fs.mkdir(userDir, { recursive: true });
  const buffer = Buffer.from(await audio.arrayBuffer());
  await fs.writeFile(path.join(userDir, fileName), buffer);

  const sample = await db.voiceSample.create({
    data: {
      userId: user.id,
      fileName,
      filePath: `/voice-samples/${user.id}/${fileName}`,
    },
  });

  return NextResponse.json({ sample });
}
