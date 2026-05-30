import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { getOrCreateUser } from "@/lib/user-utils";

export async function POST(req: Request) {
  try {
    await getOrCreateUser();

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("[TRANSCRIBE_ERROR]", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
