import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const conversations = await db.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });
    return NextResponse.json(conversations);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
