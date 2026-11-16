import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Source } from "./nutrition";

const MODEL = () => process.env.OPENAI_MODEL || "gpt-6-luna";

// The researcher may only read from health authorities, universities and research publishers.
// (Subdomains are included automatically, e.g. nih.gov covers niddk.nih.gov.)
const TRUSTED_DOMAINS = [
  "nih.gov", "cdc.gov", "who.int", "nhs.uk", "health.gov", "usda.gov", "fda.gov", "medlineplus.gov", "nice.org.uk",
  "mayoclinic.org", "clevelandclinic.org", "hopkinsmedicine.org", "harvard.edu", "stanford.edu", "ox.ac.uk", "cam.ac.uk",
  "bmj.com", "thelancet.com", "nature.com", "jamanetwork.com", "nejm.org", "springer.com", "sciencedirect.com", "wiley.com",
  "tandfonline.com", "plos.org", "frontiersin.org", "mdpi.com", "cochranelibrary.com", "acsm.org", "eatright.org",
  "nutrition.org", "diabetes.org", "heart.org", "cancer.org", "obesityaction.org", "worldobesity.org", "examine.com",
  "icmr.gov.in", "nin.res.in", "nhp.gov.in", "aiims.edu", "fssai.gov.in", "health.gov.au", "canada.ca", "gov.uk",
];

