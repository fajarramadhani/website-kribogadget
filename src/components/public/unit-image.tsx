import Image from "next/image";
import { Smartphone } from "lucide-react";
import type { UnitImage as UnitImageRow } from "@/types/db";
import { cn } from "@/lib/cn";

export function UnitImage({
  image,
  fallbackAlt,
  sizes,
  priority,
  className,
}: {
  image: Pick<UnitImageRow, "url" | "alt"> | null;
  fallbackAlt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image) {
    return (
      <div className={cn("grid size-full place-items-center bg-canvas text-muted", className)} role="img" aria-label={`${fallbackAlt} — foto belum tersedia`}>
        <Smartphone className="size-10" aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={image.url}
      alt={image.alt || fallbackAlt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={image.url.endsWith(".svg")}
      className={cn("object-cover", className)}
    />
  );
}
