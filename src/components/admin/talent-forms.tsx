"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ActionForm, AField } from "./action-form";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import {
  addUnavailability,
  createTalent,
  removeUnavailability,
  saveWorkingHours,
  updateTalent,
} from "@/lib/actions/talents";
import { WEEKDAYS } from "@/lib/format";
import type { ActionState } from "@/lib/validation/admin";
import type { Talent, WorkingHour } from "@/types/db";

export function TalentForm({ talent }: { talent?: Talent }) {
  const action: (p: ActionState, fd: FormData) => Promise<ActionState> = talent
    ? updateTalent.bind(null, talent.id)
    : createTalent;
  return (
    <ActionForm action={action} submitLabel={talent ? "Simpan talent" : "Tambah talent"} className="grid gap-5 sm:grid-cols-2">
      <AField name="name" label="Nama" required>
        <Input id="name" name="name" defaultValue={talent?.name} required />
      </AField>
      <AField name="phone" label="Nomor WhatsApp" hint="Ditampilkan ke pelanggan setelah booking Confirmed.">
        <Input id="phone" name="phone" type="tel" defaultValue={talent?.phone_whatsapp ?? ""} placeholder="08xx xxxx xxxx" />
      </AField>
      <AField name="serviceAreas" label="Area layanan" className="sm:col-span-2" hint="Pisahkan dengan koma.">
        <Input id="serviceAreas" name="serviceAreas" defaultValue={talent?.service_areas.join(", ") ?? ""} />
      </AField>
      <AField name="notes" label="Catatan internal" className="sm:col-span-2">
        <Textarea id="notes" name="notes" rows={2} defaultValue={talent?.notes ?? ""} />
      </AField>
      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={talent?.is_active ?? true}
          className="size-5 rounded accent-[#f59e0b]"
        />
        Talent aktif
      </label>
    </ActionForm>
  );
}

type Row = { weekday: number; enabled: boolean; start: string; end: string };

export function WorkingHoursEditor({ talentId, hours }: { talentId: string; hours: WorkingHour[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    WEEKDAYS.map((_, d) => {
      const h = hours.find((x) => x.weekday === d);
      return { weekday: d, enabled: Boolean(h), start: h?.start_time.slice(0, 5) ?? "10:00", end: h?.end_time.slice(0, 5) ?? "18:00" };
    }),
  );
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.weekday} className="flex flex-wrap items-center gap-3">
          <label className="flex w-28 cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => set(i, { enabled: e.target.checked })}
              className="size-4 accent-[#f59e0b]"
            />
            {WEEKDAYS[r.weekday]}
          </label>
          <Input
            type="time"
            value={r.start}
            disabled={!r.enabled}
            onChange={(e) => set(i, { start: e.target.value })}
            aria-label={`Mulai ${WEEKDAYS[r.weekday]}`}
            className="w-32"
          />
          <span aria-hidden>–</span>
          <Input
            type="time"
            value={r.end}
            disabled={!r.enabled}
            onChange={(e) => set(i, { end: e.target.value })}
            aria-label={`Selesai ${WEEKDAYS[r.weekday]}`}
            className="w-32"
          />
        </div>
      ))}
      <Button
        variant="dark"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const payload = rows.filter((r) => r.enabled).map((r) => ({ weekday: r.weekday, start: r.start, end: r.end }));
            const res = await saveWorkingHours(talentId, payload);
            if (res.ok) toast.success(res.message);
            else toast.error(res.message);
          })
        }
      >
        {pending ? "Menyimpan…" : "Simpan jam kerja"}
      </Button>
    </div>
  );
}

export function UnavailabilityForm({ talentId }: { talentId: string }) {
  return (
    <ActionForm action={addUnavailability} submitLabel="Catat" submitVariant="outline" resetOnSuccess>
      <input type="hidden" name="talentId" value={talentId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <AField name="startDate" label="Mulai tanggal" required>
          <Input id="startDate" name="startDate" type="date" required />
        </AField>
        <AField name="startTime" label="Jam mulai" required>
          <Input id="startTime" name="startTime" type="time" defaultValue="00:00" required />
        </AField>
        <AField name="endDate" label="Selesai tanggal" required>
          <Input id="endDate" name="endDate" type="date" required />
        </AField>
        <AField name="endTime" label="Jam selesai" required>
          <Input id="endTime" name="endTime" type="time" defaultValue="23:59" required />
        </AField>
      </div>
      <AField name="reason" label="Alasan (opsional)">
        <Input id="reason" name="reason" maxLength={200} placeholder="Cuti, sakit, dll." />
      </AField>
    </ActionForm>
  );
}

export function RemoveUnavailabilityButton({ talentId, id }: { talentId: string; id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label="Hapus"
      className="text-danger"
      onClick={() =>
        start(async () => {
          const r = await removeUnavailability(talentId, id);
          if (r.ok) toast.success(r.message);
          else toast.error(r.message);
        })
      }
    >
      <Trash2 aria-hidden />
    </Button>
  );
}
