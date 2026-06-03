import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { batchExtractMemories, decideAndStoreMemory } from "@/lib/memory";
import { db } from "@/lib/db";
import { createRequire } from "module";
import { handleApiError } from "@/lib/api-error";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    const fileName = file.name;
    const fileExt = fileName.split(".").pop()?.toLowerCase() ?? "txt";

    let text = "";

    console.log(`[UPLOAD] Processing file: ${fileName}, type: ${file.type}`);

    if (file.type === "application/pdf" || fileExt === "pdf") {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdf(buffer);
        text = data.text;
        console.log(`[UPLOAD] PDF parsed: ${text.length} chars`);
      } catch (pdfError: any) {
        console.error("[UPLOAD] PDF parse failed:", pdfError);
        return NextResponse.json({ success: false, error: `PDF parse failed: ${pdfError.message}` }, { status: 500 });
      }
    } else {
      text = await file.text();
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Create the raw document record
    const doc = await db.uploadedDocument.create({
      data: {
        userId: user.id,
        fileName,
        fileType: fileExt,
        content: text.substring(0, 50000), // store up to 50k chars
        wordCount,
        status: "processing",
      },
    });

    // Extract memories from the full text in chunks
    const content = text.substring(0, 15000);
    let memoriesExtracted = 0;

    if (content.length > 800) {
      memoriesExtracted = await batchExtractMemories(user.id, content, `Document "${fileName}"`, "DOCUMENT");
    } else {
      const result = await decideAndStoreMemory(
        user.id,
        `Document "${fileName}" content: ${content}`,
        undefined,
        "DOCUMENT"
      );
      if (result) memoriesExtracted = 1;
    }

    // Update document record with results
    await db.uploadedDocument.update({
      where: { id: doc.id },
      data: {
        memoriesExtracted,
        status: "done",
        processedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      fileName,
      wordCount,
      memoriesExtracted,
      message: memoriesExtracted > 0
        ? `Extracted ${memoriesExtracted} memories from "${fileName}"`
        : `Document processed — no specific memories found in "${fileName}"`,
    });
  } catch (error) {
    return handleApiError(error, );
  }
}
