import { Hono } from "hono";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

type Env = { Variables: { userId: string } };
export const home = new Hono<Env>();

home.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", session.user.id);
  await next();
});

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ today: day, date: day });

/**
 * One call for the whole Home screen:
 *  - days: calories eaten on today and the 4 days before it
 *  - entries: everything eaten on the selected date
 * Dates are the user's local calendar days, sent by the browser.
 */
home.get("/", async (c) => {
  const q = query.safeParse({ today: c.req.query("today"), date: c.req.query("date") });
  if (!q.success) return c.json({ error: "invalid date" }, 400);
  const userId = c.get("userId");

  const [days, entries] = await Promise.all([
    pool.query(
      `select to_char(d::date, 'YYYY-MM-DD') as date, coalesce(sum(m.kcal), 0)::int as kcal, count(m.id)::int as items
         from generate_series($2::date - 4, $2::date, interval '1 day') d
         left join meal_entry m on m.user_id = $1 and m.eaten_on = d::date
        group by d order by d`,
      [userId, q.data.today],
    ),
    pool.query(
      `select id, slot, name, qty::float8 as qty, unit, kcal,
              protein_g::float8 as "proteinG", carbs_g::float8 as "carbsG", fat_g::float8 as "fatG"
         from meal_entry where user_id = $1 and eaten_on = $2::date
        order by created_at`,
      [userId, q.data.date],
    ),
  ]);

  return c.json({ days: days.rows, entries: entries.rows });
});
