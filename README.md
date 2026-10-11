# Kribo Gadget — Katalog iPhone & Booking COD

Website katalog iPhone dan appointment COD untuk **Kribo Gadget** (Instagram [@kribogadget](https://instagram.com/kribogadget)).
Next.js (App Router, TypeScript strict) · Tailwind CSS v4 · Supabase (PostgreSQL, Auth, Storage) · Zod · Vercel.

- Publik: beranda, katalog + filter, detail unit, booking COD (tanpa akun), cek booking.
- Admin: inventori + foto, appointment, talent (jam kerja & cuti), pengaturan toko.
- Tanpa pembayaran online, tanpa WhatsApp Business API (hanya Click to Chat `wa.me`).

> **Catatan Next.js**: proyek memakai Next.js 16 — `middleware` bernama `proxy.ts`, `params`/`searchParams` berupa Promise.
> Halaman publik & admin sengaja `force-dynamic` karena stok/sesi berubah per request.

## Struktur

```
src/app/(public)/      beranda, /katalog, /katalog/[slug], booking, /cek-booking
src/app/admin/         /admin/login + (panel)/ inventory, appointments, talents, settings
src/lib/actions/       Server Actions (booking, auth, inventori, appointment, talent)
src/lib/data/          query data publik & admin (server-only)
src/lib/validation/    skema Zod
src/lib/supabase/      client server (cookie), browser, service (secret key, server-only)
src/proxy.ts           refresh sesi + pagar optimistik /admin
supabase/migrations/   0001_schema.sql (tabel, RLS, fungsi bisnis), 0002_storage.sql (bucket foto)
supabase/seed/         demo_seed.sql / demo_cleanup.sql (data SIMULASI, terpisah)
supabase/bootstrap_admin.sql   membuat admin pertama
tests/                 vitest: tes DB (PGlite = Postgres sungguhan) + tes unit
```

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi nilainya, lihat bagian Environment
npm run dev
```

Tanpa env Supabase situs tetap tampil (katalog kosong/ErrorState, tombol booking dinonaktifkan dengan pesan jelas).

### Perintah kualitas

```bash
npx tsc --noEmit   # typecheck
npm run lint       # ESLint
npm test           # vitest (DB + unit)
npm run build      # production build
```

## Setup Supabase

1. Buat project di <https://supabase.com/dashboard> (region terdekat, mis. Singapore).
2. **SQL Editor** → jalankan isi `supabase/migrations/0001_schema.sql`, lalu `0002_storage.sql`
   (atau `supabase db push` bila memakai Supabase CLI).
3. **Authentication → Sign In / Providers**: matikan *Allow new users to sign up*.
4. **Storage**: bucket `unit-images` dibuat oleh `0002_storage.sql` (publik, maks 5 MB, JPG/PNG/WebP;
   tulis/hapus hanya admin). Periksa di Storage → Buckets.
5. **Project Settings → API**: salin URL, *publishable key*, dan *secret key*.

### Admin pertama (tanpa password default)

1. Authentication → Users → **Add user** (email + password kuat milik Anda, *Auto Confirm User*).
2. Edit email di `supabase/bootstrap_admin.sql`, jalankan di SQL Editor.
3. Login di `/admin/login`. User tanpa baris `profiles` **tidak** punya akses admin.

### Data demo (opsional, hanya non-production)

`supabase/seed/demo_seed.sql` mengisi unit & talent **simulasi** (`is_demo = true`, badge "Data demo" tampil di situs).
Hapus dengan `supabase/seed/demo_cleanup.sql`. **Jangan jalankan di production tanpa persetujuan owner.**

## Environment variables

| Variabel | Lingkup | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | publik | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publik | publishable key (`sb_publishable_…`), dibatasi RLS |
| `SUPABASE_SECRET_KEY` | **server saja** | secret key (`sb_secret_…`); dipakai membuat booking, cek booking, rate limit. `SUPABASE_SERVICE_ROLE_KEY` juga diterima |
| `NEXT_PUBLIC_SITE_URL` | publik | URL situs untuk Open Graph/sitemap |

Jangan pernah memberi awalan `NEXT_PUBLIC_` pada secret key dan jangan commit `.env.local`.

## Deploy ke Vercel

1. Push repo ke GitHub (belum dilakukan otomatis) lalu **Import** di Vercel, atau `npx vercel` dari folder proyek.
2. Isi 4 environment variable di atas (Production & Preview).
3. Deploy. Setelah URL production aktif, isi `NEXT_PUBLIC_SITE_URL` dengan URL tersebut dan redeploy.

### Checklist post-deployment

- [ ] `/` dan `/katalog` terbuka; katalog hanya menampilkan unit terbit.
- [ ] `/admin` tanpa login diarahkan ke `/admin/login`.
- [ ] Login admin berhasil; user non-admin ditolak.
- [ ] Tambah unit + unggah foto + publikasikan → tampil di katalog.
- [ ] Booking uji dari ponsel → muncul Pending di `/admin/appointments`; `/cek-booking` bekerja.
- [ ] Konfirmasi dengan talent → tidak bisa dobel jadwal; catat penjualan → unit Sold hilang dari katalog.
- [ ] Isi Pengaturan (WhatsApp, jam operasional, alamat) — kosong = disembunyikan.
- [ ] Jalankan `get_advisors`/Security Advisor Supabase; pastikan tidak ada data demo di production.
- [ ] (Opsional) jadwalkan `select public.release_expired_holds();` via pg_cron; tanpa itu hold kedaluwarsa dilepas otomatis setiap kali katalog/booking/dashboard dibuka.

## Aturan bisnis (server-side, di database)

- Booking → status **Pending**, unit **Reserved** dengan `stock_hold_expires_at` (default 24 jam, dapat diatur).
  Index unik parsial menjamin satu unit hanya punya satu booking aktif.
- Pending kedaluwarsa → `Expired`, unit kembali Available.
- Konfirmasi/reschedule (`admin_schedule_appointment`) memvalidasi jam kerja talent, cuti, dan bentrok
  (`mulai_baru < selesai_lama AND selesai_baru > mulai_lama`) di bawah row lock; exclusion constraint sebagai lapis kedua.
- Unit hanya `Sold` lewat `admin_record_sale`; `sales.unit_id` unik → satu penjualan final per unit.
- Unit tidak bisa dihapus (hanya diarsipkan) agar riwayat tetap utuh.
- Seluruh perubahan status tercatat di `appointment_status_histories`; perubahan inventori/talent/pengaturan di `audit_logs`.

## Keamanan

- RLS aktif di semua tabel; hak `anon`/`authenticated` dicabut lalu diberikan minimum.
- Publik hanya membaca unit terbit/non-arsip/belum terjual, model, foto, dan pengaturan publik.
  `customers`, `appointments`, `talents`, `audit_logs`, `sales` hanya terbaca admin.
- `create_booking`, `lookup_booking`, `check_rate_limit` hanya bisa dipanggil `service_role` (server).
- Cek booking wajib kode + nomor cocok; pesan error sama untuk kode/nomor salah (anti-enumerasi).
- Rate limit berbasis DB pada booking, cek booking, dan login; honeypot pada form booking.
- Otorisasi admin diperiksa di server pada setiap halaman dan server action (`requireAdmin`), bukan hanya menu.
- Upload foto dibatasi 5 MB & JPG/PNG/WebP (client + bucket); hanya admin yang dapat menulis.
- Header keamanan dasar dipasang di `next.config.ts`.

## Asumsi

- Satu appointment standar berdurasi 60 menit (pengaturan `appointment_minutes`).
- Booking Pending menahan unit (Reserved) agar tidak dibooking ganda; ini dapat dipendekkan lewat `hold_hours`.
- Belum ada alamat toko, nomor WhatsApp, garansi, atau klaim lain — semua diisi owner lewat Pengaturan.
- Logo `KRIBO GADGET` bersifat sementara: ganti di `src/components/public/logo.tsx`.
