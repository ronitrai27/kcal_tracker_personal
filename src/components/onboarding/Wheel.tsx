"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

export type WheelItem = { value: number; label: string };

const ITEM = 52; // px per row
const VISIBLE = 5;

/**
 * iOS-style scroll wheel: native scroll-snap (so it feels like your phone's own
 * scrolling and momentum), plus a live scale/fade effect, haptic ticks,
 * mouse-drag, click-to-select and arrow keys for desktop.
 */
export function Wheel({
  items,
  value,
  onChange,
  unit,
  label,
  className = "",
}: {
  items: WheelItem[];
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  label: string;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const current = useRef(-1);
  const frame = useRef(0);
  const drag = useRef<{ y: number; top: number; moved: boolean } | null>(null);

  const index = useMemo(() => {
    let best = 0;
    let bestD = Infinity;
    items.forEach((it, i) => {
      const d = Math.abs(it.value - value);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }, [items, value]);

  const paint = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const pos = el.scrollTop / ITEM;
    rows.current.forEach((n, i) => {
      if (!n) return;
      const d = Math.abs(i - pos);
      if (d > 3.2) {
        n.style.opacity = "0";
        return;
      }
      n.style.transform = `scale(${1 - Math.min(d, 3) * 0.1})`;
      n.style.opacity = String(Math.max(0.12, 1 - d * 0.3));
    });
  }, []);

  // Keep the wheel in sync when the value is changed from outside (e.g. unit switch).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (current.current !== index || Math.abs(el.scrollTop - index * ITEM) > 1) {
      current.current = index;
      el.scrollTop = index * ITEM;
    }
    paint();
  }, [index, items, paint]);

  function onScroll() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      paint();
      const el = scroller.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
      if (i !== current.current) {
        current.current = i;
        navigator.vibrate?.(4);
        onChange(items[i].value);
      }
    });
  }

  const goTo = (i: number) =>
    scroller.current?.scrollTo({ top: Math.max(0, Math.min(items.length - 1, i)) * ITEM, behavior: "smooth" });

  return (
    <div className={`relative ${className}`} style={{ height: ITEM * VISIBLE }}>
      {/* selection band */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-2xl bg-neon"
        style={{ height: ITEM - 6 }}
      />
      {unit && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 text-sm font-bold"
        >
          {unit}
        </span>
      )}
      <div
        ref={scroller}
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={items[index]?.value}
        aria-valuetext={`${items[index]?.label} ${unit ?? ""}`}
        onScroll={onScroll}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") { e.preventDefault(); goTo(current.current - 1); }
          if (e.key === "ArrowDown") { e.preventDefault(); goTo(current.current + 1); }
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !scroller.current) return;
          drag.current = { y: e.clientY, top: scroller.current.scrollTop, moved: false };
          scroller.current.setPointerCapture(e.pointerId);
          scroller.current.style.scrollSnapType = "none";
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !scroller.current) return;
          if (Math.abs(e.clientY - d.y) > 4) d.moved = true;
          scroller.current.scrollTop = d.top - (e.clientY - d.y);
        }}
        onPointerUp={() => {
          const el = scroller.current;
          if (!drag.current || !el) return;
          el.style.scrollSnapType = "";
          goTo(Math.round(el.scrollTop / ITEM));
          setTimeout(() => (drag.current = null), 0);
        }}
        className="no-scrollbar relative h-full touch-pan-y select-none snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none"
        style={{
          paddingBlock: ITEM * 2,
          WebkitMaskImage: "linear-gradient(transparent, #000 28%, #000 72%, transparent)",
          maskImage: "linear-gradient(transparent, #000 28%, #000 72%, transparent)",
        }}
      >
        {items.map((it, i) => (
          <div
            key={`${it.value}-${i}`}
            ref={(n) => {
              rows.current[i] = n;
            }}
            onClick={() => !drag.current?.moved && goTo(i)}
            className="flex snap-center items-center justify-center text-[26px] font-bold tabular-nums will-change-transform"
            style={{ height: ITEM }}
          >
            {it.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export const range = (from: number, to: number, step = 1) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
};
