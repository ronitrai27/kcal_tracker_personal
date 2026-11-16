import { Hono } from "hono";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { fetchPlans, fetchTip, TIP_TOPICS, type TipTopic } from "@/lib/ai";
import {
  ACTIVITIES,
  activityFactor,
  bmi as calcBmi,
  bmr as calcBmr,
  defaultDays,
  kcalBounds,
  kcalForDays,
  macros,
  project,
  tdee as calcTdee,
  type Goal,
  type Limits,
  type Math as CalcMath,
  type Plan,
  type Source,
} from "@/lib/nutrition";
import { getLimits } from "./limits";

type Env = { Variables: { userId: string } };
export const onboarding = new Hono<Env>();

onboarding.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.user.id);
  await next();
});

const body = z.object({
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(14).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  targetKg: z.number().min(30).max(300),
  targetDays: z.number().int().min(7).max(1825),
  activity: z.enum(["lazy", "active", "very", "runner"]),
});
type Body = z.infer<typeof body>;

function derive(b: Body, L: Limits) {
  const energy = { sex: b.sex, age: b.age, heightCm: b.heightCm, weightKg: b.weightKg };
  const tdee = calcTdee(energy, b.activity);
  const goal: Goal = { tdee, sex: b.sex, weightKg: b.weightKg, targetKg: b.targetKg };
  return { bmr: calcBmr(energy), tdee, bmi: calcBmi(b.heightCm, b.weightKg), goal, bounds: kcalBounds(goal, L) };
}

function buildPlan(
  goal: Goal,
  L: Limits,
  extra: Pick<Plan, "id" | "name" | "tagline" | "source" | "recommended" | "why"> & { note?: string },
  kcal: number,
  m?: Partial<ReturnType<typeof macros>>,
): Plan {
  const mac = { ...macros(kcal, goal.weightKg, goal.targetKg), ...stripBad(m) };
  const p = project(goal, kcal, L);
  return { ...extra, dailyKcal: kcal, ...mac, weeklyKg: p.weeklyKg, days: p.days, endDate: p.endDate };
}

function stripBad(m?: Partial<ReturnType<typeof macros>>) {
  const out: Partial<ReturnType<typeof macros>> = {};
  if (!m) return out;
  for (const k of ["proteinG", "carbsG", "fatG", "fiberG"] as const) {
    const v = m[k];
    if (typeof v === "number" && v > 0 && v < 1000) out[k] = Math.round(v);
  }
  return out;
}


/* ---------------------------------- TIPS ---------------------------------- */

const TIP_TTL_DAYS = 14;

