import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Onboarding } from "@/components/onboarding/Onboarding";
import type { Data } from "@/components/onboarding/types";

export const metadata = { title: "Change goal · Kcal" };

export default async function GoalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const { rows } = await pool.query("select *, (plan_end_date - current_date)::int as days_left from profile where user_id = $1", [session.user.id]);
  const p = rows[0];
  if (!p) redirect("/onboarding");

  // Start from the saved goal; the timeline starts at the days still left on the current plan.
  const left: number = p.days_left ?? 0;
  const initial: Data = {
    heightCm: Number(p.height_cm),
    weightKg: Number(p.weight_kg),
    targetKg: Number(p.target_weight_kg),
    targetDays: left >= 14 ? left : p.target_days,
    sex: p.sex,
    age: p.age,
    activity: p.activity,
    units: {
      height: p.units?.height ?? "cm",
      weight: p.units?.weight ?? "kg",
      time: p.units?.time ?? "days",
    },
  };

  return <Onboarding mode="settings" initial={initial} />;
}
