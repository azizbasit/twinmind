import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await getOrCreateUser();

    const [
      totalMemories,
      totalConversations,
      totalMessages,
      memoriesByTypeRaw,
      memoriesBySourceRaw,
      draftCountsRaw,
      integrations,
      recentMemories,
    ] = await Promise.all([
      db.memory.count({ where: { userId: user.id } }),
      db.conversation.count({ where: { userId: user.id } }),
      db.message.count({ where: { conversation: { userId: user.id } } }),
      db.memory.groupBy({ by: ["type"], where: { userId: user.id }, _count: { type: true } }),
      db.memory.groupBy({ by: ["source"], where: { userId: user.id }, _count: { source: true } }),
      db.personaDraft.groupBy({ by: ["status"], where: { userId: user.id }, _count: { status: true } }),
      db.integration.findMany({ where: { userId: user.id }, select: { provider: true, createdAt: true } }),
      db.memory.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 7,
        select: { createdAt: true, type: true, importanceScore: true },
      }),
    ]);

    const memoriesByType = memoriesByTypeRaw.map((r) => ({ type: r.type, count: String(r._count.type) }));
    const memoriesBySource = memoriesBySourceRaw.map((r) => ({ source: r.source, count: String(r._count.source) }));
    const draftCounts = draftCountsRaw.map((r) => ({ status: r.status, count: String(r._count.status) }));

    // Persona strength: weighted score out of 100
    const typeBonus = Math.min(memoriesByType.length * 10, 40); // up to 40 pts for type diversity
    const memoryBonus = Math.min(totalMemories * 2, 40); // up to 40 pts for memory count
    const integrationBonus = Math.min(integrations.length * 10, 20); // up to 20 pts for integrations
    const personaStrength = Math.min(typeBonus + memoryBonus + integrationBonus, 100);

    return NextResponse.json({
      totalMemories,
      totalConversations,
      totalMessages,
      memoriesByType,
      memoriesBySource,
      draftCounts,
      integrations,
      recentMemories,
      personaStrength,
    });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
