import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata = { title: "Set up · Kcal" };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const done = await pool.query("select 1 from profile where user_id = $1", [session.user.id]);
  if (done.rowCount) redirect("/home");
  return <Onboarding />;
}
