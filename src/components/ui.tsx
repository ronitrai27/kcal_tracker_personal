"use client";

import { useState, type InputHTMLAttributes, type ButtonHTMLAttributes } from "react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`wiggle grid size-12 place-items-center rounded-2xl bg-neon ${className}`}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 2C12.8 7.5 16.5 11.2 22 12C16.5 12.8 12.8 16.5 12 22C11.2 16.5 7.5 12.8 2 12C7.5 11.2 11.2 7.5 12 2Z" />
      </svg>
    </div>
  );
}

/** Heading with one word highlighted in neon, like a marker stroke. */
export function Heading({ before, mark, after }: { before?: string; mark: string; after?: string }) {
  return (
    <h1 className="text-[2.1rem] font-bold leading-[1.15] tracking-tight">
      {before}
      <mark className="rounded-lg bg-neon px-1.5 text-ink">{mark}</mark>
      {after}
    </h1>
  );
}

export function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-ink/50">{children}</p>;
}

export function Field({ secure, ...props }: InputHTMLAttributes<HTMLInputElement> & { secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <div className="flex h-14 items-center rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 transition-colors focus-within:border-ink">
      <input
        {...props}
        type={secure ? (hidden ? "password" : "text") : props.type}
        className="h-full min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-ink/40"
      />
      {secure && (
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          aria-label={hidden ? "Show password" : "Hide password"}
          className="-mr-1 grid size-9 place-items-center rounded-full text-ink/50 active:bg-neon"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {!hidden && <path d="M3 3l18 18" />}
          </svg>
        </button>
      )}
    </div>
  );
}

export function Button({
  variant = "neon",
  loading,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "neon" | "black"; loading?: boolean }) {
  const color = variant === "neon" ? "bg-neon text-ink" : "bg-ink text-white";
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`flex h-14 w-full items-center justify-center rounded-[18px] text-[17px] font-bold transition-transform duration-150 active:scale-[0.96] disabled:opacity-40 ${color} ${className}`}
    >
      {loading ? (
        <span className={`size-5 animate-spin rounded-full border-2 border-t-transparent ${variant === "neon" ? "border-ink" : "border-neon"}`} />
      ) : (
        children
      )}
    </button>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="self-start rounded-lg bg-neon px-3 py-1.5 text-sm font-bold">
      {children}
    </p>
  );
}
