# CHANGELOG FIXES

### Fix #1 — Halaman admin & beranda ter-prerender statis saat build
| | |
|---|---|
| Tanggal | 2026-10-11 |
| File | `src/app/(public)/layout.tsx`, `src/app/admin/layout.tsx` |
| Masalah | `next build` menandai `/`, `/admin`, `/admin/settings`, `/admin/talents`, `/admin/inventory/new` sebagai `○ Static` |
| Akar | Data/cookie hanya diakses saat Supabase terkonfigurasi; tanpa itu Next menganggap halaman statis → data publik beku & halaman admin dibekukan saat build |
| Fix | `export const dynamic = "force-dynamic"` pada layout publik dan admin |
| Verifikasi | `next build` ulang: semua rute `ƒ Dynamic` kecuali `/_not-found`; `/admin/inventory` anonim → 307 ke `/admin/login?next=…` |
| Pelajaran | Jangan mengandalkan deteksi otomatis untuk halaman bergantung sesi/stok |
| Log Keyword | prerender, static, force-dynamic, admin |
| Deploy | BELUM DEPLOY |
