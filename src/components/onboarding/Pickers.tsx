"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { cmToIn, inToCm, kgToLb, lbToKg, DAYS_PER_MONTH, type HeightUnit, type TimeUnit, type WeightUnit } from "@/lib/units";
import { range, Wheel, type WheelItem } from "./Wheel";

const mk = (vals: number[], label: (v: number) => string = String): WheelItem[] =>
  vals.map((v) => ({ value: v, label: label(v) }));

/** Height in cm / m / inches / feet+inches. The value is always centimetres. */
export function HeightPicker({ cm, unit, onChange }: { cm: number; unit: HeightUnit; onChange: (cm: number) => void }) {
  const cmItems = useMemo(() => mk(range(100, 250)), []);
  const mItems = useMemo(() => mk(range(100, 250), (v) => (v / 100).toFixed(2)), []);
  const inItems = useMemo(() => range(39, 99).map((i) => ({ value: inToCm(i), label: String(i) })), []);
  const ftItems = useMemo(() => mk(range(3, 8)), []);
  const inchItems = useMemo(() => mk(range(0, 11)), []);

  if (unit === "cm") return <Wheel label="Height in centimetres" items={cmItems} value={cm} onChange={onChange} unit="cm" />;
  if (unit === "m") return <Wheel label="Height in metres" items={mItems} value={cm} onChange={onChange} unit="m" />;
  if (unit === "in") return <Wheel label="Height in inches" items={inItems} value={cm} onChange={onChange} unit="in" />;

  const total = Math.round(cmToIn(cm));
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return (
    <div className="flex gap-3">
      <Wheel className="flex-1" label="Feet" items={ftItems} value={ft} unit="ft" onChange={(f) => onChange(inToCm(f * 12 + inch))} />
      <Wheel className="flex-1" label="Inches" items={inchItems} value={inch} unit="in" onChange={(i) => onChange(inToCm(ft * 12 + i))} />
    </div>
  );
}

/** Weight as "whole . tenth" wheels in kg or lb. The value is always kilograms. */
export function WeightPicker({
  kg,
  unit,
  onChange,
  className = "",
}: {
  kg: number;
  unit: WeightUnit;
  onChange: (kg: number) => void;
  className?: string;
}) {
  const wholeKg = useMemo(() => mk(range(30, 250)), []);
  const wholeLb = useMemo(() => mk(range(66, 551)), []);
  const tenths = useMemo(() => mk(range(0, 9)), []);

  const u = unit === "kg" ? kg : kgToLb(kg);
  const t = Math.round(u * 10);
  const whole = Math.floor(t / 10);
  const dec = t % 10;
  // Latest values, so two wheels changing in the same frame never use stale numbers.
  const latest = useRef({ whole, dec });
  useLayoutEffect(() => {
    latest.current = { whole, dec };
  });
  const emit = (w: number, d: number) => {
    const val = w + d / 10;
    onChange(unit === "kg" ? val : lbToKg(val));
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Wheel
        className="flex-[1.35]"
        label={`Weight in ${unit}`}
        items={unit === "kg" ? wholeKg : wholeLb}
        value={whole}
        onChange={(w) => emit(w, latest.current.dec)}
      />
      <span className="text-3xl font-bold">.</span>
      <Wheel className="flex-1" label="Tenths" items={tenths} value={dec} unit={unit} onChange={(d) => emit(latest.current.whole, d)} />
    </div>
  );
}

/** Timeline in days or months. The value is always days. */
export function TimePicker({
  days,
  unit,
  onChange,
  className = "",
}: {
  days: number;
  unit: TimeUnit;
  onChange: (days: number) => void;
  className?: string;
}) {
  const dayItems = useMemo(() => mk(range(7, 730)), []);
  const monthItems = useMemo(() => mk(range(1, 24)), []);
  if (unit === "days") return <Wheel className={className} label="Days" items={dayItems} value={days} unit="days" onChange={onChange} />;
  return (
    <Wheel
      className={className}
      label="Months"
      items={monthItems}
      value={Math.max(1, Math.round(days / DAYS_PER_MONTH))}
      unit={"mo"}
      onChange={(m) => onChange(Math.round(m * DAYS_PER_MONTH))}
    />
  );
}
