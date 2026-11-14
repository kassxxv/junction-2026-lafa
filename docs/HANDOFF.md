# Handoff — bridgy, formerly MatchReady (state on 2026-11-14 evening)

Read this, then `AGENTS.md` and the **★ Current concept** section at the top of `docs/CONTEXT.md`. Together they replace the chat history. Submission: **Sunday 15 Nov 2026, 10:00**.

## 1. What exists

A working end-to-end prototype on real services (Next.js 16 on Vercel, Aiven Postgres, Gemini, Gemma on Verda via an authenticated Caddy proxy, Context.dev). The event is real (Deep Tech Talent Forum, 26–27 Nov 2026); every company and person is synthetic.

| Route | Who | What it does |
|---|---|---|
| `/` | everyone | Static landing page of the real event, three ways in |
| `/company?company=<id>` | company | Any input → Context.dev (links) + Gemini → card with typed requirements + must-have → ≤3 questions → editor with live pool count → confirm (DB) → pool stats. Default demo company: `kuura-photonics` (draft, no applications) |
| `/demo/kuura-photonics/careers` | Context.dev | Synthetic careers page so the demo reads a real URL (only works on the public deploy) |
| `/candidate` | professional | Stage 1 talent pool (fields, work type, career stage, languages, email, optional CV, 2 consents) |
| `/candidate/[id]` | professional | Status timeline; shows the **Tavata code** after approval |
| `/candidate/[id]/choose` | professional | Invitation: confirmed companies in own fields, max 3, availability |
| `/candidate/[id]/apply?companies=a,b` | professional | Stage 2: CV + LinkedIn PDF → Gemma → code fills the requirement table + CV↔LinkedIn checks, proofs, conversation starter → application |
| `/login` | organiser | Shared-password sign-in (`ORGANISER_PASSWORD`); everything under `/organiser` and `/api/organiser` requires it |
| `/organiser` | organiser | Event overview: timeline, numbers, companies, both metrics, pool by field |
| `/organiser/review/[companyId]` | organiser | Blind review: filters, batch approve clean cases, detail with evidence + CV↔LinkedIn facts, approve-with-note, decline (Program Pass), undo, decision log, bias check, CSV export, reset demo |
| `/organiser/feedback` | organiser | Both-yes rate overall and per company |
| `/meeting/[applicationId]?side=company\|candidate` | both | One yes/no question after a meeting |
| `GET /api/organiser/export?company=` | organiser | CSV for Tavata (access code, email, blind code, company, role) — the only place identity is joined |
| `GET /api/health` | ops | Per-service status, no secrets |

## 2. Architecture

```
app/                 routes (server components fetch; "use client" files hold UI state)
components/          app-shell (organiser sidebar), organiser-nav, public-shell (+ Timeline), ui/ (shadcn)
lib/
  env.ts service.ts  env parsing (all optional), error codes, Sourced<T> = live | stub
  brand.ts           product name + logo paths (public/brand/*, favicon app/icon.png, source docs/brand/)
  auth.ts organiser-session.ts   organiser gate (shared password, signed cookie), demoMode()
  rate-limit.ts      allow(bucket): per hashed IP + daily cap, counters in Postgres
  db.ts              pg pool (TLS via DATABASE_CA_CERT path or PEM), query(), withTransaction()
  gemini.ts gemma.ts contextdev.ts esco.ts   one wrapper per service, each with a stub fallback
  ai.ts              JSON-schema + parse + retry helpers for model output
  prompts/           company-card.ts (Gemini), cv-parse.ts (Gemma)
  matchready/
    event.ts config.ts demo.ts   single sources: event facts + date formatting, thresholds/limits, demo values
    facts.ts         PURE: CV/LinkedIn facts, compareCvLinkedin(), evidenceFor(), requirementText()
    card-schema.ts card-service.ts card-actions.ts         company card
    candidate-service.ts candidate-actions.ts cv-schema.ts  candidate side
    organiser.ts organiser-actions.ts                        review read model + decisions
    feedback.ts feedback-actions.ts                          metric 2
    tavata.ts                                                access codes
    auth-actions.ts                                          sign in / sign out
db/migrations/*.sql  schema (npm run db:migrate)       db/seed/data.ts  seed (npm run db:seed)
scripts/             db-migrate, db-seed, eval-company-card, eval-cv-parse, _check-seed, _db-activity (closes this app user's stuck "idle in transaction" sessions, e.g. after a seed lost its connection)
proxy.ts             first-line organiser gate (Next 16 proxy); the real check is in each action/route/page
infra/verda/         Caddy proxy setup for Gemma
public/demo/         synthetic CV + LinkedIn-export PDFs (Aisha)
```

