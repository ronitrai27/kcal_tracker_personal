"use client";

import { useId } from "react";
import { SLOTS, type Entry, type Target } from "./types";

const W = 320;
const H = 176;
const PAD = { l: 10, r: 10, t: 22, b: 30 };

/** Horizontal-tangent bezier: smooth but never overshoots the data. */
function curve(pts: [number, number][]) {
  return pts.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const mx = (px + x) / 2;
    return `${d} C${mx},${py} ${mx},${y} ${x},${y}`;
  }, "");
}

function Bar({ label, v, of }: { label: string; v: number; of: number }) {
  const pct = Math.min(1, v / Math.max(1, of));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px] font-bold">
        <span>{label}</span>
        <span className="tabular-nums text-ink/55">
          {Math.round(v)}/{of}g
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-ink transition-all duration-700 ease-out" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

export function DayChart({
  entries,
  target,
  title,
  pending,
}: {
  entries: Entry[] | null;
  target: Target;
  title: string;
  pending: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const list = entries ?? [];
  const eaten = list.reduce((s, e) => s + e.kcal, 0);
  const left = target.kcal - eaten;
  const sum = (k: "proteinG" | "carbsG" | "fatG") => list.reduce((s, e) => s + e[k], 0);

  // Running total after each meal slot.
  const slotKcal = SLOTS.map((s) => list.filter((e) => e.slot === s.key).reduce((a, e) => a + e.kcal, 0));
  const cumulative = SLOTS.map((s, i) => ({
    ...s,
    slotKcal: slotKcal[i],
    total: slotKcal.slice(0, i + 1).reduce((a, v) => a + v, 0),
  }));

  const yMax = Math.max(target.kcal * 1.12, eaten * 1.08, 100);
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (SLOTS.length - 1);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);
  const base = y(0);
  const pts = cumulative.map((c, i) => [x(i), y(c.total)] as [number, number]);
  const line = curve(pts);
  const area = `${line} L${x(SLOTS.length - 1)},${base} L${x(0)},${base} Z`;
  const ty = y(target.kcal);
  const empty = list.length === 0;

  return (
    <section className={`rounded-[28px] border-[1.5px] border-ink/12 bg-white p-5 transition-opacity duration-300 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-bold text-ink/50">{title}</p>
          <p className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{eaten.toLocaleString()}</span>
            <span className="text-[15px] font-bold text-ink/55">kcal</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-bold text-ink/50">Goal</p>
          <p className="text-[18px] font-bold tabular-nums">{target.kcal.toLocaleString()}</p>
          <p className="text-[11px] font-bold text-ink/50">kcal / day</p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full border-[1.5px] border-ink">
          <div
            className="h-full rounded-full bg-neon transition-all duration-700 ease-out"
            style={{ width: `${Math.min(100, (eaten / Math.max(1, target.kcal)) * 100)}%` }}
          />
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[13px] font-bold tabular-nums ${
            left >= 0 ? "bg-neon" : "bg-ink text-white"
          }`}
        >
          {left >= 0 ? `${left.toLocaleString()} left` : `${Math.abs(left).toLocaleString()} over`}
        </span>
      </div>

      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Calories eaten through the day against a goal of ${target.kcal}`}>
          <defs>
            <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e2f73b" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e2f73b" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* goal line */}
          <line x1={PAD.l} x2={W - PAD.r} y1={ty} y2={ty} stroke="#0a0a0a" strokeWidth="1.5" strokeDasharray="5 5" />
          <text x={W - PAD.r} y={ty - 6} textAnchor="end" fontSize="10" fontWeight="700" fill="#0a0a0a">
            Goal {target.kcal.toLocaleString()}
          </text>

          {/* area + line (re-animate when the data changes) */}
          <g key={`${eaten}-${list.length}`}>
            <path d={area} fill={`url(#g${uid})`} className="rise" />
            <path d={line} fill="none" stroke="#0a0a0a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="draw" />
          </g>

          {cumulative.map((c, i) => (
            <g key={c.key}>
              <circle cx={x(i)} cy={y(c.total)} r={c.slotKcal > 0 ? 6 : 4} fill={c.slotKcal > 0 ? "#e2f73b" : "#ffffff"} stroke="#0a0a0a" strokeWidth="2.5" />
              {c.slotKcal > 0 && (
                <text x={x(i)} y={y(c.total) - 12} textAnchor={i === 0 ? "start" : i === SLOTS.length - 1 ? "end" : "middle"} fontSize="10" fontWeight="700" fill="#0a0a0a">
                  +{c.slotKcal}
                </text>
              )}
              <text x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === SLOTS.length - 1 ? "end" : "middle"} fontSize="10" fontWeight="700" fill="#0a0a0a" opacity="0.55">
                {c.short}
              </text>
            </g>
          ))}
        </svg>
        {empty && (
          <p className="pointer-events-none absolute inset-x-0 top-[42%] text-center text-[13px] font-bold text-ink/45">
            Nothing logged yet · 0 kcal
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Bar label="Protein" v={sum("proteinG")} of={target.proteinG} />
        <Bar label="Carbs" v={sum("carbsG")} of={target.carbsG} />
        <Bar label="Fat" v={sum("fatG")} of={target.fatG} />
      </div>
    </section>
  );
}
