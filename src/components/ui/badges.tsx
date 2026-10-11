import { CheckCircle2, Clock, CircleSlash, Hourglass, RefreshCw, XCircle, UserX, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { APPOINTMENT_LABEL, STOCK_LABEL, type AppointmentStatus, type StockStatus } from "@/lib/status";

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

/** Status stok: selalu berlabel teks, tidak hanya warna. */
export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const style: Record<StockStatus, string> = {
    available: "bg-success-soft text-success",
    reserved: "bg-accent-soft text-amber-800",
    sold: "bg-ink/10 text-ink",
  };
  const Icon = status === "available" ? CheckCircle2 : status === "reserved" ? Hourglass : CircleSlash;
  return (
    <span className={cn(base, style[status], className)}>
      <Icon className="size-3.5" aria-hidden />
      {STOCK_LABEL[status]}
    </span>
  );
}

export function BookingStatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const map: Record<AppointmentStatus, { style: string; Icon: typeof Clock }> = {
    pending: { style: "bg-accent-soft text-amber-800", Icon: Clock },
    confirmed: { style: "bg-success-soft text-success", Icon: CheckCircle2 },
    reschedule_requested: { style: "bg-blue-100 text-blue-800", Icon: RefreshCw },
    completed: { style: "bg-ink text-white", Icon: CheckCircle2 },
    cancelled: { style: "bg-danger-soft text-danger", Icon: XCircle },
    no_show: { style: "bg-danger-soft text-danger", Icon: UserX },
    expired: { style: "bg-ink/10 text-muted", Icon: Timer },
  };
  const { style, Icon } = map[status];
  return (
    <span className={cn(base, style, className)}>
      <Icon className="size-3.5" aria-hidden />
      {APPOINTMENT_LABEL[status]}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full border border-ink/20 bg-paper/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink", className)}>
      Data demo
    </span>
  );
}
