/**
 * Seed data. The EVENT is real (public info from espoo.fi).
 * Every company, person, CV and LinkedIn profile below is FICTIONAL / SYNTHETIC.
 * Differences between CV and LinkedIn are described structurally; the code in
 * lib/matchready/facts.ts computes the checks and evidence from them.
 */
import type { CvFacts, Education, Experience, LanguageSkill, LinkedinFacts, RequirementType } from "../../lib/matchready/facts";

export const EVENT = {
  id: "dttf-2026",
  name: "Deep Tech Talent Forum",
  startsOn: "2026-11-26",
  endsOn: "2026-11-27",
  format: "Online, in English",
  fields: ["Semiconductors & Microelectronics", "Photonics", "Quantum technologies"],
  companyDeadline: "2026-11-18",
  applicationDeadline: "2026-11-20",
  decisionDate: "2026-11-21",
  infoUrl: "https://www.espoo.fi/en/DeepTechTalentForum",
};

const PHOTONICS = "Photonics";
const MICRO = "Semiconductors & Microelectronics";
const QUANTUM = "Quantum technologies";

interface SeedRequirement {
  type: RequirementType;
  label: string;
  minYears?: number;
  level?: string;
  detail?: string;
  mustHave: boolean;
  keywords?: string[];
}

export interface SeedCompany {
  id: string;
  name: string;
  website: string;
  field: string;
  status: "draft" | "confirmed";
  places: number;
  goals: string[];
  summary: string;
  eventGoal: string;
  role: { title: string; details: string; starter: string; requirements: SeedRequirement[] };
}

const PYTHON_AUTOMATION: SeedRequirement = {
  type: "has_done",
  label: "Test automation with Python",
  mustHave: false,
  keywords: ["automat python"],
};
const ENGLISH_B2: SeedRequirement = { type: "language", label: "English", level: "B2", mustHave: true };

export const COMPANIES: SeedCompany[] = [
  {
    id: "nordic-photonics",
    name: "Nordic Photonics Oy",
    website: "nordicphotonics.example",
    field: PHOTONICS,
    status: "confirmed",
    places: 8,
    goals: ["fill"],
    summary: "Designs and manufactures photonic components for telecom and sensing.",
    eventGoal: "Hire one test engineer and meet more people for the growing test team.",
    role: {
      title: "Test Engineer, Photonics",
      details: "Full-time · Espoo",
      starter: "Describe a test setup you built or improved. What did you measure?",
      requirements: [
        { type: "experience", label: "Optical / photonic component testing", minYears: 2, mustHave: true, keywords: ["optical testing", "photonic testing"] },
        { type: "experience", label: "Lab measurement equipment", minYears: 1, mustHave: false, keywords: ["lab equipment", "measurement equipment"] },
        PYTHON_AUTOMATION,
        { type: "education", label: "BSc or MSc", detail: "Photonics, Physics or Electrical Engineering", mustHave: false },
        ENGLISH_B2,
      ],
    },
  },
  {
    id: "quantumlab",
    name: "QuantumLab Oy",
    website: "quantumlab.example",
    field: PHOTONICS,
    status: "confirmed",
    places: 6,
    goals: ["fill", "explore"],
    summary: "Builds optical measurement systems for quantum research labs.",
    eventGoal: "Hire a validation engineer; open to meeting junior lab people.",
    role: {
      title: "Validation Engineer",
      details: "Full-time · Helsinki",
      starter: "Which measurement were you most proud to automate, and why?",
      requirements: [
        { type: "experience", label: "Lab measurement equipment", minYears: 2, mustHave: true, keywords: ["lab equipment", "measurement equipment"] },
        PYTHON_AUTOMATION,
        ENGLISH_B2,
      ],
    },
  },
  {
    id: "luxbeam",
    name: "LuxBeam Systems",
    website: "luxbeam.example",
    field: PHOTONICS,
    status: "confirmed",
    places: 5,
    goals: ["fill"],
    summary: "Designs custom optics for industrial lasers.",
    eventGoal: "Hire an optical design engineer.",
    role: {
      title: "Optical Design Engineer",
      details: "Full-time · Espoo",
      starter: "Which optical system have you designed end to end?",
      requirements: [
        { type: "experience", label: "Optical design software (e.g. Zemax)", minYears: 3, mustHave: true, keywords: ["optical design", "zemax"] },
        { type: "education", label: "MSc", detail: "Photonics or Optics", mustHave: true },
      ],
    },
  },
  {
    id: "finnsensor",
    name: "FinnSensor Ltd",
    website: "finnsensor.example",
    field: PHOTONICS,
    status: "confirmed",
    places: 6,
    goals: ["fill"],
    summary: "Produces optical sensors for industrial automation.",
    eventGoal: "Find two production test technicians.",
    role: {
      title: "Production Test Technician",
      details: "Full-time · Oulu",
      starter: "How do you keep test results reliable on a busy production line?",
      requirements: [
        { type: "experience", label: "Production or lab testing", minYears: 1, mustHave: true, keywords: ["production testing", "optical testing", "lab testing"] },
        { type: "language", label: "Finnish", level: "B1", mustHave: true },
      ],
    },
  },
  {
    id: "chipworks",
    name: "ChipWorks Oy",
    website: "chipworks.example",
    field: MICRO,
    status: "confirmed",
    places: 6,
    goals: ["fill", "brand"],
    summary: "Designs mixed-signal chips for IoT devices.",
    eventGoal: "Hire a verification engineer and present the new chip design team.",
    role: {
      title: "Chip Verification Engineer",
      details: "Full-time · Espoo",
      starter: "Tell us about a bug you found late in verification. How did you track it down?",
      requirements: [
        { type: "experience", label: "Digital design verification", minYears: 2, mustHave: true, keywords: ["verification"] },
        ENGLISH_B2,
      ],
    },
  },
  {
    id: "qubitia",
    name: "Qubitia",
    website: "qubitia.example",
    field: QUANTUM,
    status: "draft",
    places: 4,
    goals: ["explore"],
    summary: "Startup building cryogenic control electronics for quantum computers.",
    eventGoal: "",
    role: {
      title: "Quantum Hardware Engineer",
      details: "Full-time · Espoo",
      starter: "What is the coldest system you have worked with, and what did you measure?",
      requirements: [
        { type: "experience", label: "Cryogenic measurement", minYears: 2, mustHave: true, keywords: ["cryogenic"] },
        { type: "education", label: "PhD", detail: "Physics", mustHave: false },
      ],
    },
  },
];

