"use client";

import Link from "next/link";
import { useState } from "react";
import { SLOTS, type Entry, type Slot } from "./types";

export function Meals({ entries, pending, date }: { entries: Entry[] | null; pending: boolean; date: string | null }) {
  const [open, setOpen] = useState<Slot | null>(null);

  if (!entries) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {SLOTS.map((s) => (
          <div key={s.key} className="shimmer h-[76px] rounded-[26px]" />
        ))}
      </div>
    );
  }

  return (
    <div className={`stagger flex flex-col gap-3 transition-opacity duration-300 ${pending ? "opacity-60" : ""}`}>
      {SLOTS.map((s) => {
        const items = entries.filter((e) => e.slot === s.key);
        const kcal = items.reduce((a, e) => a + e.kcal, 0);
        const isOpen = open === s.key;
        return (
          <section
            key={s.key}
            className={`rounded-[26px] border-[1.5px] bg-white transition-colors duration-300 ${isOpen ? "border-ink" : "border-ink/12"}`}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`slot-${s.key}`}
              onClick={() => setOpen(isOpen ? null : s.key)}
              className="flex w-full items-center gap-3 p-4 text-left active:scale-[0.985]"
            >
              <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-[15px] font-bold ${items.length ? "bg-neon" : "bg-ink/[0.06]"}`}>
                {items.length}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-bold leading-tight">{s.label}</span>
                <span className="block text-[12px] font-bold text-ink/45">
                  {items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "Nothing logged"}
                </span>
              </span>
              <span className="text-right">
                <span className="text-[22px] font-bold tabular-nums">{kcal.toLocaleString()}</span>
                <span className="ml-1 text-[12px] font-bold text-ink/50">kcal</span>
              </span>
              <span
                aria-hidden
                className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300 ${isOpen ? "rotate-45 bg-ink text-neon" : "bg-neon"}`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>

            <div
              id={`slot-${s.key}`}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4">
                  {items.length > 0 ? (
                    <ul className="divide-y divide-ink/10 border-t border-ink/10">
                      {items.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold">{e.name}</p>
                            {e.qty != null && (
                              <p className="text-[12px] font-bold text-ink/50">
                                {e.qty} {e.unit ?? ""}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-[15px] font-bold tabular-nums">{e.kcal} kcal</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="border-t border-ink/10 pt-3 text-[14px] font-medium text-ink/50">
                      Nothing logged for {s.label.toLowerCase()} yet.
                    </p>
                  )}

                  <Link
                    href={`/browse?slot=${s.key}${date ? `&date=${date}` : ""}`}
                    tabIndex={isOpen ? 0 : -1}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-neon text-[16px] font-bold transition-transform active:scale-[0.96]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add to {s.label.toLowerCase()}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
