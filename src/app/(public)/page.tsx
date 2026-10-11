import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ClipboardCheck,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/public/product-card";
import { WhatsAppButton } from "@/components/public/whatsapp-button";
import { EmptyState } from "@/components/ui/states";
import { getFeaturedUnits, getSettings } from "@/lib/data/public";
import { waTemplates } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

const FEATURES = [
  {
    icon: Search,
    title: "Cek unit sebelum datang",
    text: "Lihat foto, harga, battery health, kondisi fisik, dan kelengkapan setiap unit langsung dari katalog.",
  },
  {
    icon: CalendarCheck,
    title: "Jadwalkan COD tanpa akun",
    text: "Cukup isi nama dan nomor WhatsApp, lalu usulkan tanggal, waktu, dan area pertemuan.",
  },
  {
    icon: UserCheck,
    title: "Talent ditentukan admin",
    text: "Admin menyesuaikan talent dan jadwal final agar pertemuan berjalan rapi.",
  },
  {
    icon: ClipboardCheck,
    title: "Status booking transparan",
    text: "Pantau status booking kapan saja dengan kode booking dan nomor WhatsApp Anda.",
  },
];

const STEPS = [
  { title: "Pilih unit", text: "Telusuri katalog dan buka detail unit yang Anda minati." },
  { title: "Ajukan booking COD", text: "Isi nama, nomor WhatsApp, serta usulan tanggal, waktu, dan area." },
  { title: "Tunggu konfirmasi admin", text: "Booking berstatus Pending sampai admin menentukan talent, waktu, dan lokasi final." },
  { title: "Bertemu dan cek unit", text: "Datang sesuai jadwal yang disepakati, periksa unit, lalu putuskan." },
];

const FAQ = [
  {
    q: "Apakah saya perlu membuat akun?",
    a: "Tidak. Anda cukup mengisi nama dan nomor WhatsApp saat booking.",
  },
  {
    q: "Apakah booking langsung dikonfirmasi?",
    a: "Belum. Booking berstatus Pending sampai admin menyepakati waktu dan lokasi final bersama Anda.",
  },
  {
    q: "Bagaimana menentukan lokasi COD?",
    a: "Anda mengusulkan area saat booking. Lokasi final dikonfirmasi manual oleh admin lewat WhatsApp.",
  },
  {
    q: "Apakah ada pembayaran online di website?",
    a: "Tidak. Website ini hanya untuk melihat katalog dan menjadwalkan COD. Pembayaran dilakukan saat bertemu.",
  },
  {
    q: "Bagaimana cara mengecek status booking?",
    a: "Buka halaman Cek Booking, lalu masukkan kode booking dan nomor WhatsApp yang Anda pakai saat booking.",
  },
];

export default async function HomePage() {
  const [featured, settings] = await Promise.all([getFeaturedUnits(4), getSettings()]);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute -right-32 -top-32 -z-10 size-[28rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-accent">Kribo Gadget</p>
          <h1 className="animate-fade-up mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight [animation-delay:60ms] sm:text-5xl lg:text-6xl">
            Temukan iPhone Impianmu.
          </h1>
          <p className="animate-fade-up mt-5 max-w-xl text-base text-white/75 [animation-delay:120ms] sm:text-lg">
            Cek unit yang tersedia, lihat harga dan kondisinya, lalu jadwalkan COD langsung dari website. Tanpa akun,
            konfirmasi lewat WhatsApp.
          </p>
          <div className="animate-fade-up mt-8 flex flex-col gap-3 [animation-delay:180ms] sm:flex-row">
            <Link href="/katalog" className={cn(buttonVariants({ size: "lg" }))}>
              Lihat Katalog iPhone <ArrowRight aria-hidden />
            </Link>
            <WhatsAppButton
              phone={settings.whatsapp_number}
              message={waTemplates.generalInquiry()}
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
            >
              Konsultasi WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="unit-pilihan">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="unit-pilihan" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Unit terbaru
            </h2>
            <p className="mt-1.5 text-sm text-muted">Unit yang saat ini tersedia untuk dibooking.</p>
          </div>
          <Link href="/katalog" className="hidden text-sm font-semibold text-accent-dark hover:underline sm:block">
            Lihat semua →
          </Link>
        </div>
        <div className="mt-8">
          {featured.length ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {featured.map((u) => (
                <ProductCard key={u.id} unit={u} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada unit yang ditampilkan"
              description="Katalog sedang diperbarui. Silakan cek kembali nanti atau hubungi kami untuk menanyakan stok."
              action={
                <Link href="/katalog" className={buttonVariants({ variant: "outline" })}>
                  Buka Katalog
                </Link>
              }
            />
          )}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link href="/katalog" className={buttonVariants({ variant: "outline" })}>
            Lihat semua unit
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-paper" aria-labelledby="keunggulan">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="keunggulan" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Belanja iPhone yang lebih tenang
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-dark">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cara-cod" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6" aria-labelledby="cara-cod-title">
        <h2 id="cara-cod-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Cara booking COD
        </h2>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-card border border-line bg-paper p-5 shadow-card">
              <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-bold text-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        {settings.booking_policy && (
          <p className="mt-6 flex items-start gap-2 text-sm text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-dark" aria-hidden />
            {settings.booking_policy}
          </p>
        )}
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-6 sm:px-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Pertanyaan umum
        </h2>
        <div className="mt-8 divide-y divide-line rounded-card border border-line bg-paper">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden className="text-xl text-accent-dark transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-card bg-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Belum menemukan yang cocok?</h2>
            <p className="mt-1 text-sm text-white/70">
              <Wallet className="mr-1.5 inline size-4 align-text-bottom" aria-hidden />
              Tanyakan ketersediaan unit atau minta rekomendasi sesuai anggaran Anda.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <WhatsAppButton phone={settings.whatsapp_number} message={waTemplates.generalInquiry()} variant="primary">
              
              Konsultasi WhatsApp
            </WhatsAppButton>
            {!settings.whatsapp_number && (
              <Link href="/katalog" className={buttonVariants({ variant: "primary" })}>
                Lihat Katalog
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
