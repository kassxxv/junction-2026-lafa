# Espoo Rethinking Recruitment — development context

Nov 14, 2026 · @Filip

Single source of context for the team and for AI coding agents (Cursor, Claude Code, Codex). Export it to Markdown and keep a copy in the repo as `docs/CONTEXT.md`.

**Status labels used throughout:**

- **\[FACT\]** — from the challenge brief, a verified source, or something already set up.
- **\[MENTORS\]** — what Espoo's mentors told the team; not independently verified.
- **\[PROPOSED\]** — our current best idea. Open to change after research or mentor feedback.
- **\[OPEN\]** — a decision not yet made. Research or ask before building on it.

Nothing marked \[PROPOSED\] or \[OPEN\] is final. When a better option appears, change it here first, then in code.

## ★ Current concept: MatchReady \[MENTORS — confirmed direction, 2026-11-14\]

This section supersedes sections 5, 7 and the data model in section 10 where they disagree.

**Name.** The product is called **bridgy** (always lowercase) (team decision 2026-11-14; earlier name MatchReady, still used for the `lib/matchready/` folder). Logo: white llama + wordmark; variants for dark and light backgrounds in `public/brand/`.

**Users.** Event **organisers** (City of Espoo event team) decide who gets a Tavata meeting pass. Never say "HR".

