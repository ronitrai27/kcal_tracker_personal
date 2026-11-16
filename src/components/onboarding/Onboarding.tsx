"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { defaultDays, FALLBACK_LIMITS, type Limits } from "@/lib/nutrition";
import { Button, ErrorText } from "../ui";
import { PlanStep } from "./PlanStep";
import { ActivityStep, HeightStep, TargetStep, WeightStep } from "./Steps";
import type { Data, PlansResponse, Selection } from "./types";

type Phase = "in-fwd" | "in-back" | "out-fwd" | "out-back";
type StepKey = "height" | "weight" | "target" | "activity" | "plan";

const FLOWS: Record<"onboarding" | "settings", StepKey[]> = {
  onboarding: ["height", "weight", "target", "activity", "plan"],
  // Re-planning: update weight and height, set a new goal, let the AI research new plans.
  settings: ["weight", "height", "target", "plan"],
};

const DEFAULTS: Data = {
  heightCm: 170,
  weightKg: 70,
  targetKg: 65,
  targetDays: 90,
  sex: "male",
  age: 25,
  activity: "active",
  units: { height: "cm", weight: "kg", time: "days" },
};

/**
 * The step-by-step flow used for first-time onboarding and for changing your goal later
 * (mode "settings", pre-filled from your saved profile).
 */
export function Onboarding({ mode = "onboarding", initial }: { mode?: "onboarding" | "settings"; initial?: Data }) {
  const router = useRouter();
  const steps = FLOWS[mode];
  const settings = mode === "settings";
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("in-fwd");
  const [d, setD] = useState<Data>(initial ?? DEFAULTS);
  // In settings the saved goal is the starting point, so don't auto-overwrite it.
  const touched = useRef({ target: settings, days: settings });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [res, setRes] = useState<PlansResponse | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const step = steps[i];
  const last = i === steps.length - 1;
  const set = (patch: Partial<Data>) => setD((p) => ({ ...p, ...patch }));
  useEffect(() => () => clearTimeout(timer.current), []);

  // Researched safety limits (cached on the server), used for the pace verdict and default timeline.
  useEffect(() => {
    fetch("/api/onboarding/guidelines")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.limits && setLimits(j.limits))
      .catch(() => {});
  }, []);

  // Until the user touches them, keep a sensible target and timeline in sync with their weight.
  useEffect(() => {
    if (step !== "target") return;
    setD((p) => {
      let { targetKg, targetDays } = p;
      if (!touched.current.target) targetKg = Math.round(p.weightKg * 0.92 * 10) / 10;
      if (!touched.current.days) targetDays = defaultDays(p.weightKg, targetKg, limits ?? FALLBACK_LIMITS);
      return targetKg === p.targetKg && targetDays === p.targetDays ? p : { ...p, targetKg, targetDays };
    });
  }, [step, d.weightKg, d.targetKg, limits]);

  function go(next: number) {
    if (next < 0) {
      if (settings) router.push("/settings");
      return;
    }
    if (next >= steps.length || next === i) return;
    const dir = next > i ? "fwd" : "back";
    setPhase(`out-${dir}`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setI(next);
      setPhase(`in-${dir}`);
      window.scrollTo({ top: 0 });
    }, 200);
  }

  const canNext = step === "target" ? Math.abs(d.targetKg - d.weightKg) >= 0.5 : step === "plan" ? !!selection && !saving : true;

  async function finish() {
    if (!selection) return;
    setSaving(true);
    setError(undefined);
    const r = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sex: d.sex,
        age: d.age,
        heightCm: d.heightCm,
        weightKg: d.weightKg,
        targetKg: d.targetKg,
        targetDays: d.targetDays,
        activity: d.activity,
        units: d.units,
        plan: selection,
      }),
    });
    if (!r.ok) {
      setSaving(false);
      setError((await r.json().catch(() => null))?.error ?? "Could not save. Try again.");
      return;
    }
    setPhase("out-fwd");
    setTimeout(() => {
      router.replace("/home");
      router.refresh();
    }, 200);
  }

  const showBack = i > 0 || settings;

  return (
    <div className="flex min-h-dvh flex-col md:min-h-[820px]">
      <header className="sticky top-0 z-20 bg-white/95 px-6 pb-3 pt-5 backdrop-blur md:rounded-t-[44px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            onClick={() => go(i - 1)}
            className={`grid size-10 place-items-center rounded-full bg-ink/[0.06] transition-all active:scale-90 ${showBack ? "" : "pointer-events-none opacity-0"}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex flex-1 gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1}>
            {steps.map((s, n) => (
              <div key={s} className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-ink transition-all duration-500 ease-out" style={{ width: n <= i ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
          <span className="w-10 text-right text-sm font-bold tabular-nums text-ink/50">
            {i + 1}/{steps.length}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-6 pb-6 pt-3">
        <div key={step} className={`flex flex-1 flex-col step-${phase}`}>
          {step === "height" && <HeightStep d={d} set={set} />}
          {step === "weight" && <WeightStep d={d} set={set} />}
          {step === "target" && <TargetStep d={d} set={set} limits={limits} touch={(k) => (touched.current[k] = true)} />}
          {step === "activity" && <ActivityStep d={d} set={set} />}
          {step === "plan" && <PlanStep d={d} res={res} setRes={setRes} onSelect={setSelection} />}
        </div>
      </main>

      <footer className="sticky bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-white via-white to-white/0 px-6 pb-6 pt-4 md:rounded-b-[44px]">
        <ErrorText>{error}</ErrorText>
        {!last ? (
          <Button onClick={() => go(i + 1)} disabled={!canNext}>
            {step === "target" && settings ? "Find my new plan" : "Continue"}
            <svg className="ml-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Button>
        ) : (
          <Button onClick={finish} loading={saving} disabled={!canNext || !res}>
            {selection ? `${settings ? "Switch to" : "Start with"} ${selection.name}` : "Pick a plan"}
          </Button>
        )}
      </footer>
    </div>
  );
}
