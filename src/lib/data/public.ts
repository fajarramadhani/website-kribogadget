import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { StoreSettings, UnitImage, UnitWithModel } from "@/types/db";

export const PAGE_SIZE = 12;

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "Kribo Gadget",
  instagram_handle: "kribogadget",
  whatsapp_number: "",
  address: "",
  operating_hours: "",
  service_info: "Lokasi COD fleksibel dan dikonfirmasi bersama admin setelah booking diajukan.",
  booking_policy:
    "Booking berstatus Pending sampai dikonfirmasi admin. Waktu dan lokasi final disepakati bersama admin.",
  hold_hours: "24",
  appointment_minutes: "60",
};

const CATALOG_SELECT = `
  id, unit_code, slug, model_id, storage_gb, color, battery_health, condition_grade,
  condition_notes, completeness, warranty_info, price, stock_status, stock_hold_expires_at,
  is_published, archived_at, is_demo, created_at, updated_at,
  product_models!inner ( name ),
  unit_images ( id, unit_id, url, storage_path, alt, is_primary, sort_order, is_demo )
`;

export type CatalogFilters = {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  storage?: number[];
  minBattery?: number;
  sort?: "terbaru" | "termurah" | "termahal";
  page?: number;
};

export function primaryImage(images: UnitImage[] | null | undefined): UnitImage | null {
  if (!images?.length) return null;
  return [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
}

export function unitDisplayName(u: Pick<UnitWithModel, "product_models" | "storage_gb" | "color">): string {
  const storage = u.storage_gb >= 1024 ? `${u.storage_gb / 1024}TB` : `${u.storage_gb}GB`;
  return `${u.product_models?.name ?? "iPhone"} ${storage} ${u.color}`;
}

export async function getSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_SETTINGS;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("store_settings").select("key, value");
    const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of data ?? []) merged[row.key] = row.value;
    return merged as unknown as StoreSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function releaseHolds(supabase: Awaited<ReturnType<typeof createClient>>) {
  // Melepas booking Pending yang kedaluwarsa agar status stok yang tampil akurat.
  await supabase.rpc("release_expired_holds");
}

export type CatalogResult = {
  units: UnitWithModel[];
  total: number;
  page: number;
  pageCount: number;
  error: boolean;
};

export async function listCatalog(filters: CatalogFilters = {}): Promise<CatalogResult> {
  const page = Math.max(1, filters.page ?? 1);
  if (!isSupabaseConfigured()) return { units: [], total: 0, page, pageCount: 1, error: true };

  try {
    const supabase = await createClient();
    await releaseHolds(supabase);

    let query = supabase
      .from("units")
      .select(CATALOG_SELECT, { count: "exact" })
      .eq("is_published", true)
      .is("archived_at", null)
      .in("stock_status", ["available", "reserved"]);

    const q = filters.q?.replace(/[%_,()\\]/g, " ").trim();
    if (q) query = query.ilike("product_models.name", `%${q}%`);
    if (filters.minPrice != null) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice != null) query = query.lte("price", filters.maxPrice);
    if (filters.storage?.length) query = query.in("storage_gb", filters.storage);
    if (filters.minBattery != null) query = query.gte("battery_health", filters.minBattery);

    if (filters.sort === "termurah") query = query.order("price", { ascending: true });
    else if (filters.sort === "termahal") query = query.order("price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const from = (page - 1) * PAGE_SIZE;
    const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const total = count ?? 0;
    return {
      units: (data ?? []) as unknown as UnitWithModel[],
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      error: false,
    };
  } catch {
    return { units: [], total: 0, page, pageCount: 1, error: true };
  }
}

export async function getFeaturedUnits(limit = 4): Promise<UnitWithModel[]> {
  const r = await listCatalog({ sort: "terbaru", page: 1 });
  return r.units.filter((u) => u.stock_status === "available").slice(0, limit);
}

export async function getStorageOptions(): Promise<number[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select("storage_gb")
      .eq("is_published", true)
      .is("archived_at", null)
      .in("stock_status", ["available", "reserved"]);
    return [...new Set((data ?? []).map((r) => r.storage_gb as number))].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export async function getUnitBySlug(slug: string): Promise<UnitWithModel | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    await releaseHolds(supabase);
    const { data } = await supabase
      .from("units")
      .select(CATALOG_SELECT)
      .eq("slug", slug)
      .eq("is_published", true)
      .is("archived_at", null)
      .in("stock_status", ["available", "reserved"])
      .maybeSingle();
    return (data as unknown as UnitWithModel) ?? null;
  } catch {
    return null;
  }
}

export async function getRelatedUnits(unit: UnitWithModel, limit = 4): Promise<UnitWithModel[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("units")
      .select(CATALOG_SELECT)
      .eq("model_id", unit.model_id)
      .neq("id", unit.id)
      .eq("is_published", true)
      .is("archived_at", null)
      .eq("stock_status", "available")
      .limit(limit);
    return (data ?? []) as unknown as UnitWithModel[];
  } catch {
    return [];
  }
}
