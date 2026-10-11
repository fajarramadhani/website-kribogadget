import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, ChevronLeft, Info } from "lucide-react";
import { ProductGallery } from "@/components/public/product-gallery";
import { ProductCard } from "@/components/public/product-card";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { DemoBadge, StockBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { getRelatedUnits, getSettings, getUnitBySlug, primaryImage, unitDisplayName } from "@/lib/data/public";
import { formatRupiah, formatStorage } from "@/lib/format";
import { waTemplates } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const unit = await getUnitBySlug(slug);
  if (!unit) return { title: "Unit tidak ditemukan" };
  const name = unitDisplayName(unit);
  const img = primaryImage(unit.unit_images);
  const description = `${name} — ${formatRupiah(unit.price)}${
    unit.battery_health != null ? `, battery health ${unit.battery_health}%` : ""
  }. Booking COD di Kribo Gadget.`;
  return {
    title: name,
    description,
    openGraph: {
      title: `${name} — Kribo Gadget`,
      description,
      type: "website",
      images: img && !img.url.endsWith(".svg") ? [{ url: img.url, alt: img.alt || name }] : undefined,
    },
  };
}

export default async function UnitDetailPage({ params }: Props) {
  const { slug } = await params;
  const unit = await getUnitBySlug(slug);
  if (!unit) notFound();

  const [settings, related] = await Promise.all([getSettings(), getRelatedUnits(unit)]);
  const name = unitDisplayName(unit);
  const available = unit.stock_status === "available";
  const images = [...unit.unit_images]
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map((i) => ({ id: i.id, url: i.url, alt: i.alt }));

  const specs: [string, string | null][] = [
    ["Kode unit", unit.unit_code],
    ["Model", unit.product_models?.name ?? "iPhone"],
    ["Penyimpanan", formatStorage(unit.storage_gb)],
    ["Warna", unit.color],
    ["Battery health", unit.battery_health != null ? `${unit.battery_health}%` : null],
    ["Kondisi fisik", unit.condition_grade],
    ["Kelengkapan", unit.completeness],
    ["Garansi", unit.warranty_info],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/katalog" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden /> Kembali ke katalog
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} name={name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StockBadge status={unit.stock_status} />
            {unit.is_demo && <DemoBadge />}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-muted">Kode unit {unit.unit_code}</p>
          <p className="mt-5 text-3xl font-extrabold tracking-tight">{formatRupiah(unit.price)}</p>

          <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-paper">
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
          </dl>

          {unit.condition_notes && (
            <div className="mt-5 rounded-card border border-line bg-paper p-4">
              <h2 className="text-sm font-bold">Catatan kondisi / minus</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-muted">{unit.condition_notes}</p>
            </div>
          )}

          {unit.is_demo && (
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-accent-soft/60 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              Ini adalah data simulasi untuk keperluan presentasi, bukan stok asli.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {available ? (
              <Link href={`/katalog/${unit.slug}/booking`} className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
                <CalendarCheck aria-hidden /> Booking COD
              </Link>
            ) : (
              <button disabled className={cn(buttonVariants({ size: "lg" }), "flex-1")}>
                Booking tidak tersedia
              </button>
            )}
            <WhatsAppButton
              phone={settings.whatsapp_number}
              message={waTemplates.unitInquiry(name, unit.unit_code)}
              size="lg"
              className="flex-1"
            />
          </div>
          {!available && (
            <p role="status" className="mt-3 text-sm text-muted">
              Unit ini sedang dibooking pelanggan lain. Jika booking tersebut tidak berlanjut, unit akan tersedia kembali.
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16" aria-labelledby="terkait">
          <h2 id="terkait" className="text-xl font-extrabold">Unit terkait</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((u) => (
              <ProductCard key={u.id} unit={u} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
