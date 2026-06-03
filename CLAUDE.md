# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is TwinMind

A personal AI digital twin platform. Users feed it voice recordings, documents, WhatsApp chats, and social media content. It learns their personality and communication style — building a quantified persona model, relationship intelligence, and evolving memory — then chats as them and drafts social media posts in their voice.

## Commands

```bash
npm run dev               # Start dev server at http://localhost:3000
npx tsx prisma/seed.ts    # Seed roles — required once before first registration
npx prisma db push        # Apply schema changes (no migration history used)
npx prisma generate       # Regenerate Prisma client after schema changes (stop dev server first on Windows)
npx tsc --noEmit          # TypeScript check
npm run build             # Production build
```

No test suite exists.

## Stack

Next.js 16 App Router · TypeScript · Prisma + **MySQL** (Laragon, localhost:3306) · OpenAI (GPT-4o, GPT-4o-mini, Whisper, text-embedding-3-small) · ElevenLabs (voice cloning) · Resend (email) · TailwindCSS

> **Note:** CLAUDE.md previously said "PostgreSQL (Neon) · pgvector" — that is incorrect. The database is MySQL. Embeddings are stored as JSON-stringified float arrays in `LongText` columns; cosine similarity is computed in-memory in JavaScript.

## Key Architecture Points

**Auth** — Custom JWT, not Clerk (ignore any Clerk keys in `.env`, they are unused). Tokens in HTTP-only cookies. In API routes use `getOrCreateUser()` from `lib/user-utils.ts`; in Server Components use `getCurrentUser()` from `lib/auth/get-user.ts`.

**Layered AI Strategy** — Three cost tiers:
- **Layer 1** — Rule-based (no AI): stats, name frequency, deduplication heuristics
- **Layer 2** — `gpt-4o-mini`: memory extraction (`decideAndStoreMemory`), persona scoring (`analyzePersonaIncremental`), contact extraction (`extractContactsIncremental`)
- **Layer 3** — `gpt-4o`: twin chat conversations and deep reasoning only

**Memory engine** (`lib/memory.ts`) — `saveMemory` embeds content with `text-embedding-3-small` only when `importanceScore >= 5` (cost control). Before saving, runs cosine similarity deduplication against existing memories of the same type — similarity > 0.88 boosts confidence instead of creating a duplicate. `decideAndStoreMemory` uses gpt-4o-mini in JSON mode. `batchExtractMemories` chunks long text and runs extraction on each segment with the correct `MemorySource`.

**Persona engine** (`lib/persona-engine.ts`) — `analyzePersonaIncremental` processes only new messages since `lastAnalyzedAt` (incremental, never reprocesses full history). Scores 22 personality dimensions (0–100) across Communication, Thinking, Decision, Work, and Social styles. Uses weighted blending (new data = 20–60% weight depending on profile maturity). Weekly snapshots auto-created; manual snapshots via `POST /api/persona/analyze` with `{ snapshot: true }`.

**Relationship engine** (`lib/relationship-engine.ts`) — `extractContactsIncremental` uses Layer 1 (regex name frequency) to find candidates, then Layer 2 (gpt-4o-mini) to classify relationship type, sentiment (−1 to +1), and importance. Deduplicates by name/alias match.

**Chat API** (`app/api/chat/route.ts`) — Streams by default via SSE. Events: `{ type: "meta" }`, `{ type: "delta" }`, `{ type: "done" }`. System prompt is enriched with: quantified persona profile (`formatPersonaForSystemPrompt`), top semantic memories, and key relationship context. Memory extraction runs async after the stream closes.

**Database** — MySQL via Prisma. Use `prisma db push` to apply schema changes. Run `npx tsx prisma/seed.ts` once to create `USER`/`ADMIN` roles (registration fails without them). On Windows, stop the dev server before running `prisma generate` (file lock on the query engine DLL).

**Cache** (`lib/cache.ts`) — In-memory singleton. Used for chat deduplication (5 min TTL) and login rate limiting. Resets on server restart.

## Database Models (summary)

| Model | Purpose |
|---|---|
| `User` | Auth, profile, voice clone status |
| `Conversation` / `Message` | Raw chat history |
| `Memory` | Extracted insights with embedding, confidence score, permanence, source |
| `UploadedDocument` | Raw uploaded files (PDF, TXT, MD) |
| `ImportedChat` | Raw imported chat exports (WhatsApp, Telegram, etc.) |
| `Contact` | Identified recurring people with relationship type and sentiment |
| `PersonaProfile` | Live 22-dimension persona scores (one per user) |
| `PersonaSnapshot` | Versioned weekly/monthly persona history |
| `PersonaDraft` | AI-generated social posts awaiting review |
| `VoiceSample` / `Integration` | ElevenLabs voice cloning, social integrations |

## API Routes (summary)

| Route | Purpose |
|---|---|
| `POST /api/chat` | Streaming twin conversation (SSE) |
| `GET/POST /api/persona/profile` | Get or trigger persona analysis |
| `POST /api/persona/analyze` | Full pipeline: persona + relationships |
| `GET /api/persona/snapshots` | Persona version history |
| `GET /api/relationships` | Identified contacts list |
| `PATCH /api/relationships/[id]` | User correction of contact data |
| `POST /api/upload` | Document upload + memory extraction |
| `POST /api/upload/whatsapp` | WhatsApp export import |
| `GET /api/analytics` | Aggregated stats + twin completeness score |
| `GET /api/memory` | Memory list (paginated) |
| `POST /api/persona/draft` | Generate social post in user's voice |

## Dashboard Pages

| Route | Purpose |
|---|---|
| `/dashboard` | Overview, persona strength, quick actions |
| `/chat` | Twin conversation interface |
| `/personality` | 22-dimension visual personality profile |
| `/relationships` | Relationship intelligence cards |
| `/persona-evolution` | Snapshot timeline and version comparison |
| `/memories` | Memory bank with filter and edit |
| `/upload` | Document / WhatsApp import |
| `/persona` | Social media draft generation |
| `/analytics` | Detailed metrics |
| `/voice` | Voice journal and cloning |
