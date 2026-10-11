"use client";

import { ActionForm, AField } from "./action-form";
import { Input } from "@/components/ui/form";
import { recordSale } from "@/lib/actions/inventory";

export function RecordSaleForm({
  unitId,
  appointmentId,
  defaultPrice,
}: {
  unitId: string;
  appointmentId?: string;
  defaultPrice?: number;
}) {
  return (
    <ActionForm action={recordSale} submitLabel="Catat penjualan" submitVariant="dark">
      <input type="hidden" name="unitId" value={unitId} />
      {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
      <AField name="price" label="Harga transaksi (Rp)" required>
        <Input id="price" name="price" type="number" min={0} step={1000} defaultValue={defaultPrice} required />
      </AField>
      <AField name="notes" label="Catatan (opsional)">
        <Input id="notes" name="notes" maxLength={500} />
      </AField>
      {appointmentId && (
        <p className="text-xs text-muted">Terhubung ke booking aktif unit ini; booking akan ditandai Completed.</p>
      )}
    </ActionForm>
  );
}