// Strip markdown links / inline citations the model sometimes adds to strings.
export function clean(s: string) {
  return s
    .replace(/\s*\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function pickSources(sources: { sourceType?: string; url?: string }[], limit = 6): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    if (s.sourceType !== "url" || !s.url) continue;
    let host: string;
    try {
      host = new URL(s.url).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (seen.has(host)) continue;
    seen.add(host);
    out.push({ url: s.url, host });
    if (out.length >= limit) break;
  }
  return out;
}

async function searchAndAnswer<T extends z.ZodType>(opts: { schema: T; prompt: string; system: string; timeoutMs: number }) {
  const r = await generateText({
    model: openai(MODEL()),
    system: opts.system,
    tools: { web_search: openai.tools.webSearch({ searchContextSize: "low", filters: { allowedDomains: TRUSTED_DOMAINS } }) },
    toolChoice: { type: "tool", toolName: "web_search" },
    output: Output.object({ schema: opts.schema }),
    prompt: opts.prompt,
    abortSignal: AbortSignal.timeout(opts.timeoutMs),
  });
  return { output: r.output as z.infer<T>, sources: pickSources(r.sources as never) };
}

const SYSTEM = [
  "You are a nutrition and fitness research assistant inside a calorie tracking app.",
  "Always search the web first and base every statement on what the sources you find say today.",
  "Prefer authoritative sources: WHO, NIH/NIDDK, CDC, NHS, Mayo Clinic, ACSM, ISSN, peer reviewed papers.",
  "Write plain, friendly, concrete text. Never include URLs, markdown, or citations inside the text fields.",
].join(" ");

/* ---------------------------------- TIPS ---------------------------------- */

export const TIP_TOPICS = {
  height:
    "How can someone measure their own height accurately at home when they have no tape measure or inch tape? Practical step by step methods using household items (wall, book, ruler, paper, phone, a known object length).",
  weight:
    "How to weigh yourself accurately for body weight tracking: best time of day, scale placement, clothing, how often, and what to do when you have no scale.",
  target:
    "What is a safe and realistic rate of weight loss or weight gain per week according to health authorities, and how long does it typically take to change body weight by a given amount?",
  activity:
    "How do you pick your physical activity level (sedentary, lightly active, moderately active, very active) when estimating daily calorie burn? Give clear everyday examples for each level, including runners.",
} as const;
export type TipTopic = keyof typeof TIP_TOPICS;

const tipSchema = z.object({
  title: z.string().describe("A short catchy heading, max 8 words"),
  tips: z.array(z.string()).min(3).max(4).describe("Each tip is one or two short sentences, max 150 characters"),
});

export async function fetchTip(topic: TipTopic) {
  const { output, sources } = await searchAndAnswer({
    schema: tipSchema,
    system: SYSTEM,
    prompt: `Search the web, then answer for a mobile app tip card.\nQuestion: ${TIP_TOPICS[topic]}`,
    timeoutMs: 60_000,
  });
  return { title: clean(output.title), tips: output.tips.map(clean).filter(Boolean), sources };
}

/* ---------------------------------- PLANS --------------------------------- */

const planSchema = z.object({
  summary: z.string().describe("Two friendly sentences summarising the situation and what the research says"),
  caution: z.string().describe("Empty string unless the requested goal or timeline is unsafe or unrealistic; then one short sentence"),
  plans: z
    .array(
      z.object({
        name: z.string().describe("2-3 word plan name"),
        tagline: z.string().describe("Max 10 words"),
        dailyKcal: z.number().int(),
        proteinG: z.number().int(),
        carbsG: z.number().int(),
        fatG: z.number().int(),
        fiberG: z.number().int(),
        why: z.string().describe("One or two sentences in plain words explaining why, referencing what health guidelines say"),
        recommended: z.boolean(),
      }),
    )
    .length(2),
});
export type AiPlans = z.infer<typeof planSchema>;

export type PlanFacts = {
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  targetDays: number;
  activity: string;
  bmi: number;
  bmr: number;
  tdee: number;
  minKcal: number;
  maxKcal: number;
};

export async function fetchPlans(f: PlanFacts) {
  const dir = f.targetKg < f.weightKg ? "lose" : "gain";
  const prompt = `Search the web for current evidence-based guidance on ${dir === "lose" ? "safe fat loss rate, calorie deficit size, protein needs while dieting" : "healthy weight gain rate, calorie surplus size, protein needs for gaining"}, then design 2 daily calorie plans for this person.

Person: ${f.sex}, ${f.age} years, ${f.heightCm} cm, ${f.weightKg} kg (BMI ${f.bmi.toFixed(1)}), activity level "${f.activity}".
Computed energy: BMR ${f.bmr} kcal, maintenance (TDEE) ${f.tdee} kcal/day.
Goal: ${dir} from ${f.weightKg} kg to ${f.targetKg} kg. The person asked to get there in ${f.targetDays} days.
Hard safety window the app enforces: dailyKcal must be between ${f.minKcal} and ${f.maxKcal}.

Rules:
- Return exactly 2 plans ordered from gentler to faster, with clearly different dailyKcal values inside the safety window. (The app separately shows the plan for the exact timeline the person asked for, so do not just repeat it.)
- Exactly one plan has recommended=true: the best balance of sustainability, muscle retention and speed for THIS person, according to the guidance you found.
- Macros in grams must roughly add up to dailyKcal (protein 4, carbs 4, fat 9 kcal per gram) and follow the protein and fat guidance you found. fiberG about 14 g per 1000 kcal.
- If the person's requested timeline is faster than the guidance considers safe, say so in "caution".`;

  const { output, sources } = await searchAndAnswer({ schema: planSchema, system: SYSTEM, prompt, timeoutMs: 100_000 });
  return {
    summary: clean(output.summary),
    caution: clean(output.caution),
    plans: output.plans.map((p) => ({ ...p, name: clean(p.name), tagline: clean(p.tagline), why: clean(p.why) })),
    sources,
  };
}

/* ------------------------------- GUIDELINES ------------------------------- */

const guidelineSchema = z.object({
  kcalPerKg: z.number().describe("Energy equivalent of 1 kg of body weight change, in kcal, as commonly used by health sources"),
  maxLossPctPerWeek: z.number().describe("Maximum recommended weight loss rate as a percent of body weight per week"),
  maxGainPctPerWeek: z.number().describe("Maximum recommended healthy weight gain rate as a percent of body weight per week"),
  minKcalMale: z.number().describe("Lowest daily calories advised for an adult man without medical supervision"),
  minKcalFemale: z.number().describe("Lowest daily calories advised for an adult woman without medical supervision"),
});

export async function fetchGuidelines() {
  const { output, sources } = await searchAndAnswer({
    schema: guidelineSchema,
    system: SYSTEM,
    prompt:
      "Search the web for current health guidance, then return these numbers exactly as the authorities state them (use the most commonly recommended value if they give a range, taking the upper end of the range for the two maximum rates): the energy equivalent of 1 kg of body weight, the maximum recommended weekly weight loss rate as a percent of body weight, the maximum recommended weekly healthy gain rate as a percent of body weight, and the minimum daily calories for adult men and women without medical supervision.",
    timeoutMs: 60_000,
  });
  return { output, sources };
}
