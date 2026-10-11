import { describe, it, expect, beforeEach } from "vitest";
import { as, book, createDb, makeAdmin, makeUnit, makeUser, makeTalent, wib, type Db } from "./harness";

let db: Db;
let adminId: string;

beforeEach(async () => {
  db = await createDb();
  adminId = await makeAdmin(db);
});

const unitRow = async (id: string) =>
  (await db.query<{ stock_status: string; stock_hold_expires_at: string | null }>(
    `select stock_status, stock_hold_expires_at from public.units where id = $1`, [id])).rows[0];

const schedule = (
  id: string, talent: string, start: string, end: string, loc = "Lokasi COD", by?: string,
) => as(db, "authenticated", by ?? adminId, () => db.query(
  `select public.admin_schedule_appointment($1, $2, ${wib(start)}, ${wib(end)}, $3, null)`, [id, talent, loc]));

describe("pembuatan booking", () => {
  it("booking valid tersimpan Pending, menahan unit, mencatat histori, kode unik", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    expect(b.booking_code).toMatch(/^KRB-[0-9A-F]{10}$/);

    const a = (await db.query<{ status: string; customer_name: string }>(
      `select status, customer_name from public.appointments where id = $1`, [b.appointment_id])).rows[0];
    expect(a.status).toBe("pending");
    expect(a.customer_name).toBe("Budi Santoso");

    const u = await unitRow(unit);
    expect(u.stock_status).toBe("reserved");
    expect(u.stock_hold_expires_at).not.toBeNull();

    const h = await db.query<{ from_status: string | null; to_status: string; actor_label: string }>(
      `select from_status, to_status, actor_label from public.appointment_status_histories where appointment_id = $1`,
      [b.appointment_id]);
    expect(h.rows).toEqual([{ from_status: null, to_status: "pending", actor_label: "customer" }]);
  });

  it("kode booking berbeda untuk booking berbeda", async () => {
    const codes = new Set<string>();
    for (let i = 0; i < 5; i++) codes.add((await book(db, await makeUnit(db), `62812000000${i}`)).booking_code);
    expect(codes.size).toBe(5);
  });

  it("menolak unit Sold", async () => {
    const unit = await makeUnit(db, { status: "sold" });
    await expect(book(db, unit)).rejects.toThrow(/UNIT_UNAVAILABLE/);
  });

  it("menolak unit yang tidak dipublikasikan, diarsipkan, atau tidak ada", async () => {
    await expect(book(db, await makeUnit(db, { published: false }))).rejects.toThrow(/UNIT_NOT_FOUND/);
    await expect(book(db, await makeUnit(db, { archived: true }))).rejects.toThrow(/UNIT_NOT_FOUND/);
    await expect(book(db, "00000000-0000-0000-0000-000000000000")).rejects.toThrow(/UNIT_NOT_FOUND/);
  });

  it("menolak nomor/nama invalid di level database (defence in depth)", async () => {
    const unit = await makeUnit(db);
    await expect(book(db, unit, "0812345")).rejects.toThrow();
    await expect(book(db, unit, "628123456789", "B")).rejects.toThrow();
  });

  it("dua request bersamaan tidak dapat menahan unit yang sama", async () => {
    const unit = await makeUnit(db);
    const results = await Promise.allSettled([
      book(db, unit, "628111111111", "Pembeli Satu"),
      book(db, unit, "628222222222", "Pembeli Dua"),
      book(db, unit, "628333333333", "Pembeli Tiga"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect(String((r as PromiseRejectedResult).reason)).toMatch(/UNIT_UNAVAILABLE/);
    }
    const n = await db.query<{ n: number }>(
      `select count(*)::int n from public.appointments where unit_id = $1 and status in ('pending','confirmed','reschedule_requested')`, [unit]);
    expect(n.rows[0].n).toBe(1);
  });

  it("constraint unik menolak dua booking aktif pada unit yang sama meski fungsi dilewati", async () => {
    const unit = await makeUnit(db);
    await book(db, unit);
    const c = (await db.query<{ id: string }>(`select id from public.customers limit 1`)).rows[0].id;
    await expect(db.query(
      `insert into public.appointments (booking_code, unit_id, customer_id, customer_name, preferred_date, preferred_time, preferred_area)
       values ('KRB-MANUAL0001', $1, $2, 'Orang Lain', current_date, '10:00', 'Area')`, [unit, c],
    )).rejects.toThrow(/appointments_one_active_per_unit/);
  });

  it("nomor yang sama memakai customer yang sama dan nama lama tidak ditimpa", async () => {
    await book(db, await makeUnit(db), "628999999999", "Nama Asli");
    await book(db, await makeUnit(db), "628999999999", "Penyamar Palsu");
    const c = await db.query<{ name: string }>(`select name from public.customers where phone = '628999999999'`);
    expect(c.rows).toEqual([{ name: "Nama Asli" }]);
  });
});

describe("kedaluwarsa dan pelepasan stok", () => {
  it("booking Pending kedaluwarsa melepas unit kembali Available", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    await db.query(`update public.appointments set expires_at = now() - interval '1 minute' where id = $1`, [b.appointment_id]);

    const released = await as(db, "anon", null, async () =>
      (await db.query<{ n: number }>(`select public.release_expired_holds() n`)).rows[0].n);
    expect(released).toBe(1);

    expect((await unitRow(unit)).stock_status).toBe("available");
    const a = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [b.appointment_id]);
    expect(a.rows[0].status).toBe("expired");
    await expect(book(db, unit, "628555555555", "Pembeli Baru")).resolves.toBeTruthy();
  });

  it("create_booking sendiri melepas hold yang sudah kedaluwarsa", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    await db.query(`update public.appointments set expires_at = now() - interval '1 minute' where id = $1`, [b.appointment_id]);
    await expect(book(db, unit, "628555555555", "Pembeli Baru")).resolves.toBeTruthy();
  });
});

