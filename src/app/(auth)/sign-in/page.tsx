import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in · Kcal" };

export default async function SignInPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/home");
  return <AuthForm mode="sign-in" />;
}
