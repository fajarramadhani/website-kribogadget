import { normalizePhone } from "./phone";

/**
 * Membuat tautan WhatsApp Click to Chat. wa.me hanya MEMBUKA percakapan dengan teks
 * yang sudah disiapkan — pengguna tetap harus menekan kirim sendiri.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message?: string): string | null {
  if (!phone) return null;
  const n = normalizePhone(phone);
  if (!n) return null;
  const base = `https://wa.me/${n}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const waTemplates = {
  unitInquiry: (unitName: string, unitCode: string) =>
    `Halo Kribo Gadget, saya tertarik dengan ${unitName} (kode unit ${unitCode}). Apakah masih tersedia?`,
  generalInquiry: () => "Halo Kribo Gadget, saya ingin konsultasi memilih iPhone.",
  bookingFollowUp: (code: string, unitName: string) =>
    `Halo Kribo Gadget, saya sudah mengajukan booking COD dengan kode ${code} untuk ${unitName}. Mohon konfirmasinya.`,
  bookingCodeOnly: (code: string) =>
    `Halo Kribo Gadget, saya sudah mengajukan booking COD dengan kode ${code}. Mohon konfirmasinya.`,
  adminToCustomer: (name: string, code: string, unitName: string) =>
    `Halo ${name}, kami dari Kribo Gadget terkait booking COD ${code} untuk ${unitName}.`,
  customerToTalent: (code: string, unitName: string) =>
    `Halo, saya pelanggan Kribo Gadget dengan kode booking ${code} (${unitName}).`,
};
