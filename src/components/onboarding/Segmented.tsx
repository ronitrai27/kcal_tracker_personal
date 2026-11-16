"use client";

/** Segmented control with a neon pill that slides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid rounded-2xl bg-ink/[0.06] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <div
        aria-hidden
        className="absolute inset-y-1 rounded-xl bg-neon shadow-[0_0_0_1.5px_var(--ink)] transition-transform duration-300 ease-[cubic-bezier(0.3,1.4,0.5,1)]"
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => {
            navigator.vibrate?.(6);
            onChange(o.value);
          }}
          className="relative z-10 h-11 rounded-xl text-[15px] font-bold transition-opacity"
          style={{ opacity: o.value === value ? 1 : 0.55 }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
