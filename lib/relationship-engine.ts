import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

interface ExtractedContact {
  name: string;
  aliases: string[];
  relationshipType: string;
  sentimentScore: number;
  importanceScore: number;
  communicationNotes: string;
}

// ─── Layer 1: Rule-based frequency counter ────────────────────────────────────

function countNameMentions(messages: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  // Simple heuristic: capitalized words that appear multiple times and aren't sentence starters
  const nameRegex = /\b([A-Z][a-z]{2,20})\b/g;
  const stopWords = new Set([
    "The","This","That","They","Their","Then","There","When","Where","What",
    "Why","How","Who","Also","Just","With","From","Have","Will","Would","Could",
    "Should","About","After","Before","During","While","Since","Though","Although",
    "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
    "January","February","March","April","May","June","July","August",
    "September","October","November","December","Today","Tomorrow","Yesterday",
    "Google","Apple","Amazon","Microsoft","Facebook","Twitter","LinkedIn",
  ]);

  const fullText = messages.join(" ");
  let match;
  while ((match = nameRegex.exec(fullText)) !== null) {
    const word = match[1];
    if (!stopWords.has(word)) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return counts;
}

// ─── Layer 2: AI-based contact extraction (gpt-4o-mini) ──────────────────────

async function extractContactsWithAI(
  messages: string[],
  candidateNames: string[]
): Promise<ExtractedContact[]> {
  if (messages.length === 0 || candidateNames.length === 0) return [];

  const sampleText = messages.slice(0, 40).join("\n---\n").substring(0, 6000);
  const candidates = candidateNames.slice(0, 20).join(", ");

  const prompt = `Analyze these user messages and identify real recurring people in their life.

Candidate names detected: ${candidates}

USER MESSAGES (sample):
${sampleText}

Return a JSON array of identified contacts. Only include people clearly mentioned multiple times or significantly:
{
  "contacts": [
    {
      "name": "Full name or best guess",
      "aliases": ["alt name or nickname"],
      "relationshipType": "friend | family | colleague | client | mentor | other",
      "sentimentScore": -1.0 to 1.0,
      "importanceScore": 0.0 to 1.0,
      "communicationNotes": "Brief note on how user relates to or communicates about this person"
    }
  ]
}

sentimentScore: -1.0 = conflict/negative, 0 = neutral, +1.0 = warm/positive
importanceScore: 0.1 = mentioned in passing, 1.0 = very important in user's life

Exclude: brand names, places, abstract concepts. Only real people.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a relationship analyst. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const parsed = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(parsed.contacts) ? parsed.contacts : [];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function extractContactsIncremental(userId: string): Promise<void> {
  const existing = await db.personaProfile.findUnique({
    where: { userId },
    select: { lastAnalyzedAt: true },
  });

  const since = existing?.lastAnalyzedAt ?? new Date(0);

  const messages = await db.message.findMany({
    where: { conversation: { userId }, role: "user", createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { content: true },
  });

  if (messages.length === 0) return;

  const texts = messages.map(m => m.content);

  // Layer 1: rule-based frequency detection — threshold 1 so a single mention reaches the AI
  const nameCounts = countNameMentions(texts);
  const frequentNames = [...nameCounts.entries()]
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  if (frequentNames.length === 0) return;

  // Layer 2: AI enrichment
  const aiContacts = await extractContactsWithAI(texts, frequentNames);

  if (aiContacts.length === 0) return;

  // Get existing contacts for deduplication
  const existingContacts = await db.contact.findMany({
    where: { userId },
    select: { id: true, name: true, aliases: true, interactionCount: true },
  });

  for (const contact of aiContacts) {
    const nameNorm = contact.name.toLowerCase().trim();

    // Check for existing contact (case-insensitive name match or alias match)
    const existing = existingContacts.find(ec => {
      if (ec.name.toLowerCase() === nameNorm) return true;
      if (ec.aliases) {
        try {
          const aliases: string[] = JSON.parse(ec.aliases);
          return aliases.some(a => a.toLowerCase() === nameNorm);
        } catch { return false; }
      }
      return false;
    });

    const mentionCount = nameCounts.get(contact.name) ?? 1;

    if (existing) {
      // Update existing — increment interaction count, update sentiment/importance
      await db.contact.update({
        where: { id: existing.id },
        data: {
          interactionCount: { increment: mentionCount },
          sentimentScore: contact.sentimentScore,
          importanceScore: contact.importanceScore,
          communicationNotes: contact.communicationNotes || undefined,
          lastInteractionAt: new Date(),
        },
      });
    } else {
      // Create new contact
      await db.contact.create({
        data: {
          userId,
          name: contact.name,
          aliases: contact.aliases.length > 0 ? JSON.stringify(contact.aliases) : null,
          relationshipType: contact.relationshipType || "other",
          importanceScore: contact.importanceScore,
          interactionCount: mentionCount,
          sentimentScore: contact.sentimentScore,
          communicationNotes: contact.communicationNotes || null,
          lastInteractionAt: new Date(),
        },
      });
    }
  }
}

// ─── Public Getters ───────────────────────────────────────────────────────────

export async function getContacts(userId: string) {
  return db.contact.findMany({
    where: { userId },
    orderBy: [{ importanceScore: "desc" }, { interactionCount: "desc" }],
  });
}

export async function getContactById(userId: string, contactId: string) {
  return db.contact.findFirst({
    where: { id: contactId, userId },
  });
}

// Builds relationship context string for the chat system prompt
export async function getRelationshipContextForChat(userId: string): Promise<string> {
  const contacts = await db.contact.findMany({
    where: { userId, importanceScore: { gte: 0.5 } },
    orderBy: { importanceScore: "desc" },
    take: 8,
    select: { name: true, relationshipType: true, sentimentScore: true, communicationNotes: true },
  });

  if (contacts.length === 0) return "";

  const lines = contacts.map(c => {
    const sentiment = c.sentimentScore > 0.3 ? "positive" : c.sentimentScore < -0.2 ? "tension" : "neutral";
    return `- ${c.name} (${c.relationshipType ?? "contact"}, ${sentiment} relationship)${c.communicationNotes ? `: ${c.communicationNotes}` : ""}`;
  });

  return `KEY RELATIONSHIPS:\n${lines.join("\n")}`;
}