describe("lookup booking (cek booking tanpa akun)", () => {
  const lookup = (code: string, phone: string) => as(db, "service_role", null, async () =>
    (await db.query<{ booking_code: string }>(`select * from public.lookup_booking($1, $2)`, [code, phone])).rows);

  it("hanya mengembalikan data bila kode DAN nomor cocok", async () => {
    const b = await book(db, await makeUnit(db), "628111222333", "Siti");
    expect(await lookup(b.booking_code, "628111222333")).toHaveLength(1);
    expect(await lookup(b.booking_code.toLowerCase(), "628111222333")).toHaveLength(1);
    expect(await lookup(b.booking_code, "628999000111")).toHaveLength(0);
    expect(await lookup("KRB-0000000000", "628111222333")).toHaveLength(0);
  });

  it("pelanggan A tidak bisa melihat booking pelanggan B", async () => {
    const a = await book(db, await makeUnit(db), "628100000001", "Pelanggan A");
    await book(db, await makeUnit(db), "628100000002", "Pelanggan B");
    expect(await lookup(a.booking_code, "628100000002")).toHaveLength(0);
  });

  it("detail jadwal dan talent disembunyikan sampai booking Confirmed", async () => {
    const b = await book(db, await makeUnit(db), "628111222333", "Siti");
    const talent = await makeTalent(db, "Talent Rahasia");
    const read = () => as(db, "service_role", null, async () =>
      (await db.query<{ status: string; talent_name: string | null; final_location: string | null }>(
        `select status, talent_name, final_location from public.lookup_booking($1, '628111222333')`, [b.booking_code])).rows[0]);

    expect(await read()).toEqual({ status: "pending", talent_name: null, final_location: null });
    await schedule(b.appointment_id, talent, "10:00", "11:00", "Mall Demo");
    expect(await read()).toEqual({ status: "confirmed", talent_name: "Talent Rahasia", final_location: "Mall Demo" });
  });
});

describe("rate limit", () => {
  it("menolak setelah melewati batas dalam jendela waktu", async () => {
    const hit = () => as(db, "service_role", null, async () =>
      (await db.query<{ ok: boolean }>(`select public.check_rate_limit('booking:abc', 3, 60) ok`)).rows[0].ok);
    expect([await hit(), await hit(), await hit(), await hit()]).toEqual([true, true, true, false]);
  });
});

