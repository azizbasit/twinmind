import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { saveMemory } from "@/lib/memory";

export async function GET() {
  try {
    const user = await getOrCreateUser();
    const memories = await db.memory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(memories);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { content, type, importanceScore } = await req.json();

    if (!content || !type) {
      return new NextResponse("Missing fields", { status: 400 });
    }

    await saveMemory({
      userId: user.id,
      content,
      type,
      importanceScore: importanceScore || 1,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
