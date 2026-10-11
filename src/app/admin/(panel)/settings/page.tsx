import type { Metadata } from "next";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { ActionForm, AField } from "@/components/admin/action-form";
import { Input, Textarea } from "@/components/ui/form";
import { requireAdmin } from "@/lib/auth";
import { getAdminSettings } from "@/lib/data/admin";
import { saveSettings } from "@/lib/actions/talents";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const { user } = await requireAdmin();
  const s = await getAdminSettings();
  return (
    <>
      <AdminHeader
        title="Pengaturan"
        description="Informasi toko yang tampil di situs. Kosongkan field yang belum dikonfirmasi — situs akan menyembunyikannya."
        email={user.email ?? undefined}
      />
      <Panel>
        <ActionForm action={saveSettings} submitLabel="Simpan pengaturan" className="grid gap-5 sm:grid-cols-2">
          <AField name="store_name" label="Nama toko" required>
            <Input id="store_name" name="store_name" defaultValue={s.store_name ?? "Kribo Gadget"} required />
          </AField>
          <AField name="instagram_handle" label="Instagram" hint="Tanpa @">
            <Input id="instagram_handle" name="instagram_handle" defaultValue={s.instagram_handle ?? "kribogadget"} />
          </AField>
          <AField name="whatsapp_number" label="Nomor WhatsApp toko" hint="Dipakai tombol WhatsApp. Kosong = tombol disembunyikan.">
            <Input id="whatsapp_number" name="whatsapp_number" type="tel" defaultValue={s.whatsapp_number ?? ""} placeholder="08xx xxxx xxxx" />
          </AField>
          <AField name="operating_hours" label="Jam operasional" hint="Mis. Senin–Sabtu 10.00–18.00 (isi bila sudah pasti)">
            <Input id="operating_hours" name="operating_hours" defaultValue={s.operating_hours ?? ""} />
          </AField>
          <AField name="address" label="Alamat toko" className="sm:col-span-2" hint="Kosong bila belum dikonfirmasi.">
            <Input id="address" name="address" defaultValue={s.address ?? ""} />
          </AField>
          <AField name="service_info" label="Teks informasi layanan" className="sm:col-span-2">
            <Textarea id="service_info" name="service_info" rows={2} defaultValue={s.service_info ?? ""} />
          </AField>
          <AField name="booking_policy" label="Kebijakan booking" className="sm:col-span-2">
            <Textarea id="booking_policy" name="booking_policy" rows={3} defaultValue={s.booking_policy ?? ""} />
          </AField>
          <AField name="hold_hours" label="Masa tahan booking Pending (jam)" required hint="Setelah ini booking Pending kedaluwarsa dan unit dilepas.">
            <Input id="hold_hours" name="hold_hours" type="number" min={1} max={720} defaultValue={s.hold_hours ?? "24"} required />
          </AField>
          <AField name="appointment_minutes" label="Durasi appointment standar (menit)" required>
            <Input id="appointment_minutes" name="appointment_minutes" type="number" min={15} max={480} step={15} defaultValue={s.appointment_minutes ?? "60"} required />
          </AField>
        </ActionForm>
      </Panel>
    </>
  );
}