describe("penjadwalan talent", () => {
  it("mengonfirmasi booking: status, talent, lokasi, hold tanpa kedaluwarsa, histori admin", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    const talent = await makeTalent(db);
    await schedule(b.appointment_id, talent, "10:00", "11:00");

    const a = (await db.query<{ status: string; final_location: string; expires_at: string | null }>(
      `select status, final_location, expires_at from public.appointments where id = $1`, [b.appointment_id])).rows[0];
    expect(a).toMatchObject({ status: "confirmed", final_location: "Lokasi COD", expires_at: null });
    expect(await unitRow(unit)).toMatchObject({ stock_status: "reserved", stock_hold_expires_at: null });

    const h = await db.query<{ to_status: string; actor_label: string; actor_id: string }>(
      `select to_status, actor_label, actor_id from public.appointment_status_histories
        where appointment_id = $1 order by created_at, id`, [b.appointment_id]);
    expect(h.rows.at(-1)).toMatchObject({ to_status: "confirmed", actor_label: "admin", actor_id: adminId });
  });

  it("talent tidak bisa dikonfirmasi pada jadwal yang bentrok", async () => {
    const talent = await makeTalent(db);
    const a = await book(db, await makeUnit(db), "628100000001", "Pelanggan A");
    const b = await book(db, await makeUnit(db), "628100000002", "Pelanggan B");
    await schedule(a.appointment_id, talent, "10:00", "11:00");

    await expect(schedule(b.appointment_id, talent, "10:30", "11:30")).rejects.toThrow(/TALENT_CONFLICT/);
    await expect(schedule(b.appointment_id, talent, "09:30", "10:30")).rejects.toThrow(/TALENT_CONFLICT/);
    await expect(schedule(b.appointment_id, talent, "10:15", "10:45")).rejects.toThrow(/TALENT_CONFLICT/);
    await expect(schedule(b.appointment_id, talent, "11:00", "12:00")).resolves.toBeTruthy();
  });

  it("talent lain boleh mengambil jam yang sama", async () => {
    const t1 = await makeTalent(db, "T1");
    const t2 = await makeTalent(db, "T2");
    const a = await book(db, await makeUnit(db), "628100000001", "Pelanggan A");
    const b = await book(db, await makeUnit(db), "628100000002", "Pelanggan B");
    await schedule(a.appointment_id, t1, "10:00", "11:00");
    await expect(schedule(b.appointment_id, t2, "10:00", "11:00")).resolves.toBeTruthy();
  });

  it("menolak di luar jam kerja atau hari tanpa jadwal kerja", async () => {
    const talent = await makeTalent(db);
    const b = await book(db, await makeUnit(db));
    await expect(schedule(b.appointment_id, talent, "07:00", "08:00")).rejects.toThrow(/OUTSIDE_WORKING_HOURS/);
    await expect(schedule(b.appointment_id, talent, "17:30", "18:30")).rejects.toThrow(/OUTSIDE_WORKING_HOURS/);
    const noHours = await makeTalent(db, "Tanpa Jam", false);
    await expect(schedule(b.appointment_id, noHours, "10:00", "11:00")).rejects.toThrow(/OUTSIDE_WORKING_HOURS/);
  });

  it("menolak saat talent cuti atau nonaktif", async () => {
    const talent = await makeTalent(db);
    const b = await book(db, await makeUnit(db));
    await db.query(
      `insert into public.talent_unavailability (talent_id, starts_at, ends_at, reason)
       values ($1, ${wib("09:00")}, ${wib("12:00")}, 'Cuti')`, [talent]);
    await expect(schedule(b.appointment_id, talent, "10:00", "11:00")).rejects.toThrow(/TALENT_UNAVAILABLE/);
    await expect(schedule(b.appointment_id, talent, "12:00", "13:00")).resolves.toBeTruthy();

    const off = await makeTalent(db, "Nonaktif");
    await db.query(`update public.talents set is_active = false where id = $1`, [off]);
    const c = await book(db, await makeUnit(db), "628100000009", "Pelanggan C");
    await expect(schedule(c.appointment_id, off, "10:00", "11:00")).rejects.toThrow(/TALENT_INACTIVE/);
  });

  it("reschedule booking Confirmed tidak bentrok dengan dirinya sendiri", async () => {
    const talent = await makeTalent(db);
    const b = await book(db, await makeUnit(db));
    await schedule(b.appointment_id, talent, "10:00", "11:00");
    await expect(schedule(b.appointment_id, talent, "10:30", "11:30")).resolves.toBeTruthy();
  });

  it("constraint exclusion menolak tumpang tindih meski fungsi dilewati", async () => {
    const talent = await makeTalent(db);
    const a = await book(db, await makeUnit(db), "628100000001", "Pelanggan A");
    const b = await book(db, await makeUnit(db), "628100000002", "Pelanggan B");
    await schedule(a.appointment_id, talent, "10:00", "11:00");
    await expect(db.query(
      `update public.appointments set status='confirmed', talent_id=$2, final_location='X',
              scheduled_start=${wib("10:30")}, scheduled_end=${wib("11:30")} where id=$1`,
      [b.appointment_id, talent],
    )).rejects.toThrow(/appointments_no_talent_overlap/);
  });

  it("non-admin tidak dapat mengonfirmasi", async () => {
    const talent = await makeTalent(db);
    const b = await book(db, await makeUnit(db));
    const user = await makeUser(db);
    await expect(schedule(b.appointment_id, talent, "10:00", "11:00", "X", user)).rejects.toThrow(/FORBIDDEN/);
  });
});

