import { db } from "@/lib/db";
import { getEmbeddings, openai } from "@/lib/openai";
import { MemorySource, MemoryType } from "@prisma/client";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Smart memory save with deduplication ────────────────────────────────────

export async function saveMemory({
  userId,
  content,
  type,
  importanceScore,
  source = "CHAT",
  permanence = "SEMI_PERMANENT",
  sourceContext,
}: {
  userId: string;
  content: string;
  type: MemoryType;
  importanceScore: number;
  source?: MemorySource;
  permanence?: string;
  sourceContext?: string;
}): Promise<"created" | "updated" | "skipped"> {
  // Only embed high-value memories (score >= 5) to reduce embedding API costs
  const shouldEmbed = importanceScore >= 5;
  const embedding = shouldEmbed ? await getEmbeddings(content) : null;

  // Deduplication: compare against stored embeddings of same type
  if (embedding) {
    const existing = await db.memory.findMany({
      where: { userId, type, embedding: { not: null } },
      select: { id: true, embedding: true, confidenceScore: true, importanceScore: true },
    });

    let highestSim = 0;
    let bestMatchId: string | null = null;

    for (const mem of existing) {
      const emb: number[] = JSON.parse(mem.embedding!);
      const sim = cosineSimilarity(embedding, emb);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatchId = mem.id;
      }
    }

    if (highestSim > 0.88 && bestMatchId) {
      // Very similar memory already exists — boost confidence instead of duplicating
      const match = existing.find(m => m.id === bestMatchId)!;
      await db.memory.update({
        where: { id: bestMatchId },
        data: {
          confidenceScore: Math.min(match.confidenceScore + 0.1, 1.0),
          importanceScore: Math.min(match.importanceScore + 1, 10),
        },
      });
      return "updated";
    }
  }

  await db.memory.create({
    data: {
      userId,
      content,
      embedding: embedding ? JSON.stringify(embedding) : null,
      type,
      source,
      importanceScore,
      confidenceScore: 0.6, // New memories start at 60% confidence
      permanence,
      sourceContext: sourceContext ?? null,
    },
  });

  return "created";
}

// ─── Semantic search ──────────────────────────────────────────────────────────

export async function searchMemories({
  userId,
  query,
  limit = 5,
  minImportance = 1,
}: {
  userId: string;
  query: string;
  limit?: number;
  minImportance?: number;
}) {
  const queryEmbedding = await getEmbeddings(query);

  // Only search memories that have embeddings (high-value ones)
  const memories = await db.memory.findMany({
    where: { userId, importanceScore: { gte: minImportance }, embedding: { not: null } },
    select: { id: true, content: true, type: true, importanceScore: true, confidenceScore: true, embedding: true, source: true },
  });

  return memories
    .map(m => {
      const emb: number[] = JSON.parse(m.embedding!);
      return {
        id: m.id,
        content: m.content,
        type: m.type,
        source: m.source,
        importanceScore: m.importanceScore,
        confidenceScore: m.confidenceScore,
        similarity: cosineSimilarity(queryEmbedding, emb),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// ─── Batch extraction from long text ─────────────────────────────────────────

export async function batchExtractMemories(
  userId: string,
  text: string,
  sourceLabel: string,
  source: MemorySource = "CHAT"
): Promise<number> {
  const chunkSize = 800;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  let stored = 0;
  for (const chunk of chunks.slice(0, 20)) {
    const result = await decideAndStoreMemory(userId, `${sourceLabel}: ${chunk}`, undefined, source);
    if (result) stored++;
  }
  return stored;
}

// ─── AI-driven extraction with deduplication (Layer 2: gpt-4o-mini) ──────────

export async function decideAndStoreMemory(
  userId: string,
  content: string,
  context?: string,
  source: MemorySource = "CHAT"
) {
  try {
    const prompt = `Analyze the following interaction and decide if it contains meaningful long-term information about the user.

Store information about:
- Personality traits and communication style
- Preferences (likes, dislikes)
- Key knowledge, skills, or expertise
- Behavioral patterns
- Goals or aspirations
- Significant life events
- Important relationships

Assign permanence:
- PERMANENT: stable long-term facts (career, core values, skills, identity)
- SEMI_PERMANENT: evolving things (goals, active projects, interests)
- TEMPORARY: short-lived info (current tasks, event-specific plans)

If worth storing:
{
  "shouldStore": true,
  "content": "A clear, self-contained memory (not referencing 'the user says' — state the fact directly)",
  "type": "PERSONALITY" | "PREFERENCE" | "KNOWLEDGE" | "BEHAVIOR" | "GOALS" | "EVENTS",
  "importanceScore": 1-10,
  "permanence": "PERMANENT" | "SEMI_PERMANENT" | "TEMPORARY",
  "sourceContext": "Brief note on why this was stored"
}
If not worth storing: { "shouldStore": false }

${context ? `CONTEXT:\n${context}\n` : ""}
MESSAGE: "${content}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Layer 2: cost-efficient for routine extraction
      messages: [
        { role: "system", content: "You are a memory extraction engine. Respond only with valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    if (result.shouldStore) {
      const status = await saveMemory({
        userId,
        content: result.content,
        type: result.type as MemoryType,
        importanceScore: result.importanceScore,
        source,
        permanence: result.permanence ?? "SEMI_PERMANENT",
        sourceContext: result.sourceContext,
      });
      return status !== "skipped" ? result : null;
    }

    return null;
  } catch (error) {
    console.error("[DECIDE_STORE_MEMORY_ERROR]", error);
    return null;
  }
}
