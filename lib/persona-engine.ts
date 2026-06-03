import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import { PersonaProfile, SnapshotType } from "@prisma/client";

export const SCORE_FIELDS = [
  "formalityScore", "casualnessScore", "humorScore", "directnessScore", "technicalDepthScore",
  "analyticalScore", "strategicScore", "creativeScore", "emotionalScore",
  "dataOrientedScore", "intuitiveScore", "riskToleranceScore", "decisionSpeedScore",
  "plannerScore", "builderScore", "researcherScore", "creatorScore", "managerScore",
  "introversionScore", "extroversionScore", "leadershipScore", "collaborationScore",
] as const;

export type ScoreKey = typeof SCORE_FIELDS[number];

// ─── Dimension metadata for UI ────────────────────────────────────────────────

export const PERSONA_DIMENSIONS = {
  communication: {
    label: "Communication Style",
    color: "violet",
    fields: [
      { key: "formalityScore", label: "Formality", desc: "Formal vs casual language" },
      { key: "casualnessScore", label: "Casualness", desc: "Relaxed & conversational" },
      { key: "humorScore", label: "Humor", desc: "Use of wit and humor" },
      { key: "directnessScore", label: "Directness", desc: "Direct vs indirect expression" },
      { key: "technicalDepthScore", label: "Technical Depth", desc: "Use of technical vocabulary" },
      { key: "avgMessageLength", label: "Message Length", desc: "Tendency for longer messages" },
    ],
  },
  thinking: {
    label: "Thinking Style",
    color: "blue",
    fields: [
      { key: "analyticalScore", label: "Analytical", desc: "Data and logic-driven thinking" },
      { key: "strategicScore", label: "Strategic", desc: "Long-term planning orientation" },
      { key: "creativeScore", label: "Creative", desc: "Novel ideas and approaches" },
      { key: "emotionalScore", label: "Emotional", desc: "Emotion in reasoning" },
    ],
  },
  decision: {
    label: "Decision Style",
    color: "teal",
    fields: [
      { key: "dataOrientedScore", label: "Data-Driven", desc: "Relies on data for decisions" },
      { key: "intuitiveScore", label: "Intuitive", desc: "Gut-feel decision making" },
      { key: "riskToleranceScore", label: "Risk Tolerance", desc: "Comfort with uncertainty" },
      { key: "decisionSpeedScore", label: "Decision Speed", desc: "Quick vs deliberate decisions" },
    ],
  },
  work: {
    label: "Work Style",
    color: "orange",
    fields: [
      { key: "plannerScore", label: "Planner", desc: "Plans ahead vs improvises" },
      { key: "builderScore", label: "Builder", desc: "Hands-on execution" },
      { key: "researcherScore", label: "Researcher", desc: "Info-gathering tendency" },
      { key: "creatorScore", label: "Creator", desc: "Content & creative output" },
      { key: "managerScore", label: "Manager", desc: "Coordinating others" },
    ],
  },
  social: {
    label: "Social Style",
    color: "pink",
    fields: [
      { key: "introversionScore", label: "Introversion", desc: "Energy from solitude" },
      { key: "extroversionScore", label: "Extroversion", desc: "Energy from social interaction" },
      { key: "leadershipScore", label: "Leadership", desc: "Takes initiative & leads" },
      { key: "collaborationScore", label: "Collaboration", desc: "Team vs solo preference" },
    ],
  },
} as const;

// ─── Core Analysis ────────────────────────────────────────────────────────────

function dynamicBlendWeight(existingDataPoints: number): number {
  if (existingDataPoints < 20) return 0.6;  // Learn quickly early on
  if (existingDataPoints < 50) return 0.4;
  if (existingDataPoints < 150) return 0.3;
  return 0.2; // Stable profile at scale
}

