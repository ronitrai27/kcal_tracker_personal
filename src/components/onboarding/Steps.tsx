"use client";

import { useEffect, useState } from "react";
import { ACTIVITIES, paceVerdict, tdee as calcTdee, type Activity, type Limits } from "@/lib/nutrition";
import { cmToIn, DAYS_PER_MONTH, formatDate, formatKg, type HeightUnit } from "@/lib/units";
import { Heading, Sub } from "../ui";
import { HeightPicker, TimePicker, WeightPicker } from "./Pickers";
import { Segmented } from "./Segmented";
import { Tip } from "./Tip";
import type { Data } from "./types";

type StepProps = { d: Data; set: (patch: Partial<Data>) => void };

function Readout({ children, small }: { children: React.ReactNode; small?: string }) {
  return (
    <div className="text-center">
      <div className="text-[56px] font-bold leading-none tracking-tight tabular-nums">{children}</div>
      {small && <div className="mt-1.5 text-sm font-bold text-ink/45">{small}</div>}
    </div>
  );
}

/* ------------------------------ 1 · HEIGHT ------------------------------ */

function heightText(cm: number, unit: HeightUnit) {
  if (unit === "cm") return `${Math.round(cm)} cm`;
  if (unit === "m") return `${(Math.round(cm) / 100).toFixed(2)} m`;
  const total = Math.round(cmToIn(cm));
  if (unit === "in") return `${total} in`;
  return `${Math.floor(total / 12)}′ ${total % 12}″`;
}

export function HeightStep({ d, set }: StepProps) {
  const unit = d.units.height;
  return (
    <div className="stagger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading before="How " mark="tall" after=" are you?" />
        <Sub>Scroll the wheel to set your height. Use any unit you like.</Sub>
      </div>
      <Segmented
        label="Height unit"
        value={unit}
        onChange={(v) => set({ units: { ...d.units, height: v } })}
        options={[
          { value: "cm", label: "cm" },
          { value: "ftin", label: "ft · in" },
          { value: "in", label: "in" },
          { value: "m", label: "m" },
        ]}
      />
      <Readout small={unit === "cm" ? `${(cmToIn(d.heightCm)).toFixed(1)} inches` : `${Math.round(d.heightCm)} cm`}>
        {heightText(d.heightCm, unit)}
      </Readout>
      <HeightPicker cm={d.heightCm} unit={unit} onChange={(cm) => set({ heightCm: cm })} />
      <Tip topic="height" label="Don’t know your height? No tape measure? Tap for a trick" />
    </div>
  );
}

/* ------------------------------ 2 · WEIGHT ------------------------------ */

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  const btn =
    "grid size-12 place-items-center rounded-2xl bg-ink text-2xl font-bold text-neon transition-transform active:scale-90 disabled:opacity-30";
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Decrease age" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <input
        inputMode="numeric"
        aria-label="Age in years"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="h-12 w-16 rounded-2xl border-[1.5px] border-ink/15 text-center text-xl font-bold outline-none focus:border-ink"
      />
      <button type="button" aria-label="Increase age" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function WeightStep({ d, set }: StepProps) {
  const unit = d.units.weight;
  return (
    <div className="stagger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading before="What do you " mark="weigh" after="?" />
        <Sub>Your starting point. An honest number today makes the plan accurate.</Sub>
      </div>
      <Segmented
        label="Weight unit"
        value={unit}
        onChange={(v) => set({ units: { ...d.units, weight: v } })}
        options={[
          { value: "kg", label: "kg" },
          { value: "lb", label: "lb" },
        ]}
      />
      <Readout>{formatKg(d.weightKg, unit)}</Readout>
      <WeightPicker kg={d.weightKg} unit={unit} onChange={(kg) => set({ weightKg: kg })} />

      <div className="rounded-3xl bg-ink/[0.05] p-4">
        <p className="text-[15px] font-bold">Two quick things</p>
        <p className="text-[13px] font-medium text-ink/50">Your body burns calories differently by age and sex.</p>
        <div className="mt-3 flex flex-col gap-3">
          <Segmented
            label="Sex"
            value={d.sex}
            onChange={(sex) => set({ sex })}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">Age</span>
            <Stepper value={d.age} min={14} max={100} onChange={(age) => set({ age })} />
          </div>
        </div>
      </div>

      <Tip topic="weight" label="Get a more accurate reading" />
    </div>
  );
}

/* ------------------------------ 3 · TARGET ------------------------------ */

