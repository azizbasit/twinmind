import { db } from "@/lib/db";
import { getEmbeddings, openai } from "@/lib/openai";
import { MemoryType } from "@prisma/client";

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

export async function saveMemory({
  userId,
  content,
  type,
  importanceScore,
}: {
  userId: string;
  content: string;
  type: MemoryType;
  importanceScore: number;
}) {
  const embedding = await getEmbeddings(content);

  await db.memory.create({
    data: {
      userId,
      content,
      embedding: JSON.stringify(embedding),
      type,
      importanceScore,
    },
  });
}

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

  const memories = await db.memory.findMany({
    where: {
      userId,
      importanceScore: { gte: minImportance },
      embedding: { not: null },
    },
    select: { id: true, content: true, type: true, importanceScore: true, embedding: true },
  });

  return memories
    .map((m) => {
      const emb: number[] = JSON.parse(m.embedding!);
      return { id: m.id, content: m.content, type: m.type, importanceScore: m.importanceScore, similarity: cosineSimilarity(queryEmbedding, emb) };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

export async function batchExtractMemories(userId: string, text: string, sourceLabel: string): Promise<number> {
  const chunkSize = 800;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

  let stored = 0;
  for (const chunk of chunks.slice(0, 20)) {
    const result = await decideAndStoreMemory(userId, `${sourceLabel}: ${chunk}`);
    if (result) stored++;
  }
  return stored;
}

export async function decideAndStoreMemory(userId: string, content: string, context?: string) {
  try {
    const prompt = `
      Analyze the following interaction and decide if it contains meaningful long-term information about the user.
      Information worth storing includes:
      - Personality traits
      - Preferences (likes, dislikes)
      - Key knowledge or facts
      - Behavioral patterns
      - Goals or aspirations
      - Significant events

      If it's worth storing, respond with a JSON object:
      {
        "shouldStore": true,
        "content": "A concise summary of the memory",
        "type": "PERSONALITY" | "PREFERENCE" | "KNOWLEDGE" | "BEHAVIOR" | "GOALS" | "EVENTS",
        "importanceScore": 1-10
      }
      If not worth storing, respond with:
      { "shouldStore": false }

      ${context ? `CONTEXT:\n${context}\n` : ""}
      MESSAGE: "${content}"
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: "You are a memory extraction engine." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    if (result.shouldStore) {
      await saveMemory({
        userId,
        content: result.content,
        type: result.type as MemoryType,
        importanceScore: result.importanceScore,
      });
      return result;
    }

    return null;
  } catch (error) {
    console.error("[DECIDE_STORE_MEMORY_ERROR]", error);
    return null;
  }
}
