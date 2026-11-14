/**
 * STUB DATA for the staff review screen — synthetic draft.
 * Fictional company, fictional job ad. Every `quote` must appear verbatim in its source.
 * Types live in lib/card/types.ts and are re-exported here for existing imports.
 */

import type { DraftField, DraftSection, DraftSource, GoalId } from "@/lib/card/types";

export { DONE, GOALS, NEEDS_ATTENTION } from "@/lib/card/types";
export type { DraftField, DraftSection, DraftSource, FieldStatus, GoalId } from "@/lib/card/types";

export const STUB_INPUT = {
  companyName: "Norrvik Logistics Oy",
  links: "https://norrvik-logistics.example/careers/backend-developer",
  notes: "Need a backend dev, maybe also open to junior data people. Talked by phone with their recruiter.",
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
    text: "Need a backend dev, maybe also open to junior data people. Talked by phone with their recruiter.",
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
        id: "main-tasks",
        label: "Main tasks",
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
      f("main-tasks", "Main tasks", "text"),
      f("must-have", "Must-have skills", "list"),
      f("nice-to-have", "Can be learned on the job", "list", false),
      f("language", "Language needed", "text"),
      f("candidate-question", "Question for candidates", "text"),
    ],
  };
}
