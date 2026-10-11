"use client";

import { ActionForm, AField } from "./action-form";
import { Input, Select, Textarea } from "@/components/ui/form";
import { changeAppointmentStatus, saveAdminNotes, scheduleAppointment } from "@/lib/actions/appointments";
import { APPOINTMENT_LABEL, type AppointmentStatus } from "@/lib/status";

export function ScheduleForm({
  appointmentId,
  talents,
  defaults,
  reschedule,
}: {
  appointmentId: string;
  talents: { id: string; name: string; service_areas: string[] }[];
  defaults: { talentId: string; date: string; startTime: string; endTime: string; location: string };
  reschedule: boolean;
}) {
  return (
    <ActionForm
      action={scheduleAppointment}
      submitLabel={reschedule ? "Simpan jadwal baru" : "Konfirmasi booking"}
      className="space-y-4"
    >
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <AField name="talentId" label="Talent" required>
        <Select id="talentId" name="talentId" defaultValue={defaults.talentId} required>
          <option value="">Pilih talent…</option>
          {talents.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.service_areas.length ? ` — ${t.service_areas.join(", ")}` : ""}
            </option>
          ))}
        </Select>
      </AField>
      <div className="grid gap-4 sm:grid-cols-3">
        <AField name="date" label="Tanggal final" required>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </AField>
        <AField name="startTime" label="Mulai (WIB)" required>
          <Input id="startTime" name="startTime" type="time" defaultValue={defaults.startTime} required />
        </AField>
        <AField name="endTime" label="Selesai (WIB)" required>
          <Input id="endTime" name="endTime" type="time" defaultValue={defaults.endTime} required />
        </AField>
      </div>
      <AField name="location" label="Lokasi COD final" required>
        <Input id="location" name="location" defaultValue={defaults.location} required />
      </AField>
      <AField name="note" label="Catatan perubahan (opsional)">
        <Input id="note" name="note" maxLength={1000} />
      </AField>
      <p className="text-xs text-muted">
        Jam kerja, cuti, dan bentrok jadwal talent divalidasi ulang oleh server saat disimpan.
      </p>
    </ActionForm>
  );
}

export function StatusForm({
  appointmentId,
  options,
}: {
  appointmentId: string;
  options: AppointmentStatus[];
}) {
  if (!options.length) return <p className="text-sm text-muted">Tidak ada perubahan status yang tersedia.</p>;
  return (
    <ActionForm action={changeAppointmentStatus} submitLabel="Ubah status" submitVariant="dark" className="space-y-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <AField name="status" label="Status baru" required>
        <Select id="status" name="status" required defaultValue="">
          <option value="" disabled>Pilih status…</option>
          {options.map((s) => (
            <option key={s} value={s}>{APPOINTMENT_LABEL[s]}</option>
          ))}
        </Select>
      </AField>
      <AField name="outcome" label="Hasil pertemuan" hint="Isi saat menandai Completed / No-show.">
        <Textarea id="outcome" name="outcome" rows={2} maxLength={1000} />
      </AField>
      <AField name="note" label="Catatan histori (opsional)">
        <Input id="note" name="note" maxLength={1000} />
      </AField>
    </ActionForm>
  );
}

export function NotesForm({ appointmentId, notes }: { appointmentId: string; notes: string }) {
  return (
    <ActionForm action={saveAdminNotes} submitLabel="Simpan catatan" submitVariant="outline">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <AField name="notes" label="Catatan internal" hint="Tidak pernah tampil ke pelanggan.">
        <Textarea id="notes" name="notes" rows={3} maxLength={1000} defaultValue={notes} />
      </AField>
    </ActionForm>
  );
}
