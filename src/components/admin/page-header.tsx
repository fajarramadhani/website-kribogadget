import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

/** AdminHeader: judul halaman + aksi + info pengguna. */
export function AdminHeader({
  title,
  description,
  actions,
  email,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  email?: string;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {email && (
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit" title={`Keluar (${email})`}>
              <LogOut aria-hidden /> Keluar
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-paper p-5 shadow-card ${className ?? ""}`}>
      {title && <h2 className="text-base font-bold">{title}</h2>}
      {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}
