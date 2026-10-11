import Link from "next/link";
import { BatteryMedium } from "lucide-react";
import { StockBadge, DemoBadge } from "@/components/ui/badges";
import { formatRupiah, formatStorage } from "@/lib/format";
import { primaryImage, unitDisplayName } from "@/lib/data/public";
import { UnitImage } from "./unit-image";
import { cn } from "@/lib/cn";
import type { UnitWithModel } from "@/types/db";

export function ProductCard({ unit, priority }: { unit: UnitWithModel; priority?: boolean }) {
  const name = unit.product_models?.name ?? "iPhone";
  const unavailable = unit.stock_status !== "available";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-paper shadow-card transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-canvas">
        <UnitImage
          image={primaryImage(unit.unit_images)}
          fallbackAlt={unitDisplayName(unit)}
          sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, 50vw"
          priority={priority}
          className={cn("transition-transform duration-500 group-hover:scale-[1.03]", unavailable && "opacity-70 grayscale-[30%]")}
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          <StockBadge status={unit.stock_status} />
          {unit.is_demo && <DemoBadge />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="text-[15px] font-bold leading-snug sm:text-base">
          <Link href={`/katalog/${unit.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted">
          {formatStorage(unit.storage_gb)} · {unit.color}
        </p>
        {unit.battery_health != null && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink/80">
            <BatteryMedium className="size-4 text-accent-dark" aria-hidden />
            Battery health {unit.battery_health}%
          </p>
        )}
        <p className="mt-auto pt-3 text-lg font-extrabold tracking-tight">{formatRupiah(unit.price)}</p>
        <span className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white transition-colors group-hover:bg-accent group-hover:text-ink">
          Lihat Detail
        </span>
      </div>
    </article>
  );
}
