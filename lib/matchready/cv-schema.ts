import { z } from "zod";

/**
 * What Gemma must return when it reads a CV or a LinkedIn PDF export.
 * Facts only (roles, employers, dates, degrees, languages, skills) — no judgements.
 * Code in facts.ts compares these facts; the model never does.
 */

const Month = z.string().describe("YYYY-MM. If only the year is known use YYYY-01. Empty string for 'present'.");

export const CvExperience = z.object({
  title: z.string(),
  employer: z.string(),
  start: Month,
  end: Month,
  areas: z.array(z.string()).describe("2–4 short lowercase topic tags for this job, e.g. 'optical testing', 'lab equipment'"),
  tasks: z.array(z.string()).describe("Up to 3 concrete tasks, copied or shortened from the text"),
});

export const CvParse = z.object({
  experience: z.array(CvExperience),
  education: z.array(
    z.object({
      degree: z.enum(["Vocational", "BSc", "MSc", "PhD"]),
      field: z.string(),
      year: z.number().describe("Graduation year, or expected year if in progress"),
      inProgress: z.boolean(),
    }),
  ),
  languages: z.array(z.object({ language: z.string(), level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "Native"]) })),
  skills: z.array(z.string()).describe("Tools and technical skills named in the text, max 12"),
});
export type CvParse = z.infer<typeof CvParse>;
