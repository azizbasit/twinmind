import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getEmbeddings(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.replace(/\n/g, " "),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("[OPENAI_EMBEDDINGS_ERROR]", error);
    throw error;
  }
}

export async function generateChatResponse(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  stream: boolean = false
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream,
      temperature: 0.7,
    });

    return response;
  } catch (error) {
    console.error("[OPENAI_CHAT_ERROR]", error);
    throw error;
  }
}
