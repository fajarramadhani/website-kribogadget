"use client";

import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-24">
      <ErrorState
        title="Terjadi kesalahan"
        description="Maaf, halaman ini tidak dapat dimuat. Silakan coba lagi."
        action={<Button onClick={reset}>Coba lagi</Button>}
      />
    </div>
  );
}
