// Pure calorie math, shared by server (validation) and client (live previews).
// The safety numbers (kcal per kg, weekly rate caps, calorie floors) are NOT constants here:
// they are researched on the web by the AI, cached, and passed in as `Limits`.

export type Sex = "male" | "female";
export type Activity = "lazy" | "active" | "very" | "runner";

export const ACTIVITIES: { key: Activity; label: string; desc: string; factor: number }[] = [
  { key: "lazy", label: "Lazy", desc: "Desk life, mostly sitting, little exercise", factor: 1.2 },
  { key: "active", label: "Active", desc: "Workout or sport about 3–4 times a week", factor: 1.375 },
  { key: "very", label: "Very active", desc: "Hard training most days or on your feet all day", factor: 1.55 },
  { key: "runner", label: "Runner", desc: "Running or endurance training almost daily", factor: 1.725 },
];

/** Guideline numbers researched from health sources. */
export type Limits = {
  kcalPerKg: number; // energy in 1 kg of body weight change
  maxLossPct: number; // max recommended loss, % of bodyweight per week
  maxGainPct: number; // max recommended gain, % of bodyweight per week
  minKcalMale: number; // lowest advised daily calories without medical supervision
  minKcalFemale: number;
};

/** Only used if the web research is unavailable. */
export const FALLBACK_LIMITS: Limits = { kcalPerKg: 7700, maxLossPct: 1, maxGainPct: 0.5, minKcalMale: 1500, minKcalFemale: 1200 };

export type Body = { sex: Sex; age: number; heightCm: number; weightKg: number };

/** Mifflin-St Jeor resting energy. */
export function bmr({ sex, age, heightCm, weightKg }: Body) {
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161));
}

export const activityFactor = (a: Activity) => ACTIVITIES.find((x) => x.key === a)!.factor;

export function tdee(body: Body, activity: Activity) {
  return Math.round(bmr(body) * activityFactor(activity));
}

export function bmi(heightCm: number, weightKg: number) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type Goal = { tdee: number; sex: Sex; weightKg: number; targetKg: number };

/** Safe daily calorie window for a goal, from the researched limits. */
export function kcalBounds({ tdee, sex, weightKg, targetKg }: Goal, L: Limits) {
  const perDayAtPct = (pct: number) => ((pct / 100) * weightKg * L.kcalPerKg) / 7;
  if (targetKg < weightKg) {
    const floor = sex === "male" ? L.minKcalMale : L.minKcalFemale;
    const max = Math.round(tdee - 100);
    const min = Math.min(max, Math.max(floor, Math.round(tdee - perDayAtPct(L.maxLossPct))));
    return { min, max };
  }
  return { min: Math.round(tdee + 100), max: Math.round(tdee + perDayAtPct(L.maxGainPct)) };
}

/** Where the goal lands when eating `kcal` per day. */
export function project(g: Goal, kcal: number, L: Limits) {
  const diff = kcal - g.tdee;
  const need = g.targetKg - g.weightKg;
  const weeklyKg = (diff * 7) / L.kcalPerKg;
  if (Math.abs(need) < 0.05 || diff * need <= 0) return { weeklyKg, days: null as number | null, endDate: null as string | null };
  const days = Math.ceil((Math.abs(need) * L.kcalPerKg) / Math.abs(diff));
  const d = new Date();
  d.setDate(d.getDate() + days);
  return { weeklyKg, days, endDate: d.toISOString().slice(0, 10) };
}

/** Daily calories needed to arrive in exactly `days`. */
export function kcalForDays(g: Goal, days: number, L: Limits) {
  return Math.round(g.tdee + ((g.targetKg - g.weightKg) * L.kcalPerKg) / days);
}

/** A comfortable pace: half of the researched maximum weekly rate. */
export function defaultDays(weightKg: number, targetKg: number, L: Limits) {
  const need = Math.abs(targetKg - weightKg);
  const pct = (targetKg < weightKg ? L.maxLossPct : L.maxGainPct) / 2 / 100;
  return Math.max(14, Math.round(need / (weightKg * pct)) * 7);
}

/** How hard a requested pace is, relative to the researched maximum. */
export function paceVerdict(weightKg: number, targetKg: number, days: number, L: Limits) {
  const weeklyKg = (targetKg - weightKg) / (days / 7);
  const max = (targetKg < weightKg ? L.maxLossPct : L.maxGainPct) / 100;
  const pct = Math.abs(weeklyKg) / weightKg;
  const level = pct <= (max / 2) * 1.08 ? "Steady pace" : pct <= max * 1.02 ? "Ambitious" : "Too fast";
  return { weeklyKg, level, tooFast: pct > max * 1.02 };
}

export function macros(kcal: number, weightKg: number, targetKg: number) {
  const proteinG = Math.round(1.8 * Math.min(weightKg, targetKg));
  const fatG = Math.round((0.27 * kcal) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  const fiberG = Math.round((14 * kcal) / 1000);
  return { proteinG, carbsG, fatG, fiberG };
}

export type Plan = {
  id: string;
  name: string;
  tagline: string;
  source: "ai" | "calculated" | "yours";
  recommended: boolean;
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  weeklyKg: number;
  days: number | null;
  endDate: string | null;
  why: string;
  note?: string;
};

/** Every step of the maths, so the screen can show exactly how a number was reached. */
export type Math = {
  bmr: number;
  activityLabel: string;
  factor: number;
  tdee: number;
  deltaKg: number; // signed: + gain, - loss
  kcalPerKg: number;
  totalKcal: number;
  daysAsked: number;
  askedKcal: number; // what the requested timeline would need per day
  askedDelta: number; // askedKcal - tdee
  safeKcal: number; // the safe value actually used
  feasible: boolean;
  maxDelta: number; // largest safe daily change from maintenance
  maxPct: number; // the weekly % cap behind it
};

export type Source = { url: string; host: string };
