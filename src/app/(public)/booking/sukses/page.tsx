import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { getSettings } from "@/lib/data/public";
import { waTemplates } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Booking Terkirim",
  robots: { index: false },
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const { kode } = await searchParams;
  if (!kode || !/^KRB-[0-9A-F]{10}$/.test(kode)) redirect("/katalog");
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <div className="rounded-card border border-line bg-paper p-7 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-8" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Booking berhasil diajukan</h1>
        <p className="mt-2 text-sm text-muted">Simpan kode booking Anda. Kode ini diperlukan untuk mengecek status.</p>

        <p className="mt-6 select-all rounded-xl border-2 border-dashed border-accent bg-accent-soft/50 px-4 py-4 font-mono text-2xl font-bold tracking-widest">
          {kode}
        </p>

        <div className="mt-6 rounded-xl bg-canvas p-4 text-left text-sm">
          <p className="font-bold">Apa selanjutnya?</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
            <li>
              Status booking Anda saat ini <strong className="text-ink">Pending</strong> sampai dikonfirmasi admin.
            </li>
            <li>Admin akan menentukan talent serta menyepakati waktu dan lokasi final bersama Anda.</li>
            <li>Waktu yang Anda pilih adalah usulan, belum jadwal yang pasti.</li>
            <li>Booking Pending yang tidak dikonfirmasi akan kedaluwarsa otomatis.</li>
          </ul>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/cek-booking" className={buttonVariants({ variant: "dark" })}>
            <Search aria-hidden /> Cek status booking
          </Link>
          <WhatsAppButton phone={settings.whatsapp_number} message={waTemplates.bookingCodeOnly(kode)}>
            Hubungi via WhatsApp
          </WhatsAppButton>
        </div>
        <p className="mt-4 text-xs text-muted">
          Tombol WhatsApp hanya membuka percakapan dengan pesan siap kirim — Anda perlu menekan kirim sendiri.
        </p>
      </div>
    </div>
  );
}
