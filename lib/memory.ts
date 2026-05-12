import { db } from "@/lib/db";
import { getEmbeddings, openai } from "@/lib/openai";
import { MemoryType } from "@prisma/client";

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

  // We use raw SQL to insert the vector because Prisma's support is limited for insertion
  await db.$executeRawUnsafe(
    `INSERT INTO "Memory" ("id", "userId", "content", "embedding", "type", "importanceScore", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3::vector, $4::"MemoryType", $5, NOW())`,
    userId,
    content,
    `[${embedding.join(",")}]`,
    type,
    importanceScore
  );
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
  const embedding = await getEmbeddings(query);
  const vectorStr = `[${embedding.join(",")}]`;

  // Perform cosine similarity search using pgvector
  // Cosine distance is (1 - cosine similarity), so we order by distance ASC
  const memories = await db.$queryRawUnsafe<any[]>(
    `SELECT id, content, type, "importanceScore", 1 - (embedding <=> $1::vector) as similarity
     FROM "Memory"
     WHERE "userId" = $2 AND "importanceScore" >= $3
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    vectorStr,
    userId,
    minImportance,
    limit
  );

  return memories;
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
