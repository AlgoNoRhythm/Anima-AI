<p align="center">
  <img src="assets/anima-ai.png" alt="Anima AI" width="220" />
</p>

<h1 align="center">Anima AI</h1>

<p align="center">
  <strong>Bring real-world objects to life with AI-powered conversations.</strong><br/>
  Upload documents. Create chatbots. Share with a QR code.
</p>

<p align="center">
  <a href="#deploy-to-railway">Deploy to Railway</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#use-cases">Use Cases</a> &middot;
  <a href="#deployment">Deployment</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <a href="https://github.com/anima-ai/anima-ai/blob/main/LICENSE"><img alt="License: GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" /></a>
  <a href="https://nodejs.org/"><img alt="Node.js 18+" src="https://img.shields.io/badge/node-18%2B-green.svg" /></a>
  <a href="https://pnpm.io/"><img alt="pnpm" src="https://img.shields.io/badge/pnpm-9%2B-F69220.svg" /></a>
</p>

<p align="center">
  <img src="assets/hero.gif" alt="Anima AI Demo" />
</p>

---

## Deploy to Railway

One-click deploy to [Railway](https://railway.com/) — provisions PostgreSQL, Redis, and all three services automatically. You just provide your API key.

<!-- TODO: Replace TEMPLATE_ID with your actual Railway template ID after creating it -->
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/TEMPLATE_ID)

### What you'll need

