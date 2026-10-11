-- Kribo Gadget — skema inti, RLS, dan fungsi bisnis.
-- Jalankan sekali pada project Supabase baru (SQL Editor atau `supabase db push`).
-- Seluruh waktu disimpan sebagai timestamptz (UTC); tampilan memakai Asia/Jakarta.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'extensions') then
    create extension if not exists btree_gist with schema extensions;
  else
    create extension if not exists btree_gist;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tipe enum (dipakai bersama oleh database dan aplikasi — lihat src/lib/status.ts)
-- ---------------------------------------------------------------------------
create type public.stock_status as enum ('available', 'reserved', 'sold');
create type public.appointment_status as enum (
  'pending', 'confirmed', 'reschedule_requested',
  'completed', 'cancelled', 'no_show', 'expired'
);
create type public.app_role as enum ('admin');

-- ---------------------------------------------------------------------------
-- Util
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Tabel
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  release_year smallint check (release_year between 2007 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null unique check (unit_code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{1,39}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  model_id uuid not null references public.product_models (id) on delete restrict,
  storage_gb integer not null check (storage_gb > 0 and storage_gb <= 4096),
  color text not null check (char_length(color) between 1 and 40),
  battery_health smallint check (battery_health is null or battery_health between 0 and 100),
  condition_grade text check (condition_grade is null or char_length(condition_grade) <= 40),
  condition_notes text check (condition_notes is null or char_length(condition_notes) <= 1000),
  completeness text check (completeness is null or char_length(completeness) <= 500),
  warranty_info text check (warranty_info is null or char_length(warranty_info) <= 500),
  price numeric(12, 2) not null check (price >= 0),
  stock_status public.stock_status not null default 'available',
  stock_hold_expires_at timestamptz,
  is_published boolean not null default false,
  archived_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index units_catalog_idx on public.units (is_published, stock_status) where archived_at is null;
create index units_model_idx on public.units (model_id);
create index units_price_idx on public.units (price);

create table public.unit_images (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id) on delete cascade,
  storage_path text,
  url text not null,
  alt text check (alt is null or char_length(alt) <= 200),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index unit_images_unit_idx on public.unit_images (unit_id, sort_order);
create unique index unit_images_one_primary on public.unit_images (unit_id) where is_primary;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null unique check (phone ~ '^62[0-9]{8,13}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.talents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone_whatsapp text check (phone_whatsapp is null or phone_whatsapp ~ '^62[0-9]{8,13}$'),
  service_areas text[] not null default '{}',
  is_active boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.talent_working_hours (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.talents (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Minggu
  start_time time not null,
  end_time time not null,
  check (end_time > start_time),
  unique (talent_id, weekday, start_time)
);

create table public.talent_unavailability (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.talents (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index talent_unavailability_idx on public.talent_unavailability (talent_id, starts_at, ends_at);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  unit_id uuid not null references public.units (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  status public.appointment_status not null default 'pending',
  preferred_date date not null,
  preferred_time time not null,
  preferred_area text not null check (char_length(preferred_area) between 2 and 200),
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 500),
  talent_id uuid references public.talents (id) on delete restrict,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  final_location text check (final_location is null or char_length(final_location) <= 300),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  outcome_notes text check (outcome_notes is null or char_length(outcome_notes) <= 1000),
  expires_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scheduled_start is null) = (scheduled_end is null)),
  check (scheduled_end is null or scheduled_end > scheduled_start),
  check (
    status <> 'confirmed'
    or (talent_id is not null and scheduled_start is not null and final_location is not null)
  )
);
create index appointments_status_idx on public.appointments (status, created_at desc);
create index appointments_unit_idx on public.appointments (unit_id);
create index appointments_customer_idx on public.appointments (customer_id);
create index appointments_talent_idx on public.appointments (talent_id, scheduled_start);
create index appointments_pending_expiry_idx on public.appointments (expires_at) where status = 'pending';

-- Satu unit hanya boleh punya satu booking aktif (mencegah dua booking menahan unit yang sama).
create unique index appointments_one_active_per_unit
  on public.appointments (unit_id)
  where status in ('pending', 'confirmed', 'reschedule_requested');

-- Satu talent tidak boleh punya dua appointment confirmed yang tumpang tindih
-- (rentang setengah-terbuka: slot yang bersentuhan tidak dianggap bentrok).
alter table public.appointments
  add constraint appointments_no_talent_overlap
  exclude using gist (
    talent_id with =,
    tstzrange(scheduled_start, scheduled_end) with &&
  ) where (status = 'confirmed');

create table public.appointment_status_histories (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  from_status public.appointment_status,
  to_status public.appointment_status not null,
  actor_id uuid,
  actor_label text not null default 'system' check (actor_label in ('customer', 'admin', 'system')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index appointment_histories_idx on public.appointment_status_histories (appointment_id, created_at);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null unique references public.units (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete restrict,
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  sold_at timestamptz not null default now(),
  recorded_by uuid,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index sales_sold_at_idx on public.sales (sold_at desc);

create table public.store_settings (
  key text primary key,
  value text not null default '',
  is_public boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'product_models', 'units', 'customers', 'talents', 'appointments', 'store_settings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Helper otorisasi
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Audit trigger generik
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old) ->> coalesce(tg_argv[0], 'id'));
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
    values ((select auth.uid()), 'delete', tg_table_name, v_id, jsonb_build_object('old', to_jsonb(old)));
    return old;
  elsif tg_op = 'UPDATE' then
    v_id := (to_jsonb(new) ->> coalesce(tg_argv[0], 'id'));
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
    values ((select auth.uid()), 'update', tg_table_name, v_id,
            jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
    return new;
  else
    v_id := (to_jsonb(new) ->> coalesce(tg_argv[0], 'id'));
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
    values ((select auth.uid()), 'insert', tg_table_name, v_id, jsonb_build_object('new', to_jsonb(new)));
    return new;
  end if;
end $$;

create trigger units_audit after insert or update on public.units
  for each row execute function public.audit_row_change();
create trigger talents_audit after insert or update on public.talents
  for each row execute function public.audit_row_change();
create trigger product_models_audit after insert or update on public.product_models
  for each row execute function public.audit_row_change();
create trigger store_settings_audit after insert or update on public.store_settings
  for each row execute function public.audit_row_change('key');

-- ---------------------------------------------------------------------------
-- Penjaga status stok pada tabel units
--   * 'sold' hanya boleh bila ada penjualan final yang tercatat
--   * unit sold tidak boleh dikembalikan lewat update biasa
--   * unit tidak boleh 'available' selagi punya booking aktif
-- ---------------------------------------------------------------------------
create or replace function public.guard_unit_stock()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.stock_status = 'sold' then
    if not exists (select 1 from public.sales s where s.unit_id = new.id) then
      raise exception 'SALE_REQUIRED' using errcode = 'P0001';
    end if;
  elsif tg_op = 'UPDATE' and old.stock_status = 'sold' then
    raise exception 'UNIT_ALREADY_SOLD' using errcode = 'P0001';
  end if;

  if new.stock_status = 'available' and exists (
    select 1 from public.appointments a
    where a.unit_id = new.id
      and a.status in ('pending', 'confirmed', 'reschedule_requested')
  ) then
    raise exception 'UNIT_HAS_ACTIVE_BOOKING' using errcode = 'P0001';
  end if;

  if new.stock_status <> 'reserved' then
    new.stock_hold_expires_at := null;
  end if;
  return new;
end $$;

create trigger units_guard_stock before insert or update on public.units
  for each row execute function public.guard_unit_stock();

-- ---------------------------------------------------------------------------
-- Pengaturan toko (nilai awal = placeholder yang jelas, BUKAN fakta)
-- ---------------------------------------------------------------------------
insert into public.store_settings (key, value, is_public) values
  ('store_name',        'Kribo Gadget', true),
  ('instagram_handle',  'kribogadget', true),
  ('whatsapp_number',   '', true),
  ('address',           '', true),
  ('operating_hours',   '', true),
  ('service_info',      'Lokasi COD fleksibel dan dikonfirmasi bersama admin setelah booking diajukan.', true),
  ('booking_policy',    'Booking berstatus Pending sampai dikonfirmasi admin. Waktu dan lokasi final disepakati bersama admin.', true),
  ('hold_hours',        '24', false),
  ('appointment_minutes', '60', false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Fungsi bisnis
-- ---------------------------------------------------------------------------
create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select case when s.value ~ '^[0-9]{1,5}$' then s.value::integer end
       from public.store_settings s where s.key = p_key),
    p_default
  );
$$;

-- Melepas booking Pending yang kedaluwarsa beserta penahanan stoknya.
-- Idempoten dan aman dipanggil publik (tidak menerima input).
create or replace function public.release_expired_holds()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select a.id, a.unit_id
    from public.appointments a
    where a.status = 'pending' and a.expires_at is not null and a.expires_at < now()
    for update skip locked
  loop
    update public.appointments
       set status = 'expired', expires_at = null
     where id = r.id;
    insert into public.appointment_status_histories
      (appointment_id, from_status, to_status, actor_label, note)
    values (r.id, 'pending', 'expired', 'system', 'Booking kedaluwarsa karena belum dikonfirmasi.');
    update public.units
       set stock_status = 'available', stock_hold_expires_at = null
     where id = r.unit_id and stock_status = 'reserved';
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Rate limiter berbasis database (konsisten lintas instance serverless).
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_count integer;
begin
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.count + 1 end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start end
  returning r.count into v_count;

  return v_count <= p_max;
end $$;

-- Membuat booking. Hanya dipanggil dari server (service_role) setelah validasi + rate limit.
create or replace function public.create_booking(
  p_unit_id uuid,
  p_name text,
  p_phone text,
  p_date date,
  p_time time,
  p_area text,
  p_notes text
)
returns table (booking_code text, appointment_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_unit public.units%rowtype;
  v_customer uuid;
  v_code text;
  v_id uuid;
  v_hold integer;
  v_try integer := 0;
begin
  perform public.release_expired_holds();

  select * into v_unit from public.units u
   where u.id = p_unit_id and u.is_published and u.archived_at is null
   for update;
  if not found then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_unit.stock_status <> 'available' then
    raise exception 'UNIT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into public.customers (name, phone)
  values (p_name, p_phone)
  on conflict (phone) do update set updated_at = now()  -- nama lama TIDAK ditimpa oleh request anonim
  returning id into v_customer;

  v_hold := public.setting_int('hold_hours', 24);

  loop
    v_try := v_try + 1;
    v_code := 'KRB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.appointments (
        booking_code, unit_id, customer_id, customer_name, status,
        preferred_date, preferred_time, preferred_area, customer_notes, expires_at
      ) values (
        v_code, p_unit_id, v_customer, p_name, 'pending',
        p_date, p_time, p_area, nullif(p_notes, ''), now() + make_interval(hours => v_hold)
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      -- bentrok kode (sangat jarang) atau unit sudah punya booking aktif
      if exists (
        select 1 from public.appointments a
        where a.unit_id = p_unit_id and a.status in ('pending', 'confirmed', 'reschedule_requested')
      ) then
        raise exception 'UNIT_UNAVAILABLE' using errcode = 'P0001';
      end if;
      if v_try >= 5 then raise; end if;
    end;
  end loop;

  update public.units
     set stock_status = 'reserved',
         stock_hold_expires_at = now() + make_interval(hours => v_hold)
   where id = p_unit_id;

  insert into public.appointment_status_histories
    (appointment_id, from_status, to_status, actor_label, note)
  values (v_id, null, 'pending', 'customer', 'Booking diajukan oleh pelanggan.');

  return query select v_code, v_id;
end $$;

-- Cek booking tanpa akun: wajib kode DAN nomor WhatsApp yang cocok.
create or replace function public.lookup_booking(p_code text, p_phone text)
returns table (
  booking_code text,
  status public.appointment_status,
  customer_name text,
  unit_name text,
  unit_slug text,
  unit_code text,
  preferred_date date,
  preferred_time time,
  preferred_area text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  final_location text,
  talent_name text,
  talent_phone text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select a.booking_code, a.status, a.customer_name,
         m.name || ' ' || u.storage_gb || 'GB ' || u.color,
         u.slug, u.unit_code,
         a.preferred_date, a.preferred_time, a.preferred_area,
         case when a.status = 'confirmed' then a.scheduled_start end,
         case when a.status = 'confirmed' then a.scheduled_end end,
         case when a.status = 'confirmed' then a.final_location end,
         case when a.status = 'confirmed' then t.name end,
         case when a.status = 'confirmed' then t.phone_whatsapp end,
         a.expires_at, a.created_at
  from public.appointments a
  join public.customers c on c.id = a.customer_id
  join public.units u on u.id = a.unit_id
  join public.product_models m on m.id = u.model_id
  left join public.talents t on t.id = a.talent_id
  where a.booking_code = upper(p_code) and c.phone = p_phone;
$$;

-- Validasi jadwal talent: jam kerja, cuti, dan bentrok. Memberi pesan error yang spesifik.
create or replace function public.assert_talent_available(
  p_talent_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_appointment uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_talent public.talents%rowtype;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  if p_end <= p_start then
    raise exception 'INVALID_TIME_RANGE' using errcode = 'P0001';
  end if;

  select * into v_talent from public.talents t where t.id = p_talent_id for update;
  if not found then
    raise exception 'TALENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_talent.is_active then
    raise exception 'TALENT_INACTIVE' using errcode = 'P0001';
  end if;

  v_local_start := p_start at time zone 'Asia/Jakarta';
  v_local_end := p_end at time zone 'Asia/Jakarta';

  if v_local_start::date <> v_local_end::date or not exists (
    select 1 from public.talent_working_hours w
    where w.talent_id = p_talent_id
      and w.weekday = extract(dow from v_local_start)::smallint
      and w.start_time <= v_local_start::time
      and w.end_time >= v_local_end::time
  ) then
    raise exception 'OUTSIDE_WORKING_HOURS' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.talent_unavailability u
    where u.talent_id = p_talent_id and p_start < u.ends_at and p_end > u.starts_at
  ) then
    raise exception 'TALENT_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- bentrok: mulai baru < selesai lama DAN selesai baru > mulai lama
  if exists (
    select 1 from public.appointments a
    where a.talent_id = p_talent_id
      and a.status = 'confirmed'
      and (p_exclude_appointment is null or a.id <> p_exclude_appointment)
      and p_start < a.scheduled_end and p_end > a.scheduled_start
  ) then
    raise exception 'TALENT_CONFLICT' using errcode = 'P0001';
  end if;
end $$;

-- Admin: konfirmasi atau reschedule (menetapkan talent, waktu, dan lokasi final).
create or replace function public.admin_schedule_appointment(
  p_appointment_id uuid,
  p_talent_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_location text,
  p_note text
)
returns public.appointment_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_appt public.appointments%rowtype;
  v_actor uuid := (select auth.uid());
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_location is null or char_length(btrim(p_location)) < 2 then
    raise exception 'LOCATION_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_appt from public.appointments a where a.id = p_appointment_id for update;
  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_appt.status not in ('pending', 'reschedule_requested', 'confirmed') then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  perform public.assert_talent_available(p_talent_id, p_start, p_end, p_appointment_id);

  update public.appointments
     set status = 'confirmed',
         talent_id = p_talent_id,
         scheduled_start = p_start,
         scheduled_end = p_end,
         final_location = btrim(p_location),
         expires_at = null,
         confirmed_at = coalesce(confirmed_at, now())
   where id = p_appointment_id;

  update public.units
     set stock_status = 'reserved', stock_hold_expires_at = null
   where id = v_appt.unit_id and stock_status <> 'sold';

  insert into public.appointment_status_histories
    (appointment_id, from_status, to_status, actor_id, actor_label, note)
  values (
    p_appointment_id, v_appt.status, 'confirmed', v_actor, 'admin',
    coalesce(nullif(btrim(p_note), ''),
      case when v_appt.status = 'confirmed' then 'Jadwal diubah (reschedule).' else 'Booking dikonfirmasi.' end)
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (v_actor, 'schedule', 'appointments', p_appointment_id::text,
          jsonb_build_object('talent_id', p_talent_id, 'start', p_start, 'end', p_end, 'location', p_location));

  return 'confirmed';
end $$;

-- Admin: ubah status (batal, no-show, selesai, minta reschedule).
create or replace function public.admin_set_appointment_status(
  p_appointment_id uuid,
  p_new_status public.appointment_status,
  p_note text,
  p_outcome text
)
returns public.appointment_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_appt public.appointments%rowtype;
  v_actor uuid := (select auth.uid());
  v_allowed boolean;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_appt from public.appointments a where a.id = p_appointment_id for update;
  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_allowed := case v_appt.status
    when 'pending'              then p_new_status in ('cancelled')
    when 'confirmed'            then p_new_status in ('reschedule_requested', 'completed', 'cancelled', 'no_show')
    when 'reschedule_requested' then p_new_status in ('cancelled', 'no_show')
    else false
  end;
  if not v_allowed then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;

  update public.appointments
     set status = p_new_status,
         expires_at = null,
         outcome_notes = coalesce(nullif(btrim(p_outcome), ''), outcome_notes),
         completed_at = case when p_new_status = 'completed' then now() else completed_at end
   where id = p_appointment_id;

  -- Lepas penahanan stok bila booking tidak lagi aktif.
  if p_new_status in ('cancelled', 'no_show', 'completed') then
    update public.units
       set stock_status = 'available', stock_hold_expires_at = null
     where id = v_appt.unit_id and stock_status = 'reserved';
  end if;

  insert into public.appointment_status_histories
    (appointment_id, from_status, to_status, actor_id, actor_label, note)
  values (p_appointment_id, v_appt.status, p_new_status, v_actor, 'admin', nullif(btrim(p_note), ''));

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (v_actor, 'status', 'appointments', p_appointment_id::text,
          jsonb_build_object('from', v_appt.status, 'to', p_new_status));

  return p_new_status;
end $$;

-- Admin: catat penjualan final. Satu-satunya jalan menjadikan unit 'sold'.
create or replace function public.admin_record_sale(
  p_unit_id uuid,
  p_appointment_id uuid,
  p_price numeric,
  p_notes text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_unit public.units%rowtype;
  v_appt public.appointments%rowtype;
  v_actor uuid := (select auth.uid());
  v_sale uuid;
  v_customer uuid;
  r record;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'INVALID_PRICE' using errcode = 'P0001';
  end if;

  select * into v_unit from public.units u where u.id = p_unit_id for update;
  if not found then
    raise exception 'UNIT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_unit.stock_status = 'sold' or exists (select 1 from public.sales s where s.unit_id = p_unit_id) then
    raise exception 'ALREADY_SOLD' using errcode = 'P0001';
  end if;

  if p_appointment_id is not null then
    select * into v_appt from public.appointments a
     where a.id = p_appointment_id and a.unit_id = p_unit_id for update;
    if not found then
      raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
    end if;
    v_customer := v_appt.customer_id;
  end if;

  begin
    insert into public.sales (unit_id, appointment_id, customer_id, sale_price, recorded_by, notes)
    values (p_unit_id, p_appointment_id, v_customer, p_price, v_actor, nullif(btrim(p_notes), ''))
    returning id into v_sale;
  exception when unique_violation then
    raise exception 'ALREADY_SOLD' using errcode = 'P0001';
  end;

  -- Selesaikan / tutup booking aktif atas unit ini.
  for r in
    select a.id, a.status from public.appointments a
    where a.unit_id = p_unit_id and a.status in ('pending', 'confirmed', 'reschedule_requested')
  loop
    if r.id = p_appointment_id and r.status = 'confirmed' then
      update public.appointments set status = 'completed', completed_at = now(), expires_at = null
       where id = r.id;
      insert into public.appointment_status_histories
        (appointment_id, from_status, to_status, actor_id, actor_label, note)
      values (r.id, r.status, 'completed', v_actor, 'admin', 'Penjualan dicatat.');
    else
      update public.appointments set status = 'cancelled', expires_at = null where id = r.id;
      insert into public.appointment_status_histories
        (appointment_id, from_status, to_status, actor_id, actor_label, note)
      values (r.id, r.status, 'cancelled', v_actor, 'admin', 'Unit sudah terjual.');
    end if;
  end loop;

  update public.units
     set stock_status = 'sold', stock_hold_expires_at = null
   where id = p_unit_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (v_actor, 'sale', 'sales', v_sale::text,
          jsonb_build_object('unit_id', p_unit_id, 'price', p_price, 'appointment_id', p_appointment_id));

  return v_sale;
end $$;

-- Admin: catatan internal pada booking (tidak pernah tampil ke pelanggan).
create or replace function public.admin_set_appointment_notes(p_appointment_id uuid, p_notes text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.appointments
     set admin_notes = nullif(btrim(p_notes), '')
   where id = p_appointment_id;
  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.product_models enable row level security;
alter table public.units enable row level security;
alter table public.unit_images enable row level security;
alter table public.customers enable row level security;
alter table public.talents enable row level security;
alter table public.talent_working_hours enable row level security;
alter table public.talent_unavailability enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_histories enable row level security;
alter table public.sales enable row level security;
alter table public.store_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- Cabut hak bawaan Supabase, lalu beri hak minimum.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- profiles: pengguna hanya membaca profilnya sendiri.
grant select on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- product_models
grant select on public.product_models to anon, authenticated;
grant insert, update on public.product_models to authenticated;
create policy product_models_public_read on public.product_models
  for select to anon, authenticated using (true);
create policy product_models_admin_insert on public.product_models
  for insert to authenticated with check (public.is_admin());
create policy product_models_admin_update on public.product_models
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- units: publik hanya melihat unit terbit, tidak diarsipkan, dan belum terjual.
grant select on public.units to anon, authenticated;
grant insert, update on public.units to authenticated;
create policy units_public_read on public.units
  for select to anon, authenticated
  using (is_published and archived_at is null and stock_status in ('available', 'reserved'));
create policy units_admin_read on public.units
  for select to authenticated using (public.is_admin());
create policy units_admin_insert on public.units
  for insert to authenticated with check (public.is_admin());
create policy units_admin_update on public.units
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- unit_images
grant select on public.unit_images to anon, authenticated;
grant insert, update, delete on public.unit_images to authenticated;
create policy unit_images_public_read on public.unit_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.units u
    where u.id = unit_id and u.is_published and u.archived_at is null
      and u.stock_status in ('available', 'reserved')
  ));
create policy unit_images_admin_read on public.unit_images
  for select to authenticated using (public.is_admin());
create policy unit_images_admin_insert on public.unit_images
  for insert to authenticated with check (public.is_admin());
create policy unit_images_admin_update on public.unit_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy unit_images_admin_delete on public.unit_images
  for delete to authenticated using (public.is_admin());

-- customers: hanya admin (tidak pernah terbuka untuk publik).
grant select on public.customers to authenticated;
create policy customers_admin_read on public.customers
  for select to authenticated using (public.is_admin());

-- talents & turunannya: hanya admin.
grant select, insert, update on public.talents to authenticated;
create policy talents_admin_read on public.talents
  for select to authenticated using (public.is_admin());
create policy talents_admin_insert on public.talents
  for insert to authenticated with check (public.is_admin());
create policy talents_admin_update on public.talents
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.talent_working_hours to authenticated;
create policy talent_hours_admin_all on public.talent_working_hours
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.talent_unavailability to authenticated;
create policy talent_unavailability_admin_all on public.talent_unavailability
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- appointments, histori, penjualan: admin hanya membaca; tulis hanya lewat fungsi.
grant select on public.appointments to authenticated;
create policy appointments_admin_read on public.appointments
  for select to authenticated using (public.is_admin());

grant select on public.appointment_status_histories to authenticated;
create policy appointment_histories_admin_read on public.appointment_status_histories
  for select to authenticated using (public.is_admin());

grant select on public.sales to authenticated;
create policy sales_admin_read on public.sales
  for select to authenticated using (public.is_admin());

-- store_settings: baris publik terbaca semua orang; admin mengelola.
grant select on public.store_settings to anon, authenticated;
grant insert, update on public.store_settings to authenticated;
create policy store_settings_public_read on public.store_settings
  for select to anon, authenticated using (is_public);
create policy store_settings_admin_read on public.store_settings
  for select to authenticated using (public.is_admin());
create policy store_settings_admin_insert on public.store_settings
  for insert to authenticated with check (public.is_admin());
create policy store_settings_admin_update on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- audit_logs: hanya admin membaca; penulisan lewat trigger/fungsi definer.
grant select on public.audit_logs to authenticated;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (public.is_admin());

-- rate_limits: tanpa policy & tanpa grant → hanya service_role.

-- ---------------------------------------------------------------------------
-- Hak eksekusi fungsi
-- ---------------------------------------------------------------------------
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.release_expired_holds() to anon, authenticated, service_role;

grant execute on function public.admin_schedule_appointment(uuid, uuid, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.admin_set_appointment_status(uuid, public.appointment_status, text, text) to authenticated;
grant execute on function public.admin_record_sale(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.admin_set_appointment_notes(uuid, text) to authenticated;

-- Hanya server (secret key / service_role) yang boleh memanggil ini.
grant execute on function public.create_booking(uuid, text, text, date, time, text, text) to service_role;
grant execute on function public.lookup_booking(text, text) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant select, insert, update, delete on public.rate_limits to service_role;
