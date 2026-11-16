import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { HomeClient } from "@/components/home/HomeClient";

export const metadata = { title: "Home · Kcal" };

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { rows } = await pool.query(
    "select daily_kcal, protein_g, carbs_g, fat_g, plan_name from profile where user_id = $1",
    [session.user.id],
  );
  const p = rows[0];
  if (!p) redirect("/onboarding");

  return (
    <HomeClient
      user={{ email: session.user.email, name: session.user.name, image: session.user.image ?? null }}
      target={{ kcal: p.daily_kcal, proteinG: p.protein_g, carbsG: p.carbs_g, fatG: p.fat_g, plan: p.plan_name }}
    />
  );
}
