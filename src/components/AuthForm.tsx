"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, ErrorText, Field, Heading, Logo, Sub } from "./ui";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const signUp = mode === "sign-up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (signUp && password.length < 8) return setError("Password needs at least 8 characters");
    setLoading(true);
    const cleanEmail = email.trim();
    const { error } = signUp
      ? await authClient.signUp.email({ email: cleanEmail, password, name: cleanEmail.split("@")[0] || "Me" })
      : await authClient.signIn.email({ email: cleanEmail, password });
    if (error) {
      setLoading(false);
      setError(error.message || (signUp ? "Could not create account" : "Wrong email or password"));
      return;
    }
    router.replace("/home");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rise flex flex-1 flex-col gap-3.5 px-6 pb-8 pt-14">
      <Logo />
      <div className="h-4" />
      {signUp ? <Heading before="Create an " mark="account" /> : <Heading before="Welcome " mark="back," />}
      <Sub>
        {signUp
          ? "Takes less than a minute. Just an email and a password."
          : "Good to see you again. Log in to keep your streak going."}
      </Sub>
      <div className="h-2" />
      <Field
        type="email"
        name="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        enterKeyHint="next"
        required
      />
      <Field
        secure
        name="password"
        placeholder={signUp ? "Password (8+ characters)" : "Password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={signUp ? "new-password" : "current-password"}
        enterKeyHint="go"
        required
      />
      <ErrorText>{error}</ErrorText>
      <Button type="submit" loading={loading} disabled={!email || !password}>
        {signUp ? "Create an Account" : "Log In"}
      </Button>

      <div className="flex-1" />

      {signUp ? (
        <p className="text-center text-[15px] font-medium">
          Already have an account?{" "}
          <Link href="/sign-in" className="rounded-md bg-neon px-1.5 py-0.5 font-bold">
            Log In
          </Link>
        </p>
      ) : (
        <>
          <p className="text-center text-sm font-medium text-ink/50">New here?</p>
          <Link
            href="/sign-up"
            className="flex h-14 w-full items-center justify-center rounded-[18px] bg-ink text-[17px] font-bold text-white transition-transform duration-150 active:scale-[0.96]"
          >
            Create an Account
          </Link>
        </>
      )}
    </form>
  );
}
