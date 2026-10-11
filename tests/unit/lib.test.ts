import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/phone";
import { buildWhatsAppLink, waTemplates } from "@/lib/whatsapp";
import { canTransition, dbErrorMessage, STATUS_TRANSITIONS, APPOINTMENT_STATUSES } from "@/lib/status";
import { adminGate, safeNextPath } from "@/lib/admin-gate";
import { addDays, jakartaToIso, slugify, todayJakarta, toJakartaParts } from "@/lib/format";
import { bookingFormSchema, checkBookingSchema } from "@/lib/validation/booking";
import { unitSchema } from "@/lib/validation/admin";

const validBooking = () => ({
  unitId: "11111111-1111-4111-8111-111111111111",
  name: "Budi Santoso",
  phone: "0812-3456-7890",
  date: addDays(todayJakarta(), 2),
  time: "14:00",
  area: "Jakarta Selatan",
  notes: "",
  website: "",
});

describe("normalizePhone", () => {
  it.each([
    ["0812 3456 7890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["81234567890", "6281234567890"],
    ["6281234567890", "6281234567890"],
  ])("menormalkan %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(["", "abc", "0812", "021-5551234", "+1 202 555 0100", "0812345678901234567"])(
    "menolak %s",
    (input) => expect(normalizePhone(input)).toBeNull(),
  );
});

describe("whatsapp link", () => {
  it("membangun wa.me dengan teks ter-encode", () => {
    const url = buildWhatsAppLink("0812 3456 7890", waTemplates.generalInquiry())!;
    expect(url.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(waTemplates.generalInquiry());
  });
  it("mengembalikan null untuk nomor kosong/tidak valid", () => {
    expect(buildWhatsAppLink("", "x")).toBeNull();
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink("123")).toBeNull();
  });
});

describe("transisi status", () => {
  it("status akhir tidak punya transisi keluar", () => {
    for (const s of ["completed", "cancelled", "no_show", "expired"] as const) {
      expect(STATUS_TRANSITIONS[s]).toHaveLength(0);
    }
  });
  it("aturan utama", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("pending", "completed")).toBe(false);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("reschedule_requested", "completed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
  });
  it("semua status terdefinisi di peta transisi", () => {
    for (const s of APPOINTMENT_STATUSES) expect(STATUS_TRANSITIONS[s]).toBeDefined();
  });
  it("memetakan kode error database ke pesan pengguna", () => {
    expect(dbErrorMessage("UNIT_UNAVAILABLE")).toMatch(/dibooking|terjual/);
    expect(dbErrorMessage("TALENT_CONFLICT")).toMatch(/bentrok/);
    expect(dbErrorMessage("some internal stack trace")).toBe("Terjadi kesalahan. Silakan coba lagi.");
  });
});

describe("pagar admin (anonim tidak bisa masuk dashboard)", () => {
  it("mengarahkan anonim dari seluruh route admin kecuali login", () => {
    for (const p of ["/admin", "/admin/inventory", "/admin/inventory/new", "/admin/appointments/abc", "/admin/talents", "/admin/settings"]) {
      expect(adminGate(p, false)).toBe("redirect-login");
      expect(adminGate(p, true)).toBe("allow");
    }
    expect(adminGate("/admin/login", false)).toBe("allow");
    expect(adminGate("/katalog", false)).toBe("allow");
  });
  it("tidak membiarkan open redirect setelah login", () => {
    expect(safeNextPath("/admin/inventory")).toBe("/admin/inventory");
    for (const bad of ["https://evil.test", "//evil.test", "/\evil", "/katalog", "", null, undefined]) {
      expect(safeNextPath(bad as string)).toBe("/admin");
    }
  });
});

describe("zona waktu Asia/Jakarta", () => {
  it("mengonversi waktu WIB ke UTC dan sebaliknya", () => {
    expect(jakartaToIso("2026-05-10", "14:30")).toBe("2026-05-10T07:30:00.000Z");
    expect(toJakartaParts("2026-05-10T17:30:00.000Z")).toEqual({ date: "2026-05-11", time: "00:30" });
  });
  it("slugify", () => {
    expect(slugify("iPhone 13 Pro 256GB Graphite!")).toBe("iphone-13-pro-256gb-graphite");
  });
});

describe("validasi booking", () => {
  it("menerima input valid", () => {
    expect(bookingFormSchema.safeParse(validBooking()).success).toBe(true);
  });
  it("menolak input tidak valid dengan pesan Indonesia", () => {
    const cases: [Partial<ReturnType<typeof validBooking>>, string][] = [
      [{ name: "A" }, "name"],
      [{ phone: "12345" }, "phone"],
      [{ unitId: "bukan-uuid" }, "unitId"],
      [{ date: "2020-01-01" }, "date"],
      [{ date: addDays(todayJakarta(), 400) }, "date"],
      [{ time: "25:99" }, "time"],
      [{ area: "x" }, "area"],
      [{ notes: "x".repeat(501) }, "notes"],
      [{ website: "bot" }, "website"],
    ];
    for (const [patch, field] of cases) {
      const r = bookingFormSchema.safeParse({ ...validBooking(), ...patch });
      expect(r.success, field).toBe(false);
      if (!r.success) expect(Object.keys(r.error.flatten().fieldErrors)).toContain(field);
    }
  });
  it("cek booking mewajibkan format kode dan nomor", () => {
    expect(checkBookingSchema.safeParse({ code: "krb-1a2b3c4d5e", phone: "081234567890" }).success).toBe(true);
    expect(checkBookingSchema.safeParse({ code: "KRB-1", phone: "081234567890" }).success).toBe(false);
    expect(checkBookingSchema.safeParse({ code: "KRB-1A2B3C4D5E", phone: "" }).success).toBe(false);
  });
});

describe("validasi unit", () => {
  const base = {
    unitCode: "KG-0001", slug: "iphone-13", modelName: "iPhone 13", storageGb: "128",
    color: "Hitam", batteryHealth: "90", price: "7500000", stockStatus: "available", isPublished: "on",
  };
  it("menerima unit valid dan mengubah battery kosong menjadi undefined", () => {
    expect(unitSchema.safeParse(base).success).toBe(true);
    const r = unitSchema.parse({ ...base, batteryHealth: "" });
    expect(r.batteryHealth).toBeUndefined();
  });
  it("menolak harga negatif, battery di luar 0-100, status 'sold'", () => {
    expect(unitSchema.safeParse({ ...base, price: "-1" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...base, batteryHealth: "101" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...base, batteryHealth: "-5" }).success).toBe(false);
    expect(unitSchema.safeParse({ ...base, stockStatus: "sold" }).success).toBe(false);
  });
});
