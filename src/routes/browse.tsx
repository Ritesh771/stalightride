import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { currency } from "@/lib/format";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { MapPin, Star, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

const search = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  transmission: z.string().optional(),
  fuel: z.string().optional(),
  max: z.number().optional(),
  page: z.number().optional(),
});
type Search = z.infer<typeof search>;

export const Route = createFileRoute("/browse")({
  validateSearch: search,
  component: Browse,
  head: () => ({
    meta: [
      { title: "Browse verified rentals — RideShare" },
      { name: "description", content: "Search verified cars, bikes, scooters, and EVs by city, category, fuel type, transmission, and daily price." },
      { property: "og:title", content: "Browse verified rentals — RideShare" },
      { property: "og:description", content: "Find verified local vehicle rentals with exact pickup maps, ratings, and secure booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Vehicle = {
  id: string; title: string; brand: string; model: string; year: number; category: string;
  city: string; price_daily: number; avg_rating: number; review_count: number;
  transmission: string; fuel: string;
  vehicle_images: { url: string; sort_order: number }[];
};

function Browse() {
  const params = useSearch({ from: "/browse" });
  const navigate = useNavigate();
  const [items, setItems] = useState<Vehicle[] | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(params.max ?? 5000);
  const [cities, setCities] = useState<string[]>([]);
  const page = Math.max(1, params.page ?? 1);

  const update = (patch: Partial<Search>) =>
    navigate({ to: "/browse", search: { ...params, page: 1, ...patch } as any });

  useEffect(() => {
    (async () => {
      setItems(null);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("vehicles")
        .select("id,title,brand,model,year,category,city,price_daily,avg_rating,review_count,transmission,fuel,vehicle_images(url,sort_order)", { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (params.category) q = q.eq("category", params.category as any);
      if (params.transmission) q = q.eq("transmission", params.transmission as any);
      if (params.fuel) q = q.eq("fuel", params.fuel as any);
      if (params.city) q = q.ilike("city", `%${params.city}%`);
      if (params.q) q = q.ilike("title", `%${params.q}%`);
      if (params.max) q = q.lte("price_daily", params.max);
      const { data, count } = await q;
      setItems((data as any) ?? []);
      setTotal(count ?? 0);
    })();
  }, [params.category, params.transmission, params.fuel, params.city, params.q, params.max, page]);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("city")
      .eq("status", "active")
      .order("city", { ascending: true })
      .limit(300)
      .then(({ data }) => {
        setCities(Array.from(new Set((data ?? []).map((row) => row.city).filter(Boolean))));
      });
  }, []);

  const paths = (items ?? []).map((v) =>
    v.vehicle_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0]?.url,
  );
  const urls = useSignedUrls("vehicle-images", paths);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goto = (p: number) =>
    navigate({ to: "/browse", search: { ...params, page: Math.min(Math.max(1, p), totalPages) } as any });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold">Browse rides</h1>
            <p className="text-sm text-muted-foreground">
              {items === null ? "Loading rides…" : `${total} ride${total === 1 ? "" : "s"} available`}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-5 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" />Filters</div>

            <div>
              <Label>Search</Label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Title" defaultValue={params.q} onBlur={(e) => update({ q: e.target.value || undefined })} />
              </div>
            </div>

            <div>
              <Label>City</Label>
              <Input className="mt-1" list="browse-cities" placeholder="Search city" defaultValue={params.city} onBlur={(e) => update({ city: e.target.value || undefined })} />
              <datalist id="browse-cities">
                {cities.map((city) => <option key={city} value={city} />)}
              </datalist>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={params.category ?? "any"} onValueChange={(v) => update({ category: v === "any" ? undefined : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="ev">EV</SelectItem>
                  <SelectItem value="motorcycle">Motorcycle</SelectItem>
                  <SelectItem value="scooter">Scooter</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Transmission</Label>
              <Select value={params.transmission ?? "any"} onValueChange={(v) => update({ transmission: v === "any" ? undefined : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="none">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fuel</Label>
              <Select value={params.fuel ?? "any"} onValueChange={(v) => update({ fuel: v === "any" ? undefined : v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="none">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between"><Label>Max price / day</Label><span className="text-sm text-muted-foreground">{currency(maxPrice)}</span></div>
              <Slider className="mt-3" min={200} max={20000} step={100} value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} onValueCommit={(v) => update({ max: v[0] })} />
            </div>

            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/browse", search: {} as any })}>Clear filters</Button>
          </aside>

          <div>
            {!items && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[4/3] w-full rounded-none" />
                    <CardContent className="space-y-3 p-4">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <div className="flex justify-between pt-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {items && items.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">No vehicles match your filters yet.</p>
              </div>
            )}
            {items && items.length > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((v) => {
                    const first = v.vehicle_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
                    const url = first ? urls[first.url] : null;
                    return <VehicleCard key={v.id} v={v} imgUrl={url ?? null} />;
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => goto(page - 1)} disabled={page <= 1}>
                      <ChevronLeft className="mr-1 h-4 w-4" />Prev
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => goto(page + 1)} disabled={page >= totalPages}>
                      Next<ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ v, imgUrl }: { v: Vehicle; imgUrl: string | null }) {
  return (
    <Link to="/vehicle/$id" params={{ id: v.id }} className="group">
      <Card className="overflow-hidden transition group-hover:border-foreground/40">
        <div className="relative aspect-[4/3] bg-muted">
          {imgUrl ? (
            <img src={imgUrl} alt={v.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
          )}
          <Badge className="absolute left-3 top-3 bg-black/70 text-white">{v.category}</Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{v.title}</div>
              <div className="truncate text-xs text-muted-foreground">{v.brand} {v.model} · {v.year}</div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />
              {Number(v.avg_rating).toFixed(1)}
              <span className="text-xs text-muted-foreground">({v.review_count})</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{v.city}</div>
            <div className="text-sm"><span className="font-semibold">{currency(v.price_daily)}</span> <span className="text-xs text-muted-foreground">/ day</span></div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
