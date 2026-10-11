import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";

// Data katalog/stok berubah terus; jangan di-prerender saat build.
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
