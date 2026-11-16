import { betterAuth } from "better-auth";
import { pool } from "./db";

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
};

export const auth = betterAuth({
  database: pool,
  secret: required("BETTER_AUTH_SECRET"),
  // Empty in dev: derived from the request, so localhost / LAN IP / Vercel all work.
  baseURL: process.env.BETTER_AUTH_URL || undefined,
  // Trust the origin the request itself came to (same-origin only, so CSRF checks still hold).
  trustedOrigins: (request) => {
    if (!request) return [];
    // Use the Host the browser actually called (Next can rewrite request.url to localhost).
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
    return host ? [`${proto}://${host}`] : [new URL(request.url).origin];
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    // Stay logged in for a year; refresh daily.
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Private app: set ALLOW_SIGNUP=false once your account exists.
          if (process.env.ALLOW_SIGNUP === "false") throw new Error("Sign-ups are closed");
          return { data: user };
        },
      },
    },
  },
});
