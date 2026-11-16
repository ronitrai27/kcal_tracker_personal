import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { ACTIVITIES } from "@/lib/nutrition";
import { formatDate, formatKg, kgToLb, type WeightUnit } from "@/lib/units";
import { Heading } from "@/components/ui";

export const metadata = { title: "Settings · Kcal" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink/[0.05] px-3 py-3">
      <p className="text-[11px] font-bold text-ink/50">{label}</p>
      <p className="mt-0.5 text-[17px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { rows } = await pool.query("select *, plan_end_date::text as end_date from profile where user_id = $1", [session.user.id]);
  const p = rows[0];
  if (!p) redirect("/onboarding");

  const wu: WeightUnit = p.units?.weight === "lb" ? "lb" : "kg";
  const weight = Number(p.weight_kg);
  const target = Number(p.target_weight_kg);
  const activity = ACTIVITIES.find((a) => a.key === p.activity)?.label ?? p.activity;
  const height = `${Math.round(Number(p.height_cm))} cm`;
  const diff = target - weight;

  return (
    <main className="rise flex flex-1 flex-col gap-4 px-5 pb-8 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/home" aria-label="Back to home" className="grid size-11 place-items-center rounded-full bg-ink/[0.06] transition-transform active:scale-90 active:bg-neon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <span className="text-[17px] font-bold">Settings</span>
      </div>

      <div className="mt-2">
        <Heading before="Your " mark="goal" />
      </div>

      <section className="rounded-[28px] bg-neon p-5">
        <p className="text-[13px] font-bold uppercase tracking-wide">{p.plan_name} plan</p>
        <p className="mt-1 text-[22px] font-bold leading-tight">
          {formatKg(weight, wu)} → {formatKg(target, wu)}
        </p>
        <p className="mt-1 text-[15px] font-medium">
          {diff < 0 ? "Lose" : "Gain"} {formatKg(Math.abs(diff), wu)}
          {p.end_date ? ` · by ${formatDate(p.end_date)}` : ""}
          {p.plan_days ? ` · ${p.plan_days} days` : ""}
        </p>
        <div className="mt-4 flex items-end justify-between rounded-2xl bg-ink px-4 py-3 text-white">
          <div>
            <p className="text-[11px] font-bold text-neon">Daily target</p>
            <p className="text-[30px] font-bold leading-none tabular-nums">{p.daily_kcal.toLocaleString()}</p>
          </div>
          <p className="text-right text-[13px] font-bold leading-snug">
            {p.protein_g}g protein
            <br />
            {p.carbs_g}g carbs · {p.fat_g}g fat
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Height" value={height} />
        <Stat label="Weight" value={wu === "kg" ? `${weight.toFixed(1)} kg` : `${kgToLb(weight).toFixed(1)} lb`} />
        <Stat label="Age · Sex" value={`${p.age} · ${p.sex === "male" ? "Male" : "Female"}`} />
        <Stat label="Activity" value={activity} />
        <Stat label="Resting burn" value={`${p.bmr.toLocaleString()} kcal`} />
        <Stat label="Daily burn" value={`${p.tdee.toLocaleString()} kcal`} />
      </div>

      <div className="flex-1" />
      <p className="px-1 text-[13px] font-medium leading-snug text-ink/50">
        Changing your goal re-runs the AI researcher, which searches the web again for fresh plans based on your new numbers.
      </p>
      <Link
        href="/settings/goal"
        className="flex h-14 w-full items-center justify-center rounded-[18px] bg-ink text-[17px] font-bold text-white transition-transform duration-150 active:scale-[0.96]"
      >
        Change goal &amp; get new plans
      </Link>
    </main>
  );
}
