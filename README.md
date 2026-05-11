# TwinMind - Personal AI Digital Twin OS

TwinMind is a production-ready AI platform that learns from everything you provide and becomes an AI representation of yourself.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Lucide React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with `pgvector` extension
- **ORM**: Prisma
- **Auth**: Clerk
- **AI**: OpenAI (GPT-4o, text-embedding-3-small)

## Getting Started

### 1. Prerequisites

- Node.js 18+ 
- PostgreSQL database with `pgvector` extension enabled

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/twinmind?schema=public"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

OPENAI_API_KEY=sk-...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Installation

```bash
npm install
```

### 4. Database Setup

```bash
# Enable pgvector in your PostgreSQL
# psql -d twinmind -c "CREATE EXTENSION IF NOT EXISTS vector;"

npx prisma generate
npx prisma db push
```

### 5. Run the App

```bash
npm run dev
```

## Core Features

- **AI Chat System**: Personalized responses based on your communication style.
- **Memory Engine**: Automatically extracts and stores meaningful insights from conversations.
- **RAG System**: Retrieves relevant memories to provide context-aware AI responses.
- **Knowledge Ingestion**: Upload text files to expand your twin's knowledge base.
- **Personality Engine**: Analyzes your writing style to mimic your digital presence.

## Project Structure

- `app/`: Next.js pages and API routes
- `components/`: Reusable UI components
- `lib/`: Core logic (AI, Memory, DB, Personality)
- `prisma/`: Database schema
