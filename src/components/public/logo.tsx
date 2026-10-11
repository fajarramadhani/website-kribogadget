import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Logo tipografis SEMENTARA. Untuk mengganti dengan logo resmi, ubah isi komponen ini
 * (mis. render <Image src="/logo.svg" />) — seluruh situs memakai komponen ini.
 */
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Kribo Gadget — beranda"
      className={cn("inline-flex items-baseline gap-1.5 text-[17px] font-extrabold tracking-[0.12em]", className)}
    >
      <span className={tone === "dark" ? "text-ink" : "text-white"}>KRIBO</span>
      <span className="text-accent">GADGET</span>
    </Link>
  );
}
