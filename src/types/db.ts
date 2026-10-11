import type { AppointmentStatus, StockStatus } from "@/lib/status";

export type UnitImage = {
  id: string;
  unit_id: string;
  url: string;
  storage_path: string | null;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
  is_demo: boolean;
};

export type Unit = {
  id: string;
  unit_code: string;
  slug: string;
  model_id: string;
  storage_gb: number;
  color: string;
  battery_health: number | null;
  condition_grade: string | null;
  condition_notes: string | null;
  completeness: string | null;
  warranty_info: string | null;
  price: number | string;
  stock_status: StockStatus;
  stock_hold_expires_at: string | null;
  is_published: boolean;
  archived_at: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type UnitWithModel = Unit & {
  product_models: { name: string } | null;
  unit_images: UnitImage[];
};

export type Talent = {
  id: string;
  name: string;
  phone_whatsapp: string | null;
  service_areas: string[];
  is_active: boolean;
  notes: string | null;
  is_demo: boolean;
};

export type WorkingHour = {
  id: string;
  talent_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type Unavailability = {
  id: string;
  talent_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Appointment = {
  id: string;
  booking_code: string;
  unit_id: string;
  customer_id: string;
  customer_name: string;
  status: AppointmentStatus;
  preferred_date: string;
  preferred_time: string;
  preferred_area: string;
  customer_notes: string | null;
  talent_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  final_location: string | null;
  admin_notes: string | null;
  outcome_notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StatusHistory = {
  id: string;
  appointment_id: string;
  from_status: AppointmentStatus | null;
  to_status: AppointmentStatus;
  actor_id: string | null;
  actor_label: "customer" | "admin" | "system";
  note: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  unit_id: string;
  appointment_id: string | null;
  sale_price: number | string;
  sold_at: string;
};

export type StoreSettings = {
  store_name: string;
  instagram_handle: string;
  whatsapp_number: string;
  address: string;
  operating_hours: string;
  service_info: string;
  booking_policy: string;
  hold_hours: string;
  appointment_minutes: string;
};

export type BookingLookup = {
  booking_code: string;
  status: AppointmentStatus;
  customer_name: string;
  unit_name: string;
  unit_slug: string;
  unit_code: string;
  preferred_date: string;
  preferred_time: string;
  preferred_area: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  final_location: string | null;
  talent_name: string | null;
  talent_phone: string | null;
  expires_at: string | null;
  created_at: string;
};