**Real event, synthetic people.** The event is real: *Deep Tech Talent Forum*, 26–27 Nov 2026, online, English; fields Semiconductors & Microelectronics, Photonics (optics, imaging), Quantum technologies; jointly organised by Espoo, Helsinki, Vantaa, Tampere, Turku, Oulu and partners ([espoo.fi](https://www.espoo.fi/en/DeepTechTalentForum)). All companies, candidates, CVs and LinkedIn profiles in the app are fictional and labelled synthetic.

**Two metrics** (features that don't move them are out of scope): (1) organiser minutes per filled meeting place; (2) share of meetings where both sides answer "yes, continue".

**Flows.**
1. **Company** (`/company`): any input (text, link, nothing) → card with goal, role(s) and **typed requirements** (experience: area + min years · has done · education: level + fields · language: CEFR), each with a **must-have** toggle (aim for the 3–5 that matter) → at most 2–3 click-to-answer questions → *Confirm* → anonymised pool stats ("12 people match your must-haves"). One conversation starter per company.
2. **Candidate stage 1 — talent pool** (~1 min, no selection): event fields, type of work, career stage, languages, email, optional CV, two consents (event: required; pool 12 months: optional). Status timeline.
3. **Invitation** after the company deadline: confirmed companies in the candidate's own fields; choose up to 3; "still available" checkbox.
4. **Candidate stage 2 — application**: CV required (reused), LinkedIn optional. Per company a table *requirement | MUST | where you have it (prefilled from CV) | proof (optional)*; conversation starter (not used for selection).
5. **Organiser review** (core): per company, blind IDs, places counter, filters (all / must-haves met / needs a look), batch "approve clean cases", detail with requirement ↔ evidence (source tags), CV ↔ LinkedIn facts (MATCH / DIFFERS / NOT FOUND / NO LINKEDIN), approve-with-note when something differs or a must-have is missing, decision log, aggregate bias check, export for Tavata.
6. **After the event**: one yes/no question per meeting; dashboard of both-yes rate.

**AI split.** Gemini: company input → card + questions (company data). Gemma (Verda, EU): CV and LinkedIn text → structured facts (candidate data). **Code, not AI, compares** facts (CV ↔ LinkedIn, candidate ↔ requirement), so every result is a traceable fact, never a score.

**Optional company task** [MENTORS, 2026-11-14 evening — replaces the earlier "take-home tasks out of scope"]: a company may add one short task (about 20 min) to its card, written by itself or picked from three ideas Gemini drafts from the card (company data only). The candidate applies it to a project from their own CV; the answer is kept as written, shown to organisers next to the facts, and walked through at the start of the meeting. Reliability comes from the personal anchor and the live walk-through, not from AI detection; nobody and nothing scores the answer. The candidate ticks whether an AI tool helped (allowed, shown to organisers as stated; applications.task_ai_used, migration 006): transparency instead of detection. Tables: company_cards.task, applications.task_answer (migration 005).

**Company access and page** [built 2026-11-14]: each company signs in at /company with an invitation code (only a hash is stored; demo codes like KUURA-2026 are in lib/matchready/demo.ts, real ones come from generateInviteCode). Its page shows the saved card, selection status (applications, places filled) and, after the event, its meetings with one question each: want to continue? Candidates answer the same on their status page. Each side sees its own answer and only one shared outcome, both said yes ("the organisers will connect you"); a "no" is never shown. Organisers send reminder e-mails per company from /organiser/feedback (Resend; without a key, previews; DEMO_EMAIL_TO routes demo mail to one inbox). Migration 007. One card = one vacancy for now.

**Source check in review** [built 2026-11-14]: at upload, code cuts personal details out of the CV text (name, e-mail, phone, links, address, birth date, nationality; markers like [e-mail hidden]) and stores it as candidate_documents.cv_text_blind (migration 008). Organisers see only this copy, next to the requirement table: clicking a requirement lights up the lines its evidence comes from, and facts the AI extracted that the text does not contain are listed (code checks the model's output against the document). Pattern-based, so the screen says it may miss an unusual format; the original never reaches organisers.

**Out of scope:** any ranking / match % / auto-reject, AI-text detection, replacing Tavata.

**Build status (2026-11-14):** DB schema + seed ✔ · organiser overview `/organiser` ✔ · organiser review `/organiser/review/[company]` ✔ (blind, batch approve clean cases, approve-with-note, decline → Program Pass, undo, decision log, bias check, review-time metric, CSV export for Tavata at `/api/organiser/export`) · company flow `/company` ✔ (any input → Context.dev for links → Gemini card with typed requirements + must-have → ≤3 questions, PhD-style soft degrees always asked → editor with live pool count → confirm saves to DB and recomputes evidence; demo company Kuura Photonics with a synthetic careers page at `/demo/kuura-photonics/careers`) · candidate flow ✔ (`/candidate` pool → status timeline → invitation by own fields, max 3, availability → stage 2: CV + LinkedIn PDF parsed by Gemma on Verda (unpdf for text), code fills requirement table + CV↔LinkedIn checks, proofs, conversation starter → application appears in organiser review; status page shows the Tavata code once approved; sample PDFs in `public/demo/`; `npm run eval:cv` 11/11) · landing `/` ✔ (static, real event facts, three entries) · after the event ✔ (`/meeting/[id]?side=` one yes/no per side, contact shared only on both yes; `/organiser/feedback` both-yes rate per company; seeded with 16 synthetic past meetings for QuantumLab, ChipWorks, FinnSensor incl. extra participants B-01…B-12; Nordic Photonics untouched for the selection demo). Bias check counts current university students as "university education", so it flags bias against vocational paths rather than against students filtered out by an experience must-have.

**Hardening (2026-11-14 evening) [FACT — in code]:** organiser pages, actions and the Tavata export sit behind one shared password (`ORGANISER_PASSWORD`, signed httpOnly cookie; locked in production when unset) and every organiser action re-checks it; demo resets only in demo mode; AI calls and sign-ups are rate-limited per hashed IP plus a daily cap (table `rate_limit_hits`, migration 004, no IPs stored). A must-have without a verifying fact (typed by the candidate or not found) is "to check", never "clean". CV ↔ LinkedIn also lists LinkedIn-only jobs/degrees and shows small date gaps; missing skills are one informational note. Experience evidence names each counted job with its own time and does not double-count overlapping jobs. Event facts, thresholds and demo values each have one source (`lib/matchready/event.ts`, `config.ts`, `demo.ts`). Real organiser accounts remain [OPEN].

## 0. Event logistics

- **Hackathon:** Junction 2026, Helsinki. \[FACT\]
- **Main challenge:** "Rethinking Recruitment" by the City of Espoo (41 teams). \[FACT\]
- **Final submission:** Sunday 15 November 2026, 10:00. \[FACT, from the team\]
- **Tech tracks entered:** Best Use of Gemini API, Best Use of Gemma, Verda Compute Track, Best Use of Aiven, Best Use of Context.dev, Best Use of Entire. \[FACT\]
- **Repository:** `junction-2026-lafa` on GitHub, **public** (required). \[FACT\]

## 1. The challenge brief (original text, cleaned)

Source: Junction platform, City of Espoo. Kept verbatim so agents and teammates read the sponsor's own words.

### Short description

Finding the right talent is becoming increasingly difficult, especially in fast-changing industries and international recruitment. At the same time, talented professionals often struggle to communicate what they can actually contribute, while companies struggle to articulate what they really need.

The City of Espoo works with companies and professionals by organizing recruitment and matchmaking events which are organized online and in person, sometimes also in hybrid format. Despite strong event organizing capabilities, challenges remain in facilitating the right kinds of matches between recruiting companies and jobseeking professionals participating in the events. We believe there is an opportunity to rethink how talent, skills, needs and opportunities are identified, described, communicated and matched.

Your challenge is to imagine and prototype new ways to help companies and talent find more relevant, efficient and meaningful connections in recruitment and matchmaking events organized by the City of Espoo. The solution can focus on any stage of the journey before, during or after a matchmaking event or address the entire process, registering to, attending and following-up after an event.

### The challenge (long description)

Recruitment and matchmaking events often rely on incomplete information. Companies do not always know how to describe their talent or service needs and they provide this information to the event organizer too late, only just before the event day. Professionals do not always know how to communicate their strengths and potential. Traditional documents such as CVs, applications and on-line profiles may not provide an accurate picture of either side.

At the same time, AI-generated job search materials and AI-assisted recruitment processes are becoming common, creating situations where both sides are increasingly interacting through machine-generated interpretations rather than genuine understanding.

### Initial insights and analysis (from Espoo)

Today's matchmaking and recruitment events face several recurring challenges:

- Companies are often difficult to engage and motivate to participate as they do not identify a public sector organization like the city to be a relevant source for building a pipeline: the city is the public sector employment service provider and companies assume there are no suitable candidates within the city's pool of jobseeker customers. Also, since the city's services are free of charge, the quality of the service is questioned.
- Participating companies may struggle to describe their actual talent and service needs clearly and early enough.
- Organisers receive a large number of applications but have limited ability to understand applicants' real capabilities and potential and how their profile matches with companies' talent needs. This applies especially to skills and competences needed in technology sectors.
- Companies can become overwhelmed by large volumes of largely irrelevant candidate approaches during events.
- Many professionals find it difficult to describe their competencies, transferable skills and value proposition in a way that attracts the attention of recruiters.
- CVs, applications and messages are increasingly generated with AI, while employers are increasingly analysing them with AI, creating a risk that matching decisions are based on synthetic representations rather than genuine capabilities and needs.
- Functionalities of an on-line event platform with matching algorithms are perceived as cumbersome.
- On-line event platform may crash due to people logging in simultaneously at the beginning of an event.
- In the case of recruiting international professionals either from within Finland or from abroad, recruitment introduces additional complexity related to authority compliance, language, culture, relocation and onboarding support.

We are interested in solutions that help create stronger signal and less noise throughout the process of registering and attending an event, ie. help companies and talent focus on the most relevant opportunities and conversations during an event. Solutions should consider how to avoid reinforcing bias or systematically disadvantaging people based on nationality, language, educational background, career path or other characteristics unrelated to the actual opportunity.

### Technologies and support from Espoo

- Access to subject-matter experts working with companies, talent attraction and international recruitment and event organizing.
- Example scenarios and user journeys based on real matchmaking events.
- Feedback on solution concepts from the perspective of event organisers, companies and talent.
- Guidance on responsible AI, privacy and public-sector considerations where relevant.

Teams are free to use any suitable technologies, methodologies or approaches. Solutions may support matchmaking, communication, discovery and decision-making processes, but automated profiling or automated decision-making about individuals without human involvement should not be a part of the solution.

Teams should use synthetic data. Solutions should minimise personal data processing and demonstrate how privacy would be protected in a real-world deployment in compliance with the EU AI Act.

### Judging criteria (from the platform)

| Criterion | Weight | Question |
| --- | --- | --- |
| Impact & relevance | 45% | Does the solution solve a real matchmaking or recruitment challenge and create meaningful value for companies, talent or event organisers? |
| Innovation & user experience | 35% | Does the solution challenge existing approaches and provide an engaging, intuitive and useful user experience? |
| Responsible & feasible execution | 20% | Is the solution technically credible, responsibly designed and realistic enough to be further developed for real-world use? |

### Prize

1st €1,500, 2nd €1,000, 3rd €500. The winner presents to Espoo's business development and innovation leaders and the national network of cities working on talent attraction; runners-up are featured on the city's channels.

### Resources Espoo listed

- Job portals: Duunitori, The Hub, Work in Finland (open jobs), Job Market Finland.
- Event platforms: Tavata, Brella.
- Other: ESCO (European Skills, Competences, Qualifications and Occupations), National Forum for Skills Anticipation, Suomi.fi PTV Open API, Business Espoo, Business Espoo recruitment assistance.
- Teams are not expected to use any specific technology, dataset or methodology.

## 2. Requirements, normalised

### Hard constraints \[FACT — from the brief\]

| # | Constraint | What it means for the build |
| --- | --- | --- |
| C1 | No automated profiling or automated decision-making about individuals without human involvement | AI never scores, ranks, accepts or rejects a person. A human makes every admission decision, and the UI must make that visible. |
| C2 | Synthetic data only | All candidates and companies in the demo are generated. Label them as synthetic. |
| C3 | Minimise personal data | Collect only fields needed for the decision. Separate identity from answers. Allow deletion. |
| C4 | Demonstrate privacy protection under the EU AI Act | A data-flow screen or slide: what is processed where, by whom, how long it is kept. |
| C5 | Avoid bias by nationality, language, education, career path | Anonymise before review; no hidden language penalties; a way to check for skew. |

### Scope \[FACT\]

Any stage (before, during, after an event) or the whole journey. Any technology.

### Legal context \[FACT — verified\]

- AI systems for recruitment or selection are **high-risk** under the EU AI Act, Annex III point 4.
- Regulation (EU) 2026/1744 (the "Digital Omnibus") moved the obligations for stand-alone Annex III systems to **2 December 2027**.
- Wording for the pitch: "designed so that AI never scores or filters people and humans make every decision". Do **not** claim the product is legally outside the high-risk category; that is a legal judgement.

## 3. What we learned from Espoo's mentors \[MENTORS\]

> **Update 2026-11-14 (second mentoring round) — terminology and audience \[MENTORS\]:** the product is a platform for **event organisers** (the City of Espoo team that runs the recruitment events), not for "HR". Organisers hired external HR only because of the recent flood of CVs; the tool serves the organisers. Say "event organisers" / "organisers" in the UI, pitch and docs, never "HR". Older text below that says "organiser HR" or "external HR" means the event organisers. More feedback from this round (a teammate's prototype and concept) is still to be added.
>
> **Company card (built):** the company fills its card itself (`/company`); the card has a company-level "What you hope to get from the event" field, and roles describe "Main tasks" (renamed from "first 3 months").

- **Places are limited.** Not everyone who registers can be admitted: the event platform (Tavata) would not cope, and companies don't have time for hundreds of meetings.
- **So the organisers select at registration (step 1) — and today they select almost blind.**
- **Companies** describe needs poorly and late: an industry and "N years of experience".
- **Candidates** don't know which companies will attend; they send generic CVs, often AI-written.
- **The organiser's HR** reads near-identical CVs, isn't an expert in every industry, and uses AI to help. "AI war": a machine writes, a machine reads, no real signal.
- **The HR doing the selection is external to the companies.** They don't know each company's goals or interests, so they select by guessing what the company wants. (Added by the team; high-impact insight.)
- **Result:** wrong people in meetings, companies overwhelmed by irrelevant requests, the event looks useless, companies don't come back.
- **Mentors' suggested split for the team:** candidate side (real signal instead of AI slop; which questions; don't exclude non-standard paths or weak language); employer side (get companies to describe needs fast and early; what's in it for them; 5 minutes); organiser HR side (what the selection workspace looks like; filters; batch approval; log; minutes per candidate now vs with us).

## 4. Research findings (summary)

Full evidence and sources: see the team's research doc on the market and problems.

### How Espoo's events work today

- **TalentMatch x IT (10–13 Dec 2024, online) ran on Tavata.** Candidates set up a Tavata profile and suggested 1:1 meetings to employers; employers prioritised candidates who matched their needs. \[FACT — verified\]
- Espoo's TalentMatch events typically have 200–1,000 jobseekers and 5–50 employers; 15-minute 1:1 meetings, pre-screened by mutual interest. \[FACT — Espoo's general range, not one event\]
- Finland TalentMatch x Tech & IT (Nov 2025) was produced by six cities incl. Espoo with Work in Finland; the platform isn't named publicly. \[FACT\]
- **No published outcome data** (how many meetings led to hires). \[FACT — not found\]

### Existing platforms and their common gap

| Platform | How it matches | Integration |
| --- | --- | --- |
| Tavata (Finnish, used by Espoo, Tampere) | Self-declared "offer / looking for"; CV as PDF; employers see jobseekers | **No public API found** → CSV / codes \[FACT\] |
| Brella (Finnish) | Organiser-defined categories and interests ("5x5 rule") | Integration API |
| b2match (Austria) | Profile + ML recommendations; meetings confirmed by acceptance | Public API is a paid add-on |
| Swapcard (France) | Profile + behaviour-based recommendations | GraphQL API |
| Grip (UK) | Mutual interest + behaviour | Claimed integrations |

**Common gaps across all of them** \[FACT — research\]:

1. Match quality depends on self-declared profiles.
2. Matching uses tags and categories; no shared skills vocabulary; no transferable skills.
3. No verification of real capability.
4. Noise: too many candidates per employer, filtering left to organisers.
5. No documented protection against nationality or language bias.
6. International hiring advice (permits, relocation) is separate from matching.
7. No outcome data.

### Public-sector tools

- **Job Market Finland (Työmarkkinatori)** — national platform; matching uses an enriched ESCO vocabulary and **deducts points for language, education or location mismatch** (language can only lower the score). Business Espoo points employers to it. \[FACT — verified\]
- **ESCO** — the EU's multilingual taxonomy of occupations and skills. Free web-service API, no key. Known limits: updated every few years, so new tech skills lag; coding quality in practice is uneven (61% of Europass CVs had at least one skills-coding error, EC slides Mar 2025). \[FACT\]

### Evidence for the pitch \[FACT — verified\]

- Unemployment in Finland (15–74, 2025): **19.6%** foreign background vs **8.3%** Finnish background; widening since 2023 (Statistics Finland).
- Espoo–Kauniainen, Feb 2025: **30,557** jobseekers, **15,070 (\~49%)** foreign-language speakers; since 1 Jan 2025 employment services are run by the city.
- Finnish field experiment (data 2016–17): **390 vs 99** interview invitations per 1,000 identical applications (Finnish vs Somali name). 2025 follow-up: foreign-named applicants still need more than twice as many applications.
- LLM-based CV screening favoured white-associated names in 85% of comparisons vs 9% for Black-associated (University of Washington, 2024).
- Only **26%** of applicants trust AI to evaluate them fairly (Gartner, Jul 2025).
- After LLMs, tailored applications stopped signalling ability (Galdin & Silbert, 2025, working paper).
- Structured interviews (same job-related questions for everyone) are the strongest single predictor of job performance (Sackett et al., 2022).

## 5. Problem statement and hypothesis \[PROPOSED\]

**Problem.** At registration, Espoo's external HR must select a limited number of candidates for company meetings, with vague company needs, generic (often AI-written) CVs, and no knowledge of each company's goals. Selection is slow and nearly blind; meetings become irrelevant; companies stop coming.

**Hypothesis.** If both sides describe themselves in a structured, concrete way at registration — through a short AI-guided dialogue instead of free-form CVs — and HR gets one selection workspace that shows the company's own criteria next to comparable answers, then:

- HR spends less time per place;
- more meetings are useful to both sides;
- companies get a reason to come back.

**Measures to collect from mentors:** minutes per application now; applications per place; share of meetings rated useful (target for after).

## 6. Principles (non-negotiable for the design)

1. **AI asks, structures, translates and explains. People answer and decide.**
2. **No AI scores, rankings or rejections of people.** Not in the UI, not in the database.
3. **The candidate's original answer is always kept**; the processed version shows what AI changed.
4. **Identity is separated from answers**; reviewers see anonymised answers first.
5. **Any language in, comparable text out**; no hidden language penalty.
6. **Every decision is logged**: who, when, which rule, which outcome.
7. **Feedback is about meetings, never about people.** Only aggregates are shown.
8. **We are an add-on to Tavata (or any event platform), not a replacement.**

## 7. The concept: stages and processes \[PROPOSED\]

MVP core = stages 1–3. Stage 4 = an export button. Stage 5 = one summary screen or a slide.

### Stage 1 — Company describes its need (before the event)

1. Company enters its website URL.
2. Context.dev pulls public company info (what it does, industry, size, site language, open roles). Company confirms or edits. Fallback: company types 2–3 lines.
3. Company writes in its own words whom it needs ("developer, 3 years").
4. Gemini asks 3–4 clarifying questions (first 3 months, must-have vs trainable, language actually needed, why the role is open, what a strong answer looks like).
5. Gemini drafts the **card**; ESCO normalises skill names; company confirms.

**The card** — one structured description per company/role, identical fields for all:

- Company profile (from the website)
- Why the role is open (context for external HR)
- What the person does in the first 3 months
- Must-have skills / trainable skills (ESCO-normalised where possible)
- Language actually needed for the job
- What a strong answer looks like (company's own criterion for HR)
- What is clearly not a fit
- One question for candidates \[OPEN — see decision D1\]

The card is the anchor: candidates choose and answer cards (stage 2), HR compares against cards (stage 3), meeting hints come from cards (stage 4).

### Stage 2 — Candidate registers

1. Candidate sees the cards of all companies attending.
2. Chooses up to 3 cards and writes why. \[PROPOSED limit\]
3. Answers each card's question in their own words, any language.
4. Optional: AI asks one follow-up question about the candidate's own answer.
5. Optional: career-changer bridge — AI suggests how past experience may transfer; candidate accepts/edits/rejects each suggestion.
6. Gemma (on Verda, EU) translates, removes personal identifiers (name, age, nationality, etc.), extracts skills with the sentence each came from; ESCO normalises skill names.
7. Stored: original answer, processed answer, skills, chosen cards. Identity stored separately.
8. Optional, self-reported demographics for the aggregate bias check, stored separately, never shown on individual cards. \[OPEN — D4\]

### Stage 3 — Event organisers select

1. Table per event: rows = applications, columns = answers to each card's question, next to the card's must-haves and "what a strong answer looks like".
2. AI glossary next to each card explains industry terms to HR (explains words, does not judge people).
3. HR defines explicit, visible rules (e.g. "answered company X's question", "mentions must-have skill Y").
4. Batch approval by rule; every application can be opened; borderline queue.
5. Optional: borderline cases sent anonymised to the company: "Do you want to meet?" \[OPEN — D5\]
6. Decision log: reviewer, timestamp, rule, decision.
7. Aggregate skew check: share of approved vs all applicants by optional self-reported group.

### Stage 4 — Hand-off to Tavata (during the event)

1. Approved candidates get their Tavata access code (mechanism \[OPEN — D6\]) plus a hint: "you answered these companies — book meetings with them".
2. Optional extra hint: other companies whose must-have skills overlap the candidate's confirmed skills (ESCO overlap). The candidate decides. This recommends companies to a person, never ranks people.
3. Each company gets the list of approved candidates who chose its card, to prioritise their meeting requests.
4. Delivered outside Tavata (our screen or email) plus a CSV export, since no public Tavata API was found.

### Stage 5 — Feedback (after the event)

1. Each side answers one question per meeting: "Was this meeting useful?" (plus optional "next step agreed?").
2. Organiser sees aggregates only: % useful meetings overall, per card, per selection rule.
3. Uses: evidence to bring companies back; improve card questions; check HR rules; first outcome data Espoo has.
4. Feedback never affects an individual's future admission (that would be profiling).

## 8. Idea backlog

| # | Idea | Problem it solves | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Task question on each card instead of CVs | AI slop; real capability | S | \[PROPOSED — MVP\] |
| 2 | Mutual shortlist + fair slot allocation (deferred-acceptance style, follows human choices) | Limited places; irrelevant requests | M | Backlog |
| 3 | Blind first round, reveal identity on interest | Name/nationality bias | S | \[PROPOSED — MVP\] |
| 4 | Max 3 requests per candidate, with a reason | Noise for companies | S | \[PROPOSED — MVP\] |
| 5 | One AI follow-up question on the candidate's own answer | AI slop; depth | S | \[PROPOSED — MVP\] |
| 6 | "Requirement price tag": show how many registrants a requirement excludes (e.g. fluent Finnish) | Unnecessary barriers; bias at source | S | \[PROPOSED — MVP\] |
| 7 | Career-changer bridge (candidate confirms each suggestion) | Transferable skills | S | Backlog / stretch |
| 8 | Need capture during Espoo staff's company visits (voice note → card) | Late, vague company needs | M | Pitch: next step |
| 9 | Case-worker nominations from the city's jobseeker pool | Companies doubt the city's candidates | M | Pitch: next step |
| 10 | Learning loop on questions/rules (not people) | No outcome data | S | Stage 5 |
| 11 | AI glossary for external HR | HR doesn't know industry or company | S | \[PROPOSED — MVP\] |
| 12 | Company reviews borderline anonymised cases | External HR guessing | S | \[OPEN — D5\] |
| 13 | Read-aloud of cards in several languages (text-to-speech of company text only) | Accessibility; weak reading language | S | \[OPEN — D11\] |
| – | Themed group tables; second-chance pool | More people get a slot; no silent rejection | – | Pitch only |

## 9. Open decisions

Resolve each before building the part that depends on it. Record the decision and the reason here.

| ID | Decision | Options | Current lean | How to resolve |
| --- | --- | --- | --- | --- |
| D1 | What does the company publish? | A: structured description only · B: description + one AI-proposed question the company confirms · C: full mini-task | B | Ask mentors: will companies confirm a question? Will HR find it easier? |
| D2 | Hosting of the app | Vercel (EU function region) + authenticated proxy to Gemma · whole app on the Verda server | Undecided | Weigh setup time vs. "all in EU" story; test proxy effort |
| D3 | Gemma model | gemma3:12b (pulled) · a Gemma 4 variant if available in Ollama | gemma3:12b | Test anonymisation + extraction quality on 10 synthetic answers |
| D4 | Bias check data | Optional self-reported demographics, stored separately, aggregate only · no demographics | Optional self-reported | Ask mentors (privacy, public-sector rules) |
| D5 | Company review of borderline cases | Yes / no | Yes, if mentors agree | Ask mentors |
| D6 | Tavata hand-off | CSV import · codes generated by Espoo · manual | CSV + codes shown on our screen | Ask mentors how codes work |
| D7 | Embeddings for semantic search | Gemini embeddings (company data only) · open model on Verda (candidate data) · none, ESCO only | Open model for candidate data | Needed only for skill overlap/search; can start without |
| D8 | Candidate question count | 1 per chosen card (max 3) · fixed general set | 1 per card | Ask mentors how much candidates will write |
| D9 | Entire checkpoint publishing (public repo) | Manual policy · private checkpoint remote | Manual policy | Team decision; never paste secrets into prompts |
| D10 | Device focus | Web, desktop-first for company + HR, responsive for candidates · mobile app | Web, desktop-first + responsive candidate flow | Ask mentors how candidates usually register |
| D11 | ElevenLabs | Not used · text-to-speech of company cards only (no candidate voice) | Only if time remains | Low prize; must not process candidate voice (biometric data) |

## 10. Technical stack \[PROPOSED unless marked FACT\]

### Components

| Component | Role in the product | Status | Notes |
| --- | --- | --- | --- |
| **Next.js** (TypeScript, App Router, Tailwind) | UI for company, candidate, HR + server routes that call every service | \[PROPOSED\] | One repo, one app. All API keys used only in server code. |
| **Vercel** | Hosting with auto-deploy from `main` | \[FACT\] deployed 2026-11-14 at `junction-2026-lafa.vercel.app`; function region Frankfurt (`fra1`), same as Aiven | `DATABASE_CA_CERT` holds the PEM text on Vercel. `GEMMA_*` unset there until Verda has an authenticated HTTPS proxy (Gemma runs on stubs in production). See D2. |
| **Aiven PostgreSQL + pgvector** | All data: cards, answers, decisions, log; vector search | \[FACT\] running: PostgreSQL 18.7, Developer tier, region Europe; pgvector 0.8.7 verified (2026-11-14) | Check "Allowed IP addresses" for the deployed app. TLS: current `pg` treats `sslmode=require` as verify-full and fails on Aiven's CA, so `lib/db.ts` strips sslmode from the URL and verifies with the CA file in `DATABASE_CA_CERT` (falls back to unverified TLS if unset). |
| **Gemini API** | Company side: clarifying dialogue, card drafting (JSON), HR glossary | \[FACT\] key created | Only non-personal (company) data goes to Gemini. |
| **Gemma on Verda (Ollama)** | Candidate side: translate, anonymise, extract skills with evidence | \[FACT\] A100 40GB on-demand, Ubuntu 26.04 + CUDA 13.4, Ollama 0.40.16, `gemma3:12b` | \~€1.5/h; delete after submission. Ollama on localhost; SSH tunnel (dev) or authenticated proxy (deploy). OpenAI-compatible `/v1`. |
| **Context.dev** | Company website → profile and open roles | \[FACT\] key created | Scrape / answers / map; never People Search. Cache in Aiven. |
| **ESCO web-service API** | Normalise skill names | \[FACT\] no key | A vocabulary, not truth: keep original skill if no good match. CSV fallback. |
| **Entire** | AI sessions linked to commits | \[FACT\] enabled; hooks for Claude Code, Codex; EU mirror | Merge `filip` branch (`.entire/` config) into `main`. See D9. |
| **Tavata** | Existing event platform (not ours) | External | Hand-off via CSV/codes (D6). |

### Data flow

Services never call each other; the Next.js server is the hub.

1. Company: browser → Next.js server → Context.dev → Gemini → ESCO → Aiven.
2. Candidate: browser → Next.js server → Gemma (Verda) → ESCO → Aiven.
3. HR: browser → Next.js server → Aiven (applications, decisions, log) → Gemini (glossary, company data only).
4. Export: Aiven → Next.js server → CSV for Tavata.

### Environment variables

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash-lite   # cheap stable model for the prototype; unset = Gemini stubbed
CONTEXT_DEV_API_KEY=
DATABASE_URL=            # Aiven Service URI (sslmode in it is ignored, see lib/db.ts)
DATABASE_CA_CERT=./certs/ca.pem      # path to Aiven CA; /certs and *.pem are git-ignored
GEMMA_BASE_URL=          # dev: http://localhost:11434/v1 (SSH tunnel)
GEMMA_MODEL=gemma3:12b
GEMMA_API_KEY=           # any string for Ollama; real secret behind a proxy
VERDA_API_KEY=           # Verda account (fallback inference); not used in code yet
USE_STUBS=               # 1 = all wrappers return stub data
HEALTH_PROBE_CONTEXTDEV= # 1 = /api/health calls Context.dev (default: key presence only)
```

### Service layer and health \[FACT — built 2026-11-14\]

- Next.js 16.4 app at the repo root (App Router, Tailwind 4, `cacheComponents` on: no `runtime`/`dynamic` route exports; use `await connection()` for request-time routes). Python prototype stays in `src/` (uv-managed `.venv`), excluded from TS/ESLint.
- One wrapper per service in `lib/` (`db.ts`, `gemma.ts`, `gemini.ts`, `contextdev.ts`, `esco.ts`), all `server-only`. AI/HTTP wrappers return `Sourced<T>` = `{source: "live" | "stub"}`; callers must not store stub output as real. Gemma never falls back to another provider. DB has no stub: it throws `ServiceUnavailableError`.
- `GET /api/health` returns per-service `status` (ok / unchecked / degraded / down / not_configured), `mode`, latency and a fixed error code. No keys, hosts, URLs or upstream messages. Always HTTP 200.

Rules: keys only in `.env` (git-ignored) and in the host's environment settings; never in client components; never with a `NEXT_PUBLIC_` prefix; never pasted into AI prompts (Entire uploads transcripts of a public repo).

### Data model (draft) \[PROPOSED\]

- `events` — id, name, date, places\_available
- `companies` — id, name, website, profile\_json, confirmed\_at
- `cards` — id, company\_id, event\_id, why\_open, first\_3\_months, must\_have\[\], trainable\[\], language\_needed, strong\_answer, not\_a\_fit, candidate\_question, esco\_skill\_ids\[\], confirmed\_at
- `candidates` — id (pseudonymous), event\_id, created\_at
- `candidate_identity` — candidate\_id, contact details only; separate, restricted
- `candidate_demographics` — optional self-reported; separate; aggregate use only (D4)
- `applications` — id, candidate\_id, card\_id, reason
- `answers` — id, application\_id, original\_text, original\_language, processed\_text, skills\_json (skill + evidence sentence + ESCO id), ai\_changes\_json, followup\_q, followup\_a
- `rules` — id, event\_id, created\_by, definition\_json, description
- `decisions` — id, application\_id, decision (approved / rejected / borderline / sent\_to\_company), rule\_id, reviewer, created\_at
- `meeting_feedback` — id, card\_id, side, useful, next\_step, created\_at (no person-level scoring)

### Server routes (draft) \[PROPOSED\]

- `POST /api/company/enrich` — URL → Context.dev → profile draft
- `POST /api/cards/draft` — \[FACT, built\] company text → Gemini → card draft (field status + verified quote) + 0–5 follow-up questions; falls back to a labelled sample. Prompt in `lib/prompts/card-draft.ts`, mapping/rules in `lib/card/from-model.ts`, quality check `npm run eval:cards`
- `POST /api/company/card/confirm`
- `GET /api/event/:id/cards`
- `POST /api/candidate/answer` — answer → Gemma → ESCO → store
- `POST /api/candidate/followup` — candidate data goes to Gemma only
- `GET /api/hr/applications?event=` — anonymised table data
- `POST /api/hr/rules`, `POST /api/hr/decisions` (batch)
- `GET /api/hr/skew?event=` — aggregate check
- `GET /api/export/tavata.csv?event=`
- `POST /api/feedback`

### AI tasks (draft) \[PROPOSED\]

- **Gemini — card drafting:** input = company profile + free text + clarifying answers; output = strict JSON matching `cards`; must not invent requirements the company didn't state; proposes one candidate question about concrete past behaviour related to the first-3-months task.
- **Gemini — HR glossary:** input = card text; output = short plain explanations of technical terms. Never receives candidate data.
- **Gemma — candidate processing:** input = original answer; output = JSON {language, translation\_en, anonymised\_text, removed\_items\[\], skills\[{skill, evidence\_sentence}\]}; no skills without a supporting sentence; never rates the candidate.
- **Gemma — follow-up:** input = the candidate's own answer; output = one concrete question about what they personally did.

### Fallbacks

- Context.dev fails → company types its profile.
- Gemma/Verda unavailable → Verda Inference API (EU, no data stored); Gemma track lost.
- ESCO API fails → keep original skills or use the ESCO CSV in Aiven.
- Vercel can't reach Gemma → run the whole app on the Verda server.

### Build order \[PROPOSED\]

1. Database schema + seed synthetic data.
2. Three screens on stub AI responses.
3. Gemini card drafting.
4. Gemma candidate processing.
5. HR rules, batch approval, decision log, CSV export.
6. Context.dev enrichment, ESCO normalisation.
7. Skew check, follow-up question, requirement price tag.
8. Feedback summary screen (or slide).

## 11. Synthetic data plan \[PROPOSED\]

- `companies.json` — 10 fictional companies (IT, health tech, logistics, energy); deliberately vague initial needs.
- `candidates.json` — 30 pseudonymous candidates; varied origins and languages (answers in Finnish, Ukrainian, Arabic, imperfect English); 8 career changers; 3 obviously AI-generated generic answers; no real names.
- `event.json` — one event with limited places (e.g. 40 applications for 15 places).
- Real job ads may inspire structure; never copy text. Skill names from ESCO. Label every record synthetic.

## 12. Tech tracks: requirements and our angle

| Track | Their judging / requirement \[FACT\] | Basic use | Our "best use" angle \[PROPOSED\] | Must-do for submission |
| --- | --- | --- | --- | --- |
| Gemini API | Meaningful, innovative, technically impressive; explain problem, integration, why Gemini matters | Chat call to draft text | Multi-turn clarifying interview → strict JSON card; HR glossary; stretch: read a company's PDF job ad or an Espoo staff voice note (multimodal) | Credits form (18+); answer their 4 questions in the submission |
| Gemma | Innovative, impactful use of open models | Call a hosted Gemma | Self-hosted in the EU so candidate data stays on our infrastructure; multilingual anonymisation + evidence-backed skills; small evaluation (PII removed in N/N synthetic answers) | Explain why an open model is essential |
| Verda | Ambition, fit, working prototype + documented process, path to scale (25% each) | Rent a GPU | Their own example matches us (recruitment tool on infrastructure you control); batch-process a full registration wave; scaling plan to 1,000 applications | **Post a summary in Verda's Discord**; document choices |
| Aiven | Meaningful use 40%, implementation 30%, impact 20%, creativity 10% | Postgres as storage | pgvector skill search; separated identity tables; audit log; EU region as part of privacy design | – |
| Context.dev | Creative use 40% (unusual sources, combined endpoints), central 30%, execution 30% (accuracy, latency, change over time) | One scrape call | Map (find careers page) + scrape + answers (JSON); stretch: monitors that detect new job posts and suggest updating the card or inviting the company to the next event | Repo + demo + note on endpoints used and why |
| Entire | Sessions, Graph, Brain, Trails; clean history; measurable token efficiency | Install and forget | Trails for task split between 4 teammates; Graph search for agents; Brain for decisions; screenshot token savings | Screenshots / recap |
| ElevenLabs (not entered) | MLH bounty, small prize | – | Only text-to-speech of company cards for accessibility | Only if time (D11) |

## 13. Validation with organisers \[PROPOSED\]

Full plan and question bank: see the doc "Espoo Rethinking Recruitment — concept, requirements & validation plan". Order: problem check → company + candidate flows → HR workspace → hand-off, feedback, privacy. Show sketches, not code. Go / adjust / kill after each step.

Questions added since:

- Is it true the selecting HR doesn't know each company's goals? Would "why the role is open" and "what a strong answer looks like" help?
- Would companies review anonymised borderline cases?
- How do Tavata access codes work; can Espoo import a CSV?
- Do candidates usually register on a phone or a laptop?

## 14. Glossary

- **Card** — structured description of one company's need for one event; the anchor every comparison uses.
- **Event organisers** — the City of Espoo team that runs the event and selects which candidates are admitted (not "HR"); external to the companies.
- **Admission / selection** — deciding who gets a place at the event (stage 3).
- **ESCO** — the EU's multilingual skills and occupations vocabulary.
- **Anonymised answer** — a candidate's answer with identifiers removed and translated; the original is kept separately.
- **Skew check** — aggregate comparison of approved vs all applicants by optional self-reported group.
- **Tavata** — the Finnish event platform Espoo used for TalentMatch.

## 15. Sources

- Challenge brief: Junction platform, City of Espoo (section 1).
- Espoo TalentMatch: https://www.espoo.fi/en/talentmatch-recruitment-event
- TalentMatch 2024 on Tavata: https://workinfinland.com/en/open-jobs/talent-match-espoo-2024
- Tavata recruitment events: https://tavata.fi/fi/palvelut/rekrytointitapahtumat
- Job Market Finland matching: https://tyomarkkinatori.fi/en/info/instructions-and-frequently-asked-questions/how-the-matching-works
- Statistics Finland 15bm: https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin\_\_tyti/statfin\_tyti\_pxt\_15bm.px
- City of Espoo employment report 2025: https://admin.espoo.fi/sites/default/files/2025-04/Toimintaymp%C3%A4rist%C3%B6%202025%20Espoon%20ty%C3%B6llisyystoiminta\_3.pdf
- ESCO / EURES slides (EC, Mar 2025): https://esco.ec.europa.eu/system/files/2025-04/ESCO%20MSWG%20140325%20EURES\_final.pdf
- EU AI Act Annex III: https://artificialintelligenceact.eu/annex/3/
- Digital Omnibus (White & Case): https://www.whitecase.com/insight-alert/eu-ai-omnibus-enters-force-amending-ai-act
- Sackett et al. 2022 (SIOP summary): https://www.siop.org/tip-article/is-cognitive-ability-the-best-predictor-of-job-performance
- Verda Inference docs: https://docs.verda.com/inference
- Entire CLI docs: https://docs.entire.io/platforms/cli-and-entire-io
