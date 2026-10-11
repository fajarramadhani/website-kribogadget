import { describe, it, expect, beforeAll } from "vitest";
import { as, book, createDb, makeAdmin, makeUnit, makeUser, type Db } from "./harness";

let db: Db;
let adminId: string;
let userId: string;
let units: Record<string, string>;

beforeAll(async () => {
  db = await createDb();
  adminId = await makeAdmin(db);
  userId = await makeUser(db);
  units = {
    available: await makeUnit(db, { code: "U-AVAIL" }),
    reserved: await makeUnit(db, { code: "U-RSV", status: "reserved" }),
    sold: await makeUnit(db, { code: "U-SOLD", status: "sold" }),
    draft: await makeUnit(db, { code: "U-DRAFT", published: false }),
    archived: await makeUnit(db, { code: "U-ARCH", archived: true }),
  };
});

const codes = (rows: { unit_code: string }[]) => rows.map((r) => r.unit_code).sort();

describe("katalog publik (RLS pada units)", () => {
  it("anon hanya melihat unit terbit, tidak diarsipkan, dan belum terjual", async () => {
    const rows = await as(db, "anon", null, async () =>
      (await db.query<{ unit_code: string }>(`select unit_code from public.units`)).rows);
    expect(codes(rows)).toEqual(["U-AVAIL", "U-RSV"]);
  });

  it("user login non-admin tetap hanya melihat katalog publik", async () => {
    const rows = await as(db, "authenticated", userId, async () =>
      (await db.query<{ unit_code: string }>(`select unit_code from public.units`)).rows);
    expect(codes(rows)).toEqual(["U-AVAIL", "U-RSV"]);
  });

  it("admin melihat semua unit termasuk draft, arsip, dan terjual", async () => {
    const rows = await as(db, "authenticated", adminId, async () =>
      (await db.query<{ unit_code: string }>(`select unit_code from public.units`)).rows);
    expect(codes(rows)).toEqual(["U-ARCH", "U-AVAIL", "U-DRAFT", "U-RSV", "U-SOLD"]);
  });

  it("anon tidak bisa mengubah stok atau harga", async () => {
    await expect(
      as(db, "anon", null, () => db.query(`update public.units set price = 1 where id = $1`, [units.available])),
    ).rejects.toThrow(/permission denied/i);
  });

  it("user non-admin yang login tidak bisa mengubah unit (RLS menolak diam-diam)", async () => {
    const res = await as(db, "authenticated", userId, () =>
      db.query(`update public.units set price = 1 where id = $1`, [units.available]));
    expect(res.affectedRows).toBe(0);
  });
});

describe("data privat", () => {
  it("anon dan user biasa tidak dapat membaca customers, appointments, talents, audit_logs, settings privat", async () => {
    await book(db, units.available, "628111111111", "Pelanggan Satu");
    for (const [role, uid] of [["anon", null], ["authenticated", userId]] as const) {
      for (const table of ["customers", "appointments", "appointment_status_histories", "talents", "audit_logs", "sales", "rate_limits"]) {
        const p = as(db, role, uid, async () => (await db.query(`select * from public.${table}`)).rows);
        if (role === "anon" || table === "rate_limits") {
          await expect(p, `${role}/${table}`).rejects.toThrow(/permission denied/i);
        } else {
          expect(await p, `${role}/${table}`).toHaveLength(0);
        }
      }
    }
  });

  it("pengaturan privat (hold_hours) tidak terbaca publik, yang publik terbaca", async () => {
    const rows = await as(db, "anon", null, async () =>
      (await db.query<{ key: string }>(`select key from public.store_settings`)).rows);
    const keys = rows.map((r) => r.key);
    expect(keys).toContain("store_name");
    expect(keys).not.toContain("hold_hours");
  });

  it("anon tidak boleh memanggil create_booking / lookup_booking / check_rate_limit langsung", async () => {
    for (const q of [
      `select * from public.create_booking(gen_random_uuid(), 'Budi', '628123456789', current_date, '10:00', 'x', null)`,
      `select * from public.lookup_booking('KRB-X', '628123456789')`,
      `select public.check_rate_limit('k', 1, 60)`,
    ]) {
      await expect(as(db, "anon", null, () => db.query(q))).rejects.toThrow(/permission denied/i);
      await expect(as(db, "authenticated", userId, () => db.query(q))).rejects.toThrow(/permission denied/i);
    }
  });

  it("anon tidak dapat memanggil fungsi admin", async () => {
    await expect(
      as(db, "anon", null, () => db.query(`select public.admin_record_sale(gen_random_uuid(), null, 1, null)`)),
    ).rejects.toThrow(/permission denied/i);
  });

  it("user login non-admin ditolak oleh fungsi admin (FORBIDDEN)", async () => {
    await expect(
      as(db, "authenticated", userId, () => db.query(`select public.admin_record_sale($1, null, 1, null)`, [units.available])),
    ).rejects.toThrow(/FORBIDDEN/);
  });

  it("user non-admin tidak punya profil → is_admin() false, tak bisa mengangkat dirinya", async () => {
    await expect(
      as(db, "authenticated", userId, () => db.query(`insert into public.profiles (id, role) values ($1, 'admin')`, [userId])),
    ).rejects.toThrow(/permission denied/i);
  });
});
