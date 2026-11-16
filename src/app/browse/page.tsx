import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Heading } from "@/components/ui";
import { SLOTS } from "@/components/home/types";

export const metadata = { title: "Browse foods · Kcal" };

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ slot?: string; date?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const { slot } = await searchParams;
  const label = SLOTS.find((s) => s.key === slot)?.label.toLowerCase();

  return (
    <main className="rise flex flex-1 flex-col gap-4 px-5 pb-8 pt-6">
      <Link
        href="/home"
        aria-label="Back to home"
        className="grid size-11 place-items-center rounded-full bg-ink/[0.06] transition-transform active:scale-90 active:bg-neon"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </Link>
      <div className="mt-2">
        <Heading before="Browse " mark="foods" />
      </div>
      <p className="text-[15px] font-medium leading-relaxed text-ink/55">
        {label ? `Adding to ${label}. ` : ""}Search, scan and log food from here. This page is coming next.
      </p>
    </main>
  );
}
