/**
 * Normalisasi nomor telepon seluler Indonesia ke format internasional tanpa "+": 628xxxxxxxxx.
 * Mengembalikan null bila bukan nomor seluler Indonesia yang masuk akal.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  if (!/^\+?[0-9]+$/.test(digits)) return null;
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  if (!/^62[0-9]{8,13}$/.test(n)) return null;
  if (!n.startsWith("628")) return null;
  return n;
}

export function formatPhoneDisplay(normalized: string): string {
  return "+" + normalized.replace(/^(62)(\d{3})(\d{4})(\d+)$/, "$1 $2-$3-$4");
}
