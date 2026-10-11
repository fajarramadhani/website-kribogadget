"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  UserRound,
  X,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Logo } from "@/components/public/logo";

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/inventory", label: "Inventori", icon: Package },
  { href: "/admin/appointments", label: "Appointment", icon: CalendarClock },
  { href: "/admin/talents", label: "Talent", icon: UserRound },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export function AdminSidebar({ pending, children }: { pending: number; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Tutup menu mobile saat pindah halaman (penyesuaian state saat render, bukan efek).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const nav = (
    <nav aria-label="Menu admin" className="flex flex-1 flex-col gap-1 p-3">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-ink" : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
            {href === "/admin/appointments" && pending > 0 && (
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-ink">
                {pending}
                <span className="sr-only"> pending</span>
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href="/"
        target="_blank"
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:text-white"
      >
        <ExternalLink className="size-[18px]" aria-hidden /> Lihat situs
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-ink lg:flex">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <Logo tone="light" />
        </div>
        {nav}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Tutup menu" className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
              <Logo tone="light" />
              <button aria-label="Tutup menu" onClick={() => setOpen(false)} className="text-white/70">
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 lg:hidden">
          <button aria-label="Buka menu" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg hover:bg-canvas">
            <Menu className="size-5" />
          </button>
          <Logo />
        </div>
        {children}
      </div>
    </div>
  );
}
