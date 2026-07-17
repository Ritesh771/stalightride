export const currency = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const daysBetween = (start: string | Date, end: string | Date) => {
  const s = new Date(start);
  const e = new Date(end);
  const ms = Math.max(0, e.getTime() - s.getTime());
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
};

export const publicUrl = (bucket: string, path: string | null | undefined) => {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
};
