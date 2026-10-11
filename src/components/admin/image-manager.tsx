"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { deleteUnitImage, registerUnitImage, setPrimaryImage } from "@/lib/actions/inventory";
import type { UnitImage } from "@/types/db";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function ImageManager({ unitId, images, unitName }: { unitId: string; images: UnitImage[]; unitName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const supabase = createBrowserSupabase();
    let ok = 0;
    for (const file of Array.from(files)) {
      const ext = TYPES[file.type];
      if (!ext) {
        toast.error(`${file.name}: hanya JPG, PNG, atau WebP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: ukuran maksimal 5 MB.`);
        continue;
      }
      const path = `${unitId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("unit-images").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (up.error) {
        toast.error(`${file.name}: gagal diunggah.`);
        continue;
      }
      const res = await registerUnitImage(unitId, path, `${unitName}`);
      if (res.ok) ok++;
      else toast.error(res.message ?? "Gagal menyimpan foto.");
    }
    setUploading(false);
    if (input.current) input.current.value = "";
    if (ok) toast.success(`${ok} foto ditambahkan.`);
  }

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? "Berhasil.");
      else toast.error(r.message ?? "Gagal.");
    });

  const sorted = [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Belum ada foto. Unggah foto unit yang sebenarnya (JPG/PNG/WebP, maks. 5 MB).
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-xl border border-line">
              <div className="relative aspect-square bg-canvas">
                <Image
                  src={img.url}
                  alt={img.alt || unitName}
                  fill
                  sizes="200px"
                  unoptimized={img.url.endsWith(".svg")}
                  className="object-cover"
                />
                {img.is_primary && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold">
                    <Star className="size-3" aria-hidden /> Utama
                  </span>
                )}
                {img.is_demo && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-paper/90 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Demo
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={img.is_primary || pending}
                  onClick={() => run(() => setPrimaryImage(unitId, img.id))}
                >
                  Jadikan utama
                </Button>
                <ConfirmDialog
                  destructive
                  title="Hapus foto ini?"
                  description="Foto akan dihapus dari unit dan dari penyimpanan."
                  confirmLabel="Hapus"
                  onConfirm={async () => {
                    const r = await deleteUnitImage(unitId, img.id);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.message);
                  }}
                  trigger={
                    <Button size="sm" variant="ghost" aria-label="Hapus foto" className="text-danger">
                      <Trash2 aria-hidden />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          id="upload-foto"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button variant="dark" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
          {uploading ? "Mengunggah…" : "Unggah foto"}
        </Button>
      </div>
    </div>
  );
}
