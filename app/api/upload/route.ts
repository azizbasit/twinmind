import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/user-utils";
import { decideAndStoreMemory } from "@/lib/memory";

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new NextResponse("No file uploaded", { status: 400 });
    }

    const text = await file.text();
    
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
