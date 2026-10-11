"use client";

import { useActionState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form";
import { BookingStatusBadge } from "@/components/ui/badges";
import { checkBooking, type CheckBookingState } from "@/lib/actions/booking";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import { buildWhatsAppLink, waTemplates } from "@/lib/whatsapp";
import { buttonVariants } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/status";

const initial: CheckBookingState = { ok: false };

const EXPLAIN: Record<AppointmentStatus, string> = {
  pending: "Menunggu konfirmasi admin. Admin akan menentukan talent serta menyepakati waktu dan lokasi final.",
  confirmed: "Booking dikonfirmasi. Datang sesuai jadwal dan lokasi final di bawah ini.",
  reschedule_requested: "Permintaan perubahan jadwal sedang diproses admin.",
  completed: "Pertemuan telah selesai. Terima kasih!",
  cancelled: "Booking ini dibatalkan.",
  no_show: "Pertemuan tercatat tidak dihadiri.",
  expired: "Booking kedaluwarsa karena tidak dikonfirmasi tepat waktu. Silakan ajukan booking baru.",
};

export function CheckBookingForm({ defaultCode, storePhone }: { defaultCode?: string; storePhone: string }) {
  const [state, action, pending] = useActionState(checkBooking, initial);
  const b = state.booking;
  const talentWa = b?.talent_phone
    ? buildWhatsAppLink(b.talent_phone, waTemplates.customerToTalent(b.booking_code, b.unit_name))
    : null;
  const storeWa = b ? buildWhatsAppLink(storePhone, waTemplates.bookingFollowUp(b.booking_code, b.unit_name)) : null;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-5 rounded-card border border-line bg-paper p-5 shadow-card sm:p-7">
        <FormField label="Kode booking" htmlFor="code" required error={state.fieldErrors?.code}>
          <Input
            id="code"
            name="code"
            defaultValue={defaultCode}
            placeholder="KRB-XXXXXXXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            className="font-mono uppercase"
            required
          />
        </FormField>
        <FormField
          label="Nomor WhatsApp"
          htmlFor="phone"
          required
          error={state.fieldErrors?.phone}
          hint="Nomor yang sama dengan saat booking."
        >
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xx xxxx xxxx" required />
        </FormField>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          {pending ? "Memeriksa…" : "Cek Booking"}
        </Button>
        {!state.ok && state.message && (
          <p role="alert" className="text-center text-sm font-medium text-danger">
            {state.message}
          </p>
        )}
      </form>

      {state.ok && b && (
        <section aria-live="polite" className="animate-fade-up rounded-card border border-line bg-paper p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold tracking-wider">{b.booking_code}</p>
            <BookingStatusBadge status={b.status} />
          </div>
          <p className="mt-3 text-sm text-muted">{EXPLAIN[b.status]}</p>

          <dl className="mt-5 divide-y divide-line text-sm">
            <Row k="Unit" v={b.unit_name} />
            <Row k="Atas nama" v={b.customer_name} />
            <Row k="Usulan tanggal" v={formatDate(b.preferred_date)} />
            <Row k="Usulan waktu" v={formatTime(b.preferred_time)} />
            <Row k="Usulan area" v={b.preferred_area} />
            {b.status === "confirmed" && b.scheduled_start && (
              <>
                <Row k="Jadwal final" v={formatDateTime(b.scheduled_start)} strong />
                {b.final_location && <Row k="Lokasi final" v={b.final_location} strong />}
                {b.talent_name && <Row k="Talent" v={b.talent_name} strong />}
              </>
            )}
            {b.status === "pending" && b.expires_at && (
              <Row k="Berlaku hingga" v={formatDateTime(b.expires_at)} />
            )}
          </dl>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {talentWa && (
              <a href={talentWa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "primary" })}>
                Hubungi talent via WhatsApp
              </a>
            )}
            {storeWa && (
              <a href={storeWa} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
                Hubungi admin via WhatsApp
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className={strong ? "text-right font-bold" : "text-right font-medium"}>{v}</dd>
    </div>
  );
}
