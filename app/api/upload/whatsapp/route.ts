import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { parseWhatsAppExport, extractUserMessages, extractAllSenders } from "@/lib/whatsapp-parser";
import { batchExtractMemories } from "@/lib/memory";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userName = (formData.get("userName") as string | null) ?? "";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const raw = await file.text();
    const allMessages = parseWhatsAppExport(raw);

    if (allMessages.length === 0) {
      return NextResponse.json({
        error: "Could not parse any messages. Make sure it is a WhatsApp exported .txt file.",
      }, { status: 400 });
    }

    const senders = extractAllSenders(allMessages);

    // Step 1: return senders list for user to identify themselves
    if (!userName) {
      return NextResponse.json({ needsSender: true, senders, totalMessages: allMessages.length });
    }

    const userMessages = extractUserMessages(allMessages, userName);

    if (userMessages.length === 0) {
      return NextResponse.json({ error: `No messages found for sender "${userName}"` }, { status: 400 });
    }

    // Create raw data record
    const importedChat = await db.importedChat.create({
      data: {
        userId: user.id,
        platform: "whatsapp",
        rawContent: raw.substring(0, 100000),
        messageCount: allMessages.length,
        yourMessageCount: userMessages.length,
        status: "processing",
      },
    });

    const text = userMessages.join("\n");
    const memoriesExtracted = await batchExtractMemories(
      user.id,
      text,
      "WhatsApp conversation",
      "WHATSAPP"
    );

    // Update record
    await db.importedChat.update({
      where: { id: importedChat.id },
      data: { memoriesExtracted, status: "done", processedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      totalMessages: allMessages.length,
      yourMessages: userMessages.length,
      memoriesExtracted,
    });
  } catch (error) {
    return handleApiError(error, );
  }
}
