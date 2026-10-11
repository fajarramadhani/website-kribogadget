import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
export const sqlFile = (rel: string) => readFileSync(path.join(root, rel), "utf8");

/** Stub minimal skema Supabase (auth, role) agar migrasi asli bisa dijalankan apa adanya. */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant select on auth.users to authenticated;
`;

export async function createDb(opts: { seedDemo?: boolean } = {}) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SUPABASE_STUB);
  await db.exec(sqlFile("supabase/migrations/0001_schema.sql"));
  if (opts.seedDemo) await db.exec(sqlFile("supabase/seed/demo_seed.sql"));
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

/** Menjalankan fn dengan role Postgres tertentu (meniru PostgREST: anon / authenticated / service_role). */
export async function as<T>(
  db: Db,
  role: "anon" | "authenticated" | "service_role" | "postgres",
  userId: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export async function makeAdmin(db: Db, email = "admin@example.test") {
  const u = await db.query<{ id: string }>(
    `insert into auth.users (email) values ($1) returning id`, [email],
  );
  const id = u.rows[0].id;
  await db.query(`insert into public.profiles (id, role) values ($1, 'admin')`, [id]);
  return id;
}

export async function makeUser(db: Db, email = "user@example.test") {
  const u = await db.query<{ id: string }>(
    `insert into auth.users (email) values ($1) returning id`, [email],
  );
  return u.rows[0].id;
}

export async function makeUnit(
  db: Db,
  o: Partial<{ code: string; status: string; published: boolean; archived: boolean; price: number; battery: number | null; storage: number }> = {},
) {
  const m = await db.query<{ id: string }>(
    `insert into public.product_models (name) values ('iPhone Test') on conflict (name) do update set name = excluded.name returning id`,
  );
  const code = o.code ?? `T-${Math.random().toString(36).slice(2, 8)}`;
  const r = await db.query<{ id: string }>(
    `insert into public.units (unit_code, slug, model_id, storage_gb, color, battery_health, price, is_published, archived_at)
     values ($1, $2, $3, $4, 'Hitam', $5, $6, $7, $8) returning id`,
    [code, code.toLowerCase(), m.rows[0].id, o.storage ?? 128, o.battery === undefined ? 90 : o.battery,
     o.price ?? 5_000_000, o.published ?? true, o.archived ? new Date().toISOString() : null],
  );
  const id = r.rows[0].id;
  if (o.status && o.status !== "available") {
    if (o.status === "sold") {
      await db.query(`insert into public.sales (unit_id, sale_price) values ($1, $2)`, [id, o.price ?? 5_000_000]);
    }
    await db.query(`update public.units set stock_status = $2 where id = $1`, [id, o.status]);
  }
  return id;
}

export async function makeTalent(db: Db, name = "Talent Uji", hours = true) {
  const t = await db.query<{ id: string }>(
    `insert into public.talents (name) values ($1) returning id`, [name],
  );
  const id = t.rows[0].id;
  if (hours) {
    for (let d = 0; d <= 6; d++) {
      await db.query(
        `insert into public.talent_working_hours (talent_id, weekday, start_time, end_time) values ($1,$2,'09:00','18:00')`,
        [id, d],
      );
    }
  }
  return id;
}

export async function book(db: Db, unitId: string, phone = "628123456789", name = "Budi Santoso") {
  return as(db, "service_role", null, async () => {
    const r = await db.query<{ booking_code: string; appointment_id: string }>(
      `select * from public.create_booking($1, $2, $3, current_date + 3, '14:00', 'Jakarta Selatan', null)`,
      [unitId, name, phone],
    );
    return r.rows[0];
  });
}

/** Jam WIB (UTC+7) → timestamptz literal untuk tanggal relatif hari ini+3. */
export const wib = (hhmm: string, dayOffset = 3) =>
  `((current_date + ${dayOffset}) + time '${hhmm}') at time zone 'Asia/Jakarta'`;
