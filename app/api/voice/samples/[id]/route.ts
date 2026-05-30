import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import path from "path";
import fs from "fs/promises";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try { user = await getOrCreateUser(); } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sample = await db.voiceSample.findFirst({ where: { id, userId: user.id } });
  if (!sample) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await fs.unlink(path.join(process.cwd(), "public", sample.filePath));
  } catch {}

  await db.voiceSample.delete({ where: { id: sample.id } });
  return NextResponse.json({ success: true });
}