describe("status appointment", () => {
  const setStatus = (id: string, status: string, note: string | null = null, outcome: string | null = null) =>
    as(db, "authenticated", adminId, () => db.query(
      `select public.admin_set_appointment_status($1, $2::public.appointment_status, $3, $4)`, [id, status, note, outcome]));

  it("mengikuti aturan transisi dan mencatat histori", async () => {
    const unit = await makeUnit(db);
    const talent = await makeTalent(db);
    const b = await book(db, unit);

    await expect(setStatus(b.appointment_id, "completed")).rejects.toThrow(/INVALID_TRANSITION/);

    await schedule(b.appointment_id, talent, "10:00", "11:00", "Lokasi");
    await setStatus(b.appointment_id, "reschedule_requested", "Pelanggan minta ganti jam");
    await expect(setStatus(b.appointment_id, "completed")).rejects.toThrow(/INVALID_TRANSITION/);

    await schedule(b.appointment_id, talent, "13:00", "14:00", "Lokasi baru");
    await setStatus(b.appointment_id, "completed", null, "Pelanggan memeriksa unit, belum deal");

    const a = (await db.query<{ status: string; outcome_notes: string; completed_at: string }>(
      `select status, outcome_notes, completed_at from public.appointments where id = $1`, [b.appointment_id])).rows[0];
    expect(a.status).toBe("completed");
    expect(a.outcome_notes).toContain("belum deal");
    expect(a.completed_at).not.toBeNull();
    expect((await unitRow(unit)).stock_status).toBe("available");

    await expect(setStatus(b.appointment_id, "cancelled")).rejects.toThrow(/INVALID_TRANSITION/);

    const h = await db.query<{ to_status: string }>(
      `select to_status from public.appointment_status_histories where appointment_id = $1 order by created_at, id`,
      [b.appointment_id]);
    expect(h.rows.map((r) => r.to_status)).toEqual(
      ["pending", "confirmed", "reschedule_requested", "confirmed", "completed"]);
  });

  it("pembatalan melepas hold; booking yang dibatalkan tidak bisa dikonfirmasi", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    await setStatus(b.appointment_id, "cancelled", "Pelanggan batal");
    expect((await unitRow(unit)).stock_status).toBe("available");
    const talent = await makeTalent(db);
    await expect(schedule(b.appointment_id, talent, "10:00", "11:00")).rejects.toThrow(/INVALID_TRANSITION/);
  });
});