**Rules baked into the code** (keep them): AI never scores/ranks people; **code compares facts**, models only extract; candidate text only to Gemma (`lib/gemma.ts`); Gemini only company data; organiser queries never join `candidate_identity`; every decision is a row in `decisions`; server re-checks every rule (clean-only batch, note required, places limit).

**Commands:** `npm run dev` · `npm run lint && npm run build && npx tsc --noEmit` (build first: it generates route types) · `npm run db:migrate` · `npm run db:seed` (wipes and reloads synthetic data) · `npm run eval:company` · `npm run eval:cv` (11/11 on the demo PDFs).

**Changing models:** Gemini = `GEMINI_MODEL` (now `gemini-3.1-flash-lite`) in `.env` and Vercel env, then redeploy. Gemma = `GEMMA_MODEL` (`gemma3:12b`); a new model must first be pulled in Ollama on the Verda server. No code change needed for either.

**Next.js 16 gotchas (Cache Components on):** no `runtime`/`dynamic` exports; data pages call `await connection()` and sit inside `<Suspense>` (or `loading.tsx`); `usePathname`/`useSearchParams` need a Suspense boundary; Server Actions + `refresh()` from `next/cache` to update the screen. Read `node_modules/next/dist/docs/` before changing routing/caching.

## 3. Demo path (pitch)

1. `/` → **Companies** → "Fill demo text" → Create card (on the deploy it reads `/demo/kuura-photonics/careers`) → PhD question → card with must-haves and live pool count → Confirm → "N people meet your must-haves". "Start over (demo)" resets.
2. `/candidate` → "Fill demo answers" → Join → "Demo: jump" → choose Nordic Photonics (+ one more) → available → Use sample CV → Use sample export → Fill demo answers → Send.
3. `/organiser/review/nordic-photonics` (sign in with `ORGANISER_PASSWORD` if set) → "Select clean cases" → Approve (7/8) → open A-07 (or the new candidate) → note → Approve with note (8/8) → decision log, bias check, Export CSV. "Reset demo" resets.
4. Back at the candidate status page: Tavata code shown.
5. `/organiser/feedback` → "Answer as the candidate/company" → both-yes rate updates.

Re-seed before the pitch: `npm run db:seed`. On the deploy set `ORGANISER_PASSWORD` and, for the reset buttons, `DEMO_MODE=1`. Run `npm run db:migrate` once (migration 004 adds the rate-limit table). If a seed fails with ECONNRESET, run `npx tsx --conditions=react-server --env-file=.env scripts/_db-activity.ts`, then seed again.

## 4. Hardcoded — what to move out (DONE 2026-11-14: `lib/matchready/event.ts`, `config.ts`, `demo.ts`; kept for reference)

| Where | What | Suggested fix |
|---|---|---|
| `app/page.tsx`, `components/public-shell.tsx`, `components/app-shell.tsx`, `app/company/page.tsx`, `app/candidate/[id]/choose/page.tsx`, `app/organiser/feedback/page.tsx` | Event name, "26–27 November", deadlines "18/20/21 Nov", fields list, espoo.fi URL | One `getEvent()`-based source (DB `events` row) or `lib/matchready/event.ts` constants + date formatting helpers; landing can stay static by importing the same constants |
| `lib/matchready/facts.ts` | `REFERENCE_DATE = "2026-11"` (used as "today" for open-ended jobs) | Use the event start date or the current month; keep fixed only in seed/evals |
| `lib/matchready/organiser.ts`, `components/app-shell.tsx` | Organiser "Laura (organiser, demo)" | Single demo-user constant; real auth later |
| `lib/matchready/tavata.ts` | Salt `dttf-2026` | Derive from event id |
| `app/company/page.tsx`, `company-flow.tsx` | Default company `kuura-photonics`, demo text URL | `DEMO_COMPANY_ID` constant; keep demo helpers clearly labelled |
| `lib/matchready/feedback.ts` | Demo meeting prefers `quantumlab` | Pick any approved meeting without both answers |
| `app/candidate/[id]/apply/apply-form.tsx`, `join-form.tsx` | Demo starter text, demo answers (Aisha) | Move all demo fill-ins to one `lib/matchready/demo.ts` |
| Various | Thresholds: dates differ > 3 months, bias gap 15 pp / min 3 approvals, review session gap 30 min, max 3 companies, max 3 questions | Named constants in one config module |

## 5. Known issues and risks (fix in priority order)

