export type Slot = "breakfast" | "brunch" | "lunch" | "snack" | "dinner";

export const SLOTS: { key: Slot; label: string; short: string }[] = [
  { key: "breakfast", label: "Breakfast", short: "Breakfast" },
  { key: "brunch", label: "Brunch", short: "Brunch" },
  { key: "lunch", label: "Lunch", short: "Lunch" },
  { key: "snack", label: "Evening snack", short: "Snack" },
  { key: "dinner", label: "Dinner", short: "Dinner" },
];

export type Entry = {
  id: string;
  slot: Slot;
  name: string;
  qty: number | null;
  unit: string | null;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type DayTotal = { date: string; kcal: number; items: number };

export type Target = { kcal: number; proteinG: number; carbsG: number; fatG: number; plan: string };
export type User = { email: string; name: string; image: string | null };

/** Local calendar day as YYYY-MM-DD (never UTC, so "today" matches the user's clock). */
export function localDate(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export const parseDate = (s: string) => new Date(`${s}T00:00:00`);

/** "ronit.rai1237@gmail.com" -> "Ronit". Uses the name if set, else the email's first part. */
export function firstName(name: string, email: string) {
  const raw = (name || email.split("@")[0]).split(/[._\-\s+]/)[0].replace(/[0-9]+/g, "");
  const base = raw || email.split("@")[0].replace(/[0-9]+/g, "") || "there";
  return base.charAt(0).toUpperCase() + base.slice(1);
}
