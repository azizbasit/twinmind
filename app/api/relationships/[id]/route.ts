import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

// GET /api/relationships/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    const contact = await db.contact.findFirst({ where: { id, userId: user.id } });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (error) {
    console.error("[RELATIONSHIP_GET_ONE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/relationships/[id] — user corrections
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    const body = await req.json();
    const { relationshipType, communicationNotes, importanceScore } = body;

    const contact = await db.contact.findFirst({ where: { id, userId: user.id } });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.contact.update({
      where: { id },
      data: {
        relationshipType: relationshipType ?? contact.relationshipType,
        communicationNotes: communicationNotes ?? contact.communicationNotes,
        importanceScore: typeof importanceScore === "number" ? importanceScore : contact.importanceScore,
        userCorrected: true,
      },
    });

    return NextResponse.json({ contact: updated });
  } catch (error) {
    console.error("[RELATIONSHIP_PATCH]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/relationships/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    const contact = await db.contact.findFirst({ where: { id, userId: user.id } });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RELATIONSHIP_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