**Status 2026-11-14 evening:** done — password gate, demo-only resets, rate limits, CSV formula escaping, legacy cleanup, findUrl, CV ↔ LinkedIn (all five points), evidence breakdown + no double counting, unverified must-haves no longer "clean", typed values kept on card re-confirm, place limit under a lock, stub parses never stored. Still open — see the end of this section.

**Security / privacy (before sharing the public URL widely)**
- **No auth anywhere** (by design for the demo). Organiser pages, Server Actions (approve/decline/reset) and `GET /api/organiser/export` (returns emails of approved people — synthetic, but still) are open to anyone with the URL. Minimum: a shared-password gate for `/organiser/*` and `/api/organiser/*` (env `ORGANISER_PASSWORD`, checked in Next 16 `proxy.ts`/middleware or per route/action). Reset actions should be demo-only.
- No rate limiting on AI calls (`draftCompanyCard`, `uploadDocument`) → cost abuse. Add a simple per-IP limit or a demo cap.
- Uploaded file handling: 4 MB limit, PDF via `unpdf@1.9.1` (pinned on purpose: newer versions were published the same day). Keep text-only processing; never execute or store files.

**Correctness**
- **CV ↔ LinkedIn comparison** (`facts.ts compareCvLinkedin`) shows MATCH / DIFFERS / NOT FOUND / NO LINKEDIN for experience, education and CV skills, but: jobs that are **only on LinkedIn** (not in the CV) are not shown; date differences ≤ 3 months count as a match silently; skill "not found" is noisy (e.g. "optical spectrum analysers"); education field matching is a plain string compare; the candidate sees only the count of differences, not the list. Improve all five.
- **Evidence matching** is keyword-based (`mentions()`): Gemma's `areas` tags decide. It can over-count (the demo CV gives "optical testing 5 y 2 m" by counting the research job). Options: stricter tagging prompt, show which jobs were counted, or pgvector similarity on job text (would also be a meaningful Aiven use).
- `findUrl()` treats things like `node.js` as a URL.
- `saveConfirmedCard()` deletes and recreates requirements; proofs are re-attached by requirement type (heuristic).
- Model nondeterminism: the PhD question is enforced in code (`toDraft`); check other must-ask cases.
- Review-time metric is approximate (session = page open → last action, 30-min gap).

**Cleanup**
- Remove legacy first-concept code: `lib/card/*`, `lib/prompts/card-draft.ts`, `app/api/cards/draft`, `app/cards/*` (redirect only now), `scripts/eval-card-draft.ts`, `evals/card-draft`. Check nothing imports them first (`app/company` used to).
- `scripts/_db-activity.ts` terminates stuck transactions of the app user; keep as a documented dev tool or remove.
- `ESCO` wrapper exists but is unused (skill names are not normalised).

**Added late 2026-11-14:** optional company task (card editor "Task (optional)", "Suggest tasks" via Gemini with rate limit taskSuggest; candidate answers in the application; organisers see it in review) and the company page (a confirmed company lands on its saved card). Run npm run db:migrate on any database without migration 005.

**Added night of 2026-11-14:** company sign-in by invitation code (/company; demo codes KUURA-2026, NORDIC-2026, QUANTUMLAB-2026), company page with selection status and meetings, meeting answers on the candidate status page, reminder e-mails from /organiser/feedback (lib/email.ts, Resend or preview). Migration 007; seed now never approves more people than a company has places.

**Source check:** review shows the de-identified CV text (lib/matchready/redact.ts, written at upload) with the lines behind each requirement (lib/matchready/sources.ts) and the facts not found in the text. Seed candidate A-07 has one simulated model error (aiExtraSkills) so the check is visible in the demo. Migration 008.

**Still open after the 2026-11-14 pass**
- Several vacancies per company (one card per vacancy) is shown as "next step" only.
- Gemma still tags the demo CV's research job "optical testing" (its lines say "optical measurements"), so it is counted. The value now shows the split ("Valo Optics 3 y 5 m + University photonics lab 1 y 9 m") so the organiser sees it; a stricter fix (area tags must be backed by the job's own lines) would change seed results and needs a decision.
- Meeting feedback links (`/meeting/[id]?side=`) are unauthenticated: anyone with an application id can answer for either side. Per-side tokens are needed before real use.
- One shared organiser password, not accounts: decisions are still logged as the demo organiser.
- `proofRef` is free text and shown as text only (never as a link); keep it that way or validate URLs first.

## 6. Tool-by-tool review

