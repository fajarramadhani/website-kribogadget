"use client";

import { startTransition, useActionState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/form";
import { submitBooking, type BookingState } from "@/lib/actions/booking";
import { bookingFormSchema, MAX_BOOKING_DAYS_AHEAD, type BookingFormInput } from "@/lib/validation/booking";
import { addDays, todayJakarta } from "@/lib/format";

const initial: BookingState = { ok: false };

export function BookingForm({ unitId, disabled }: { unitId: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(submitBooking, initial);
  const today = useMemo(() => todayJakarta(), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    mode: "onBlur",
    defaultValues: { unitId, name: "", phone: "", date: "", time: "", area: "", notes: "", website: "" },
  });

  useEffect(() => {
    if (state.message && !state.ok) toast.error(state.message);
  }, [state]);

  const err = (k: keyof BookingFormInput) => errors[k]?.message ?? state.fieldErrors?.[k]?.[0];

  return (
    <form
      noValidate
      onSubmit={handleSubmit(
        (values) => {
          // Dikirim lewat transition (bukan atribut action) agar isian tidak di-reset saat server menolak.
          const fd = new FormData();
          Object.entries(values).forEach(([k, v]) => fd.set(k, String(v ?? "")));
          startTransition(() => action(fd));
        },
        () => toast.error("Periksa kembali isian formulir."),
      )}
      className="space-y-5"
    >
      <input type="hidden" {...register("unitId")} value={unitId} />
      {/* Honeypot — disembunyikan dari pengguna dan pembaca layar */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      <FormField label="Nama lengkap" htmlFor="name" required error={err("name")}>
        <Input id="name" autoComplete="name" placeholder="Nama Anda" aria-invalid={!!err("name")} {...register("name")} />
      </FormField>

      <FormField
        label="Nomor WhatsApp"
        htmlFor="phone"
        required
        error={err("phone")}
        hint="Dipakai admin dan talent untuk menghubungi Anda. Contoh: 0812 3456 7890"
      >
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="08xx xxxx xxxx"
          aria-invalid={!!err("phone")}
          {...register("phone")}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Tanggal COD pilihan" htmlFor="date" required error={err("date")}>
          <Input
            id="date"
            type="date"
            min={today}
            max={addDays(today, MAX_BOOKING_DAYS_AHEAD)}
            aria-invalid={!!err("date")}
            {...register("date")}
          />
        </FormField>
        <FormField label="Waktu COD pilihan (WIB)" htmlFor="time" required error={err("time")}>
          <Input id="time" type="time" aria-invalid={!!err("time")} {...register("time")} />
        </FormField>
      </div>

      <FormField
        label="Area / lokasi usulan"
        htmlFor="area"
        required
        error={err("area")}
        hint="Contoh: nama mall, stasiun, atau kecamatan. Lokasi final dikonfirmasi admin."
      >
        <Input id="area" placeholder="Area atau titik temu yang Anda usulkan" aria-invalid={!!err("area")} {...register("area")} />
      </FormField>

      <FormField label="Catatan tambahan (opsional)" htmlFor="notes" error={err("notes")}>
        <Textarea id="notes" rows={3} placeholder="Mis. ingin cek kondisi baterai, bawa kabel sendiri, dll." {...register("notes")} />
      </FormField>

      <div className="rounded-xl bg-accent-soft/60 p-4 text-sm text-ink/80">
        Waktu dan lokasi di atas adalah <strong>usulan</strong>. Booking berstatus <strong>Pending</strong> sampai
        dikonfirmasi admin, yang juga akan menentukan talent dan jadwal final.
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending || disabled}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> Mengirim booking…
          </>
        ) : (
          <>
            <CalendarCheck aria-hidden /> Ajukan Booking COD
          </>
        )}
      </Button>
      {state.message && !state.ok && (
        <p role="alert" className="text-center text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
