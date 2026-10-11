"use client";

import Image from "next/image";
import { useState } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/cn";

type Img = { id: string; url: string; alt: string | null };

export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return (
      <div
        role="img"
        aria-label={`${name} — foto belum tersedia`}
        className="grid aspect-[4/5] place-items-center rounded-card border border-line bg-paper text-muted"
      >
        <Smartphone className="size-14" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card border border-line bg-paper">
        <Image
          key={current.id}
          src={current.url}
          alt={current.alt || `${name} — foto ${active + 1}`}
          fill
          priority
          sizes="(min-width:1024px) 50vw, 100vw"
          unoptimized={current.url.endsWith(".svg")}
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Pilih foto">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Tampilkan foto ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 sm:size-20",
                  i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="80px" unoptimized={img.url.endsWith(".svg")} className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
