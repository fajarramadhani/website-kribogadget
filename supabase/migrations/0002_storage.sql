-- Bucket foto produk. Dipisah dari 0001 karena skema `storage` hanya ada di Supabase.
-- Bucket publik (foto produk memang untuk katalog). Penulisan hanya untuk admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unit-images', 'unit-images', true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "unit-images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'unit-images' and public.is_admin());

create policy "unit-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'unit-images' and public.is_admin())
  with check (bucket_id = 'unit-images' and public.is_admin());

create policy "unit-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'unit-images' and public.is_admin());

-- Pembacaan objek pada bucket publik dilayani lewat URL publik (tanpa policy select),
-- sehingga daftar isi bucket tidak dapat di-enumerate oleh anon.
