# AGENTS.md

Instructions for AI coding agents (Codex, Claude Code, Cursor) working in this repo.
Read this file fully. Then read `docs/HANDOFF.md` (current state, routes, known issues, open work) and the ★ section of `docs/CONTEXT.md` before any change to architecture, data model, AI prompts or user flows.

## Project

Junction 2026 — City of Espoo challenge "Rethinking Recruitment". Final submission: Sunday 15 Nov 2026, 10:00.

We build an add-on for Espoo's recruitment events (which run on the Tavata platform). It improves **selection at registration**:

1. **Company** describes its need in ~5 minutes → AI turns it into a structured **card** (task, must-have vs trainable skills, language actually needed, what a strong answer looks like, one question for candidates).
2. **Candidate** picks up to 3 cards and answers each card's question in their own words, any language → AI translates, anonymises, extracts skills with evidence.
3. **Event organisers** (City of Espoo; the people who run the event, not HR) select in one table with explicit rules, batch approval and a decision log → CSV/codes for Tavata.

## Non-negotiable product rules

These come from the sponsor's requirements and the EU AI Act. Never break them, even if a task seems to ask for it — stop and flag instead.

- **AI never scores, ranks, accepts or rejects a person.** No score/rank fields on candidates, in the UI or in the database. Humans decide; AI asks, structures, translates and explains.
- **Candidate data goes only to Gemma** (self-hosted on Verda, EU). Never send candidate text to Gemini, Context.dev or any other external API.
- **Gemini gets company data only** (card drafting, glossary for organisers).
- **Keep the candidate's original answer** next to the processed version, and record what AI changed.
- **Identity is stored separately from answers.** Reviewer screens show anonymised answers.
- **Every selection decision is logged**: reviewer, timestamp, rule, decision.
- **Meeting feedback is aggregated per card/rule**, never stored or shown as a judgement of a person.
- **Synthetic data only.** Label seed data as synthetic. Never add real personal data.
- **Context.dev:** company websites only. Never use People Search.

## Stack

- Next.js (TypeScript, App Router, Tailwind). All external calls happen in server code (route handlers / server actions).
- Aiven PostgreSQL + pgvector (`DATABASE_URL`, `sslmode=require`).
- Gemini API (`GEMINI_API_KEY`) — company side.
- Gemma via Ollama on Verda, OpenAI-compatible API (`GEMMA_BASE_URL`, `GEMMA_MODEL`, `GEMMA_API_KEY`). In development it's reached through an SSH tunnel at `http://localhost:11434/v1`.
- Context.dev (`CONTEXT_DEV_API_KEY`) — company website → profile.
- ESCO web-service API (no key) — normalise skill names; keep the original skill when there's no good match.

## Commands

The Next.js app lives at the repo root (`app/`, `lib/`). The Python prototype in `src/` uses uv and `.venv` — install Python packages with `uv pip install`, never global pip.

- Install: `npm install`
- Dev server: `npm run dev` (Gemma needs the SSH tunnel to Verda)
- Service status: `GET /api/health`
- Database: `npm run db:migrate` applies `db/migrations/*.sql`; `npm run db:seed` wipes app data and loads the seed (real event, synthetic companies and people). Read-only status check: `npx tsx --conditions=react-server --env-file=.env scripts/_check-seed.ts [company-id]`.
- AI quality checks (synthetic inputs only): `npm run eval:company [case-id]` (Gemini + Context.dev; run after every change to `lib/prompts/company-card.ts`) and `npm run eval:cv` (Gemma; run after every change to `lib/prompts/cv-parse.ts`).
- Before every commit: `npm run lint && npm run build && npx tsc --noEmit` (build first: it generates the route types tsc needs)

## Coding rules

- TypeScript strict. No `any` unless unavoidable, with a comment.
- Validate every AI response against a schema (e.g. zod) before using or storing it. Handle invalid output with a retry or a clear error, never by guessing.
- Wrap each external service in one module under `lib/` (e.g. `lib/gemini.ts`, `lib/gemma.ts`, `lib/contextdev.ts`, `lib/esco.ts`, `lib/db.ts`) so it can be swapped or stubbed.
- Every AI call has a stub/fallback so the UI works when a service is down.
- Keep prompts in `lib/prompts/` as named constants, not inline strings.
- Don't add dependencies without a reason stated in the commit message.
- Small, focused changes. One task per session.

## Secrets

- Keys live only in `.env` (git-ignored) and in the host's environment settings.
- Never import keys in client components and never use the `NEXT_PUBLIC_` prefix for them.
- Never print, log or paste keys. This repo is **public** and Entire uploads agent session transcripts.

## Decisions

`docs/CONTEXT.md` marks items as [FACT], [MENTORS], [PROPOSED] or [OPEN].

- Don't treat [PROPOSED] or [OPEN] items as settled. If a task depends on an [OPEN] decision (section 9 of `docs/CONTEXT.md`), ask before building.
- If you change the architecture, data model or a decision, update `docs/CONTEXT.md` in the same commit.

## Git

- One branch per person/feature; merge to `main` only when lint, typecheck and build pass.
- Commit messages: imperative and specific, e.g. `Add card draft route with Gemini JSON schema`.
- Never commit `.env`, real data or generated secrets.

<!-- entire-agent:begin -->
Read .entire/agent-guide.md for this repository's workflow, source inspection, and verification guidance.
@.entire/agent-guide.md
<!-- entire-agent:end -->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
