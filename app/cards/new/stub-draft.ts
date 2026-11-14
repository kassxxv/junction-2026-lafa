/**
 * STUB DATA — synthetic draft that the AI step will return later.
 * Fictional company, fictional job ad. Every `quote` must appear verbatim in its source.
 * The real zod card schema replaces these types when we connect Gemini.
 */

/**
 * staff     – typed by Espoo staff in the input step: confirmed, edit only
 * source    – taken from a source with an exact quote: auto-confirmed, editable
 * ai        – AI suggestion without direct evidence: needs a human decision
 * missing   – nothing found: needs input
 * confirmed – a person accepted or edited it
 * ask       – parked: the company has to answer
 */
export type FieldStatus = "staff" | "source" | "ai" | "missing" | "confirmed" | "ask";

export type GoalId = "fill" | "explore" | "brand";

export interface DraftField {
  id: string;
  label: string;
  required: boolean;
  kind: "text" | "list";
  value: string | string[];
  status: FieldStatus;
  /** Evidence: which source, and the exact sentence. */
  sourceId?: string;
  quote?: string;
  /** What the AI wants to know when the value is missing or unsure. */
  question?: string;
  /** Quick answers for the question; `suggested` is the AI's pick. */
  options?: string[];
  suggested?: string;
}

export interface DraftSection {
  id: string;
  title: string;
  /** Shown only when this goal is selected. Missing = always shown. */
  goal?: GoalId;
  fields: DraftField[];
}

export interface DraftSource {
  id: string;
  label: string;
  /** link = read from a URL, typed = entered in step 1, added = pasted later (removable). */
  kind: "link" | "typed" | "added";
  url?: string;
  text: string;
}

export const GOALS: { id: GoalId; label: string; hint: string }[] = [
  { id: "fill", label: "Fill a position", hint: "They have an open role and want to fill it" },
  { id: "explore", label: "Explore talent", hint: "Open conversations, may get interested in someone" },
  { id: "brand", label: "Employer branding", hint: "Presentation or pitch to show who they are" },
];

/** Counts as done for publishing. */
export const DONE: FieldStatus[] = ["staff", "source", "confirmed"];
/** Needs the staff member's attention now. */
export const NEEDS_ATTENTION: FieldStatus[] = ["ai", "missing"];

export const STUB_INPUT = {
  companyName: "Norrvik Logistics Oy",
  links: "https://norrvik-logistics.example/careers/backend-developer",
  notes: "Need a backend dev, maybe also open to junior data people. Talked by phone with their HR.",
  goals: ["fill", "explore"] as GoalId[],
};

export const STUB_SOURCES: DraftSource[] = [
  {
    id: "job-ad",
    label: "Job ad",
    kind: "link",
    url: "norrvik-logistics.example/careers/backend-developer",
    text: `Backend Developer (Espoo, hybrid)

Norrvik Logistics Oy plans and tracks deliveries for 40 retail chains in Finland and Sweden. Our order volume has doubled in two years, so we are growing the platform team.

In your first months you will maintain and extend the order tracking API and help move our batch jobs to an event-based setup.

What we expect:
- Solid experience with Python and SQL.
- Experience with REST APIs in production.
- Docker is a plus, but we can teach it.

Our working language is English. Finnish is not required.

We value people who can explain a technical problem clearly to non-technical colleagues.`,
  },
  {
    id: "notes",
    label: "Your text",
    kind: "typed",
    text: "Need a backend dev, maybe also open to junior data people. Talked by phone with their HR.",
  },
];