| Tool | How we use it now | Improve |
|---|---|---|
| Gemini (`gemini-3.1-flash-lite`) | Company input → card JSON + questions; quotes verified by code | Try `gemini-3.5-flash` for quality; multimodal: read a PDF job ad directly; answer the 4 required track questions in the submission |
| Gemma (`gemma3:12b`, Verda) | CV + LinkedIn PDF text → facts; 11/11 eval | Stricter `areas` tagging; small eval on more synthetic CVs (Finnish, career changer); write "why an open model" for the track |
| Verda | A100, Ollama, Caddy proxy with token, keep-alive 2h | **Post the required summary in Verda's Discord**; delete the server after the submission |
| Aiven | Postgres 18 + pgvector installed (unused), schema with separated identity, decision log, consents with expiry | Use pgvector meaningfully (evidence search) or say honestly why not; consent-expiry cleanup job |
| Context.dev | `web.scrape` markdown of a linked page | Map/search endpoints to find the careers page from just a domain; verify on the deploy |
| ESCO | Not used | Normalise skill names in requirements and CV facts (keep originals) |
| Entire | Sessions recorded | Screenshots / recap for the track |

## 7. Design brief (full pass)

Current state: tokens in `app/globals.css` (Espoo navy `#011135` sidebar/hero, light work area `#f3f5f8`, action blue `#0a5bd3`, status colours with icons), fonts Instrument Sans (UI) + Source Serif 4 (company source text, quotes). Built screen by screen, so it drifted.

Problems to fix: inconsistent page widths and paddings; mixed native and styled selects; inputs truncate long values (candidate table, requirement rows); company card editor rows are cramped; type scale not consistent; some screens are text-heavy; empty/loading/error states differ in voice; status chips differ in shape between screens.

Direction: calm public-sector tool with one confident brand moment per screen (navy hero, the evidence/quote highlight, the places counter). Light theme only, desktop-first, mobile must not break. No Espoo logo (needs permission). Keep accessibility: focus rings, contrast, labels, colour never the only signal.

Use the installed skills, not random marketplace copies (supply-chain risk): **`frontend-design`** (official Anthropic, anti-generic rules), **`jmo-workflow:better-ui`** (radius, shadows, icons, states), **`jmo-workflow:animate`** (only meaningful motion), then screenshot every screen and critique.

Screens in priority: landing → company card editor → candidate apply → organiser review → organiser overview → candidate join/choose/status → feedback.

## 8. Copy audit (anti-AI, less and sharper text)

- Use the **`humanizer`** skill on all user-facing copy. Cut every sentence that does not help someone act; keep legally needed AI-transparency notes (EU AI Act Art. 50, in force since 2 Aug 2026) short.
- One vocabulary everywhere: organisers (never "HR"), talent pool, meeting pass / Tavata code, Program Pass, must-have, conversation starter, blind review.
- Sentence case, plain verbs, buttons say what happens ("Confirm card" → toast "Card confirmed"). No middle-dot chains, no "AI-powered", no "seamless".
- Check every number shown is real (computed) or labelled synthetic.

## 9. Ready-to-paste prompts

**A. Full review, de-hardcode, fix (run first)**
> Read docs/HANDOFF.md, AGENTS.md and the ★ section of docs/CONTEXT.md. Then: (1) run /code-review and /security-review on the whole repo; (2) fix §5 security items (organiser password gate, rate limits), correctness items (CV↔LinkedIn gaps, evidence over-counting, findUrl) and cleanup (remove legacy code after checking imports); (3) move everything in §4 to single sources; (4) keep all product rules in AGENTS.md. After each change run `npm run lint && npm run build && npx tsc --noEmit`, `npm run eval:cv`, `npm run eval:company`, and re-run the demo path in §3. Do not touch secrets; synthetic data only. Commit in small steps with reasons.

**B. Design pass**
> Load the frontend-design and better-ui skills. Follow docs/HANDOFF.md §7. Build one consistent type scale and layout system, fix the listed problems, then improve the look screen by screen in the given order. Screenshot each screen before and after (headless Chrome or the browser tools), critique against the anti-generic rules, and iterate. Do not change behaviour or data flow; rerun the demo path in §3 at the end.

**C. Copy pass**
> Load the humanizer skill. Follow docs/HANDOFF.md §8 on every user-facing string in app/ and components/. Shorter, concrete, one vocabulary, no AI tells; keep required AI-transparency notes. Show a before/after list for review before applying.

## 10. Submission checklist (team)

- Merge to `main`, check the Vercel deploy: `/api/health` all ok; company flow reads the demo careers page; CV upload works.
- `npm run db:seed` right before the demo.
- Verda Discord post · Entire screenshots · Gemini track questions · slides (problem with the "today" form from the teammate's prototype, solution, live demo, responsibility, two metrics).
- After the submission: delete the Verda server.
