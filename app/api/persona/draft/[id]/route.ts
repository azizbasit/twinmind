import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { postToLinkedIn } from "@/lib/integrations/linkedin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    const { action } = await req.json(); // "approve" | "reject" | "post"

    const draft = await db.personaDraft.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (action === "reject") {
      await db.personaDraft.update({ where: { id: params.id }, data: { status: "REJECTED" } });
      return NextResponse.json({ success: true });
    }

    if (action === "approve") {
      await db.personaDraft.update({ where: { id: params.id }, data: { status: "APPROVED" } });
      return NextResponse.json({ success: true });
    }

    if (action === "post") {
      // Attempt to post to the platform
      if (draft.platform === "linkedin") {
        const integration = await db.integration.findFirst({
          where: { userId: user.id, provider: "linkedin" },
        });
        if (!integration) {
          return NextResponse.json({ error: "LinkedIn not connected. Connect it in Settings." }, { status: 400 });
        }

        let profileData: any = {};
        try { profileData = JSON.parse(integration.profileData ?? "{}"); } catch {}
        const urn = `urn:li:person:${profileData.sub}`;

        const posted = await postToLinkedIn(integration.accessToken, urn, draft.content);
        if (!posted) {
          return NextResponse.json({ error: "Failed to post to LinkedIn" }, { status: 500 });
        }
      }

      await db.personaDraft.update({
        where: { id: params.id },
        data: { status: "POSTED", postedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[PERSONA_DRAFT_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getOrCreateUser();
    await db.personaDraft.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
