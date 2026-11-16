"use client";

import { useEffect, useState } from "react";
import type { Source } from "@/lib/nutrition";

type TipData = { title: string; tips: string[]; sources: Source[]; fetchedAt: string };

// Survives step changes so a tip is only requested once per visit.
const memo = new Map<string, Promise<TipData>>();

function load(topic: string) {
  let p = memo.get(topic);
  if (!p) {
    p = fetch(`/api/onboarding/tip/${topic}`).then((r) => {
      if (!r.ok) throw new Error("tip failed");
      return r.json() as Promise<TipData>;
    });
    p.catch(() => memo.delete(topic));
    memo.set(topic, p);
  }
  return p;
}

/**
 * A collapsible tip whose content is searched live on the web by the server
 * (and cached) — never written by hand. Shows its sources.
 */
export function Tip({ topic, label }: { topic: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TipData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    load(topic)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [topic]);

  if (failed) return null;

  return (
    <div className="rounded-3xl border-[1.5px] border-ink/15 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />
          </svg>
        </span>
        <span className="flex-1 text-[15px] font-bold leading-tight">{label}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            {!data ? (
              <div className="space-y-2.5" aria-busy="true" aria-label="Searching the web">
                <div className="shimmer h-4 w-2/3 rounded-md" />
                <div className="shimmer h-4 w-full rounded-md" />
                <div className="shimmer h-4 w-5/6 rounded-md" />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-bold uppercase tracking-wide text-ink/45">Live from the web</p>
                <p className="mt-1 text-[17px] font-bold leading-snug">{data.title}</p>
                <ol className="mt-3 space-y-2.5">
                  {data.tips.map((t, i) => (
                    <li key={i} className="flex gap-3 text-[15px] font-medium leading-snug">
                      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-neon">
                        {i + 1}
                      </span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
                <Sources sources={data.sources} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sources({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-bold text-ink/45">Sources</span>
      {sources.map((s) => (
        <a
          key={s.host}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-xs font-bold active:bg-neon"
        >
          {s.host}
        </a>
      ))}
    </div>
  );
}
