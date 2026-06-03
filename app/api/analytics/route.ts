import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

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
      uploadedDocuments,
      importedChats,
      contactsCount,
      personaProfile,
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
        select: { createdAt: true, type: true, importanceScore: true, confidenceScore: true },
      }),
      db.uploadedDocument.count({ where: { userId: user.id } }),
      db.importedChat.count({ where: { userId: user.id } }),
      db.contact.count({ where: { userId: user.id } }),
      db.personaProfile.findUnique({ where: { userId: user.id } }),
    ]);

    const memoriesByType = memoriesByTypeRaw.map(r => ({ type: r.type, count: String(r._count.type) }));
    const memoriesBySource = memoriesBySourceRaw.map(r => ({ source: r.source, count: String(r._count.source) }));
    const draftCounts = draftCountsRaw.map(r => ({ status: r.status, count: String(r._count.status) }));

    // Persona strength: weighted score out of 100
    const typeBonus = Math.min(memoriesByType.length * 10, 40);
    const memoryBonus = Math.min(totalMemories * 2, 40);
    const integrationBonus = Math.min(integrations.length * 10, 20);
    const personaStrength = Math.min(typeBonus + memoryBonus + integrationBonus, 100);

    // Twin completeness: how much of the persona model is filled in
    const twinCompleteness = personaProfile
      ? Math.min(
          Math.round(
            (personaProfile.dataPointsAnalyzed / 50) * 40 +
            (totalMemories / 20) * 30 +
            (contactsCount / 5) * 15 +
            (integrations.length / 3) * 15
          ),
          100
        )
      : 0;

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
      // New metrics
      uploadedDocuments,
      importedChats,
      contactsCount,
      twinCompleteness,
      personaAnalyzedAt: personaProfile?.lastAnalyzedAt ?? null,
    });
  } catch (error) {
    return handleApiError(error, );
  }
}
