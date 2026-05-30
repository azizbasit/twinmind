# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is TwinMind

A personal AI digital twin platform. Users feed it their voice recordings, documents, WhatsApp chats, and social media content. It learns their personality and communication style, then can chat as them and draft social media posts in their voice.

## Commands

```bash
npm run dev               # Start dev server at http://localhost:3000
npx tsx prisma/seed.ts    # Seed roles — required once before first registration
npx prisma db push        # Apply schema changes (no migration history used)
npx tsc --noEmit          # TypeScript check
npm run build             # Production build
```

No test suite exists.

## Stack

Next.js 14 App Router · TypeScript · Prisma + PostgreSQL (Neon) · pgvector · OpenAI (GPT-4o, Whisper, text-embedding-3-small) · Resend (email) · TailwindCSS

## Key Architecture Points

**Auth** — Custom JWT, not Clerk (ignore the Clerk keys in `.env`, they are unused). Tokens in HTTP-only cookies. `proxy.ts` is the middleware. In API routes use `getOrCreateUser()` from `lib/user-utils.ts`; in Server Components use `getCurrentUser()` from `lib/auth/get-user.ts`.

**Memory engine** (`lib/memory.ts`) — Vector inserts and similarity searches use raw SQL (`$executeRawUnsafe` / `$queryRawUnsafe`) because Prisma does not support pgvector natively. `decideAndStoreMemory` calls GPT-4o in JSON mode to decide whether to store a message. `batchExtractMemories` chunks long text and runs extraction on each segment.

**Chat API** (`app/api/chat/route.ts`) — Streams by default via SSE. Events: `{ type: "meta" }`, `{ type: "delta" }`, `{ type: "done" }`. Memory extraction runs after the stream closes.

**Database** — Use `prisma db push` to apply schema changes. Run `npx tsx prisma/seed.ts` once to create the `USER`/`ADMIN` roles (registration fails without them).

**Cache** (`lib/cache.ts`) — In-memory singleton. Used for chat deduplication (5 min TTL) and login rate limiting. Resets on server restart.
