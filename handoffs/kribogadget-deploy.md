# Kribo Gadget — deploy & verifikasi dengan Supabase nyata
Status: DITUNDA · Service: kribogadget (Next.js + Supabase) · Diperbarui: 2026-10-11 22:30

## Status terakhir
- Kode lengkap, lint/tsc/test/build lulus (lihat README). Belum ada project Supabase untuk app ini, belum ada deploy.
- 4 project Supabase di akun adalah milik proyek lain (inactive) — JANGAN dipakai/diubah.

## Langkah berikutnya
1. User membuat project Supabase (atau izinkan membuat; ada biaya) → jalankan migrations 0001 + 0002.
2. Bootstrap admin (`supabase/bootstrap_admin.sql`), matikan signup.
3. Isi `.env.local`, jalankan `npm run dev`, uji alur booking → konfirmasi → penjualan end-to-end.
4. Opsional seed demo (hanya non-production), lalu deploy Vercel + isi env.
5. Verifikasi layout mobile (belum diuji di perangkat/emulasi).

## Jangan lakukan
- Jangan jalankan demo_seed.sql di production. Jangan commit .env.local.
