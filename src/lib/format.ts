import { supabase } from "@/integrations/supabase/client";

export const currency = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const daysBetween = (start: string | Date, end: string | Date) => {
  const s = new Date(start);
  const e = new Date(end);
  const ms = Math.max(0, e.getTime() - s.getTime());
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
};

/** Legacy sync helper — returns a public URL. Only works for public buckets. */
export const publicUrl = (bucket: string, path: string | null | undefined) => {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/** Batch-sign a list of storage paths from a bucket. Returns a { path -> url } map. */
export async function signImageUrls(bucket: string, paths: string[], expiresIn = 3600) {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((d, i) => { if (d.signedUrl) map[unique[i]] = d.signedUrl; });
  return map;
}
