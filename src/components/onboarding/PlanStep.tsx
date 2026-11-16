"use client";

import { useEffect, useMemo, useState } from "react";
import type { Plan } from "@/lib/nutrition";
import { formatDate, kgToLb, type WeightUnit } from "@/lib/units";
import { Heading, Sub } from "../ui";
import { Sources } from "./Tip";
import type { Data, PlansResponse, Selection } from "./types";

const LOADING_LINES = [
  "Searching the latest health guidelines…",
  "Checking safe rates of weight change…",
  "Crunching your energy numbers…",
  "Balancing protein, carbs and fat…",
  "Almost there…",
];

const n = (v: number) => Math.round(v).toLocaleString("en-US");
const signed = (v: number) => `${v >= 0 ? "+" : "−"}${n(Math.abs(v))}`;

function weekly(kg: number, unit: WeightUnit) {
  const v = unit === "kg" ? kg : kgToLb(kg);
  return `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(2)} ${unit}/wk`;
}

function Loading() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((k) => Math.min(k + 1, LOADING_LINES.length - 1)), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center" aria-live="polite">
      <div className="relative grid size-40 place-items-center">
        <div className="orb absolute inset-0 bg-neon" />
        <div className="orb absolute inset-6 bg-ink [animation-delay:-1.2s]" />
        <svg className="wiggle relative" width="34" height="34" viewBox="0 0 24 24" fill="#e2f73b">
          <path d="M12 2C12.8 7.5 16.5 11.2 22 12C16.5 12.8 12.8 16.5 12 22C11.2 16.5 7.5 12.8 2 12C7.5 11.2 11.2 7.5 12 2Z" />
        </svg>
      </div>
      <div>
        <p className="text-2xl font-bold">Building your plan</p>
        <p key={i} className="rise mt-2 text-[15px] font-medium text-ink/55">
          {LOADING_LINES[i]}
        </p>
      </div>
    </div>
  );
}

