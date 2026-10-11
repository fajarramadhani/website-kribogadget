import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/public/logo";

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div>
        <Logo />
        <p className="mt-10 text-6xl font-extrabold text-accent">404</p>
        <h1 className="mt-3 text-2xl font-extrabold">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-muted">Tautan mungkin salah, atau unit sudah tidak tersedia.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "dark" })}>Ke beranda</Link>
          <Link href="/katalog" className={buttonVariants({ variant: "outline" })}>Lihat katalog</Link>
        </div>
      </div>
    </div>
  );
}
