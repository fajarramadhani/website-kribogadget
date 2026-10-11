"use client";

import { useState } from "react";
import { ActionForm, AField } from "./action-form";
import { Input, Select, Textarea } from "@/components/ui/form";
import { slugify } from "@/lib/format";
import type { ActionState } from "@/lib/validation/admin";
import type { UnitWithModel } from "@/types/db";

export function UnitForm({
  action,
  unit,
  models,
  submitLabel,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  unit?: UnitWithModel;
  models: string[];
  submitLabel: string;
}) {
  const sold = unit?.stock_status === "sold";
  const [slugTouched, setSlugTouched] = useState(Boolean(unit));
  const [slug, setSlug] = useState(unit?.slug ?? "");
  const [code, setCode] = useState(unit?.unit_code ?? "");
  const [model, setModel] = useState(unit?.product_models?.name ?? "");

  function suggestSlug(m: string, c: string) {
    if (!slugTouched) setSlug(slugify(`${m} ${c}`));
  }

  return (
    <ActionForm action={action} submitLabel={submitLabel} className="grid gap-5 sm:grid-cols-2">
      <AField name="unitCode" label="Kode unit" required hint="Unik, mis. KG-0001">
        <Input
          id="unitCode"
          name="unitCode"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            suggestSlug(model, e.target.value);
          }}
          required
        />
      </AField>

      <AField name="modelName" label="Model" required hint="Pilih dari daftar atau ketik model baru">
        <Input
          id="modelName"
          name="modelName"
          list="model-options"
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            suggestSlug(e.target.value, code);
          }}
          required
        />
        <datalist id="model-options">
          {models.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </AField>

      <AField name="slug" label="Slug (URL)" required className="sm:col-span-2" hint="Huruf kecil, angka, dan strip. Dipakai di /katalog/slug">
        <Input
          id="slug"
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
        />
      </AField>

      <AField name="storageGb" label="Storage (GB)" required>
        <Input id="storageGb" name="storageGb" type="number" min={1} step={1} defaultValue={unit?.storage_gb ?? 128} required />
      </AField>
      <AField name="color" label="Warna" required>
        <Input id="color" name="color" defaultValue={unit?.color} required />
      </AField>

      <AField name="batteryHealth" label="Battery health (%)" hint="0–100. Kosongkan bila tidak diketahui.">
        <Input id="batteryHealth" name="batteryHealth" type="number" min={0} max={100} step={1} defaultValue={unit?.battery_health ?? ""} />
      </AField>
      <AField name="price" label="Harga (Rp)" required>
        <Input id="price" name="price" type="number" min={0} step={1000} defaultValue={unit ? Number(unit.price) : ""} required />
      </AField>

      <AField name="conditionGrade" label="Kondisi fisik" hint="Mis. Mulus, Normal, Ada baret halus">
        <Input id="conditionGrade" name="conditionGrade" defaultValue={unit?.condition_grade ?? ""} />
      </AField>
      <AField name="completeness" label="Kelengkapan" hint="Mis. Unit + dus + kabel">
        <Input id="completeness" name="completeness" defaultValue={unit?.completeness ?? ""} />
      </AField>

      <AField name="conditionNotes" label="Catatan minus" className="sm:col-span-2">
        <Textarea id="conditionNotes" name="conditionNotes" rows={3} defaultValue={unit?.condition_notes ?? ""} />
      </AField>
      <AField name="warrantyInfo" label="Informasi garansi" className="sm:col-span-2" hint="Isi hanya bila memang ada garansi yang sudah dipastikan.">
        <Input id="warrantyInfo" name="warrantyInfo" defaultValue={unit?.warranty_info ?? ""} />
      </AField>

      <AField name="stockStatus" label="Status stok">
        {sold ? (
          <>
            <Input value="Sold (terjual)" disabled readOnly aria-label="Status stok" />
            <input type="hidden" name="stockStatus" value="available" />
          </>
        ) : (
          <Select id="stockStatus" name="stockStatus" defaultValue={unit?.stock_status ?? "available"}>
            <option value="available">Available</option>
            <option value="reserved">Reserved (ditahan manual)</option>
          </Select>
        )}
      </AField>

      <div className="flex items-end pb-2">
        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={unit?.is_published ?? false}
            className="size-5 rounded border-line accent-[#f59e0b]"
          />
          Publikasikan di katalog
        </label>
      </div>
    </ActionForm>
  );
}
