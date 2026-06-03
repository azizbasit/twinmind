import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { searchMemories } from "@/lib/memory";
import { getUserPersonality } from "@/lib/personality";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { topic, platform } = await req.json();

    if (!topic || !platform) {
      return NextResponse.json({ error: "topic and platform are required" }, { status: 400 });
    }

    const [memories, personality] = await Promise.all([
      searchMemories({ userId: user.id, query: topic, limit: 8 }),
      getUserPersonality(user.id),
    ]);

    const memoryContext = memories.length > 0
      ? memories.map(m => `- ${m.content}`).join("\n")
      : "No specific memories found.";

    const platformGuidelines: Record<string, string> = {
      linkedin: "Write a professional LinkedIn post. 150-300 words. Use paragraphs, not bullet lists. End with a thought-provoking question or call to action.",
      twitter: "Write a tweet. Max 280 characters. Conversational, punchy, authentic.",
      instagram: "Write an Instagram caption. Engaging, personal, end with relevant hashtags.",
    };

    const guidelines = platformGuidelines[platform] ?? "Write a short social media post.";

    const systemPrompt = `You are a ghostwriter who writes in the exact voice of the user described below.

USER PERSONALITY:
${personality}

USER MEMORIES (context about them):
${memoryContext}

RULES:
- Write ONLY as this person would write. Match their vocabulary, tone, sentence length.
- Do NOT add disclaimers, meta-commentary, or anything the user wouldn't say.
- Output only the post content, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write a ${platform} post about: ${topic}\n\n${guidelines}` },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0].message.content ?? "";

    // Save as a pending draft
    const draft = await db.personaDraft.create({
      data: {
        userId: user.id,
        platform,
        content,
        topic,
        status: "PENDING",
      },
    });

    return NextResponse.json({ draft });
  } catch (error) {
    return handleApiError(error, );
  }
}

export async function GET(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "PENDING";

    const drafts = await db.personaDraft.findMany({
      where: { userId: user.id, status: status as any },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ drafts });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