describe("penjualan final", () => {
  const sell = (unit: string, appt: string | null, price: number, by?: string) =>
    as(db, "authenticated", by ?? adminId, async () =>
      (await db.query<{ id: string }>(`select public.admin_record_sale($1, $2, $3, null) id`, [unit, appt, price])).rows[0].id);

  it("unit menjadi Sold hanya setelah penjualan tercatat; booking ikut selesai", async () => {
    const unit = await makeUnit(db, { price: 7_000_000 });
    const talent = await makeTalent(db);
    const b = await book(db, unit);
    await schedule(b.appointment_id, talent, "10:00", "11:00", "Lokasi");

    await sell(unit, b.appointment_id, 6_900_000);
    expect((await unitRow(unit)).stock_status).toBe("sold");
    const s = (await db.query<{ sale_price: string; customer_id: string | null }>(
      `select sale_price, customer_id from public.sales where unit_id = $1`, [unit])).rows[0];
    expect(Number(s.sale_price)).toBe(6_900_000);
    expect(s.customer_id).not.toBeNull();
    const a = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [b.appointment_id]);
    expect(a.rows[0].status).toBe("completed");
  });

  it("penjualan final tidak bisa dibuat dua kali untuk unit yang sama", async () => {
    const unit = await makeUnit(db);
    await sell(unit, null, 5_000_000);
    await expect(sell(unit, null, 5_000_000)).rejects.toThrow(/ALREADY_SOLD/);
    await expect(db.query(`insert into public.sales (unit_id, sale_price) values ($1, 1)`, [unit]))
      .rejects.toThrow(/sales_unit_id_key/);
    const n = await db.query<{ n: number }>(`select count(*)::int n from public.sales where unit_id = $1`, [unit]);
    expect(n.rows[0].n).toBe(1);
  });

  it("dua pencatatan bersamaan hanya menghasilkan satu penjualan", async () => {
    const unit = await makeUnit(db);
    const r = await Promise.allSettled([sell(unit, null, 5_000_000), sell(unit, null, 5_000_000)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });

  it("status 'sold' tidak bisa diset langsung tanpa penjualan, dan tidak bisa dibatalkan lewat update", async () => {
    const unit = await makeUnit(db);
    await expect(as(db, "authenticated", adminId, () =>
      db.query(`update public.units set stock_status = 'sold' where id = $1`, [unit]))).rejects.toThrow(/SALE_REQUIRED/);

    await sell(unit, null, 5_000_000);
    await expect(as(db, "authenticated", adminId, () =>
      db.query(`update public.units set stock_status = 'available' where id = $1`, [unit]))).rejects.toThrow(/UNIT_ALREADY_SOLD/);
  });

  it("menolak harga negatif dan booking milik unit lain", async () => {
    const unit = await makeUnit(db);
    await expect(sell(unit, null, -1)).rejects.toThrow(/INVALID_PRICE/);
    const other = await makeUnit(db);
    const b = await book(db, other);
    await expect(sell(unit, b.appointment_id, 1)).rejects.toThrow(/APPOINTMENT_NOT_FOUND/);
  });

  it("menjual unit membatalkan booking aktif lain atas unit tersebut", async () => {
    const unit = await makeUnit(db);
    const b = await book(db, unit);
    await sell(unit, null, 5_000_000);
    const a = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [b.appointment_id]);
    expect(a.rows[0].status).toBe("cancelled");
  });

  it("non-admin tidak dapat mencatat penjualan", async () => {
    const unit = await makeUnit(db);
    const user = await makeUser(db);
    await expect(sell(unit, null, 1, user)).rejects.toThrow(/FORBIDDEN/);
  });
});

describe("validasi inventaris", () => {
  const insertUnit = (code: string, slug: string, price = 1_000_000, battery: number | null = null) =>
    db.query(
      `insert into public.units (unit_code, slug, model_id, storage_gb, color, price, battery_health)
       values ($1, $2, (select id from public.product_models limit 1), 128, 'Hitam', $3, $4)`,
      [code, slug, price, battery]);
  beforeEach(async () => { await db.query(`insert into public.product_models (name) values ('iPhone V')`); });

  it("menolak harga negatif dan battery di luar 0-100, menerima NULL dan 0", async () => {
    await expect(insertUnit("V-1", "v-1", -1)).rejects.toThrow(/units_price_check/);
    await expect(insertUnit("V-2", "v-2", 1, 101)).rejects.toThrow(/battery_health/);
    await expect(insertUnit("V-3", "v-3", 1, -1)).rejects.toThrow(/battery_health/);
    await expect(insertUnit("V-4", "v-4", 1, null)).resolves.toBeTruthy();
    await expect(insertUnit("V-5", "v-5", 1, 0)).resolves.toBeTruthy();
  });

  it("kode unit dan slug harus unik", async () => {
    await insertUnit("DUP-1", "dup-1");
    await expect(insertUnit("DUP-1", "lain")).rejects.toThrow(/unit_code/);
    await expect(insertUnit("DUP-2", "dup-1")).rejects.toThrow(/slug/);
  });

  it("unit tidak dapat dihapus admin (riwayat dipertahankan); arsip menyembunyikan dari publik", async () => {
    const unit = await makeUnit(db);
    await expect(as(db, "authenticated", adminId, () =>
      db.query(`delete from public.units where id = $1`, [unit]))).rejects.toThrow(/permission denied/i);
    await as(db, "authenticated", adminId, () =>
      db.query(`update public.units set archived_at = now() where id = $1`, [unit]));
    const pub = await as(db, "anon", null, async () =>
      (await db.query(`select 1 from public.units where id = $1`, [unit])).rows);
    expect(pub).toHaveLength(0);
  });

  it("perubahan unit oleh admin tercatat di audit_logs", async () => {
    const unit = await makeUnit(db);
    await as(db, "authenticated", adminId, () =>
      db.query(`update public.units set price = 9000000 where id = $1`, [unit]));
    const r = await as(db, "authenticated", adminId, async () =>
      (await db.query<{ actor_id: string }>(
        `select actor_id from public.audit_logs where entity_type = 'units' and entity_id = $1 and action = 'update'`, [unit])).rows);
    expect(r).toEqual([{ actor_id: adminId }]);
  });
});
