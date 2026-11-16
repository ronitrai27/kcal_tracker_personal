import type { Activity, Limits, Math as CalcMath, Plan, Sex, Source } from "@/lib/nutrition";
import type { HeightUnit, TimeUnit, WeightUnit } from "@/lib/units";

export type Data = {
  heightCm: number;
  weightKg: number;
  targetKg: number;
  targetDays: number;
  sex: Sex;
  age: number;
  activity: Activity;
  units: { height: HeightUnit; weight: WeightUnit; time: TimeUnit };
};

export type PlansResponse = {
  ai: boolean;
  summary: string;
  caution: string;
  sources: Source[];
  bmr: number;
  tdee: number;
  bmi: number;
  bounds: { min: number; max: number };
  defaultDays: number;
  plans: Plan[];
  yours: Plan;
  math: CalcMath;
  limits: Limits;
  limitSources: Source[];
  limitsResearched: boolean;
  _key?: string;
};

export type Selection = {
  name: string;
  source: Plan["source"];
  dailyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
};