/* ---------------- Candidates ---------------- */

type LinkedinPlan =
  | "same"
  | "none"
  | { retitle?: [employer: string, title: string]; shiftStart?: [employer: string, months: number]; dropEmployer?: string; dropSkills?: string[] };

export interface SeedCandidate {
  code: string;
  name: string;
  fields: string[];
  workType: string;
  stage: "student" | "early" | "experienced" | "senior";
  careerChanger: boolean;
  cv: CvFacts;
  linkedin: LinkedinPlan;
  applies: string[];
  proofs?: Record<string, { type: "diploma" | "certificate" | "link" | "reference"; ref: string }>;
  starter?: string;
}

const exp = (title: string, employer: string, start: string, end: string | null, areas: string[], tasks: string[] = []): Experience => ({
  title,
  employer,
  start,
  end,
  areas,
  tasks,
});
const edu = (degree: Education["degree"], field: string, year: number, inProgress = false): Education => ({ degree, field, year, inProgress });
const L = (language: string, level: LanguageSkill["level"]): LanguageSkill => ({ language, level });

const OT = "optical testing";
const LAB = "lab equipment";

export const CANDIDATES: SeedCandidate[] = [
  {
    code: "A-01", name: "Mateo Rossi", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Test Engineer", "Kide Photonics", "2021-03", null, [OT, LAB], ["Ran reliability tests on laser modules"])], education: [edu("BSc", "Electrical Engineering", 2020)], languages: [L("English", "C1"), L("Italian", "Native")], skills: ["Optical spectrum analysers", "MATLAB"] },
    linkedin: "same", applies: ["nordic-photonics", "quantumlab"],
  },
  {
    code: "A-02", name: "Linh Nguyen", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Optical Test Engineer", "Aurora Sensors", "2019-09", "2024-12", [OT, LAB], ["Automated spectral measurements in Python"])], education: [edu("MSc", "Physics", 2019)], languages: [L("English", "C1"), L("Vietnamese", "Native"), L("Finnish", "B1")], skills: ["Python", "LabVIEW"] },
    linkedin: "same", applies: ["nordic-photonics", "quantumlab", "finnsensor"],
    proofs: { language: { type: "certificate", ref: "english_c1_certificate.pdf" } },
  },
  {
    code: "A-03", name: "Oskari Virtanen", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Test Engineer", "Fjord Instruments", "2020-01", "2023-06", [OT]), exp("Lab Engineer", "Lumen Lab Oy", "2023-08", null, [LAB])], education: [edu("BSc", "Physics", 2019)], languages: [L("Finnish", "Native"), L("English", "B2")], skills: ["Oscilloscopes"] },
    linkedin: { shiftStart: ["Fjord Instruments", 8] }, applies: ["nordic-photonics"],
  },
  {
    code: "A-04", name: "Priya Sharma", fields: [PHOTONICS], workType: "Testing and validation", stage: "senior", careerChanger: false,
    cv: { experience: [exp("Photonics Test Specialist", "Hamina Fiber", "2018-05", null, [OT, LAB], ["Led fibre component qualification"])], education: [edu("MSc", "Photonics", 2018)], languages: [L("English", "C2"), L("Hindi", "Native")], skills: ["Zemax", "Python"] },
    linkedin: "none", applies: ["nordic-photonics", "luxbeam"],
  },
  {
    code: "A-05", name: "Jonas Weber", fields: [PHOTONICS], workType: "Production", stage: "experienced", careerChanger: true,
    cv: { experience: [exp("Electrician", "Weber Elektro", "2012-08", "2019-12", ["electrical installation"]), exp("Test Technician", "Saimaa Optoelectronics", "2020-02", null, [OT, LAB, "production testing"])], education: [edu("Vocational", "Electronics", 2012)], languages: [L("German", "Native"), L("English", "B2")], skills: ["Soldering", "Test fixtures"] },
    linkedin: "same", applies: ["nordic-photonics", "finnsensor"],
  },
  {
    code: "A-06", name: "Sara Lindqvist", fields: [PHOTONICS, MICRO], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Test Engineer", "Nordlys Lasers", "2022-01", null, [OT], ["Built Python test automation for laser drivers"])], education: [edu("MSc", "Electrical Engineering", 2021)], languages: [L("Swedish", "Native"), L("Finnish", "C1"), L("English", "C1")], skills: ["Python", "pytest"] },
    linkedin: "same", applies: ["nordic-photonics", "quantumlab"],
    proofs: { has_done: { type: "link", ref: "github.com/sara-l/laser-driver-tests" } },
  },
  {
    code: "A-07", name: "Aisha Rahman", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: {
      experience: [
        exp("Research Assistant", "University photonics lab", "2020-09", "2022-05", [LAB], ["Characterised fibre couplers"]),
        exp("Test Lead", "Valo Optics", "2022-06", "2025-10", [OT, LAB], ["Built an automated insertion-loss test bench in Python"]),
      ],
      education: [edu("MSc", "Photonics", 2022)],
      languages: [L("English", "C1"), L("Arabic", "Native"), L("Finnish", "A2")],
      skills: ["Python", "Zemax", "LabVIEW"],
    },
    linkedin: { retitle: ["Valo Optics", "Test Engineer"], dropSkills: ["Zemax"] },
    applies: ["nordic-photonics", "quantumlab", "luxbeam"],
    proofs: { education: { type: "diploma", ref: "msc_photonics_diploma.pdf" }, has_done: { type: "link", ref: "github.com/aisha-demo/testbench" } },
    starter: "At Valo Optics I built an automated insertion-loss test bench for fibre couplers. Python drives the spectrum analyser, and test time per batch went from 3 hours to 40 minutes.",
  },
  {
    code: "A-08", name: "Daniel Okafor", fields: [PHOTONICS, MICRO], workType: "Engineering and design", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Optical Measurement Engineer", "Polar Microsystems", "2021-08", null, [OT, LAB, "verification"])], education: [edu("BSc", "Physics", 2021)], languages: [L("English", "Native")], skills: ["MATLAB"] },
    linkedin: "same", applies: ["nordic-photonics", "chipworks"],
  },
  {
    code: "A-09", name: "Elena Petrova", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Test Engineer", "Archipelago Instruments", "2019-04", "2022-03", [OT]), exp("Test Engineer", "Valo Optics", "2022-04", null, [OT, LAB])], education: [edu("MSc", "Physics", 2018)], languages: [L("English", "C1"), L("Russian", "Native")], skills: ["Python"] },
    linkedin: { shiftStart: ["Archipelago Instruments", 8] }, applies: ["nordic-photonics"],
  },
  {
    code: "A-10", name: "Tomás García", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Test Technician", "Fjord Instruments", "2018-01", "2020-12", [OT]), exp("Senior Test Engineer", "Lumen Lab Oy", "2021-01", null, [OT, LAB])], education: [edu("BSc", "Electrical Engineering", 2017)], languages: [L("English", "B2"), L("Spanish", "Native")], skills: ["Python"] },
    linkedin: { retitle: ["Lumen Lab Oy", "Test Engineer"], dropEmployer: "Fjord Instruments" }, applies: ["nordic-photonics", "finnsensor"],
  },
  {
    code: "A-11", name: "Hanna Mäkinen", fields: [PHOTONICS], workType: "Testing and validation", stage: "early", careerChanger: false,
    cv: { experience: [exp("Quality Engineer", "Saimaa Optoelectronics", "2022-09", null, [OT])], education: [edu("BSc", "Physics", 2022)], languages: [L("Finnish", "Native"), L("English", "C1")], skills: ["Statistics"] },
    linkedin: "same", applies: ["nordic-photonics"],
  },
  // A-12 … A-18: an internship or short role in optical testing, below the 2-year must-have.
  {
    code: "A-12", name: "Yusuf Demir", fields: [PHOTONICS], workType: "Testing and validation", stage: "student", careerChanger: false,
    cv: { experience: [exp("Test Intern", "Valo Optics", "2025-03", "2025-10", [OT])], education: [edu("BSc", "Physics", 2026, true)], languages: [L("English", "C1"), L("Turkish", "Native")], skills: ["Python"] },
    linkedin: "same", applies: ["nordic-photonics", "finnsensor"],
  },
  {
    code: "A-13", name: "Mei Chen", fields: [PHOTONICS], workType: "Research", stage: "student", careerChanger: false,
    cv: { experience: [exp("Research Intern", "University photonics lab", "2025-01", "2025-08", [OT, LAB])], education: [edu("MSc", "Photonics", 2026, true)], languages: [L("English", "C1"), L("Mandarin", "Native")], skills: ["Zemax"] },
    linkedin: "none", applies: ["nordic-photonics", "luxbeam"],
  },
  {
    code: "A-14", name: "Lauri Heikkinen", fields: [PHOTONICS], workType: "Testing and validation", stage: "early", careerChanger: false,
    cv: { experience: [exp("Trainee", "Aurora Sensors", "2025-02", "2025-09", [OT, LAB])], education: [edu("BSc", "Electrical Engineering", 2025)], languages: [L("Finnish", "Native"), L("English", "B2")], skills: [] },
    linkedin: "same", applies: ["nordic-photonics"],
  },
  {
    code: "A-15", name: "Amira Haddad", fields: [PHOTONICS], workType: "Production", stage: "early", careerChanger: true,
    cv: { experience: [exp("Pharmacy Technician", "City pharmacy", "2015-06", "2023-12", ["customer service"]), exp("Lab Technician", "Hamina Fiber", "2024-04", "2024-11", [OT, "production testing"])], education: [edu("Vocational", "Laboratory work", 2015)], languages: [L("Arabic", "Native"), L("English", "B2"), L("Finnish", "B1")], skills: [] },
    linkedin: "same", applies: ["nordic-photonics", "finnsensor"],
  },
  {
    code: "A-16", name: "Ivan Kowalski", fields: [PHOTONICS], workType: "Testing and validation", stage: "student", careerChanger: false,
    cv: { experience: [exp("Test Intern", "Nordlys Lasers", "2025-01", "2025-08", [OT])], education: [edu("BSc", "Physics", 2026, true)], languages: [L("Polish", "Native"), L("English", "B1")], skills: ["Python"] },
    linkedin: "same", applies: ["nordic-photonics"],
  },
  {
    code: "A-17", name: "Fatima Benali", fields: [PHOTONICS], workType: "Testing and validation", stage: "early", careerChanger: false,
    cv: { experience: [exp("Junior Test Engineer", "Fjord Instruments", "2025-03", null, [OT, LAB])], education: [edu("MSc", "Photonics", 2024)], languages: [L("French", "Native"), L("English", "C1")], skills: ["Python"] },
    linkedin: "same", applies: ["nordic-photonics", "quantumlab"],
  },
  {
    code: "A-18", name: "Noah Andersson", fields: [PHOTONICS], workType: "Testing and validation", stage: "student", careerChanger: false,
    cv: { experience: [exp("Test Intern", "Polar Microsystems", "2024-06", "2024-10", [OT]), exp("Summer Trainee", "Polar Microsystems Lab", "2025-06", "2025-08", [OT])], education: [edu("BSc", "Electrical Engineering", 2026, true)], languages: [L("Swedish", "Native"), L("English", "C1"), L("Finnish", "B2")], skills: [] },
    linkedin: "same", applies: ["nordic-photonics"],
  },
  // Talent pool only (no applications yet): used for the companies' "people in the pool" stats.
  {
    code: "P-01", name: "Kenji Sato", fields: [PHOTONICS], workType: "Testing and validation", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Optical Test Engineer", "Nordlys Lasers", "2020-05", null, [OT, LAB])], education: [edu("MSc", "Photonics", 2020)], languages: [L("English", "C1"), L("Japanese", "Native")], skills: ["Python"] },
    linkedin: "same", applies: [],
  },
  {
    code: "P-02", name: "Olivia Brown", fields: [MICRO], workType: "Engineering and design", stage: "experienced", careerChanger: false,
    cv: { experience: [exp("Verification Engineer", "Polar Microsystems", "2019-01", null, ["verification", "uvm"])], education: [edu("MSc", "Electrical Engineering", 2018)], languages: [L("English", "Native")], skills: ["SystemVerilog"] },
    linkedin: "same", applies: [],
  },
  {
    code: "P-03", name: "Ahmed Karimi", fields: [QUANTUM], workType: "Research", stage: "senior", careerChanger: false,
    cv: { experience: [exp("Postdoctoral Researcher", "University quantum lab", "2019-09", null, ["cryogenic measurement", LAB])], education: [edu("PhD", "Physics", 2019)], languages: [L("English", "C2"), L("Persian", "Native")], skills: ["Python", "QCoDeS"] },
    linkedin: "same", applies: [],
  },
  {
    code: "P-04", name: "Emilia Laine", fields: [MICRO, QUANTUM], workType: "Engineering and design", stage: "early", careerChanger: false,
    cv: { experience: [exp("Hardware Engineer", "Kide Photonics", "2024-01", null, ["pcb design"])], education: [edu("MSc", "Electrical Engineering", 2023)], languages: [L("Finnish", "Native"), L("English", "C1")], skills: ["KiCad"] },
    linkedin: "same", applies: [],
  },
  {
    code: "P-05", name: "Carlos Mendes", fields: [PHOTONICS], workType: "Business and sales", stage: "senior", careerChanger: true,
    cv: { experience: [exp("Sales Engineer", "Hamina Fiber", "2017-03", null, ["sales"])], education: [edu("BSc", "Physics", 2012)], languages: [L("Portuguese", "Native"), L("English", "C1")], skills: [] },
    linkedin: "same", applies: [],
  },
];

