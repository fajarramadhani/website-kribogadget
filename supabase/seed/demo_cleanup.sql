-- Menghapus SELURUH data demo (is_demo = true) beserta jejak transaksinya.
-- Hanya menyentuh baris bertanda demo. Backup dulu bila ragu.
-- Aman dijalankan berulang.

begin;

-- Booking atas unit demo (termasuk histori status — cascade).
delete from public.sales where unit_id in (select id from public.units where is_demo);
delete from public.appointments where unit_id in (select id from public.units where is_demo);

-- Foto demo (cascade dari unit) dan unit demo.
delete from public.unit_images where is_demo;
delete from public.units where is_demo;

-- Talent demo (jam kerja & cuti ikut terhapus).
delete from public.appointments where talent_id in (select id from public.talents where is_demo);
delete from public.talents where is_demo;

-- Model yang tidak dipakai unit mana pun dan berasal dari seed demo.
delete from public.product_models m
 where not exists (select 1 from public.units u where u.model_id = m.id)
   and m.name in ('iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 14', 'iPhone 14 Pro Max');

commit;
