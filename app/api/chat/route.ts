import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { searchMemories, decideAndStoreMemory } from "@/lib/memory";
import { getUserPersonality } from "@/lib/personality";
import { buildDiscoveryHint } from "@/lib/conversation-guide";
import { extractContactsIncremental } from "@/lib/relationship-engine";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";
import { handleApiError } from "@/lib/api-error";

// Build a persona-aware section for the system prompt from stored profile scores
function buildPersonaSection(profile: any | null, personalityStyle: string): string {
  if (!profile) return `PERSONALITY PROFILE:\n${personalityStyle}`;
  return `PERSONA PROFILE (scores 0-100):
Communication — formality:${profile.formalityScore}, humor:${profile.humorScore}, directness:${profile.directnessScore}, technical:${profile.technicalDepthScore}
Thinking — analytical:${profile.analyticalScore}, creative:${profile.creativeScore}, strategic:${profile.strategicScore}, emotional:${profile.emotionalScore}
Decisions — data-driven:${profile.dataOrientedScore}, intuitive:${profile.intuitiveScore}, risk-tolerance:${profile.riskToleranceScore}
Work — builder:${profile.builderScore}, planner:${profile.plannerScore}, researcher:${profile.researcherScore}, creator:${profile.creatorScore}
Social — leadership:${profile.leadershipScore}, collaboration:${profile.collaborationScore}, introversion:${profile.introversionScore}
${profile.summaryText ? `\nNARRATIVE: ${profile.summaryText}` : ""}`.trim();
}

// Build relationship context string for the system prompt
function buildRelationshipSection(contacts: any[]): string {
  if (contacts.length === 0) return "";
  const lines = contacts.map((c: any) => {
    const sentiment = c.sentimentScore > 0.3 ? "positive" : c.sentimentScore < -0.2 ? "tension" : "neutral";
    return `- ${c.name} (${c.relationshipType ?? "contact"}, ${sentiment} relationship)${c.communicationNotes ? `: ${c.communicationNotes}` : ""}`;
  });
  return `KEY RELATIONSHIPS:\n${lines.join("\n")}`;
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { message, conversationId, stream: wantStream = true } = await req.json();

    if (!message) {
      return new NextResponse("Message is required", { status: 400 });
    }

    // Fetch context in parallel — DB queries are fast, only searchMemories hits OpenAI
    const [relevantMemories, personalityStyle, personaProfile, importantContacts] =
      await Promise.all([
        searchMemories({ userId: user.id, query: message, limit: 5 }),
        getUserPersonality(user.id),
        db.personaProfile.findUnique({ where: { userId: user.id } }),
        db.contact.findMany({
          where: { userId: user.id, importanceScore: { gte: 0.5 } },
          orderBy: { importanceScore: "desc" },
          take: 8,
          select: { name: true, relationshipType: true, sentimentScore: true, communicationNotes: true },
        }),
      ]);

    const memoryContext =
      relevantMemories.length > 0
        ? `RELEVANT MEMORIES:\n${relevantMemories
            .map(m => `- [${m.type}, confidence:${Math.round(m.confidenceScore * 100)}%] ${m.content}`)
            .join("\n")}`
        : "No specific relevant memories yet.";

    const personaSection = buildPersonaSection(personaProfile, personalityStyle);
    const relationshipSection = buildRelationshipSection(importantContacts);

    // Build a tiny, targeted discovery hint (30 tokens max, empty when profile is mature)
    const discoverySection = buildDiscoveryHint(
      personaProfile as Record<string, number> | null,
      personaProfile?.dataPointsAnalyzed ?? 0
    );

    const systemPrompt = [
      "You are the Personal AI Digital Twin of the user. Understand them deeply through conversation and represent them accurately.",
      personaSection,
      memoryContext,
      relationshipSection,
      discoverySection,
      "Be genuinely curious. Mirror their style. Ask one question at a time. Feel like a real conversation.",
    ].filter(Boolean).join("\n\n").trim();

    // Get or create conversation
    let currentConversationId = conversationId;
    let history: { role: string; content: string }[] = [];

    if (currentConversationId) {
      const msgs = await db.message.findMany({
        where: { conversationId: currentConversationId },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      history = msgs.map(m => ({ role: m.role, content: m.content }));
    } else {
      const newConv = await db.conversation.create({
        data: { userId: user.id, title: message.substring(0, 50) },
      });
      currentConversationId = newConv.id;
    }

    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    // ── Streaming response (default) ──────────────────────────────────────────
    if (wantStream) {
      const encoder = new TextEncoder();
      let fullResponse = "";

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const streamResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: openaiMessages,
              stream: true,
              temperature: 0.7,
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "meta", conversationId: currentConversationId })}\n\n`)
            );

            for await (const chunk of streamResponse) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) {
                fullResponse += delta;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`)
                );
              }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();

            // Persist messages after stream closes
            await db.message.createMany({
              data: [
                { conversationId: currentConversationId, role: "user", content: message },
                { conversationId: currentConversationId, role: "assistant", content: fullResponse },
              ],
            });

            // Async background processing — never blocks the user
            const chatContext = history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n");
            const exchange = `User: ${message}\nAssistant: ${fullResponse}`;
            decideAndStoreMemory(user.id, exchange, chatContext, "CHAT").catch(err =>
              console.error("Memory extraction error:", err)
            );
            extractContactsIncremental(user.id).catch(err =>
              console.error("Contact extraction error:", err)
            );
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Non-streaming fallback ─────────────────────────────────────────────────
    const cacheKey = `ai_response:${user.id}:${Buffer.from(message).toString("base64").substring(0, 100)}`;
    const cached = cache.get<{ content: string; conversationId: string }>(cacheKey);
    if (cached && cached.conversationId === conversationId) return NextResponse.json(cached);

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: openaiMessages,
      temperature: 0.7,
    });

    const assistantMessage = aiResponse.choices[0].message.content ?? "";

    await db.message.createMany({
      data: [
        { conversationId: currentConversationId, role: "user", content: message },
        { conversationId: currentConversationId, role: "assistant", content: assistantMessage },
      ],
    });

    const chatContext = history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n");
    const exchange = `User: ${message}\nAssistant: ${assistantMessage}`;
    decideAndStoreMemory(user.id, exchange, chatContext, "CHAT").catch(err =>
      console.error("Memory extraction error:", err)
    );
    extractContactsIncremental(user.id).catch(err =>
      console.error("Contact extraction error:", err)
    );

    const result = { content: assistantMessage, conversationId: currentConversationId };
    cache.set(cacheKey, result, 5 * 60 * 1000);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, );
  }
}