export function TargetStep({ d, set, touch, limits }: StepProps & { touch: (k: "target" | "days") => void; limits: Limits | null }) {
  const diff = d.targetKg - d.weightKg;
  const same = Math.abs(diff) < 0.5;
  const p = limits ? paceVerdict(d.weightKg, d.targetKg, d.targetDays, limits) : null;
  const end = new Date();
  end.setDate(end.getDate() + d.targetDays);
  const wu = d.units.weight;

  return (
    <div className="stagger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading before="Your " mark="goal" />
        <Sub>Lose or gain, pick the weight you want and how long you’ll give yourself.</Sub>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Segmented
          label="Weight unit"
          value={wu}
          onChange={(v) => set({ units: { ...d.units, weight: v } })}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lb" },
          ]}
        />
        <Segmented
          label="Time unit"
          value={d.units.time}
          onChange={(v) => set({ units: { ...d.units, time: v } })}
          options={[
            { value: "days", label: "Days" },
            { value: "months", label: "Months" },
          ]}
        />
      </div>

      <div className="flex items-end gap-2 px-1 text-[13px] font-bold uppercase tracking-wide text-ink/45">
        <span className="flex-[2.6]">I want to weigh</span>
        <span className="flex-1">in</span>
      </div>
      <div className="-mt-2 flex gap-2">
        <WeightPicker
          className="flex-[2.6]"
          kg={d.targetKg}
          unit={wu}
          onChange={(kg) => {
            touch("target");
            set({ targetKg: kg });
          }}
        />
        <TimePicker
          className="flex-1"
          days={d.targetDays}
          unit={d.units.time}
          onChange={(days) => {
            touch("days");
            set({ targetDays: days });
          }}
        />
      </div>

      <div className="rounded-3xl bg-neon p-4">
        {same ? (
          <p className="text-[17px] font-bold">Pick a target different from your current {formatKg(d.weightKg, wu)}.</p>
        ) : (
          <>
            <p className="text-[22px] font-bold leading-tight">
              {diff < 0 ? "Lose" : "Gain"} {formatKg(Math.abs(diff), wu)}
            </p>
            <p className="mt-1 text-[15px] font-medium">
              By {formatDate(end.toISOString().slice(0, 10))} · about {formatKg(Math.abs((d.targetKg - d.weightKg) / (d.targetDays / 7)), wu)} a week
            </p>
            <span className="mt-2.5 inline-block rounded-full bg-ink px-3 py-1 text-xs font-bold text-neon">
              {p ? p.level : "Checking guidelines…"}
              {d.units.time === "months" ? ` · ${(d.targetDays / DAYS_PER_MONTH).toFixed(1)} months` : ` · ${Math.round(d.targetDays / 7)} weeks`}
            </span>
          </>
        )}
      </div>
      {!same && p?.tooFast && (
        <p className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-medium text-white">
          That’s faster than health guidelines recommend. No problem: the last step shows the exact kcal your date would need, and the closest safe plan.
        </p>
      )}

      <Tip topic="target" label="What’s a safe pace?" />
    </div>
  );
}

/* ----------------------------- 4 · ACTIVITY ----------------------------- */

const ICONS: Record<Activity, string> = {
  lazy: "M4 14v-3a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3M3 14h18v4H3zM6 18v2M18 18v2",
  active: "M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12",
  very: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9Z",
  runner: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
};

export function ActivityStep({ d, set }: StepProps) {
  const body = { sex: d.sex, age: d.age, heightCm: d.heightCm, weightKg: d.weightKg };
  const [bumped, setBumped] = useState<Activity | null>(null);
  useEffect(() => {
    if (!bumped) return;
    const t = setTimeout(() => setBumped(null), 350);
    return () => clearTimeout(t);
  }, [bumped]);

  return (
    <div className="stagger flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Heading before="How " mark="active" after=" are you?" />
        <Sub>This sets how many calories you burn every day, even before you eat anything.</Sub>
      </div>
      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Activity level">
        {ACTIVITIES.map((a) => {
          const on = d.activity === a.key;
          return (
            <button
              key={a.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                navigator.vibrate?.(8);
                set({ activity: a.key });
                setBumped(a.key);
              }}
              className={`flex items-center gap-4 rounded-3xl border-[1.5px] p-4 text-left transition-all duration-200 active:scale-[0.97] ${
                on ? "border-ink bg-neon" : "border-ink/15 bg-white"
              } ${bumped === a.key ? "pop" : ""}`}
            >
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${on ? "bg-ink" : "bg-ink/[0.06]"}`}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={on ? "#e2f73b" : "#0a0a0a"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[a.key]} />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[18px] font-bold leading-tight">{a.label}</span>
                <span className="block text-[13px] font-medium leading-snug text-ink/55">{a.desc}</span>
              </span>
              <span className="text-right">
                <span className="block text-[20px] font-bold leading-none tabular-nums">{calcTdee(body, a.key).toLocaleString()}</span>
                <span className="block text-[11px] font-bold text-ink/50">kcal / day</span>
              </span>
            </button>
          );
        })}
      </div>
      <Tip topic="activity" label="Not sure which one you are?" />
    </div>
  );
}
