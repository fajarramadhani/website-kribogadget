import "server-only";
import { requireAdmin } from "@/lib/auth";
import { dayBoundsJakarta, todayJakarta } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/status";
import type {
  Appointment,
  Sale,
  StatusHistory,
  Talent,
  Unavailability,
  UnitWithModel,
  WorkingHour,
} from "@/types/db";

const UNIT_SELECT = `*, product_models ( name ), unit_images ( id, unit_id, url, storage_path, alt, is_primary, sort_order, is_demo )`;

export type AppointmentRow = Appointment & {
  units: { unit_code: string; slug: string; storage_gb: number; color: string; product_models: { name: string } | null } | null;
  talents: { name: string } | null;
};

const APPT_SELECT = `*, units ( unit_code, slug, storage_gb, color, product_models ( name ) ), talents ( name )`;

export async function getDashboardStats() {
  const { supabase } = await requireAdmin();
  await supabase.rpc("release_expired_holds");
  const today = dayBoundsJakarta(todayJakarta());
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [available, reserved, pending, todayCount, confirmed, sales, recent] = await Promise.all([
    count(supabase.from("units").select("id", { count: "exact", head: true }).eq("stock_status", "available").is("archived_at", null)),
    count(supabase.from("units").select("id", { count: "exact", head: true }).eq("stock_status", "reserved").is("archived_at", null)),
    count(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "confirmed")
        .gte("scheduled_start", today.start)
        .lt("scheduled_start", today.end),
    ),
    count(supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "confirmed")),
    supabase.from("sales").select("sale_price", { count: "exact" }).limit(5000),
    supabase.from("appointments").select(APPT_SELECT).order("created_at", { ascending: false }).limit(8),
  ]);

  const revenue = (sales.data ?? []).reduce((s, r) => s + Number(r.sale_price), 0);
  return {
    available,
    reserved,
    pending,
    today: todayCount,
    confirmed,
    salesCount: sales.count ?? 0,
    revenue,
    recent: (recent.data ?? []) as unknown as AppointmentRow[],
  };
}

export async function listInventory(opts: { q?: string; status?: string; archived?: boolean }) {
  const { supabase } = await requireAdmin();
  let query = supabase.from("units").select(UNIT_SELECT).order("created_at", { ascending: false }).limit(500);
  if (opts.archived) query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (opts.status === "available" || opts.status === "reserved" || opts.status === "sold") {
    query = query.eq("stock_status", opts.status);
  }
  const { data } = await query;
  const rows = (data ?? []) as unknown as UnitWithModel[];
  const q = opts.q?.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((u) =>
    [u.unit_code, u.color, u.product_models?.name ?? ""].some((v) => v.toLowerCase().includes(q)),
  );
}

export async function getUnitById(id: string): Promise<UnitWithModel | null> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("units").select(UNIT_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as UnitWithModel) ?? null;
}

export async function getUnitHistory(unitId: string) {
  const { supabase } = await requireAdmin();
  const [appts, sale] = await Promise.all([
    supabase.from("appointments").select(APPT_SELECT).eq("unit_id", unitId).order("created_at", { ascending: false }),
    supabase.from("sales").select("*").eq("unit_id", unitId).maybeSingle(),
  ]);
  return {
    appointments: (appts.data ?? []) as unknown as AppointmentRow[],
    sale: (sale.data as Sale | null) ?? null,
  };
}

export async function listAppointments(opts: { status?: string; from?: string; to?: string }) {
  const { supabase } = await requireAdmin();
  await supabase.rpc("release_expired_holds");
  let query = supabase.from("appointments").select(APPT_SELECT).order("created_at", { ascending: false }).limit(300);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status as AppointmentStatus);
  if (opts.from) query = query.gte("preferred_date", opts.from);
  if (opts.to) query = query.lte("preferred_date", opts.to);
  const { data } = await query;
  return (data ?? []) as unknown as AppointmentRow[];
}

export async function getAppointment(id: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("appointments")
    .select(`${APPT_SELECT}, customers ( name, phone )`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const [hist, sale] = await Promise.all([
    supabase.from("appointment_status_histories").select("*").eq("appointment_id", id).order("created_at"),
    supabase.from("sales").select("*").eq("unit_id", (data as { unit_id: string }).unit_id).maybeSingle(),
  ]);
  return {
    appointment: data as unknown as AppointmentRow & { customers: { name: string; phone: string } | null },
    histories: (hist.data ?? []) as StatusHistory[],
    sale: (sale.data as Sale | null) ?? null,
  };
}

export async function listTalents() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("talents").select("*").order("name");
  return (data ?? []) as Talent[];
}

export async function getTalent(id: string) {
  const { supabase } = await requireAdmin();
  const nowIso = new Date().toISOString();
  const [t, hours, off, appts] = await Promise.all([
    supabase.from("talents").select("*").eq("id", id).maybeSingle(),
    supabase.from("talent_working_hours").select("*").eq("talent_id", id).order("weekday").order("start_time"),
    supabase.from("talent_unavailability").select("*").eq("talent_id", id).gte("ends_at", nowIso).order("starts_at"),
    supabase
      .from("appointments")
      .select(APPT_SELECT)
      .eq("talent_id", id)
      .in("status", ["confirmed", "reschedule_requested"])
      .order("scheduled_start")
      .limit(50),
  ]);
  if (!t.data) return null;
  return {
    talent: t.data as Talent,
    hours: (hours.data ?? []) as WorkingHour[],
    unavailability: (off.data ?? []) as Unavailability[],
    appointments: (appts.data ?? []) as unknown as AppointmentRow[],
  };
}

export async function listActiveTalents() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("talents").select("id, name, service_areas").eq("is_active", true).order("name");
  return (data ?? []) as Pick<Talent, "id" | "name" | "service_areas">[];
}

export async function getAdminSettings() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("store_settings").select("key, value");
  const out: Record<string, string> = {};
  for (const r of data ?? []) out[r.key] = r.value;
  return out;
}

export async function listModels() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("product_models").select("name").order("name");
  return (data ?? []).map((m) => m.name as string);
}
