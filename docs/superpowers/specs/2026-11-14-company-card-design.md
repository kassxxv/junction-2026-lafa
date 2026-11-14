# Company card editor — design

Status: step 1 built on stub data (2026-11-14). Steps 2–4 not started.

## Why

Companies send their needs late and in any shape: a long text, two words, a job-ad link or just their website. Espoo event staff have to turn that into something HR and candidates can use. The card editor turns any input into one **standard card per company**, so every card has the same parts and HR can compare them.

## Who uses it

**Changed 2026-11-14: the company fills the card itself.** It must be as easy as possible for a busy contact person.

- **Company flow (`/company`, primary):** one big box (link, any text, or a few words) → AI fills what it finds → at most ~4 short questions, one per screen, with tap-able answers, a suggested answer, "skip" and "write your own" → the finished card as a plain document; click anything to change it; guesses are marked "We guessed this — that's right?" → "Send my card". No boxes per field, no status badges, no source pane.
- **Espoo staff review (`/cards`, parked):** the two-pane source | fields screen below. Kept as-is until the team decides whether company cards are published directly or reviewed by Espoo first.

## The card (one per company)

- **Company:** name, what the company does.
- **Why they come** (multi-select): fill a position · explore talent · employer branding. The goals decide which sections appear.
- **Positions** (0..n, goal "fill"): title, why the role is open, first 3 months, must-have skills, can be learned on the job, language needed, experience level, one question for candidates.
- **Exploring** (goal "explore"): areas of interest, good-to-have skills.
- **Employer branding** (goal "brand"): what they will present.

## Field statuses

| Status | Meaning | Needs a person? |
|---|---|---|
| Entered by you | Typed by staff in the input step | No (edit only, no reject) |
| From source | Value backed by an exact quote from a source | No — auto-confirmed, editable |
| AI suggestion | Inferred, no direct evidence | Yes: accept, edit or reject |
| Missing | Nothing found | Yes: fill in or pick a suggested answer |
| Confirmed | A person accepted or edited it | No |
| Ask company | Parked for the company to answer | Blocks publishing if required |

Publishing needs every required field to be done (entered, from source or confirmed).

## Layout (approach A, chosen over a step-by-step wizard and a three-pane view)

- Espoo navy (`#011135`) only in the sidebar; light work area.
- Step 1: one input page (name, goals, links, free text) → "Create draft card".
- Step 2: two panes. **Left:** the source text set in a serif "document" face, evidence sentences highlighted. **Right:** goal toggles, then fields grouped by section; a sticky "fields need you" bar on top; a card preview tab.
- Clicking a field highlights its quote; clicking a quote jumps to the field.
- Keyboard: J next field needing attention, Enter accept, E edit.

## Decisions taken without the team (easy to change)

- Interface in English; companies may write in any language.
- Colours live only in `app/globals.css` tokens; action blue `#0a5bd3` is a placeholder until Espoo's guidelines.
- No Espoo logo (the city's guidelines require permission).
- "Ask company" is only a marker for now; no page or message for the company yet.
- Light theme only.

## Next steps

1. ~~UX fixes and visual pass on stub data~~ (done).
2. ~~1a: card schema + `POST /api/cards/draft` on pasted text~~ (done): Gemini fills the template with a status and quote per field; quotes not found verbatim become guesses; 0–5 questions only for required, shown fields that are missing or guessed; the candidate question is always shown for confirmation.
   1b (next): adaptive questions — after each answer, a light call updates fields, drops answered questions and may add one follow-up (max 5 in total).
   Then: Context.dev reads links (or finds the website from the name).
3. ESCO skill normalisation, save cards to the database.
4. Later: voice input for staff notes (company data, so Gemini may process it).
