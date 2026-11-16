// Usage: npm run db:migrate   (applies db/schema.sql to Neon; safe to re-run)
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = WebSocket;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
console.log("migration done");
await pool.end();
