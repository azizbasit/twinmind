import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { searchMemories, decideAndStoreMemory } from "@/lib/memory";
import { getUserPersonality } from "@/lib/personality";
import { openai } from "@/lib/openai";
import { db } from "@/lib/db";
import { cache } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { message, conversationId, stream: wantStream = true } = await req.json();

    if (!message) {
      return new NextResponse("Message is required", { status: 400 });
    }

    // 1. Retrieve relevant memories
    const relevantMemories = await searchMemories({
      userId: user.id,
      query: message,
      limit: 5,
    });

    // 2. Retrieve user personality style
    const personalityStyle = await getUserPersonality(user.id);

    // 3. Build system prompt
    const memoryContext = relevantMemories.length > 0
      ? `Relevant memories about the user:\n${relevantMemories.map(m => `- ${m.content}`).join("\n")}`
      : "No specific relevant memories found.";

    const systemPrompt = `
You are the Personal AI Digital Twin of the user.
Your goal is to represent the user accurately, thinking and responding as they would.

USER PERSONALITY PROFILE:
${personalityStyle}

USER MEMORY CONTEXT:
${memoryContext}

INSTRUCTIONS:
- Respond in the user's communication style.
- Use the provided memories to give personalized and context-aware responses.
- Be the "TwinMind" - a reflection of the user's digital consciousness.
    `.trim();

    // 4. Get or create conversation
    let currentConversationId = conversationId;
    let history: { role: string; content: string }[] = [];

    if (currentConversationId) {
      const messages = await db.message.findMany({
        where: { conversationId: currentConversationId },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      history = messages.map(m => ({ role: m.role, content: m.content }));
    } else {
      const newConv = await db.conversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 50),
        },
      });
      currentConversationId = newConv.id;
    }

    const openaiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    // 5a. Streaming response
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

            // First chunk: send conversationId so client can store it
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

            // Persist messages + extract memories after stream closes
            await db.message.createMany({
              data: [
                { conversationId: currentConversationId, role: "user", content: message },
                { conversationId: currentConversationId, role: "assistant", content: fullResponse },
              ],
            });

            const chatContext = history.slice(-3).map(m => `${m.role}: ${m.content}`).join("\n");
            decideAndStoreMemory(user.id, message, chatContext).catch(err =>
              console.error("Memory storage error:", err)
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

    // 5b. Non-streaming (fallback, also used by voice page)
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
    decideAndStoreMemory(user.id, message, chatContext).catch(err =>
      console.error("Memory storage error:", err)
    );

    const result = { content: assistantMessage, conversationId: currentConversationId };
    cache.set(cacheKey, result, 5 * 60 * 1000);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
