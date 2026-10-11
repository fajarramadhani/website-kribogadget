"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/katalog", label: "Katalog iPhone" },
  { href: "/#cara-cod", label: "Cara COD" },
  { href: "/#kontak", label: "Hubungi Kami" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Tutup menu mobile saat pindah halaman (penyesuaian state saat render, bukan efek).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Menu utama" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink",
                pathname === l.href && "text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/cek-booking" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-2")}>
            Cek Booking
          </Link>
        </nav>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-ink hover:bg-ink/5 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <nav id="menu-mobile" aria-label="Menu utama" className="border-t border-line bg-paper px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {[...LINKS, { href: "/cek-booking", label: "Cek Booking" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-canvas">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