onboarding.get("/tip/:topic", async (c) => {
  const topic = c.req.param("topic") as TipTopic;
  if (!(topic in TIP_TOPICS)) return c.json({ error: "unknown topic" }, 404);

  const cached = await pool.query(
    `select title, tips, sources, fetched_at, fetched_at > now() - make_interval(days => $2) as fresh from tip_cache where topic = $1`,
    [topic, TIP_TTL_DAYS],
  );
  const row = cached.rows[0];
  if (row?.fresh) return c.json({ title: row.title, tips: row.tips, sources: row.sources, fetchedAt: row.fetched_at });

  try {
    const t = await fetchTip(topic);
    await pool.query(
      `insert into tip_cache (topic, title, tips, sources, fetched_at) values ($1, $2, $3, $4, now())
       on conflict (topic) do update set title = excluded.title, tips = excluded.tips, sources = excluded.sources, fetched_at = now()`,
      [topic, t.title, JSON.stringify(t.tips), JSON.stringify(t.sources)],
    );
    return c.json({ ...t, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error("tip failed", topic, err);
    if (row) return c.json({ title: row.title, tips: row.tips, sources: row.sources, fetchedAt: row.fetched_at });
    return c.json({ error: "tip unavailable" }, 502);
  }
});

/* ------------------------------- GUIDELINES ------------------------------- */

onboarding.get("/guidelines", async (c) => {
  const { limits, sources, researched } = await getLimits();
  return c.json({ limits, sources, researched });
});

/* ---------------------------------- PLANS --------------------------------- */

onboarding.post("/plans", async (c) => {
  const parsed = body.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid input" }, 400);
  const b = parsed.data;
  if (Math.abs(b.targetKg - b.weightKg) < 0.5) return c.json({ error: "target must differ from current weight" }, 400);

  const { limits: L, sources: limitSources, researched } = await getLimits();
  const { bmr, tdee, bmi, goal, bounds } = derive(b, L);
  const clamp = (k: number) => Math.min(bounds.max, Math.max(bounds.min, Math.round(k)));
  const gain = b.targetKg > b.weightKg;

  // The plan for exactly the timeline the user asked for: the true kcal needed, never capped.
  const asked = kcalForDays(goal, b.targetDays, L);
  const safe = clamp(asked);
  const feasible = safe === Math.round(asked);
  const end = new Date();
  end.setDate(end.getDate() + b.targetDays);

  const yours: Plan = {
    ...buildPlan(
      goal,
      L,
      {
        id: "yours",
        name: "Your timeline",
        tagline: asked < 0 ? "Even eating nothing wouldn’t get there in time" : `${b.targetDays} days, as you asked`,
        source: "yours",
        recommended: false,
        why: "The exact daily intake needed to land on your target date.",
      },
      Math.max(0, Math.round(asked)),
    ),
    days: b.targetDays,
    endDate: end.toISOString().slice(0, 10),
  };

  const math: CalcMath = {
    bmr,
    activityLabel: ACTIVITIES.find((a) => a.key === b.activity)!.label,
    factor: activityFactor(b.activity),
    tdee,
    deltaKg: b.targetKg - b.weightKg,
    kcalPerKg: L.kcalPerKg,
    totalKcal: Math.round(Math.abs(b.targetKg - b.weightKg) * L.kcalPerKg),
    daysAsked: b.targetDays,
    askedKcal: Math.round(asked),
    askedDelta: Math.round(asked - tdee),
    safeKcal: safe,
    feasible,
    maxDelta: Math.abs((gain ? bounds.max : bounds.min) - tdee),
    maxPct: gain ? L.maxGainPct : L.maxLossPct,
  };

  let ai = true;
  let summary = "";
  let caution = "";
  let sources: Source[] = [];
  let plans: Plan[] = [];

  try {
    const r = await fetchPlans({
      sex: b.sex,
      age: b.age,
      heightCm: b.heightCm,
      weightKg: b.weightKg,
      targetKg: b.targetKg,
      targetDays: b.targetDays,
      activity: b.activity,
      bmi,
      bmr,
      tdee,
      minKcal: bounds.min,
      maxKcal: bounds.max,
    });
    summary = r.summary;
    caution = r.caution;
    sources = r.sources;
    const sorted = [...r.plans].sort((a, z) => Math.abs(tdee - a.dailyKcal) - Math.abs(tdee - z.dailyKcal));
    let recIdx = sorted.findIndex((p) => p.recommended);
    if (recIdx < 0) recIdx = 0;
    plans = sorted.map((p, i) =>
      buildPlan(
        goal,
        L,
        { id: `ai-${i}`, name: p.name, tagline: p.tagline, source: "ai", recommended: i === recIdx, why: p.why },
        clamp(p.dailyKcal),
        p,
      ),
    );
  } catch (err) {
    console.error("plans failed", err);
    ai = false;
  }

  if (!ai) {
    // Fallback: two safe paces inside the window, clearly labelled as calculated.
    const steps = [0.3, 0.8];
    const names = ["Easy pace", "Fast track"];
    plans = steps.map((t, i) =>
      buildPlan(
        goal,
        L,
        {
          id: `calc-${i}`,
          name: names[i],
          tagline: "Calculated from your numbers",
          source: "calculated",
          recommended: i === 0,
          why: "Based on standard energy balance maths. The AI research assistant was unavailable.",
        },
        clamp(gain ? bounds.min + t * (bounds.max - bounds.min) : bounds.max - t * (bounds.max - bounds.min)),
      ),
    );
    summary = "Here are two safe paces calculated from your body and activity.";
  }

  // Drop duplicate calorie levels so cards are meaningfully different.
  const seen = new Set<number>([yours.dailyKcal]);
  plans = plans.filter((p) => (seen.has(p.dailyKcal) ? false : (seen.add(p.dailyKcal), true)));
  if (!plans.some((p) => p.recommended) && plans[0]) plans[0].recommended = true;

  return c.json({
    ai,
    summary,
    caution,
    sources,
    bmr,
    tdee,
    bmi,
    bounds,
    defaultDays: defaultDays(b.weightKg, b.targetKg, L),
    plans,
    yours,
    math,
    limits: L,
    limitSources,
    limitsResearched: researched,
  });
});

/* -------------------------------- COMPLETE -------------------------------- */

const complete = body.extend({
  units: z.object({ height: z.string().max(8), weight: z.string().max(8), time: z.string().max(8) }),
  plan: z.object({
    name: z.string().min(1).max(60),
    source: z.enum(["ai", "calculated", "yours"]),
    dailyKcal: z.number().int(),
    proteinG: z.number().int().min(0).max(1000),
    carbsG: z.number().int().min(0).max(2000),
    fatG: z.number().int().min(0).max(1000),
    fiberG: z.number().int().min(0).max(300),
  }),
});

onboarding.post("/complete", async (c) => {
  const parsed = complete.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid input" }, 400);
  const b = parsed.data;
  const { limits: L } = await getLimits();
  const { bmr, tdee, goal, bounds } = derive(b, L);

  // Suggested plans must stay inside the researched safe window; the user's own timeline is saved exactly as asked.
  const own = b.plan.source === "yours";
  const outOfRange = own ? b.plan.dailyKcal < 0 || b.plan.dailyKcal > 20000 : b.plan.dailyKcal < bounds.min || b.plan.dailyKcal > bounds.max;
  if (outOfRange) {
    return c.json({ error: `Calories must be between ${bounds.min} and ${bounds.max} for your goal` }, 400);
  }
  const p = project(goal, b.plan.dailyKcal, L);
  if (own) {
    const e = new Date();
    e.setDate(e.getDate() + b.targetDays);
    p.days = b.targetDays;
    p.endDate = e.toISOString().slice(0, 10);
  }

  await pool.query(
    `insert into profile (user_id, sex, age, height_cm, weight_kg, target_weight_kg, target_days, activity, units, bmr, tdee,
       plan_name, plan_source, daily_kcal, protein_g, carbs_g, fat_g, fiber_g, plan_days, plan_end_date)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     on conflict (user_id) do update set
       sex=excluded.sex, age=excluded.age, height_cm=excluded.height_cm, weight_kg=excluded.weight_kg,
       target_weight_kg=excluded.target_weight_kg, target_days=excluded.target_days, activity=excluded.activity,
       units=excluded.units, bmr=excluded.bmr, tdee=excluded.tdee, plan_name=excluded.plan_name,
       plan_source=excluded.plan_source, daily_kcal=excluded.daily_kcal, protein_g=excluded.protein_g,
       carbs_g=excluded.carbs_g, fat_g=excluded.fat_g, fiber_g=excluded.fiber_g, plan_days=excluded.plan_days,
       plan_end_date=excluded.plan_end_date, updated_at=now()`,
    [
      c.get("userId"), b.sex, b.age, b.heightCm, b.weightKg, b.targetKg, b.targetDays, b.activity,
      JSON.stringify(b.units), bmr, tdee, b.plan.name, b.plan.source, b.plan.dailyKcal,
      b.plan.proteinG, b.plan.carbsG, b.plan.fatG, b.plan.fiberG, p.days, p.endDate,
    ],
  );
  return c.json({ ok: true });
});
