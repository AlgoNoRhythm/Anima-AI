<p align="center">
  <img src="assets/anima-ai.png" alt="Anima AI" width="220" />
</p>

<h1 align="center">Anima AI</h1>

<p align="center">
  <strong>Bring real-world objects to life with AI-powered conversations.</strong><br/>
  Upload documents. Create chatbots. Share with a QR code.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#use-cases">Use Cases</a> &middot;
  <a href="#deployment">Deployment</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="assets/hero.gif" alt="Anima AI Demo" />
</p>

---

## What is Anima AI?

Anima AI is an open-source platform that lets you turn documents into interactive, AI-powered chatbots. Upload a PDF, TXT, Markdown, HTML, or DOCX file, customize the chatbot's personality and appearance, generate a QR code, and stick it on the real thing. Anyone who scans it can have a conversation with the document's content -- no app download required.

Think of it as giving a voice to objects that can't speak for themselves.

### Key Features

- **Document Upload & Processing** -- Drag-and-drop upload (PDF, TXT, MD, HTML, DOCX). PDFs are parsed into per-page text via `pdf-parse` (with optional Docling service for higher-fidelity structure extraction).
- **RAG-Powered Chat (PageIndex)** -- Retrieval-Augmented Generation using **PageIndex**, a custom RAG system that replaces traditional vector embeddings with an LLM-driven hierarchical page index. At indexing time, an LLM builds a tree of document sections with titles, summaries, and page ranges. At query time, the LLM searches the tree structure to find the most relevant nodes -- with automatic citation of source pages. No embedding model or vector database required.
- **Streaming Responses with Markdown** -- Real-time SSE streaming with full markdown rendering (bold, lists, code blocks, tables) in chat bubbles.
- **Customizable Personality** -- Define system prompts, tone (professional, friendly, casual, formal, technical), temperature, guardrails, blocked topics, and suggested questions.
- **Theme Editor** -- Brand your chatbot with custom colors, fonts, logos, border radius, welcome messages, and action button labels. Live preview in the admin dashboard.
- **QR Code Generator** -- Create styled QR codes (square, dots, rounded) with custom colors, title, and subtitle. Download as SVG or PNG.
- **Analytics Dashboard** -- Track sessions, messages, and user feedback. Export conversations as CSV.
- **Embeddable Widget** -- Embed your chatbot in any website via an iframe. Fully themed.
- **Team Collaboration** -- Invite team members as editors or viewers via link. Role-based access control (owner/editor/viewer) with per-action permissions.
- **Project Modes** -- Configure projects as chat-only, PDF-only, or both. Mode is enforced in both the UI and API.
- **Per-Project Rate Limiting** -- Set custom rate limits per project via the admin settings. Independent counters per project and user.
- **Mobile-Optimized Chat** -- Fixed-position app-like layout with iOS keyboard handling, safe-area support, and touch-optimized controls.
- **Multi-Provider LLM Support** -- Works with Anthropic (default) and OpenAI via Vercel AI SDK. Bring your own API keys per provider.

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

- **Node.js** 18+ and **pnpm** 9+
- **Docker** (for PostgreSQL and Valkey)
- An **Anthropic** or **OpenAI** API key (for LLM-powered indexing and chat)

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

```bash
# AUTH_SECRET (random 32+ char string)
openssl rand -base64 32

# ENCRYPTION_KEY (64-char hex = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
| Frontend | Next.js 15, React 19, Tailwind CSS | MIT |
| UI Components | shadcn/ui, Radix Primitives, CVA | MIT |
| Chat API | Hono, Server-Sent Events | MIT |
| Auth | NextAuth.js v5 (credentials provider) | ISC |
| Database | PostgreSQL 16, Drizzle ORM | PostgreSQL / MIT |
| Retrieval | PageIndex -- LLM-driven hierarchical page index (no embeddings) | -- |
| Queue | BullMQ (Redis-backed, in-memory fallback) | MIT |
| Cache | In-memory / Valkey (Redis-compatible) | MIT / BSD-3 |
| Storage | Local FS / S3-compatible (R2, SeaweedFS) | MIT |
| LLM | Vercel AI SDK -- Anthropic (default), OpenAI | Apache-2.0 |
| PDF Parsing | pdf-parse (JS) + optional Docling (Python sidecar) | MIT |
| QR Codes | qr-code-styling | MIT |
| Testing | Vitest + Playwright | MIT |

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

### Option 1: Docker Compose (Full Stack)

The easiest way to deploy everything together:

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

### Option 2: Cloud Services

Deploy each component to managed services:

| Component | Options |
|-----------|---------|
| **Database** | Any managed PostgreSQL (Neon, Supabase, RDS, Cloud SQL) |
| **Cache + Queues** | Any managed Redis-compatible service (Upstash, ElastiCache, Aiven) |
| **Web App** | Vercel, Railway, Render, Fly.io, or any Node.js host |
| **Chat API** | Railway, Render, Fly.io, or any container host |
| **Worker** | Railway, Render, Fly.io, or any long-running container host |
| **Storage** | Cloudflare R2, AWS S3, or any S3-compatible service |

#### Vercel Deployment (Web App Only)

The Next.js web app can be deployed to Vercel. You'll need:
- An external PostgreSQL database (set `DATABASE_URL`)
- An external Redis/Valkey instance (set `REDIS_URL`) or leave empty for in-memory
- The chat API deployed separately (set `CHAT_API_URL`)

#### Minimum Production Setup

At minimum, you need:
1. **PostgreSQL** -- any managed instance
2. **One server** running the web app, chat API, and worker (can be a single $5/mo VPS with Docker Compose)
3. **An LLM API key** (Anthropic or OpenAI)

Valkey and S3 storage are optional but recommended for production. Without Valkey, rate limiting uses in-memory counters (lost on restart) and document processing runs synchronously.

### Production Checklist

- [ ] Set a strong `AUTH_SECRET` (min 32 chars, randomly generated)
- [ ] Set `ENCRYPTION_KEY` (64-char hex) for API key encryption at rest
- [ ] Set `CORS_ORIGIN` to your actual domain (not `*`)
- [ ] Set `REDIS_URL` for persistent rate limiting and background job processing
- [ ] Set `STORAGE_ENDPOINT` for S3-compatible storage (local FS doesn't scale across replicas)
- [ ] Ensure `DATABASE_URL` points to a production PostgreSQL instance with backups
- [ ] Run `pnpm db:migrate` against your production database before first deploy

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

---

## License

GPL-3.0 — see [LICENSE](LICENSE) for details.
