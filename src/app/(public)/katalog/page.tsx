import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/public/product-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { getStorageOptions, listCatalog, type CatalogFilters } from "@/lib/data/public";
import { formatStorage } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Katalog iPhone",
  description: "Daftar unit iPhone Kribo Gadget lengkap dengan harga, storage, warna, dan battery health.",
};

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => {
  if (v == null || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function parseFilters(sp: SP): CatalogFilters & { storageRaw: string[] } {
  const storageRaw = ([] as string[]).concat(sp.storage ?? []);
  const sort = first(sp.urut);
  return {
    q: first(sp.q)?.slice(0, 60),
    minPrice: num(first(sp.min)),
    maxPrice: num(first(sp.max)),
    storage: storageRaw.map(Number).filter((n) => Number.isInteger(n) && n > 0),
    storageRaw,
    minBattery: num(first(sp.battery)),
    sort: sort === "termurah" || sort === "termahal" ? sort : "terbaru",
    page: Math.max(1, Math.floor(num(first(sp.page)) ?? 1)),
  };
}

function pageHref(sp: SP, page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page" || v == null) continue;
    for (const item of ([] as string[]).concat(v)) p.append(k, item);
  }
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `/katalog?${qs}` : "/katalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [result, storageOptions] = await Promise.all([listCatalog(filters), getStorageOptions()]);
  const hasFilters = Boolean(
    filters.q || filters.minPrice != null || filters.maxPrice != null || filters.storage?.length || filters.minBattery != null,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Katalog iPhone</h1>
        <p className="mt-1.5 text-sm text-muted">
          {result.error ? "Katalog belum dapat dimuat." : `${result.total} unit ditemukan`}
        </p>
      </header>

      <form method="GET" action="/katalog" className="mt-6 rounded-card border border-line bg-paper p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="q" className="sr-only">Cari model</label>
            <Input id="q" name="q" defaultValue={filters.q} placeholder="Cari model, mis. iPhone 13" className="pl-10" />
          </div>
          <div className="sm:w-52">
            <label htmlFor="urut" className="sr-only">Urutkan</label>
            <Select id="urut" name="urut" defaultValue={filters.sort}>
              <option value="terbaru">Terbaru</option>
              <option value="termurah">Harga: terendah</option>
              <option value="termahal">Harga: tertinggi</option>
            </Select>
          </div>
        </div>

        <details className="group mt-4" open={hasFilters && Boolean(filters.minPrice != null || filters.maxPrice != null || filters.storage?.length || filters.minBattery != null)}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" aria-hidden /> Filter lanjutan
          </summary>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Harga (Rp)</legend>
              <div className="flex items-center gap-2">
                <Input name="min" type="number" inputMode="numeric" min={0} step={100000} placeholder="Min" defaultValue={filters.minPrice} aria-label="Harga minimum" />
                <span aria-hidden className="text-muted">–</span>
                <Input name="max" type="number" inputMode="numeric" min={0} step={100000} placeholder="Maks" defaultValue={filters.maxPrice} aria-label="Harga maksimum" />
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Penyimpanan</legend>
              {storageOptions.length ? (
                <div className="flex flex-wrap gap-2">
                  {storageOptions.map((gb) => (
                    <label key={gb} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name="storage"
                        value={gb}
                        defaultChecked={filters.storageRaw.includes(String(gb))}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 items-center rounded-xl border border-line px-3.5 text-sm font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent-dark">
                        {formatStorage(gb)}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Belum ada data.</p>
              )}
            </fieldset>

            <div>
              <label htmlFor="battery" className="mb-1.5 block text-sm font-medium">Battery health minimum</label>
              <Select id="battery" name="battery" defaultValue={filters.minBattery != null ? String(filters.minBattery) : ""}>
                <option value="">Semua</option>
                <option value="80">80% ke atas</option>
                <option value="85">85% ke atas</option>
                <option value="90">90% ke atas</option>
                <option value="95">95% ke atas</option>
              </Select>
            </div>
          </div>
        </details>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit">Terapkan</Button>
          {hasFilters && (
            <Link href="/katalog" className={buttonVariants({ variant: "ghost" })}>
              Reset filter
            </Link>
          )}
        </div>
      </form>

      <section className="mt-8" aria-label="Daftar unit">
        {result.error ? (
          <ErrorState
            title="Katalog belum dapat dimuat"
            description="Koneksi ke database belum siap atau terjadi gangguan. Silakan muat ulang halaman beberapa saat lagi."
            action={
              <Link href="/katalog" className={buttonVariants({ variant: "outline" })}>
                Muat ulang
              </Link>
            }
          />
        ) : result.units.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Tidak ada unit yang cocok" : "Belum ada unit yang tersedia"}
            description={
              hasFilters
                ? "Coba ubah atau reset filter pencarian Anda."
                : "Katalog sedang diperbarui. Silakan cek kembali nanti."
            }
            action={
              hasFilters ? (
                <Link href="/katalog" className={buttonVariants({ variant: "outline" })}>
                  Reset filter
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {result.units.map((u, i) => (
              <ProductCard key={u.id} unit={u} priority={i < 4} />
            ))}
          </div>
        )}
      </section>

      {result.pageCount > 1 && (
        <nav aria-label="Halaman katalog" className="mt-10 flex items-center justify-center gap-3">
          <Link
            aria-disabled={result.page <= 1}
            href={pageHref(sp, result.page - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), result.page <= 1 && "pointer-events-none opacity-40")}
          >
            ← Sebelumnya
          </Link>
          <span className="text-sm text-muted">
            Halaman {result.page} dari {result.pageCount}
          </span>
          <Link
            aria-disabled={result.page >= result.pageCount}
            href={pageHref(sp, result.page + 1)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              result.page >= result.pageCount && "pointer-events-none opacity-40",
            )}
          >
            Berikutnya →
          </Link>
        </nav>
      )}
    </div>
  );
}
