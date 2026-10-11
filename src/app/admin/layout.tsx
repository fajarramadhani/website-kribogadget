import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin Kribo Gadget" },
  robots: { index: false, follow: false },
};

// Area admin selalu dirender per-request (bergantung pada sesi).
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
