import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { decideAndStoreMemory } from "@/lib/memory";
import { createRequire } from "module";

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

    let text = "";
    
    console.log(`[UPLOAD] Processing file: ${file.name}, type: ${file.type}`);

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        console.log("[UPLOAD] Detected PDF, converting to buffer...");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`[UPLOAD] Buffer created, size: ${buffer.length} bytes. Parsing PDF...`);
        // pdf-parse might need to be imported differently or handled carefully
        const data = await pdf(buffer);
        text = data.text;
        console.log(`[UPLOAD] PDF parsed successfully, extracted ${text.length} characters.`);
      } catch (pdfError: any) {
        console.error("[UPLOAD] PDF Parsing failed:", pdfError);
        return NextResponse.json({ 
          success: false, 
          error: `PDF Parsing failed: ${pdfError.message || "Unknown error"}` 
        }, { status: 500 });
      }
    } else {
      text = await file.text();
    }
    
    // Split text into chunks if it's too large, but for MVP we'll process the whole thing
    // or the first 5000 characters
    const content = text.substring(0, 5000);

    // Extract memories from the uploaded text
    const result = await decideAndStoreMemory(user.id, `Uploaded document content: ${content}`);

    return NextResponse.json({
      success: true,
      message: result ? "Memory extracted from document" : "Document processed, no specific memories found",
    });
  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
