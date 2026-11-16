"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { DayChart } from "./DayChart";
import { Meals } from "./Meals";
import { Menu } from "./Menu";
import { WeekStrip } from "./WeekStrip";
import { firstName, localDate, parseDate, type DayTotal, type Entry, type Target, type User } from "./types";

type Data = { date: string; days: DayTotal[]; entries: Entry[] };

const noop = () => () => {};
// null on the server, the browser's own clock on the client (no hydration mismatch).
const useToday = () => useSyncExternalStore(noop, () => localDate(), () => null);
const useGreeting = () =>
  useSyncExternalStore(
    noop,
    () => {
      const h = new Date().getHours();
      return h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    },
    () => "Hello",
  );

function Avatar({ user }: { user: User }) {
  const initial = (user.name || user.email).trim()[0]?.toUpperCase() ?? "?";
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.image} alt="" className="size-12 rounded-full object-cover" />
  ) : (
    <span className="grid size-12 place-items-center rounded-full bg-neon text-[20px] font-bold ring-2 ring-ink">{initial}</span>
  );
}

export function HomeClient({ user, target }: { user: User; target: Target }) {
  const today = useToday();
  const greeting = useGreeting();
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? today;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!today || !selected) return;
    const ctrl = new AbortController();
    fetch(`/api/home?today=${today}&date=${selected}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((j) => {
        setError(false);
        setData({ date: selected, days: j.days, entries: j.entries });
      })
      .catch((e) => e.name !== "AbortError" && setError(true));
    return () => ctrl.abort();
  }, [today, selected, retry]);

  const pending = !data || data.date !== selected;
  const isToday = selected === today;
  const title = !selected
    ? ""
    : isToday
      ? "Today"
      : parseDate(selected).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pb-10 pt-6">
      <header className="rise relative z-40 flex items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink/50">{greeting}</p>
          <p className="truncate text-[22px] font-bold leading-tight">{firstName(user.name, user.email)}</p>
        </div>
        <Menu email={user.email} />
      </header>

      <WeekStrip days={data?.days ?? null} today={today} selected={selected} target={target.kcal} onSelect={setPicked} />

      {error && !data ? (
        <div className="rounded-3xl bg-ink p-5 text-white">
          <p className="font-bold">Couldn’t load your day.</p>
          <button type="button" onClick={() => (setError(false), setRetry((n) => n + 1))} className="mt-3 h-11 rounded-2xl bg-neon px-5 font-bold text-ink active:scale-95">
            Try again
          </button>
        </div>
      ) : (
        <>
          <DayChart entries={data?.entries ?? null} target={target} title={title ? `${title}’s intake` : "Intake"} pending={pending} />
          <div className="flex items-end justify-between px-1">
            <h2 className="text-[22px] font-bold">{isToday ? "Today’s meals" : `${title}`}</h2>
            <span className="text-[13px] font-bold text-ink/50">{target.plan} plan</span>
          </div>
          <Meals entries={data?.entries ?? null} pending={pending} date={selected} />
        </>
      )}
    </div>
  );
}
