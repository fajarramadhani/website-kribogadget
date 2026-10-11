"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/status";
import { slugify } from "@/lib/format";
import { formDataToObject, saleSchema, unitSchema, type ActionState } from "@/lib/validation/admin";

async function ensureModelId(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], name: string) {
  const existing = await supabase.from("product_models").select("id").eq("name", name).maybeSingle();
  if (existing.data?.id) return existing.data.id as string;
  const { data, error } = await supabase.from("product_models").insert({ name }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

function unitRow(d: ReturnType<typeof unitSchema.parse>, modelId: string) {
  return {
    unit_code: d.unitCode,
    slug: d.slug || slugify(`${d.modelName} ${d.storageGb}gb ${d.color} ${d.unitCode}`),
    model_id: modelId,
    storage_gb: d.storageGb,
    color: d.color,
    battery_health: d.batteryHealth ?? null,
    condition_grade: d.conditionGrade ?? null,
    condition_notes: d.conditionNotes ?? null,
    completeness: d.completeness ?? null,
    warranty_info: d.warrantyInfo ?? null,
    price: d.price,
    stock_status: d.stockStatus,
    is_published: d.isPublished,
  };
}

export async function createUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = unitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  let id: string;
  try {
    const modelId = await ensureModelId(supabase, parsed.data.modelName);
    const { data, error } = await supabase.from("units").insert(unitRow(parsed.data, modelId)).select("id").single();
    if (error) return { ok: false, message: dbErrorMessage(error.message) };
    id = data.id;
  } catch (e) {
    return { ok: false, message: dbErrorMessage((e as Error).message) };
  }
  revalidatePath("/admin/inventory");
  redirect(`/admin/inventory/${id}?baru=1`);
}

export async function updateUnit(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = unitSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const modelId = await ensureModelId(supabase, parsed.data.modelName);
    const row = unitRow(parsed.data, modelId);

    const { data: current } = await supabase.from("units").select("stock_status").eq("id", id).maybeSingle();
    // Unit terjual: status stok tidak boleh diubah dari sini.
    const patch: Record<string, unknown> =
      current?.stock_status === "sold"
        ? Object.fromEntries(Object.entries(row).filter(([k]) => k !== "stock_status"))
        : row;

    const { error } = await supabase.from("units").update(patch).eq("id", id);
    if (error) return { ok: false, message: dbErrorMessage(error.message) };
  } catch (e) {
    return { ok: false, message: dbErrorMessage((e as Error).message) };
  }
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  return { ok: true, message: "Perubahan disimpan." };
}

export async function setUnitPublished(id: string, published: boolean): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("units").update({ is_published: published }).eq("id", id);
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  return { ok: true, message: published ? "Unit dipublikasikan." : "Unit disembunyikan." };
}

/** Arsip = sembunyikan dari semua tampilan, riwayat booking & penjualan tetap utuh. */
export async function setUnitArchived(id: string, archived: boolean): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const patch = archived ? { archived_at: new Date().toISOString(), is_published: false } : { archived_at: null };
  const { error } = await supabase.from("units").update(patch).eq("id", id);
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${id}`);
  return { ok: true, message: archived ? "Unit diarsipkan." : "Unit dikembalikan dari arsip." };
}

const PATH_RE = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/;

/** Dipanggil setelah browser mengunggah file ke Storage (RLS membatasi ke admin). */
export async function registerUnitImage(unitId: string, path: string, alt: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!path.startsWith(`${unitId}/`) || !PATH_RE.test(path)) {
    return { ok: false, message: "Path foto tidak valid." };
  }
  const [folder, file] = path.split("/");
  const { data: listed } = await supabase.storage.from("unit-images").list(folder, { search: file });
  if (!listed?.some((o) => o.name === file)) {
    return { ok: false, message: "File foto tidak ditemukan di penyimpanan." };
  }
  const { data: pub } = supabase.storage.from("unit-images").getPublicUrl(path);

  const { count } = await supabase.from("unit_images").select("id", { count: "exact", head: true }).eq("unit_id", unitId);
  const { error } = await supabase.from("unit_images").insert({
    unit_id: unitId,
    storage_path: path,
    url: pub.publicUrl,
    alt: alt.trim().slice(0, 200) || null,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath(`/admin/inventory/${unitId}`);
  return { ok: true, message: "Foto ditambahkan." };
}

export async function setPrimaryImage(unitId: string, imageId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const a = await supabase.from("unit_images").update({ is_primary: false }).eq("unit_id", unitId).eq("is_primary", true);
  if (a.error) return { ok: false, message: dbErrorMessage(a.error.message) };
  const b = await supabase.from("unit_images").update({ is_primary: true }).eq("id", imageId).eq("unit_id", unitId);
  if (b.error) return { ok: false, message: dbErrorMessage(b.error.message) };
  revalidatePath(`/admin/inventory/${unitId}`);
  return { ok: true, message: "Foto utama diperbarui." };
}

export async function deleteUnitImage(unitId: string, imageId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const { data: img } = await supabase
    .from("unit_images")
    .select("id, storage_path, is_primary")
    .eq("id", imageId)
    .eq("unit_id", unitId)
    .maybeSingle();
  if (!img) return { ok: false, message: "Foto tidak ditemukan." };

  const { error } = await supabase.from("unit_images").delete().eq("id", imageId);
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  if (img.storage_path) await supabase.storage.from("unit-images").remove([img.storage_path]);

  if (img.is_primary) {
    const { data: next } = await supabase
      .from("unit_images")
      .select("id")
      .eq("unit_id", unitId)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from("unit_images").update({ is_primary: true }).eq("id", next.id);
  }
  revalidatePath(`/admin/inventory/${unitId}`);
  return { ok: true, message: "Foto dihapus." };
}

export async function recordSale(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = saleSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali isian.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { error } = await supabase.rpc("admin_record_sale", {
    p_unit_id: parsed.data.unitId,
    p_appointment_id: parsed.data.appointmentId ?? null,
    p_price: parsed.data.price,
    p_notes: parsed.data.notes ?? null,
  });
  if (error) return { ok: false, message: dbErrorMessage(error.message) };
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Penjualan tercatat. Unit ditandai Terjual." };
}
