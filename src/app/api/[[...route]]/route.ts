import { Hono } from "hono";
import { handle } from "hono/vercel";
import { auth } from "@/lib/auth";
import { home } from "@/server/home";
import { onboarding } from "@/server/onboarding";

// Web search + AI can take a while.
export const maxDuration = 120;

// All backend routes live here (Hono). Later features add routes below.
const app = new Hono().basePath("/api");

app.get("/health", (c) => c.json({ ok: true }));

// Better Auth: /api/auth/*
app.on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw));

app.route("/onboarding", onboarding);
app.route("/home", home);

// Pattern for protected routes.
app.get("/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: session.user });
});

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