function buildAnalysisPrompt(
  messages: { content: string }[],
  memories: { type: string; content: string }[],
  existing: PersonaProfile | null
): string {
  const sampleMessages = messages
    .slice(0, 25)
    .map(m => `"${m.content.substring(0, 250)}"`)
    .join("\n");

  const memoryContext = memories
    .map(m => `[${m.type}] ${m.content}`)
    .join("\n");

  const priorContext = existing
    ? `\n\nCURRENT PROFILE BASELINE (blend with your analysis — do not reset without strong evidence):\n${JSON.stringify(
        Object.fromEntries(SCORE_FIELDS.map(f => [f, (existing as any)[f]])),
        null, 2
      )}`
    : "";

  return `Analyze the following user data and score their personality across all dimensions (0-100 each).

RECENT USER MESSAGES (${messages.length} total sampled):
${sampleMessages}

STORED INSIGHTS:
${memoryContext || "None yet"}
${priorContext}

Respond with ONLY a valid JSON object. All score fields must be integers 0-100.
Required fields:
{
  "formalityScore": 0-100,
  "casualnessScore": 0-100,
  "humorScore": 0-100,
  "directnessScore": 0-100,
  "technicalDepthScore": 0-100,
  "analyticalScore": 0-100,
  "strategicScore": 0-100,
  "creativeScore": 0-100,
  "emotionalScore": 0-100,
  "dataOrientedScore": 0-100,
  "intuitiveScore": 0-100,
  "riskToleranceScore": 0-100,
  "decisionSpeedScore": 0-100,
  "plannerScore": 0-100,
  "builderScore": 0-100,
  "researcherScore": 0-100,
  "creatorScore": 0-100,
  "managerScore": 0-100,
  "introversionScore": 0-100,
  "extroversionScore": 0-100,
  "leadershipScore": 0-100,
  "collaborationScore": 0-100,
  "summaryText": "2-3 sentence narrative of this person's personality and communication style"
}

Score definitions:
- formalityScore: formal/professional writing (0=very casual, 100=very formal)
- casualnessScore: relaxed and conversational (0=stiff, 100=very casual)
- humorScore: use of humor/wit (0=none, 100=constant)
- directnessScore: direct vs indirect (0=very indirect, 100=very direct)
- technicalDepthScore: technical vocabulary (0=layman, 100=expert)
- analyticalScore: data/logic-driven (0=intuitive, 100=highly analytical)
- strategicScore: long-term thinking (0=reactive, 100=strategic planner)
- creativeScore: novel ideas (0=conventional, 100=highly creative)
- emotionalScore: emotional expression (0=stoic, 100=highly emotional)
- dataOrientedScore: decisions from data (0=gut-feel, 100=data-driven)
- intuitiveScore: relies on intuition (0=needs proof, 100=very intuitive)
- riskToleranceScore: comfort with risk (0=risk-averse, 100=risk-taker)
- decisionSpeedScore: decision speed (0=deliberate, 100=very fast)
- plannerScore: plans ahead (0=improviser, 100=detailed planner)
- builderScore: hands-on execution (0=delegator, 100=builder)
- researcherScore: information-gathering (0=acts first, 100=researches deeply)
- creatorScore: creates content/output (0=consumer, 100=prolific creator)
- managerScore: coordinates others (0=individual contributor, 100=manager)
- introversionScore: energy from solitude (0=very extroverted, 100=very introverted)
- extroversionScore: energy from people (0=very introverted, 100=very extroverted)
- leadershipScore: takes leadership (0=follower, 100=natural leader)
- collaborationScore: team vs solo (0=solo worker, 100=highly collaborative)`;
}

// ─── Weekly Snapshot Logic ────────────────────────────────────────────────────

