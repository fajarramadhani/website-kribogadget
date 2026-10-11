-- DATA DEMO / SIMULASI — BUKAN stok asli Kribo Gadget.
-- Jalankan HANYA di environment presentasi/staging, dan hanya dengan persetujuan owner.
-- Jangan jalankan di production. Semua baris bertanda is_demo = true;
-- hapus dengan supabase/seed/demo_cleanup.sql.

insert into public.product_models (name, release_year) values
  ('iPhone 11', 2019),
  ('iPhone 12', 2020),
  ('iPhone 13', 2021),
  ('iPhone 13 Pro', 2021),
  ('iPhone 14', 2022),
  ('iPhone 14 Pro Max', 2022)
on conflict (name) do nothing;

with seed(code, slug, model, storage, color, battery, grade, notes, completeness, price, status, published) as (
  values
    ('DEMO-001', 'demo-iphone-11-64gb-hitam',        'iPhone 11',         64,  'Hitam',      82, 'Mulus',  'Data demo: goresan halus pada frame.',            'Unit + kabel (simulasi)',        3900000, 'available', true),
    ('DEMO-002', 'demo-iphone-12-128gb-biru',        'iPhone 12',         128, 'Biru',       86, 'Mulus',  'Data demo: tidak ada minus fungsi.',              'Unit + dus (simulasi)',          5800000, 'available', true),
    ('DEMO-003', 'demo-iphone-13-128gb-midnight',    'iPhone 13',         128, 'Midnight',   90, 'Sangat Mulus', 'Data demo: pemakaian ringan.',            'Fullset (simulasi)',             7900000, 'available', true),
    ('DEMO-004', 'demo-iphone-13-pro-256gb-graphite','iPhone 13 Pro',     256, 'Graphite',   88, 'Mulus',  'Data demo: bekas pakai wajar.',                   'Unit + charger (simulasi)',      10400000,'available', true),
    ('DEMO-005', 'demo-iphone-14-128gb-starlight',   'iPhone 14',         128, 'Starlight',  94, 'Sangat Mulus', 'Data demo: nyaris tanpa bekas.',          'Fullset (simulasi)',             9800000, 'reserved',  true),
    ('DEMO-006', 'demo-iphone-14-pro-max-256gb-ungu','iPhone 14 Pro Max', 256, 'Deep Purple',91, 'Mulus',  'Data demo: ada baret tipis pada back glass.',     'Unit + dus (simulasi)',          14500000,'available', true),
    ('DEMO-007', 'demo-iphone-12-64gb-merah-draft',  'iPhone 12',         64,  'Merah',      NULL,'Normal', 'Data demo: unit draft, belum dipublikasikan.',    null,                             5200000, 'available', false)
)
insert into public.units
  (unit_code, slug, model_id, storage_gb, color, battery_health, condition_grade,
   condition_notes, completeness, price, stock_status, is_published, is_demo)
select s.code, s.slug, m.id, s.storage, s.color, s.battery, s.grade,
       s.notes, s.completeness, s.price, s.status::public.stock_status, s.published, true
from seed s
join public.product_models m on m.name = s.model
on conflict (unit_code) do nothing;

-- Foto placeholder (ilustrasi, bukan foto unit asli). File ada di /public/demo.
insert into public.unit_images (unit_id, url, alt, is_primary, sort_order, is_demo)
select u.id, '/demo/foto-demo.svg', 'Foto ilustrasi demo untuk ' || u.unit_code, true, 0, true
from public.units u
where u.is_demo
  and not exists (select 1 from public.unit_images i where i.unit_id = u.id);

-- Talent demo
insert into public.talents (name, phone_whatsapp, service_areas, is_active, notes, is_demo)
select * from (values
  ('Talent Demo A', null::text, array['Area demo 1'], true,  'Data simulasi', true),
  ('Talent Demo B', null::text, array['Area demo 2'], true,  'Data simulasi', true)
) as t(name, phone_whatsapp, service_areas, is_active, notes, is_demo)
where not exists (select 1 from public.talents where is_demo);

-- Jam kerja demo: Senin–Sabtu 10:00–18:00
insert into public.talent_working_hours (talent_id, weekday, start_time, end_time)
select t.id, d, '10:00', '18:00'
from public.talents t, generate_series(1, 6) as d
where t.is_demo
on conflict do nothing;
