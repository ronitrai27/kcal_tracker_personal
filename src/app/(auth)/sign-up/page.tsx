import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Create account · Kcal" };

export default async function SignUpPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/home");
  return <AuthForm mode="sign-up" />;
}