export const STUB_SECTIONS: DraftSection[] = [
  {
    id: "company",
    title: "Company",
    fields: [
      { id: "name", label: "Company name", required: true, kind: "text", value: "Norrvik Logistics Oy", status: "staff" },
      {
        id: "summary",
        label: "What the company does",
        required: true,
        kind: "text",
        value: "Plans and tracks deliveries for 40 retail chains in Finland and Sweden.",
        status: "source",
        sourceId: "job-ad",
        quote: "Norrvik Logistics Oy plans and tracks deliveries for 40 retail chains in Finland and Sweden.",
      },
    ],
  },
  {
    id: "position-1",
    title: "Backend Developer",
    goal: "fill",
    fields: [
      {
        id: "why-open",
        label: "Why the role is open",
        required: true,
        kind: "text",
        value: "Order volume doubled in two years; the platform team is growing.",
        status: "source",
        sourceId: "job-ad",
        quote: "Our order volume has doubled in two years, so we are growing the platform team.",
      },
      {
        id: "first-months",
        label: "First 3 months",
        required: true,
        kind: "text",
        value: "Maintain and extend the order tracking API; help move batch jobs to an event-based setup.",
        status: "source",
        sourceId: "job-ad",
        quote:
          "In your first months you will maintain and extend the order tracking API and help move our batch jobs to an event-based setup.",
      },
      {
        id: "must-have",
        label: "Must-have skills",
        required: true,
        kind: "list",
        value: ["Python", "SQL", "REST APIs in production"],
        status: "source",
        sourceId: "job-ad",
        quote: "Solid experience with Python and SQL.\n- Experience with REST APIs in production.",
      },
      {
        id: "nice-to-have",
        label: "Can be learned on the job",
        required: false,
        kind: "list",
        value: ["Docker"],
        status: "source",
        sourceId: "job-ad",
        quote: "Docker is a plus, but we can teach it.",
      },
      {
        id: "language",
        label: "Language needed",
        required: true,
        kind: "text",
        value: "English. Finnish not required.",
        status: "source",
        sourceId: "job-ad",
        quote: "Our working language is English. Finnish is not required.",
      },
      {
        id: "experience",
        label: "Experience level",
        required: true,
        kind: "text",
        value: "",
        status: "missing",
        question: "The ad asks for “solid experience”. Roughly how much do they expect?",
        options: ["Under 2 years", "2–4 years", "5+ years"],
        suggested: "2–4 years",
      },
      {
        id: "candidate-question",
        label: "Question for candidates",
        required: true,
        kind: "text",
        value: "Tell us about a time you explained a technical problem to someone non-technical. What did you do?",
        status: "ai",
        sourceId: "job-ad",
        quote: "We value people who can explain a technical problem clearly to non-technical colleagues.",
        question: "Drafted from what the ad says they value. Keep it, or edit it with the company.",
      },
    ],
  },
  {
    id: "explore",
    title: "Exploring",
    goal: "explore",
    fields: [
      {
        id: "explore-areas",
        label: "Areas of interest",
        required: true,
        kind: "list",
        value: ["Junior data and analytics"],
        status: "ai",
        sourceId: "notes",
        quote: "maybe also open to junior data people.",
        question: "Your notes only say “maybe”. Is data the only area they are open to?",
      },
      {
        id: "explore-plus",
        label: "Good to have",
        required: false,
        kind: "list",
        value: [],
        status: "ask",
        question: "What would make a junior data person interesting to them?",
      },
    ],
  },
  {
    id: "brand",
    title: "Employer branding",
    goal: "brand",
    fields: [
      {
        id: "brand-pitch",
        label: "What they will present",
        required: true,
        kind: "text",
        value: "",
        status: "missing",
        question: "What will the company talk about in their pitch?",
      },
    ],
  },
];

let positionCount = 1;

/** A fresh, empty position section for “Add position”. */
export function emptyPosition(): DraftSection {
  positionCount += 1;
  const p = `position-${positionCount}`;
  const f = (id: string, label: string, kind: DraftField["kind"], required = true, question?: string): DraftField => ({
    id: `${p}-${id}`,
    label,
    required,
    kind,
    value: kind === "list" ? [] : "",
    status: "missing",
    question,
  });
  return {
    id: p,
    title: "New position",
    goal: "fill",
    fields: [
      f("title", "Job title", "text"),
      f("why-open", "Why the role is open", "text"),
      f("first-months", "First 3 months", "text"),
      f("must-have", "Must-have skills", "list"),
      f("nice-to-have", "Can be learned on the job", "list", false),
      f("language", "Language needed", "text"),
      f("candidate-question", "Question for candidates", "text"),
    ],
  };
}
