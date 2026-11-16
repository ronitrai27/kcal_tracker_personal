"use client";

import { useEffect, useRef } from "react";
import { parseDate, type DayTotal } from "./types";

/** The last 4 days plus today (rightmost), each with the kcal eaten that day. */
export function WeekStrip({
  days,
  today,
  selected,
  target,
  onSelect,
}: {
  days: DayTotal[] | null;
  today: string | null;
  selected: string | null;
  target: number;
  onSelect: (date: string) => void;
}) {
  const sel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    sel.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  if (!days || !today) {
    return (
      <div className="grid grid-cols-5 gap-2" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="shimmer h-[132px] rounded-[22px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-2" role="tablist" aria-label="Days">
      {days.map((d) => {
        const dt = parseDate(d.date);
        const on = d.date === selected;
        const future = d.date > today;
        const isToday = d.date === today;
        const pct = Math.min(1, d.kcal / Math.max(1, target));
        const label = future && d.items === 0 ? "N/A" : d.kcal.toLocaleString();
        return (
          <button
            key={d.date}
            ref={on ? sel : undefined}
            role="tab"
            aria-selected={on}
            aria-label={`${dt.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}, ${d.kcal} kcal`}
            onClick={() => {
              navigator.vibrate?.(6);
              onSelect(d.date);
            }}
            className={`flex flex-col items-center gap-1.5 rounded-[22px] border-[1.5px] px-0.5 pb-2.5 pt-2.5 transition-all duration-300 active:scale-95 ${
              on ? "-translate-y-0.5 border-ink bg-neon shadow-[0_5px_0_0_var(--ink)]" : "border-ink/12 bg-white"
            }`}
          >
            <span className={`text-[11px] font-bold ${on ? "" : "text-ink/50"}`}>
              {isToday ? "Today" : dt.toLocaleDateString(undefined, { weekday: "short" })}
            </span>
            <span
              className={`grid size-10 place-items-center rounded-full text-[16px] font-bold tabular-nums transition-colors ${
                on ? "bg-ink text-neon" : "bg-ink/[0.06]"
              }`}
            >
              {dt.getDate()}
            </span>
            <span className="text-[12px] font-bold leading-none tabular-nums">{label}</span>
            <span className="-mt-0.5 text-[9px] font-bold leading-none text-ink/45">{label === "N/A" ? "" : "kcal"}</span>
            <span className={`h-1 w-8 overflow-hidden rounded-full ${on ? "bg-ink/20" : "bg-ink/10"}`}>
              <span className="block h-full rounded-full bg-ink transition-all duration-500" style={{ width: `${pct * 100}%` }} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
