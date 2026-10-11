import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminGate } from "@/lib/admin-gate";

/**
 * Proxy (middleware): menyegarkan sesi Supabase dan melakukan cek OPTIMISTIK untuk /admin.
 * Otorisasi sebenarnya (role admin) dilakukan di server pada setiap halaman/aksi admin
 * lewat requireAdmin() — proxy bukan satu-satunya pagar.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let response = NextResponse.next({ request });
  let hasUser = false;

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    hasUser = Boolean(data.user);
  }

  const decision = adminGate(request.nextUrl.pathname, hasUser);
  if (decision === "redirect-login") {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
