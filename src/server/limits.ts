import { fetchGuidelines } from "@/lib/ai";
import { pool } from "@/lib/db";
import { FALLBACK_LIMITS, type Limits, type Source } from "@/lib/nutrition";

const TTL_DAYS = 30;

// A researched value is only trusted if it is physically sensible; otherwise the fallback is used.
const within = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : fallback;

type Raw = { kcalPerKg?: number; maxLossPctPerWeek?: number; maxGainPctPerWeek?: number; minKcalMale?: number; minKcalFemale?: number };

function sanitize(r: Raw): Limits {
  return {
    kcalPerKg: within(r.kcalPerKg, 6000, 9000, FALLBACK_LIMITS.kcalPerKg),
    maxLossPct: within(r.maxLossPctPerWeek, 0.5, 1.5, FALLBACK_LIMITS.maxLossPct),
    maxGainPct: within(r.maxGainPctPerWeek, 0.2, 1, FALLBACK_LIMITS.maxGainPct),
    minKcalMale: within(r.minKcalMale, 1200, 1800, FALLBACK_LIMITS.minKcalMale),
    minKcalFemale: within(r.minKcalFemale, 1000, 1500, FALLBACK_LIMITS.minKcalFemale),
  };
}

/** Researched guideline numbers, cached for 30 days in the database. */
export async function getLimits(): Promise<{ limits: Limits; sources: Source[]; researched: boolean }> {
  const cached = await pool.query(
    `select tips, sources, fetched_at > now() - make_interval(days => $2) as fresh from tip_cache where topic = $1`,
    ["guidelines", TTL_DAYS],
  );
  const row = cached.rows[0];
  if (row?.fresh) return { limits: sanitize(row.tips), sources: row.sources, researched: true };

  try {
    const { output, sources } = await fetchGuidelines();
    await pool.query(
      `insert into tip_cache (topic, title, tips, sources, fetched_at) values ($1, $2, $3, $4, now())
       on conflict (topic) do update set tips = excluded.tips, sources = excluded.sources, fetched_at = now()`,
      ["guidelines", "Guideline limits", JSON.stringify(output), JSON.stringify(sources)],
    );
    return { limits: sanitize(output), sources, researched: true };
  } catch (err) {
    console.error("guidelines failed", err);
    if (row) return { limits: sanitize(row.tips), sources: row.sources, researched: true };
    return { limits: FALLBACK_LIMITS, sources: [], researched: false };
  }
}
