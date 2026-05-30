import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    const { content, importanceScore } = await req.json();

    const memory = await db.memory.findFirst({ where: { id: params.id, userId: user.id } });
    if (!memory) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.memory.update({
      where: { id: params.id },
      data: {
        ...(content !== undefined ? { content } : {}),
        ...(importanceScore !== undefined ? { importanceScore } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    await db.memory.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
