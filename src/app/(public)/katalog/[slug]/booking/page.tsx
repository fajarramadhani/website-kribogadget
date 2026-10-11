import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { BookingForm } from "@/components/public/booking-form";
import { UnitImage } from "@/components/public/unit-image";
import { StockBadge } from "@/components/ui/badges";
import { ErrorState } from "@/components/ui/states";
import { buttonVariants } from "@/components/ui/button";
import { getUnitBySlug, primaryImage, unitDisplayName } from "@/lib/data/public";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Booking COD",
  robots: { index: false },
};

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const unit = await getUnitBySlug(slug);
  if (!unit) notFound();

  const name = unitDisplayName(unit);
  const available = unit.stock_status === "available";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link
        href={`/katalog/${unit.slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden /> Kembali ke detail unit
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Booking COD</h1>

      <div className="mt-6 flex gap-4 rounded-card border border-line bg-paper p-3 shadow-card">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-canvas">
          <UnitImage image={primaryImage(unit.unit_images)} fallbackAlt={name} sizes="96px" />
        </div>
        <div className="min-w-0">
          <StockBadge status={unit.stock_status} />
          <p className="mt-1.5 truncate font-bold">{name}</p>
          <p className="text-sm text-muted">Kode {unit.unit_code}</p>
          <p className="mt-1 font-extrabold">{formatRupiah(unit.price)}</p>
        </div>
      </div>

      <div className="mt-6">
        {available ? (
          <div className="rounded-card border border-line bg-paper p-5 shadow-card sm:p-7">
            <BookingForm unitId={unit.id} />
          </div>
        ) : (
          <ErrorState
            title="Unit ini tidak dapat dibooking"
            description="Unit sedang dibooking pelanggan lain atau sudah terjual. Silakan pilih unit lain dari katalog."
            action={
              <Link href="/katalog" className={buttonVariants({ variant: "dark" })}>
                Lihat unit lain
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
