import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import type { Pool } from "pg";

// Neon over WebSocket (port 443): works even on networks that block Postgres port 5432.
if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;

// One pool per server process (survives hot reload in dev).
const g = globalThis as unknown as { __pool?: Pool };

export const pool: Pool =
  g.__pool ??
  (g.__pool = new NeonPool({ connectionString: process.env.DATABASE_URL, max: 5 }) as unknown as Pool);
