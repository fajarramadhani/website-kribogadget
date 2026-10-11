import type { Metadata } from "next";
import { CheckBookingForm } from "@/components/public/check-booking-form";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Cek Booking",
  description: "Periksa status booking COD Anda dengan kode booking dan nomor WhatsApp.",
};

export default async function CheckBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const [{ kode }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Cek Booking</h1>
      <p className="mt-1.5 text-sm text-muted">
        Masukkan kode booking dan nomor WhatsApp yang Anda gunakan saat booking.
      </p>
      <div className="mt-6">
        <CheckBookingForm defaultCode={kode?.slice(0, 20)} storePhone={settings.whatsapp_number} />
      </div>
    </div>
  );
}
