/**
 * SYNTHETIC test inputs for the card-draft prompt. Fictional companies only.
 * Covers the shapes companies really send: link only, two words, a full ad,
 * another language, something vague, and a no-hiring case.
 */
export const CARD_DRAFT_CASES: { id: string; companyName: string; text: string; expect: string }[] = [
  {
    id: "link-only",
    companyName: "Norrvik Logistics Oy",
    text: "https://norrvik-logistics.example/careers/backend-developer",
    expect: "Almost nothing known (no scraping yet): title may be guessed from the URL, questions about goals and role.",
  },
  {
    id: "two-words",
    companyName: "Kallio Health Tech",
    text: "backend developer",
    expect: "Goal fill guessed, title found, most fields missing, up to 5 questions.",
  },
  {
    id: "full-ad",
    companyName: "Norrvik Logistics Oy",
    text: `Backend Developer (Espoo, hybrid)

Norrvik Logistics Oy plans and tracks deliveries for 40 retail chains in Finland and Sweden. Our order volume has doubled in two years, so we are growing the platform team.

In your first months you will maintain and extend the order tracking API and help move our batch jobs to an event-based setup.

What we expect:
- Solid experience with Python and SQL.
- Experience with REST APIs in production.
- Docker is a plus, but we can teach it.

Our working language is English. Finnish is not required.

We value people who can explain a technical problem clearly to non-technical colleagues.`,
    expect: "Most fields found with exact quotes. Few questions: experience (\"solid\"), candidate question.",
  },
  {
    id: "finnish",
    companyName: "Saaristo Varasto Oy",
    text: "Etsimme varastotyöntekijää Espoon terminaaliin. Trukkikortti vaaditaan. Työ alkaa tammikuussa, kolmivuorotyö. Suomen kielen perustaito riittää.",
    expect: "Values in English, quotes in Finnish. Forklift licence must-have, basic Finnish.",
  },
  {
    id: "vague",
    companyName: "Pixel Lagoon Studio",
    text: "we want someone nice who fits our vibe, maybe a Luntik :)",
    expect: "No invented skills. Questions about goals and what the role is.",
  },
  {
    id: "no-hiring",
    companyName: "Aalto Grid Energy",
    text: "We are not hiring right now, but we want to present our new battery lab and meet students interested in UX design and energy data.",
    expect: "Goals brand + explore, no positions, areas UX design / energy data, pitch about the battery lab.",
  },
];
