import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { VariantProps } from "class-variance-authority";

/** Tombol Click to Chat. Tidak dirender bila nomor tidak ada/tidak valid (tidak ada tombol mati). */
export function WhatsAppButton({
  phone,
  message,
  children = "Tanya via WhatsApp",
  variant = "outline",
  size,
  className,
}: {
  phone: string | null | undefined;
  message?: string;
  children?: React.ReactNode;
  className?: string;
} & VariantProps<typeof buttonVariants>) {
  const href = buildWhatsAppLink(phone, message);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant, size }), className)}
    >
      <MessageCircle aria-hidden />
      {children}
    </a>
  );
}
