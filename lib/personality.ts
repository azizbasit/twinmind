import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

export async function getUserPersonality(userId: string) {
  // Retrieve recent messages and personality memories to build a profile
  const [recentMessages, personalityMemories] = await Promise.all([
    db.message.findMany({
      where: {
        conversation: { userId },
        role: "user",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.memory.findMany({
      where: {
        userId,
        type: "PERSONALITY",
      },
      orderBy: { importanceScore: "desc" },
      take: 10,
    }),
  ]);

  if (recentMessages.length === 0 && personalityMemories.length === 0) {
    return "A helpful and friendly AI assistant.";
  }

  const context = `
    Recent messages: ${recentMessages.map(m => m.content).join("\n")}
    Personality insights: ${personalityMemories.map(m => m.content).join("\n")}
  `;

  const prompt = `
    Based on the following user communications and personality insights, describe the user's communication style in 3-4 sentences.
    Focus on:
    - Tone (formal, casual, enthusiastic, etc.)
    - Vocabulary style
    - Sentence structure/length
    - Emotional expression
    
    This description will be used to help an AI mimic the user.
    
    Context:
    ${context}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: "You are a personality analysis engine." }, { role: "user", content: prompt }],
  });

  return response.choices[0].message.content || "A helpful and friendly AI assistant.";
}