| What | Where to get it |
|------|-----------------|
| A Railway account | [railway.com](https://railway.com/) (free tier available) |
| An LLM API key | [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/api-keys) (at least one) |

### What happens when you click Deploy

Railway automatically creates everything defined in [`railway.yml`](railway.yml):

- **PostgreSQL** database
- **Redis** instance
- **web** — Next.js admin dashboard + public chat UI
- **chat-api** — Hono SSE streaming API
- **worker** — BullMQ document processing pipeline

`AUTH_SECRET` and `ENCRYPTION_KEY` are **auto-generated** as shared variables. Database and Redis URLs are wired automatically via Railway's reference variables.

### After deploying

1. **Paste your API key** — In Railway, go to your project's shared variables and add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (the deploy will prompt you for this)
2. **Wait for the first build** (~2-3 minutes) — migrations run automatically
3. **Visit your web URL** — create your first admin account
4. **Upload a document** and start chatting

### Creating the Railway template (maintainers only)

The deploy button above requires a Railway template. To create or update it:

1. Deploy the project manually on Railway (see [manual setup](#manual-railway-setup) below)
2. Go to project **Settings → Generate Template from Project**
3. Railway will capture all services, databases, and variable definitions
4. Copy the template ID and update the deploy button URL in this README

> The per-service `railway.toml` files in each app directory handle build and deploy configuration automatically.

### Manual Railway setup

If you prefer to set up manually instead of using the template:

<details>
<summary>Click to expand manual setup steps</summary>

#### 1. Create services

From your [Railway dashboard](https://railway.com/dashboard), create a new project and add:

| Service | Source | Root Directory |
|---------|--------|----------------|
| **Postgres** | Add Database → PostgreSQL | -- |
| **Redis** | Add Database → Redis | -- |
| **web** | GitHub repo → `main` branch | `apps/web` |
| **chat-api** | GitHub repo → `main` branch | `apps/chat-api` |
| **worker** | GitHub repo → `main` branch | `apps/worker` |

Each app has a `railway.toml` with the correct build and start commands — no configuration needed.

#### 2. Generate secrets

```bash
# AUTH_SECRET — random string for signing sessions
openssl rand -base64 32

# ENCRYPTION_KEY — 64-char hex for encrypting stored API keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Add shared variables

In Railway: project **Settings → Shared Variables**. All services inherit these automatically.

| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | Paste the output from `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Paste the output from the `node` command above |
| `ANTHROPIC_API_KEY` | Your key from [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | *(optional)* Your key from [platform.openai.com](https://platform.openai.com/api-keys) |

> **`AUTH_SECRET` must be identical across all services** — if they differ, sessions and API key decryption will silently fail. Shared variables handle this automatically.

#### 4. Add per-service variables

**web:**
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `NEXT_PUBLIC_CHAT_API_URL` | `https://` + the chat-api public domain |

**chat-api:**
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `CORS_ORIGIN` | `https://` + the web public domain |

**worker:**
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |

#### 5. Enable public networking

Settings → Networking → enable **Public Networking** for:
- **web** — your main URL (e.g. `your-app.up.railway.app`)
- **chat-api** — streaming API needs its own public domain

The **worker** does NOT need public networking.

#### 6. Deploy

Push to `main` or click **Deploy**. Migrations run automatically on first boot.

</details>

---

## What is Anima AI?

Anima AI is an open-source platform that lets you turn documents into interactive, AI-powered chatbots. Upload a PDF, TXT, Markdown, HTML, or DOCX file, customize the chatbot's personality and appearance, generate a QR code, and stick it on the real thing. Anyone who scans it can have a conversation with the document's content -- no app download required.

Think of it as giving a voice to objects that can't speak for themselves.

### Key Features

- **Document Upload & Processing** -- Drag-and-drop upload (PDF, TXT, MD, HTML, DOCX). PDFs are parsed into per-page text via [`pdf-parse`](https://www.npmjs.com/package/pdf-parse) (with optional [Docling](https://github.com/DS4SD/docling) service for higher-fidelity structure extraction).
- **RAG-Powered Chat (PageIndex)** -- Retrieval-Augmented Generation using **PageIndex**, a custom RAG system that replaces traditional vector embeddings with an LLM-driven hierarchical page index. At indexing time, an LLM builds a tree of document sections with titles, summaries, and page ranges. At query time, the LLM searches the tree structure to find the most relevant nodes -- with automatic citation of source pages. No embedding model or vector database required.
- **Streaming Responses with Markdown** -- Real-time SSE streaming with full markdown rendering (bold, lists, code blocks, tables) in chat bubbles.
- **Customizable Personality** -- Define system prompts, tone (professional, friendly, casual, formal, technical), temperature, guardrails, blocked topics, and suggested questions. Personality name and disclaimer text are translatable.
- **Theme Editor** -- Brand your chatbot with custom colors, fonts, logos, border radius, welcome messages, and action button labels. Live preview in the admin dashboard. All user-facing text (welcome message, action button label, suggested questions) is translatable per language.
- **Feedback Surveys** -- Configure post-conversation feedback with star ratings and free-text questions. Each rating and question is individually toggleable as required/optional. Responses are collected per session and viewable in the analytics dashboard.
- **QR Code Generator** -- Create styled QR codes (square, dots, rounded) with custom colors, title, and subtitle. Download as SVG or PNG. Built with [`qr-code-styling`](https://github.com/nickolay-volkov/qr-code-styling).
- **Analytics Dashboard** -- Track sessions, messages, and feedback survey responses with time-range filtering and visual charts. Export conversations as CSV.
- **Multi-Language Chat UI** -- The public chat interface supports English, German, French, and Italian. Language is resolved automatically from `?lang=` query parameter or the browser's `Accept-Language` header. All static UI strings and admin-configured content (welcome messages, suggested questions, personality name, disclaimer, feedback labels) are translatable via language tabs in the admin editors.
- **Embeddable Widget** -- Embed your chatbot in any website via an iframe. Fully themed and localized.
- **Team Collaboration** -- Invite team members as editors or viewers via link. Role-based access control (owner/editor/viewer) with per-action permissions.
- **Project Modes** -- Configure projects as chat-only, PDF-only, or both. Mode is enforced in both the UI and API.
- **Per-Project Rate Limiting** -- Set custom rate limits per project via the admin settings. Independent counters per project and user.
- **Mobile-Optimized Chat** -- Fixed-position app-like layout with iOS keyboard handling, safe-area support, and touch-optimized controls.
- **Multi-Provider LLM Support** -- Works with [Anthropic](https://www.anthropic.com/) (default) and [OpenAI](https://openai.com/) via [Vercel AI SDK](https://ai-sdk.dev/). Bring your own API keys per provider.

---

## How It Works

```
1. CREATE    You create a project in the admin dashboard.
   |
2. UPLOAD    You upload one or more documents (PDF, TXT, MD, HTML, DOCX).
   |
3. PROCESS   Worker parses the document, extracts pages, LLM builds a hierarchical page index.
   |
4. CONFIGURE You set the chatbot's personality, guardrails, and visual theme.
   |
5. GENERATE  You generate a styled QR code pointing to the public chat URL.
   |
6. DEPLOY    You print the QR code and attach it to the real-world object.
   |
7. CHAT      Anyone scans the QR code and chats with the document via their browser.
```

### Under the Hood: PageIndex RAG System

Anima AI uses **PageIndex**, a custom RAG (Retrieval-Augmented Generation) system that works without vector embeddings or a vector database. Instead, it uses the LLM itself to build and search a hierarchical document index.

**Indexing** -- When a document is uploaded, the worker:

1. **Parses** the document into per-page text (`pdf-parse` for PDFs, direct extraction for TXT/MD/HTML/DOCX). Optionally uses Docling for richer PDF structure if configured.
2. **Detects** the table of contents (if any) using an LLM.
3. **Builds a PageIndex tree** -- a hierarchical tree of sections, each with a title, page range, full text, and an LLM-generated summary.
4. **Stores** the tree as JSONB in PostgreSQL -- no vector embeddings, no external index.

**Querying** -- When a user sends a message, PageIndex:

1. **Validates** the input against guardrails and blocked topics.
2. **Loads** the PageIndex trees for the project from PostgreSQL.
3. **LLM tree search** -- sends the tree structure (titles + summaries) to the LLM, which selects the most relevant node IDs.
4. **Extracts** citations from the selected nodes (document name, page numbers, section titles).
5. **Generates** a streaming response with the full text of selected sections injected as context.

All responses stream in real-time via Server-Sent Events. No embedding model or vector database is required -- the same LLM provider (Anthropic or OpenAI) handles indexing, retrieval, and response generation.

---

## Use Cases

Anima AI can be deployed anywhere a document exists alongside a physical object. Here are some ideas:

### Restaurants & Cafes
Stick a QR code on each table. Guests scan it and ask questions about the menu: *"What's gluten-free?"*, *"What pairs well with the salmon?"*, *"What are today's specials?"*. Upload the menu PDF and configure a friendly, knowledgeable personality.

### Home Appliances
Attach a QR to your dishwasher, washing machine, or oven. Lost the manual? Scan and ask: *"How do I run a self-clean cycle?"*, *"What does error code E4 mean?"*, *"How do I reset the timer?"*. Upload the product manual and never dig through a drawer again.

### Cruise Ships & Hotels
Place QR codes in cabins, at the pool, in the lobby. Guests ask about dining hours, shore excursions, spa services, or emergency procedures. Upload the ship's guide or hotel directory. Multiple languages, zero wait time.

### Public Buildings & Government Offices
QR codes at the entrance or service counters. Citizens ask about required documents, hours, procedures: *"What do I need to renew my passport?"*, *"Where's the tax office?"*, *"How long is the wait?"*. Upload procedural guides and FAQ documents.

### Parks & Nature Reserves
Place QR codes at trailheads, information boards, or visitor centers. Hikers ask about trail difficulty, wildlife, history: *"How long is the summit trail?"*, *"Are there bears in this area?"*, *"When was this park established?"*. Upload trail maps and park guides.

### Books & Textbooks
Print a QR inside the cover. Readers interact with the content: *"Summarize chapter 3"*, *"Explain the difference between X and Y"*, *"Quiz me on this section"*. Authors can use it to add an interactive layer to physical books.

### Museums & Galleries
QR codes next to exhibits. Visitors ask questions in their own language: *"Who painted this?"*, *"What period is this from?"*, *"Tell me more about the technique used"*. Upload exhibit catalogs and curatorial notes.

### Universities & Schools
QR codes on course syllabi, lab equipment, or campus maps. Students ask: *"What's the grading policy?"*, *"How do I use this spectrometer?"*, *"Where's the computer science building?"*. Upload syllabi, equipment manuals, and campus guides.

### Real Estate
QR codes on property listing signs. Potential buyers scan and ask: *"How many bedrooms?"*, *"What's the square footage?"*, *"When was the roof replaced?"*, *"What are the HOA fees?"*. Upload property disclosure documents.

### Healthcare Clinics
QR codes in waiting rooms. Patients ask about procedures, preparation instructions, and insurance: *"Do I need to fast before my blood test?"*, *"What should I bring to my appointment?"*. Upload patient information booklets.

### Conferences & Events
QR codes on badges, booths, or schedules. Attendees ask: *"When is the keynote?"*, *"Where's the networking event?"*, *"What talks are about AI?"*. Upload the event program.

### Manufacturing & Warehouses
QR codes on machinery and equipment. Operators ask about maintenance schedules, safety procedures, and troubleshooting: *"How often should I replace the filter?"*, *"What's the lockout/tagout procedure?"*. Upload SOPs and maintenance manuals.

---

## Quick Start

### Prerequisites

- [**Node.js**](https://nodejs.org/) 18+ and [**pnpm**](https://pnpm.io/) 9+
- [**Docker**](https://www.docker.com/) (for PostgreSQL and Valkey)
- An [**Anthropic**](https://console.anthropic.com/) or [**OpenAI**](https://platform.openai.com/api-keys) API key (for LLM-powered indexing and chat)

### Installation

```bash
# Clone the repo
git clone https://github.com/anima-ai/anima-ai.git
cd anima-ai

# Install dependencies
pnpm install

# Copy environment template and configure
cp .env.example .env
```

Edit `.env` and set at minimum:
- `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) -- your LLM provider key
- `AUTH_SECRET` -- a random string of at least 32 characters (generate with `openssl rand -base64 32`)

### Running Locally

```bash
# 1. Start PostgreSQL + Valkey via Docker
docker compose -f docker/docker-compose.local.yml up -d

# 2. Run database migrations
pnpm db:migrate

# 3. (Optional) Seed demo data
pnpm db:seed

# 4. Start all services in dev mode
pnpm dev
```

This starts:

| Service | URL | Description |
|---------|-----|-------------|
| **Web app** | `http://localhost:3000` | Next.js admin dashboard + public chat UI |
| **Chat API** | `http://localhost:3001` | Hono SSE streaming API |
| **Worker** | (background) | BullMQ document processing + page index pipeline |

The first time you visit `http://localhost:3000`, you'll be prompted to create an admin account.

### What Docker Provides

The local Docker Compose (`docker/docker-compose.local.yml`) runs two services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **PostgreSQL** | `pgvector/pgvector:pg16` | 5432 | Primary database (required) |
| **Valkey** | `valkey/valkey:8-alpine` | 6379 | Cache (rate limiting) + job queues (BullMQ) |

Both use named volumes for data persistence across restarts.

### Stopping & Cleaning Up

```bash
# Stop services (keeps data)
docker compose -f docker/docker-compose.local.yml down

# Stop and delete all data
docker compose -f docker/docker-compose.local.yml down -v
```

### Optional: Docling Service (Enhanced PDF Parsing)

PDFs are parsed out of the box using `pdf-parse` (pure JS, no extra setup). For higher-fidelity extraction of tables and document structure, you can optionally run the Docling Python service:

```bash
cd apps/docling-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Then set `DOCLING_URL=http://localhost:8000` in your `.env`. If Docling is unavailable, the worker automatically falls back to `pdf-parse`.

---

## Environment Variables

All environment variables are documented in `.env.example`. Here's the full reference:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://anima:anima@localhost:5432/anima` |
| `AUTH_SECRET` | NextAuth session secret (min 32 chars). Must be the same across web + chat-api. | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Anthropic API key (default LLM provider) | `sk-ant-...` |

### Optional -- Infrastructure

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Valkey/Redis URL for cache + BullMQ queues | Empty (in-memory cache, synchronous processing) |
| `STORAGE_ENDPOINT` | S3-compatible storage endpoint | Empty (local filesystem `./uploads/`) |
| `STORAGE_BUCKET` | S3 bucket name | `anima-ai` |
| `STORAGE_ACCESS_KEY` | S3 access key | -- |
| `STORAGE_SECRET_KEY` | S3 secret key | -- |
| `DOCLING_URL` | Docling service URL for enhanced PDF parsing | Empty (falls back to `pdf-parse`) |

### Optional -- Application

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (alternative LLM provider) | -- |
| `ENCRYPTION_KEY` | 64-char hex for AES-256-GCM API key encryption | Falls back to `AUTH_SECRET` |
| `CHAT_API_URL` | Chat API URL (used by the web app) | `http://localhost:3001` |
| `CHAT_API_PORT` | Port the chat API listens on | `3001` |
| `CORS_ORIGIN` | Allowed origins for chat API CORS | `*` (restrict in production) |
| `NEXTAUTH_URL` | App URL for auth callbacks | `http://localhost:3000` |
| `RATE_LIMIT_MAX_REQUESTS` | Global rate limit (requests per window) | `20` |
| `RATE_LIMIT_WINDOW_SECONDS` | Global rate limit window | `60` |

### Generating Secrets

Both secrets are required in production. **`AUTH_SECRET` must be identical** across web, chat-api, and worker services -- if they differ, user sessions and API key decryption will silently fail.

```bash
# AUTH_SECRET — random 32+ character string for signing sessions
# Must be the SAME value for web, chat-api, and worker
openssl rand -base64 32
# Example: K7xB3mQ9v2nR8wL5pY1hT6jA4cF0eD3g...

# ENCRYPTION_KEY — exactly 64 hex characters (32 bytes) for AES-256-GCM
# Used to encrypt user-provided API keys stored in the database
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Example: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

Copy the output and paste it into your `.env` file (local) or environment variables (Railway/cloud). Do not wrap in quotes -- paste the raw value.

### Local `.env` Files

The web app requires its own `.env.local` since Next.js doesn't load the root `.env` automatically:

| File | Used by | Notes |
|------|---------|-------|
| `.env` | chat-api, worker | Root env, loaded by all non-Next.js services |
| `apps/web/.env.local` | web (Next.js) | Must duplicate `DATABASE_URL`, `AUTH_SECRET`, and any keys the web app needs |

---

## Architecture

Anima AI is a **monorepo** powered by Turborepo and pnpm workspaces.

```
anima-ai/
├── apps/
│   ├── web/                # Next.js 15 (App Router) -- admin dashboard + public chat
│   ├── chat-api/           # Hono -- SSE streaming chat API with rate limiting
│   ├── worker/             # BullMQ -- document parsing + page index pipeline
│   └── docling-service/    # (Optional) Python FastAPI -- enhanced PDF structure extraction
├── packages/
│   ├── ui/                 # Shared UI components (shadcn/ui + Tailwind + Radix)
│   ├── database/           # Drizzle ORM schema + PostgreSQL client + migrations
│   ├── shared/             # Types, constants, utilities, logger
│   ├── ai/                 # PageIndex RAG system, tree builder, guardrails, LLM providers
│   ├── storage/            # File storage abstraction (local FS / S3-compatible)
│   └── cache/              # Cache abstraction (in-memory / Valkey)
├── e2e/                    # Playwright E2E tests
└── docker/                 # Docker Compose for local dev + production deployment
```

### Tech Stack

| Layer | Technology | License |
|-------|-----------|---------|
| Frontend | [Next.js 15](https://nextjs.org/), [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) | MIT |
| UI Components | [shadcn/ui](https://ui.shadcn.com/), [Radix Primitives](https://www.radix-ui.com/), CVA | MIT |
| Chat API | [Hono](https://hono.dev/), Server-Sent Events | MIT |
| Auth | [NextAuth.js v5](https://authjs.dev/) (credentials provider) | ISC |
| Database | [PostgreSQL 16](https://www.postgresql.org/), [Drizzle ORM](https://orm.drizzle.team/) | PostgreSQL / MIT |
| Retrieval | PageIndex -- LLM-driven hierarchical page index (no embeddings) | -- |
| Queue | [BullMQ](https://bullmq.io/) (Redis-backed, in-memory fallback) | MIT |
| Cache | In-memory / [Valkey](https://valkey.io/) (Redis-compatible) | MIT / BSD-3 |
| Storage | Local FS / S3-compatible ([Cloudflare R2](https://developers.cloudflare.com/r2/), AWS S3) | MIT |
| LLM | [Vercel AI SDK](https://ai-sdk.dev/) -- [Anthropic](https://www.anthropic.com/) (default), [OpenAI](https://openai.com/) | Apache-2.0 |
| PDF Parsing | [pdf-parse](https://www.npmjs.com/package/pdf-parse) (JS) + optional [Docling](https://github.com/DS4SD/docling) (Python sidecar) | MIT |
| QR Codes | [qr-code-styling](https://github.com/nickolay-volkov/qr-code-styling) | MIT |
| Testing | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | MIT |

### Data Flow

```
User uploads document (PDF, TXT, MD, HTML, DOCX)
     │
     ▼
┌──────────┐     ┌───────────────┐     ┌──────────┐
│  Web App │────▶│ Object Storage│────▶│  Worker  │
│ (Next.js)│     │ (Local / S3)  │     │ (BullMQ) │
└──────────┘     └───────────────┘     └────┬─────┘
                                            │
                                    ┌───────▼───────┐
                                    │  PDF Parsing   │
                                    │(+Docling opt.) │
                                    └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │   PageIndex    │
                                    │  (LLM-powered  │
                                    │  tree builder)  │
                                    └───────┬───────┘
                                            │
                                    ┌───────▼───────┐
                                    │   PostgreSQL   │
                                    │ (JSONB trees)  │
                                    └───────────────┘

User scans QR / opens chat URL
     │
     ▼
┌──────────┐     ┌──────────┐     ┌────────────────┐
│  Browser │────▶│ Chat API │────▶│   PageIndex     │
│          │◀────│  (Hono)  │◀────│  RAG Pipeline   │
└──────────┘ SSE └──────────┘     └────────────────┘
```

### Web App Routes

| Route | Auth | Description |
|-------|------|------------|
| `/login` | Public | Sign in |
| `/register` | Public | Create account (first user or via invite) |
| `/projects` | Admin | Project list with search |
| `/projects/[id]` | Admin | Project dashboard |
| `/projects/[id]/documents` | Admin | Document management |
| `/projects/[id]/personality` | Admin | Chatbot personality editor |
| `/projects/[id]/theme` | Admin | Visual theme editor |
| `/projects/[id]/feedback` | Admin | Feedback survey configuration |
| `/projects/[id]/qr` | Admin | QR code generator + embed codes |
| `/projects/[id]/team` | Admin | Team members + invitations (owner only) |
| `/projects/[id]/analytics` | Admin | Usage analytics |
| `/projects/[id]/conversations` | Admin | Conversation history + export |
| `/projects/[id]/settings` | Admin | Project settings (name, slug, mode, rate limit) |
| `/c/[projectSlug]` | Public | Chat interface (no auth required) |
| `/embed/[projectSlug]` | Public | Embeddable iframe chat widget |
| `/invite/[token]` | Public | Invitation acceptance page |

### Team & Permissions

Projects support multi-user collaboration through an invitation system. The project creator is the **owner**; additional users are invited as **editors** or **viewers**.

| Action | Viewer | Editor | Owner |
|--------|--------|--------|-------|
| View dashboard, analytics, conversations | Yes | Yes | Yes |
| Upload/delete documents | -- | Yes | Yes |
| Edit personality, theme, QR | -- | Yes | Yes |
| Clone project | -- | Yes | Yes |
| Update project name/slug/mode/settings | -- | -- | Yes |
| Invite/remove team members | -- | -- | Yes |
| Delete project | -- | -- | Yes |

Invitations are link-based. The owner creates an invite for an email + role, gets a shareable link. If the invitee doesn't have an account, the link takes them to a registration page locked to the invited email. Membership is created automatically on registration.

### Chat SSE Protocol

The chat API streams events over SSE:

```
start → text (×N) → citations → followups → done
```

Each event carries a JSON payload. The client connects with an `X-Session-Token` header for anonymous session management.

---

## Deployment

### Option 1: Railway (Recommended)

One-click deploy with the [Railway button](#deploy-to-railway) at the top of this README. Everything is provisioned automatically.

### Option 2: Docker Compose (Self-Hosted)

The easiest way to self-host everything on a single server:

```bash
cd docker

# Copy and configure environment
cp .env.docker.example .env
# Edit .env -- set ANTHROPIC_API_KEY, AUTH_SECRET, ENCRYPTION_KEY

# Start all services
docker compose up -d
```

This brings up:

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL 16 | 5432 | Primary database |
| Valkey 8 | 6379 | Cache + job queue backend |
| Web app (Next.js) | 3000 | Admin dashboard + public chat |
| Chat API (Hono) | 3001 | SSE streaming API |
| Worker (BullMQ) | -- | Document processing pipeline |
| Docling (FastAPI) | 8000 | Enhanced PDF parsing (optional) |

### Option 3: Cloud Services (Mix & Match)

Deploy each component to managed services:

| Component | Options |
|-----------|---------|
| **Database** | Any managed PostgreSQL ([Neon](https://neon.tech/), [Supabase](https://supabase.com/), [AWS RDS](https://aws.amazon.com/rds/), [Cloud SQL](https://cloud.google.com/sql)) |
| **Cache + Queues** | Any managed Redis-compatible service ([Upstash](https://upstash.com/), [ElastiCache](https://aws.amazon.com/elasticache/), [Aiven](https://aiven.io/)) |
| **Web App** | [Vercel](https://vercel.com/), [Railway](https://railway.com/), [Render](https://render.com/), [Fly.io](https://fly.io/), or any Node.js host |
| **Chat API** | [Railway](https://railway.com/), [Render](https://render.com/), [Fly.io](https://fly.io/), or any container host |
| **Worker** | [Railway](https://railway.com/), [Render](https://render.com/), [Fly.io](https://fly.io/), or any long-running container host |
| **Storage** | [Cloudflare R2](https://developers.cloudflare.com/r2/), [AWS S3](https://aws.amazon.com/s3/), or any S3-compatible service |

#### Vercel (Web App Only)

The Next.js web app can be deployed to [Vercel](https://vercel.com/). You'll need:
- An external PostgreSQL database (set `DATABASE_URL`)
- An external Redis/Valkey instance (set `REDIS_URL`) or leave empty for in-memory
- The chat API deployed separately (set `NEXT_PUBLIC_CHAT_API_URL`)

#### Minimum Production Setup

At minimum, you need:
1. **PostgreSQL** -- any managed instance
2. **One server** running the web app, chat API, and worker (can be a single $5/mo VPS with Docker Compose)
3. **An LLM API key** ([Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/api-keys))

Valkey and S3 storage are optional but recommended for production. Without Valkey, rate limiting uses in-memory counters (lost on restart) and document processing runs synchronously.

### Production Checklist

- [ ] Generate `AUTH_SECRET` -- run `openssl rand -base64 32` and use the **same value** for web, chat-api, and worker
- [ ] Generate `ENCRYPTION_KEY` -- run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (must be exactly 64 hex characters)
- [ ] Set `CORS_ORIGIN` to your actual domain (not `*`)
- [ ] Set `REDIS_URL` for persistent rate limiting and background job processing
- [ ] Set `STORAGE_ENDPOINT` for S3-compatible storage (local FS doesn't scale across replicas)
- [ ] Ensure `DATABASE_URL` points to a production PostgreSQL instance with backups
- [ ] Database migrations run automatically on deploy via Next.js instrumentation

---

## Development

### Project Scripts

```bash
pnpm dev              # Start all services in dev mode
pnpm build            # Build all packages and apps (Turbo-cached)
pnpm test             # Run all unit and integration tests
pnpm typecheck        # Type-check all packages
pnpm lint             # Lint all packages
pnpm format           # Prettier format all files
pnpm clean            # Remove dist/ and .next/ directories

# Database
pnpm db:generate      # Generate migrations from schema changes
pnpm db:migrate       # Apply pending migrations
pnpm db:seed          # Seed development data

# Filter to a single package
pnpm --filter @anima-ai/ai test
pnpm --filter @anima-ai/web build
pnpm --filter @anima-ai/database test
```

### Running Tests

```bash
# Unit & integration tests (all packages + apps)
pnpm test

# Single package
pnpm --filter @anima-ai/database test
pnpm --filter @anima-ai/chat-api test

# E2E tests (requires Playwright browsers)
cd e2e
npx playwright install
pnpm e2e
```

Tests require Docker services running (PostgreSQL + Valkey) since database and chat-api tests hit real instances.

### Test Coverage

- **273+ unit/integration tests** across 22 test files in 8 packages
- **11 E2E test suites** with Playwright (Chromium, mobile Chrome, mobile Safari)
- Tests cover: database CRUD, team queries, storage adapters, cache operations, RAG pipeline, guardrails, chat API, rate limiting (global + per-project), mode enforcement, security headers, session management, server actions (projects, documents, team)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes with tests
4. Run `pnpm test` and `pnpm typecheck` to verify
5. Submit a pull request

See the [open issues](https://github.com/anima-ai/anima-ai/issues) for ideas.

---

## License

[GPL-3.0](LICENSE) -- free to use, modify, and distribute. Contributions must use the same license.