async function maybeCreateWeeklySnapshot(
  userId: string,
  profile: PersonaProfile,
  type: SnapshotType = "WEEKLY"
): Promise<void> {
  const latestSnapshot = await db.personaSnapshot.findFirst({
    where: { userId },
    orderBy: { version: "desc" },
  });

  if (latestSnapshot) {
    const daysSinceSnapshot =
      (Date.now() - latestSnapshot.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Weekly snapshots every 7 days, monthly every 30
    const minDays = type === "WEEKLY" ? 7 : 30;
    if (daysSinceSnapshot < minDays && type !== "MANUAL") return;
  }

  const nextVersion = (latestSnapshot?.version ?? 0) + 1;

  // Compute key changes from previous
  let changesFromPrev: string | null = null;
  if (latestSnapshot) {
    const changes: Record<string, { from: number; to: number; delta: number }> = {};
    for (const field of SCORE_FIELDS) {
      const prev = (latestSnapshot as any)[field] as number;
      const curr = (profile as any)[field] as number;
      const delta = curr - prev;
      if (Math.abs(delta) >= 5) {
        changes[field] = { from: prev, to: curr, delta };
      }
    }
    if (Object.keys(changes).length > 0) {
      changesFromPrev = JSON.stringify(changes);
    }
  }

  await db.personaSnapshot.create({
    data: {
      userId,
      version: nextVersion,
      snapshotType: type,
      formalityScore: profile.formalityScore,
      casualnessScore: profile.casualnessScore,
      humorScore: profile.humorScore,
      directnessScore: profile.directnessScore,
      technicalDepthScore: profile.technicalDepthScore,
      avgMessageLength: profile.avgMessageLength,
      analyticalScore: profile.analyticalScore,
      strategicScore: profile.strategicScore,
      creativeScore: profile.creativeScore,
      emotionalScore: profile.emotionalScore,
      dataOrientedScore: profile.dataOrientedScore,
      intuitiveScore: profile.intuitiveScore,
      riskToleranceScore: profile.riskToleranceScore,
      decisionSpeedScore: profile.decisionSpeedScore,
      plannerScore: profile.plannerScore,
      builderScore: profile.builderScore,
      researcherScore: profile.researcherScore,
      creatorScore: profile.creatorScore,
      managerScore: profile.managerScore,
      introversionScore: profile.introversionScore,
      extroversionScore: profile.extroversionScore,
      leadershipScore: profile.leadershipScore,
      collaborationScore: profile.collaborationScore,
      dataPointsAnalyzed: profile.dataPointsAnalyzed,
      summaryText: profile.summaryText,
      changesFromPrev,
    },
  });
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function analyzePersonaIncremental(userId: string): Promise<void> {
  const existing = await db.personaProfile.findUnique({ where: { userId } });

  // Incremental: only new messages since last analysis
  const since = existing?.lastAnalyzedAt ?? new Date(0);

  const [newMessages, totalUserMessages, memories] = await Promise.all([
    db.message.findMany({
      where: { conversation: { userId }, role: "user", createdAt: { gt: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { content: true },
    }),
    db.message.count({ where: { conversation: { userId }, role: "user" } }),
    db.memory.findMany({
      where: { userId },
      orderBy: { importanceScore: "desc" },
      take: 30,
      select: { type: true, content: true },
    }),
  ]);

  // Need at least 3 new messages (or 5 total for first analysis)
  if (newMessages.length < 3 && existing) return;
  if (totalUserMessages < 5 && !existing) return;

  // Calculate average message length (scaled 0-100)
  const avgLen =
    newMessages.length > 0
      ? Math.min(
          Math.round(
            newMessages.reduce((s, m) => s + m.content.length, 0) / newMessages.length / 3
          ),
          100
        )
      : (existing?.avgMessageLength ?? 50);

  const prompt = buildAnalysisPrompt(newMessages, memories, existing);

  // Layer 2: use gpt-4o-mini for cost-efficient routine analysis
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are an expert personality analyst. Respond only with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const raw = JSON.parse(response.choices[0].message.content || "{}");
  const summaryText: string | null = raw.summaryText || existing?.summaryText || null;

  // Weighted blend: new analysis gets less weight as profile matures
  const blendWeight = dynamicBlendWeight(existing?.dataPointsAnalyzed ?? 0);
  const finalScores: Record<string, number> = {};

  for (const field of SCORE_FIELDS) {
    const rawScore = typeof raw[field] === "number" ? Math.round(raw[field]) : 50;
    if (existing) {
      const current = (existing as any)[field] as number;
      finalScores[field] = Math.min(100, Math.max(0, Math.round(current * (1 - blendWeight) + rawScore * blendWeight)));
    } else {
      finalScores[field] = Math.min(100, Math.max(0, rawScore));
    }
  }

  // Create weekly snapshot before updating (if profile exists)
  if (existing) {
    await maybeCreateWeeklySnapshot(userId, existing);
  }

  // Upsert current profile
  await db.personaProfile.upsert({
    where: { userId },
    create: {
      userId,
      ...finalScores,
      avgMessageLength: avgLen,
      dataPointsAnalyzed: totalUserMessages,
      lastAnalyzedAt: new Date(),
      summaryText,
    },
    update: {
      ...finalScores,
      avgMessageLength: avgLen,
      dataPointsAnalyzed: totalUserMessages,
      lastAnalyzedAt: new Date(),
      summaryText,
    },
  });
}

// ─── Public Getters ───────────────────────────────────────────────────────────

export async function getPersonaProfile(userId: string) {
  return db.personaProfile.findUnique({ where: { userId } });
}

export async function getPersonaSnapshots(userId: string) {
  return db.personaSnapshot.findMany({
    where: { userId },
    orderBy: { version: "asc" },
  });
}

export async function createManualSnapshot(userId: string): Promise<void> {
  const profile = await db.personaProfile.findUnique({ where: { userId } });
  if (!profile) throw new Error("No persona profile found — run analysis first.");
  await maybeCreateWeeklySnapshot(userId, profile, "MANUAL");
}

// Builds a rich text description for use in the chat system prompt
export function formatPersonaForSystemPrompt(profile: PersonaProfile): string {
  const top = (field: ScoreKey) => (profile as any)[field] as number;

  const communicationStyle =
    top("formalityScore") > 60 ? "formal" :
    top("casualnessScore") > 60 ? "casual and conversational" :
    "balanced";

  const thinkingStyle =
    top("analyticalScore") > 60 ? "analytical" :
    top("creativeScore") > 60 ? "creative" :
    top("strategicScore") > 60 ? "strategic" : "balanced";

  const decisionStyle =
    top("dataOrientedScore") > 60 ? "data-driven" :
    top("intuitiveScore") > 60 ? "intuitive" : "balanced";

  const socialStyle =
    top("leadershipScore") > 65 ? "leader" :
    top("collaborationScore") > 65 ? "collaborative" :
    top("introversionScore") > 65 ? "introverted" : "adaptable";

  return `PERSONA PROFILE (quantified scores 0-100):
Communication: formality=${top("formalityScore")}, humor=${top("humorScore")}, directness=${top("directnessScore")}, technical=${top("technicalDepthScore")}
Thinking: analytical=${top("analyticalScore")}, creative=${top("creativeScore")}, strategic=${top("strategicScore")}, emotional=${top("emotionalScore")}
Decisions: data-oriented=${top("dataOrientedScore")}, intuitive=${top("intuitiveScore")}, risk-tolerance=${top("riskToleranceScore")}
Work: builder=${top("builderScore")}, planner=${top("plannerScore")}, researcher=${top("researcherScore")}, creator=${top("creatorScore")}
Social: leadership=${top("leadershipScore")}, collaboration=${top("collaborationScore")}, introversion=${top("introversionScore")}

STYLE SUMMARY: ${communicationStyle} communicator, ${thinkingStyle} thinker, ${decisionStyle} decision-maker, ${socialStyle} socially.
${profile.summaryText ? `\nNARRATIVE: ${profile.summaryText}` : ""}`.trim();
}
