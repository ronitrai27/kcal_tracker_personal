"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const icon = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Hamburger button that opens a small animated menu: Settings, Log out. */
export function Menu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const row = "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[16px] font-bold transition-colors active:bg-neon";
  const tile = "grid size-10 place-items-center rounded-xl bg-ink/[0.06]";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`grid size-11 place-items-center rounded-full transition-all active:scale-90 ${open ? "bg-ink text-neon" : "bg-ink/[0.06]"}`}
      >
        <svg {...icon} className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h10" />}
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="rise absolute right-0 top-14 z-40 w-64 origin-top-right rounded-3xl border-[1.5px] border-ink bg-white p-2 shadow-[0_6px_0_0_var(--ink)]"
          >
            <p className="truncate px-3 pb-2 pt-1.5 text-[12px] font-bold text-ink/45">{email}</p>
            <Link href="/settings" role="menuitem" className={row} onClick={() => setOpen(false)}>
              <span className={tile}>
                <svg {...icon}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                </svg>
              </span>
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              className={row}
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                await authClient.signOut();
                router.replace("/sign-in");
                router.refresh();
              }}
            >
              <span className={tile}>
                <svg {...icon}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </span>
              {leaving ? "Logging out…" : "Log out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
