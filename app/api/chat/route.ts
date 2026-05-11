import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { searchMemories, decideAndStoreMemory } from "@/lib/memory";
import { getUserPersonality } from "@/lib/personality";
import { generateChatResponse } from "@/lib/openai";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const user = await getOrCreateUser();
    const { message, conversationId } = await req.json();

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

    // 3. Build context from memories
    const memoryContext = relevantMemories.length > 0
      ? `Relevant memories about the user:\n${relevantMemories.map(m => `- ${m.content}`).join("\n")}`
      : "No specific relevant memories found.";

    // 4. Build system prompt
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
    `;

    // 5. Get conversation history
    let currentConversationId = conversationId;
    let history: any[] = [];

    if (currentConversationId) {
      const messages = await db.message.findMany({
        where: { conversationId: currentConversationId },
        orderBy: { createdAt: "asc" },
        take: 10,
      });
      history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
    } else {
      const newConv = await db.conversation.create({
        data: {
          userId: user.id,
          title: message.substring(0, 50),
        },
      });
      currentConversationId = newConv.id;
    }

    // 6. Generate AI response
    const aiResponse = await generateChatResponse([
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ]);

    const assistantMessage = (aiResponse as any).choices[0].message.content;

    // 7. Store messages in DB
    await db.message.createMany({
      data: [
        { conversationId: currentConversationId, role: "user", content: message },
        { conversationId: currentConversationId, role: "assistant", content: assistantMessage },
      ],
    });

    // 8. Background task: Decide if user message should be a memory
    // We don't await this to keep response time low
    decideAndStoreMemory(user.id, message).catch(err => console.error("Memory storage error:", err));

    return NextResponse.json({
      content: assistantMessage,
      conversationId: currentConversationId,
    });
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
