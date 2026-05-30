/**
 * Parses WhatsApp exported .txt chat files.
 * Formats supported:
 *  [DD/MM/YYYY, HH:MM:SS] Name: message
 *  DD/MM/YYYY, HH:MM - Name: message
 */

export interface ChatMessage {
  timestamp: string;
  sender: string;
  content: string;
}

const LINE_REGEX =
  /^\[?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s[-–]\s(.+?):\s(.+)$/;

export function parseWhatsAppExport(raw: string): ChatMessage[] {
  const lines = raw.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const line of lines) {
    const match = line.match(LINE_REGEX);
    if (match) {
      if (current) messages.push(current);
      const [, date, time, sender, content] = match;
      current = { timestamp: `${date} ${time}`, sender: sender.trim(), content: content.trim() };
    } else if (current && line.trim()) {
      // Continuation of previous message
      current.content += " " + line.trim();
    }
  }
  if (current) messages.push(current);

  // Filter out system messages
  return messages.filter(
    m =>
      !m.content.startsWith("<Media omitted>") &&
      !m.content.startsWith("This message was deleted") &&
      m.content.length > 2
  );
}

export function extractUserMessages(messages: ChatMessage[], userName: string): string[] {
  const nameLower = userName.toLowerCase();
  return messages
    .filter(m => m.sender.toLowerCase().includes(nameLower))
    .map(m => m.content);
}

export function extractAllSenders(messages: ChatMessage[]): string[] {
  return [...new Set(messages.map(m => m.sender))];
}
