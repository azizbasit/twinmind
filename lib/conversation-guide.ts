// Conversation intelligence — personality discovery through natural dialogue.
// Per-request hint is ~60-80 tokens. Starters are fetched once per session (free).

// ─── Dimension metadata ───────────────────────────────────────────────────────
// Each dimension has:
//   probe: natural, engaging question the AI can use or riff on
//   obs:   what the AI can observe automatically (no question needed)

interface DimensionMeta {
  probe?: string;   // question to ask naturally
  obs?: string;     // observable from how they write (no question needed)
}

const DIMENSIONS: Record<string, DimensionMeta> = {
  // ── Observable automatically from writing style ──────────────────────────
  formalityScore:      { obs: "formality level from their writing" },
  casualnessScore:     { obs: "casual vs stiff tone" },
  humorScore:          { obs: "humor and wit in replies" },
  directnessScore:     { obs: "direct vs indirect phrasing" },
  technicalDepthScore: { obs: "vocabulary and technical comfort" },
  avgMessageLength:    { obs: "message length tendency" },

  // ── Need a question to reveal ────────────────────────────────────────────
  analyticalScore:     { probe: "Logic or gut — which guides you more?" },
  strategicScore:      { probe: "Do you think about the end goal first?" },
  creativeScore:       { probe: "Do you usually find a new angle or stick to what works?" },
  emotionalScore:      { probe: "How much do feelings factor into your decisions?" },
  dataOrientedScore:   { probe: "Data or instinct — how do you decide?" },
  intuitiveScore:      { probe: "Do you usually trust your first instinct?" },
  riskToleranceScore:  { probe: "What's the boldest call you've made recently?" },
  decisionSpeedScore:  { probe: "Fast decisions or do you sit with them?" },
  plannerScore:        { probe: "Plan ahead or figure it out as you go?" },
  builderScore:        { probe: "Do it yourself or delegate?" },
  researcherScore:     { probe: "Research first or just start?" },
  creatorScore:        { probe: "More of an ideas person or an executor?" },
  managerScore:        { probe: "Do you enjoy coordinating others?" },
  introversionScore:   { probe: "What recharges you — people or alone time?" },
  extroversionScore:   { probe: "Do big social situations energize or drain you?" },
  leadershipScore:     { probe: "Do you step up to lead or let others drive?" },
  collaborationScore:  { probe: "Better alone or with people around?" },
};

// Fields that require a question (not auto-observable)
const PROBEABLE_FIELDS = Object.entries(DIMENSIONS)
  .filter(([, v]) => v.probe)
  .map(([k]) => k);

// ─── Build a targeted ~70-token discovery hint ────────────────────────────────
// Picks the 1-2 dimensions we know least about, includes the exact probe question.
// Returns empty string when profile is mature (≥ 200 data points).

export function buildDiscoveryHint(
  profile: Record<string, number> | null,
  dataPointsAnalyzed: number
): string {
  if (dataPointsAnalyzed >= 200) return ""; // profile mature, no discovery needed

  let targets: string[];

  if (!profile) {
    // Fresh user: start with high-signal foundational dimensions
    targets = ["analyticalScore", "riskToleranceScore"];
  } else {
    // Find probeable dimensions closest to 50 (= default = not yet learned)
    targets = PROBEABLE_FIELDS
      .sort((a, b) => Math.abs((profile[a] ?? 50) - 50) - Math.abs((profile[b] ?? 50) - 50))
      .slice(0, 2);
  }

  const lines = targets
    .map(t => DIMENSIONS[t]?.probe)
    .filter(Boolean)
    .map(q => `→ "${q}"`);

  if (lines.length === 0) return "";

  const freq =
    dataPointsAnalyzed < 20  ? "most responses" :
    dataPointsAnalyzed < 80  ? "every few responses" :
                               "occasionally";

  return `DISCOVERY (${freq}): ask ONE of these — short, under 10 words, casual:\n${lines.join("\n")}`;
}

// ─── Conversation starters (fetched once, shown in UI) ───────────────────────

export interface ConversationStarter {
  id: string;
  text: string;
  emoji: string;
}

export const CONVERSATION_STARTERS: ConversationStarter[] = [
  { id: "cs01", emoji: "⚡", text: "Gut says yes, zero data — do you go for it?" },
  { id: "cs02", emoji: "🧠", text: "Logic or instinct — which one wins for you?" },
  { id: "cs03", emoji: "🔄", text: "What's something you changed your mind on recently?" },
  { id: "cs04", emoji: "✨", text: "What does your perfect workday look like?" },
  { id: "cs05", emoji: "🗺️", text: "Plan everything out, or figure it out as you go?" },
  { id: "cs06", emoji: "⚡", text: "What kind of work makes time disappear for you?" },
  { id: "cs07", emoji: "🔋", text: "People or alone time — what recharges you?" },
  { id: "cs08", emoji: "👥", text: "Do you step up to lead or let others take the wheel?" },
  { id: "cs09", emoji: "🎯", text: "What are you quietly working on that most people don't know?" },
  { id: "cs10", emoji: "💡", text: "What do most people get wrong about your field?" },
  { id: "cs11", emoji: "🎭", text: "What would surprise someone who just met you?" },
  { id: "cs12", emoji: "🚀", text: "What's the boldest call you've made recently?" },
  { id: "cs13", emoji: "⚖️", text: "Someone you respect disagrees — push back or reconsider?" },
  { id: "cs14", emoji: "🌱", text: "Who shaped how you think the most?" },
  { id: "cs15", emoji: "💭", text: "What idea have you been sitting on but haven't started?" },
  { id: "cs16", emoji: "🏆", text: "What does success mean to you right now — really?" },
  { id: "cs17", emoji: "🔨", text: "Builder or strategist — which one are you?" },
  { id: "cs18", emoji: "🤔", text: "Alone or with people — where do you think best?" },
  { id: "cs19", emoji: "👀", text: "How would a close colleague describe how you work?" },
  { id: "cs20", emoji: "📚", text: "Research first or just dive in?" },
];

export function getRandomStarters(n = 4, excludeIds: string[] = []): ConversationStarter[] {
  const pool = CONVERSATION_STARTERS.filter(s => !excludeIds.includes(s.id));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, n);
}
