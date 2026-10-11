import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { AdminHeader, Panel } from "@/components/admin/page-header";
import { NotesForm, ScheduleForm, StatusForm } from "@/components/admin/appointment-forms";
import { RecordSaleForm } from "@/components/admin/record-sale-form";
import { BookingStatusBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAppointment, listActiveTalents } from "@/lib/data/admin";
import { formatDate, formatDateTime, formatRupiah, formatTime, toJakartaParts } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import { buildWhatsAppLink, waTemplates } from "@/lib/whatsapp";
import { APPOINTMENT_LABEL, SCHEDULABLE, STATUS_TRANSITIONS } from "@/lib/status";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Detail appointment" };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { user } = await requireAdmin();
  const data = await getAppointment(id);
  if (!data) notFound();
  const [talents, settings] = await Promise.all([listActiveTalents(), getSettings()]);

  const { appointment: a, histories, sale } = data;
  const unitName = `${a.units?.product_models?.name ?? "iPhone"} ${a.units?.storage_gb ?? ""}GB ${a.units?.color ?? ""}`;
  const phone = a.customers?.phone ?? "";
  const waCustomer = buildWhatsAppLink(phone, waTemplates.adminToCustomer(a.customer_name, a.booking_code, unitName));

  const canSchedule = SCHEDULABLE.includes(a.status);
  const statusOptions = STATUS_TRANSITIONS[a.status];
  const sched = a.scheduled_start && a.scheduled_end ? { s: toJakartaParts(a.scheduled_start), e: toJakartaParts(a.scheduled_end) } : null;
  const minutes = Number(settings.appointment_minutes) || 60;
  const defaultEnd = (() => {
    const [h, m] = a.preferred_time.slice(0, 5).split(":").map(Number);
    const t = h * 60 + m + minutes;
    return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  })();

  return (
    <>
      <AdminHeader
        title={a.booking_code}
        description={unitName}
        email={user.email ?? undefined}
        actions={
          <Link href="/admin/appointments" className="text-sm font-medium text-muted hover:text-ink">
            ← Kembali
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <BookingStatusBadge status={a.status} />
        {a.status === "pending" && a.expires_at && (
          <span className="text-sm text-muted">Kedaluwarsa {formatDateTime(a.expires_at)}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Panel title="Pelanggan & permintaan">
            <dl className="divide-y divide-line text-sm">
              <Row k="Nama" v={a.customer_name} />
              <Row k="WhatsApp" v={phone ? formatPhoneDisplay(phone) : "—"} />
              <Row k="Unit" v={<Link className="font-semibold hover:underline" href={`/admin/inventory/${a.unit_id}`}>{unitName}</Link>} />
              <Row k="Usulan tanggal" v={formatDate(a.preferred_date)} />
              <Row k="Usulan waktu" v={formatTime(a.preferred_time)} />
              <Row k="Usulan area" v={a.preferred_area} />
              {a.customer_notes && <Row k="Catatan pelanggan" v={a.customer_notes} />}
            </dl>
            {waCustomer && (
              <a href={waCustomer} target="_blank" rel="noopener noreferrer" className={`${buttonVariants({ variant: "outline" })} mt-4`}>
                <MessageCircle aria-hidden /> Hubungi pelanggan via WhatsApp
              </a>
            )}
          </Panel>

          {canSchedule && (
            <Panel
              title={a.status === "confirmed" ? "Reschedule / ganti talent" : "Tentukan talent & jadwal final"}
              description="Admin yang menentukan talent. Waktu pelanggan hanyalah usulan."
            >
              {talents.length === 0 ? (
                <p className="text-sm text-muted">
                  Belum ada talent aktif.{" "}
                  <Link href="/admin/talents/new" className="font-semibold text-accent-dark hover:underline">
                    Tambah talent
                  </Link>
                </p>
              ) : (
                <ScheduleForm
                  appointmentId={a.id}
                  talents={talents}
                  reschedule={a.status === "confirmed"}
                  defaults={{
                    talentId: a.talent_id ?? "",
                    date: sched?.s.date ?? a.preferred_date,
                    startTime: sched?.s.time ?? a.preferred_time.slice(0, 5),
                    endTime: sched?.e.time ?? defaultEnd,
                    location: a.final_location ?? a.preferred_area,
                  }}
                />
              )}
            </Panel>
          )}

          {sched && (
            <Panel title="Jadwal final">
              <dl className="divide-y divide-line text-sm">
                <Row k="Talent" v={a.talents?.name ?? "—"} />
                <Row k="Waktu" v={formatDateTime(a.scheduled_start!)} />
                <Row k="Lokasi" v={a.final_location ?? "—"} />
              </dl>
            </Panel>
          )}

          <Panel title="Histori status">
            <ol className="space-y-4">
              {histories.map((h) => (
                <li key={h.id} className="relative border-l-2 border-line pl-4">
                  <p className="text-sm font-semibold">
                    {h.from_status ? `${APPOINTMENT_LABEL[h.from_status]} → ` : ""}
                    {APPOINTMENT_LABEL[h.to_status]}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDateTime(h.created_at)} ·{" "}
                    {h.actor_label === "admin" ? "Admin" : h.actor_label === "customer" ? "Pelanggan" : "Sistem"}
                  </p>
                  {h.note && <p className="mt-1 text-sm">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Ubah status">
            <StatusForm appointmentId={a.id} options={[...statusOptions]} />
          </Panel>

          {a.outcome_notes && (
            <Panel title="Hasil pertemuan">
              <p className="whitespace-pre-line text-sm">{a.outcome_notes}</p>
            </Panel>
          )}

          <Panel title="Catatan internal">
            <NotesForm appointmentId={a.id} notes={a.admin_notes ?? ""} />
          </Panel>

          {sale ? (
            <Panel title="Penjualan tercatat">
              <p className="text-2xl font-extrabold">{formatRupiah(sale.sale_price)}</p>
              <p className="mt-1 text-sm text-muted">{formatDateTime(sale.sold_at)}</p>
            </Panel>
          ) : (
            ["confirmed", "completed"].includes(a.status) && (
              <Panel title="Catat penjualan" description="Unit ditandai Sold setelah penjualan final tercatat.">
                <RecordSaleForm unitId={a.unit_id} appointmentId={a.id} />
              </Panel>
            )
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
