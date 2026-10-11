import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { env } from "@/lib/env";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Kribo Gadget — Katalog iPhone & Booking COD",
    template: "%s — Kribo Gadget",
  },
  description:
    "Cek unit iPhone yang tersedia di Kribo Gadget, lihat harga dan kondisinya, lalu jadwalkan COD dengan mudah.",
  applicationName: "Kribo Gadget",
  openGraph: {
    type: "website",
    siteName: "Kribo Gadget",
    locale: "id_ID",
    title: "Kribo Gadget — Katalog iPhone & Booking COD",
    description: "Temukan iPhone impianmu. Cek unit, harga, kondisi, dan jadwalkan COD.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#111318",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={sans.variable}>
      <body className="min-h-dvh flex flex-col">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