/** LinkedIn facts built from the CV with the planned differences (synthetic stand-in for a live profile). */
export function linkedinFrom(cv: CvFacts, plan: LinkedinPlan): LinkedinFacts | null {
  if (plan === "none") return null;
  const p = plan === "same" ? {} : plan;
  return {
    experience: cv.experience
      .filter((e) => e.employer !== p.dropEmployer)
      .map((e) => {
        let start = e.start;
        if (p.shiftStart && p.shiftStart[0] === e.employer) {
          const [y, m] = e.start.split("-").map(Number);
          const idx = y * 12 + (m - 1) - p.shiftStart[1];
          start = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
        }
        return {
          title: p.retitle && p.retitle[0] === e.employer ? p.retitle[1] : e.title,
          employer: e.employer,
          start,
          end: e.end,
        };
      }),
    education: cv.education.filter((e) => !e.inProgress).map(({ degree, field, year }) => ({ degree, field, year })),
    skills: cv.skills.filter((s) => !(p.dropSkills ?? []).includes(s)),
  };
}

/** Plain-text CV rendered from the facts (what a candidate would upload). */
export function cvText(name: string, cv: CvFacts): string {
  const lines = [name, "", "EXPERIENCE"];
  for (const e of [...cv.experience].reverse()) {
    lines.push(`${e.title}, ${e.employer} (${e.start} – ${e.end ?? "present"})`);
    for (const t of e.tasks) lines.push(`- ${t}`);
    if (e.areas.length) lines.push(`- Areas: ${e.areas.join(", ")}`);
  }
  lines.push("", "EDUCATION");
  for (const ed of cv.education) lines.push(`${ed.degree} in ${ed.field}, ${ed.inProgress ? "in progress" : ed.year}`);
  lines.push("", "LANGUAGES", cv.languages.map((l) => `${l.language} ${l.level}`).join(", "));
  if (cv.skills.length) lines.push("", "SKILLS", cv.skills.join(", "));
  return lines.join("\n");
}