function MacroBar({ p }: { p: Pick<Plan, "proteinG" | "carbsG" | "fatG" | "fiberG"> }) {
  const parts = [
    { k: "Protein", g: p.proteinG, kcal: p.proteinG * 4, cls: "bg-ink" },
    { k: "Carbs", g: p.carbsG, kcal: p.carbsG * 4, cls: "bg-neon border-x border-ink" },
    { k: "Fat", g: p.fatG, kcal: p.fatG * 9, cls: "bg-ink/30" },
  ];
  const total = parts.reduce((s, x) => s + x.kcal, 0) || 1;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full border-[1.5px] border-ink">
        {parts.map((x) => (
          <div key={x.k} className={`${x.cls} transition-all duration-500`} style={{ width: `${(x.kcal / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1 text-center">
        {[...parts, { k: "Fiber", g: p.fiberG }].map((x) => (
          <div key={x.k}>
            <div className="text-[17px] font-bold tabular-nums">{x.g}g</div>
            <div className="text-[11px] font-bold text-ink/50">{x.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect, unit }: { plan: Plan; selected: boolean; onSelect: () => void; unit: WeightUnit }) {
  return (
    <div
      className={`rounded-3xl border-[1.5px] transition-all duration-300 ${
        selected ? "border-ink bg-neon shadow-[0_6px_0_0_var(--ink)]" : "border-ink/15 bg-white"
      }`}
    >
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex w-full items-center gap-3 p-4 text-left active:scale-[0.985]">
        <span className="min-w-0 flex-1">
          {plan.recommended && (
            <span className="mb-1.5 inline-block rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-neon">
              Best for you
            </span>
          )}
          <span className="block text-[19px] font-bold leading-tight">{plan.name}</span>
          <span className="block text-[13px] font-medium leading-snug text-ink/60">{plan.tagline}</span>
        </span>
        <span className="text-right">
          <span className="block text-[30px] font-bold leading-none tabular-nums">{n(plan.dailyKcal)}</span>
          <span className="block text-[11px] font-bold text-ink/55">kcal / day</span>
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${selected ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3.5 px-4 pb-4">
            <div className="flex flex-wrap gap-2 text-[13px] font-bold">
              <span className="rounded-full bg-ink px-3 py-1 text-white">{plan.days ? `${plan.days} days` : "No progress"}</span>
              {plan.endDate && <span className="rounded-full bg-white px-3 py-1">{formatDate(plan.endDate)}</span>}
              <span className="rounded-full bg-white px-3 py-1">{weekly(plan.weeklyKg, unit)}</span>
            </div>
            <MacroBar p={plan} />
            {plan.why && <p className="text-[14px] font-medium leading-snug">{plan.why}</p>}
            {plan.note && <p className="rounded-xl bg-ink px-3 py-2.5 text-[13px] font-medium leading-snug text-white">{plan.note}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Every step of the arithmetic behind the numbers, taken straight from the server's calculation. */
function MathCard({ res }: { res: PlansResponse }) {
  const [open, setOpen] = useState(false);
  const m = res.math;
  const gain = m.deltaKg > 0;
  const row = "flex items-baseline justify-between gap-3 border-b border-ink/10 py-2.5 last:border-0";
  return (
    <div className="rounded-3xl border-[1.5px] border-ink/15 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
        <span className="text-[15px] font-bold">How these numbers were calculated</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={`shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 text-[14px] font-medium">
            <div className={row}>
              <span>Resting burn (Mifflin-St Jeor)</span>
              <b className="tabular-nums">{n(m.bmr)} kcal</b>
            </div>
            <div className={row}>
              <span>
                × {m.factor} activity ({m.activityLabel})
              </span>
              <b className="tabular-nums">{n(m.tdee)} kcal/day</b>
            </div>
            <div className={row}>
              <span>
                {gain ? "Gain" : "Lose"} {Math.abs(m.deltaKg).toFixed(1)} kg × {n(m.kcalPerKg)} kcal/kg
              </span>
              <b className="tabular-nums">{n(m.totalKcal)} kcal</b>
            </div>
            <div className={row}>
              <span>÷ {m.daysAsked} days you asked for</span>
              <b className="tabular-nums">{signed(m.askedDelta)} /day</b>
            </div>
            <div className={row}>
              <span>= needed to hit your date</span>
              <b className="tabular-nums">{n(m.askedKcal)} kcal/day</b>
            </div>
            <div className={row}>
              <span>
                Safe limit: at most {signed(gain ? m.maxDelta : -m.maxDelta)} /day ({m.maxPct}% of bodyweight a week)
              </span>
              <b className="shrink-0 tabular-nums">{m.feasible ? "within ✓" : "over this limit"}</b>
            </div>
            <p className="mt-3 text-[12px] leading-snug text-ink/55">
              These are estimates, typically within about ±10%. Weigh yourself for 2–3 weeks; if progress is off, change your goal in Settings and the plan is recalculated.
            </p>
            {res.limitSources.length > 0 && <Sources sources={res.limitSources} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanStep({
  d,
  res,
  setRes,
  onSelect,
}: {
  d: Data;
  res: PlansResponse | null;
  setRes: (r: PlansResponse | null) => void;
  onSelect: (s: Selection | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [choice, setChoice] = useState<{ key: string; id: string } | null>(null);
  const unit = d.units.weight;

  const payload = useMemo(
    () => ({ sex: d.sex, age: d.age, heightCm: d.heightCm, weightKg: d.weightKg, targetKg: d.targetKg, targetDays: d.targetDays, activity: d.activity }),
    [d.sex, d.age, d.heightCm, d.weightKg, d.targetKg, d.targetDays, d.activity],
  );
  const key = JSON.stringify(payload);
  // A cached result only counts if it was made for exactly these inputs.
  const data = res && res._key === key ? res : null;

  // (Re)fetch when the inputs changed since the cached result, or on retry.
  useEffect(() => {
    if (res?._key === key) return;
    let alive = true;
    fetch("/api/onboarding/plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: key })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not build your plan");
        return j as PlansResponse;
      })
      .then((j) => alive && setRes({ ...j, _key: key }))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  // The AI's plans (best first), then the plan for the user's own timeline.
  const cards = useMemo(() => {
    if (!data) return [];
    const ai = [...data.plans].sort((a, b) => Number(b.recommended) - Number(a.recommended));
    return [...ai, data.yours];
  }, [data]);

  // The recommended plan is preselected until the user picks something else.
  const mine = choice && choice.key === key ? choice : null;
  const selId = mine?.id ?? cards[0]?.id ?? null;
  const selected = cards.find((c) => c.id === selId) ?? null;

  useEffect(() => {
    onSelect(
      selected
        ? { name: selected.name, source: selected.source, dailyKcal: selected.dailyKcal, proteinG: selected.proteinG, carbsG: selected.carbsG, fatG: selected.fatG, fiberG: selected.fiberG }
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.dailyKcal]);

  if (error)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-2xl font-bold">Couldn’t build your plan</p>
        <p className="text-[15px] font-medium text-ink/55">{error}</p>
        <button type="button" onClick={() => (setError(null), setAttempt((k) => k + 1))} className="h-12 rounded-2xl bg-neon px-6 font-bold active:scale-95">
          Try again
        </button>
      </div>
    );

  if (!data) return <Loading />;

  return (
    <div className="stagger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading before="Pick your " mark="plan" />
        <Sub>{data.summary}</Sub>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { v: n(data.bmr), l: "Resting burn" },
          { v: n(data.tdee), l: "Daily burn" },
          { v: data.bmi.toFixed(1), l: "Your BMI" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl bg-ink/[0.05] px-2 py-3">
            <div className="text-[20px] font-bold tabular-nums">{x.v}</div>
            <div className="text-[11px] font-bold text-ink/50">{x.l}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {cards.map((c) => (
          <PlanCard key={c.id} plan={c} selected={selId === c.id} onSelect={() => setChoice({ key, id: c.id })} unit={unit} />
        ))}
      </div>

      <MathCard res={data} />

      <div className="rounded-2xl bg-ink/[0.05] p-3.5">
        <p className="text-[12px] font-medium leading-snug text-ink/60">
          {data.ai
            ? "The two suggested plans were researched live on the web by AI, then checked against the safe limits by the app. General guidance, not medical advice."
            : "The AI researcher was unavailable, so these are calculated from standard energy maths. General guidance, not medical advice."}
        </p>
        <Sources sources={data.sources} />
      </div>
    </div>
  );
}
