"use client";

import { Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setUnitArchived, setUnitPublished } from "@/lib/actions/inventory";

export function UnitStateActions({
  unitId,
  published,
  archived,
  sold,
}: {
  unitId: string;
  published: boolean;
  archived: boolean;
  sold: boolean;
}) {
  const report = (r: { ok: boolean; message?: string }) => {
    if (r.ok) toast.success(r.message);
    else toast.error(r.message);
  };

  return (
    <div className="space-y-3">
      {!archived && (
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => report(await setUnitPublished(unitId, !published))}
        >
          {published ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {published ? "Sembunyikan dari katalog" : "Publikasikan"}
        </Button>
      )}

      {archived ? (
        <Button variant="outline" className="w-full" onClick={async () => report(await setUnitArchived(unitId, false))}>
          <ArchiveRestore aria-hidden /> Kembalikan dari arsip
        </Button>
      ) : (
        <ConfirmDialog
          title="Arsipkan unit ini?"
          description={
            sold
              ? "Unit akan disembunyikan dari daftar aktif. Riwayat penjualan tetap tersimpan."
              : "Unit akan disembunyikan dari katalog dan daftar aktif. Riwayat booking dan transaksi tetap tersimpan."
          }
          confirmLabel="Arsipkan"
          onConfirm={async () => {
            report(await setUnitArchived(unitId, true));
          }}
          trigger={
            <Button variant="outline" className="w-full">
              <Archive aria-hidden /> Arsipkan unit
            </Button>
          }
        />
      )}
      <p className="text-xs text-muted">
        Unit tidak dapat dihapus permanen agar riwayat booking dan penjualan tetap utuh.
      </p>
    </div>
  );
}
