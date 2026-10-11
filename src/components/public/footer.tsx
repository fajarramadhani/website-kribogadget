import Link from "next/link";
import { AtSign, MapPin, MessageCircle, Clock } from "lucide-react";
import { Logo } from "./logo";
import { getSettings } from "@/lib/data/public";
import { buildWhatsAppLink, waTemplates } from "@/lib/whatsapp";
import { formatPhoneDisplay } from "@/lib/phone";

export async function Footer() {
  const s = await getSettings();
  const wa = buildWhatsAppLink(s.whatsapp_number, waTemplates.generalInquiry());
  const ig = s.instagram_handle ? `https://instagram.com/${s.instagram_handle}` : null;

  return (
    <footer id="kontak" className="mt-20 bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm text-white/70">
            Katalog iPhone dan penjadwalan COD. Cek unit, pilih jadwal, dan konfirmasi lewat WhatsApp.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Jelajahi</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/katalog">Katalog iPhone</Link></li>
            <li><Link className="hover:text-accent" href="/#cara-cod">Cara COD</Link></li>
            <li><Link className="hover:text-accent" href="/cek-booking">Cek Booking</Link></li>
            <li><Link className="hover:text-accent" href="/#faq">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50">Kontak</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {ig && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-accent" href={ig} target="_blank" rel="noopener noreferrer">
                  <AtSign className="size-4" aria-hidden /> @{s.instagram_handle}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a className="inline-flex items-center gap-2 hover:text-accent" href={wa} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp {formatPhoneDisplay(s.whatsapp_number.replace(/\D/g, ""))}
                </a>
              </li>
            )}
            {s.operating_hours && (
              <li className="flex items-start gap-2 text-white/80">
                <Clock className="mt-0.5 size-4 shrink-0" aria-hidden /> {s.operating_hours}
              </li>
            )}
            {s.address && (
              <li className="flex items-start gap-2 text-white/80">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {s.address}
              </li>
            )}
            {!wa && !s.address && !s.operating_hours && (
              <li className="text-white/60">Kontak toko akan ditambahkan oleh admin.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} {s.store_name}. Seluruh harga dan ketersediaan unit dapat berubah sewaktu-waktu.
      </div>
    </footer>
  );
}
