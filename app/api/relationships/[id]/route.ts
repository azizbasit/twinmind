import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

// GET /api/relationships/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    const contact = await db.contact.findFirst({ where: { id, userId: user.id } });
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ contact });
  } catch (error) {
    return handleApiError(error, );
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
    return handleApiError(error, );
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
    return handleApiError(error, );
  }
}
