/** Keputusan murni (mudah diuji) untuk proxy: apakah request ke path ini perlu diarahkan ke login. */
export function adminGate(pathname: string, hasUser: boolean): "allow" | "redirect-login" {
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdminArea) return "allow";
  if (pathname === "/admin/login") return "allow";
  return hasUser ? "allow" : "redirect-login";
}

/** Hanya path internal yang boleh dipakai sebagai tujuan setelah login (cegah open redirect). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) return "/admin";
  return next;
}
