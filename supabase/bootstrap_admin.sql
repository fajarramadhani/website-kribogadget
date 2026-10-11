-- Bootstrap admin pertama (manual, sekali saja).
--
-- 1. Supabase Dashboard → Authentication → Users → "Add user" → buat user dengan
--    email + password KUAT milik Anda (centang "Auto Confirm User").
-- 2. Authentication → Sign In / Providers → MATIKAN "Allow new users to sign up"
--    agar tidak ada yang mendaftar sendiri.
-- 3. Ganti email di bawah dengan email admin tadi, lalu jalankan di SQL Editor.
--
-- Tidak ada akun/password default. Tanpa baris di `profiles`, sebuah user
-- Supabase Auth TIDAK punya akses admin apa pun.

insert into public.profiles (id, full_name, role)
select id, 'Admin Kribo Gadget', 'admin'
from auth.users
where email = 'GANTI-DENGAN-EMAIL-ADMIN@contoh.com'
on conflict (id) do update set role = 'admin';
