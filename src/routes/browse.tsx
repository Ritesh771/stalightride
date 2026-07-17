import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { publicUrl, currency } from "@/lib/format";
import { MapPin, Star, Search, Filter } from "lucide-react";

const search = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  transmission: z.string().optional(),
  fuel: z.string().optional(),
  max: z.number().optional(),
});
type Search = z.infer<typeof search>;

export const Route = createFileRoute("/browse")({
  validateSearch: search,
  component: Browse,
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
  const [maxPrice, setMaxPrice] = useState<number>(params.max ?? 500);

  const update = (patch: Partial<Search>) =>
    navigate({ to: "/browse", search: { ...params, ...patch } as any });

  useEffect(() => {
    (async () => {
      setItems(null);
      let q = supabase
        .from("vehicles")
        .select("id,title,brand,model,year,category,city,price_daily,avg_rating,review_count,transmission,fuel,vehicle_images(url,sort_order)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (params.category) q = q.eq("category", params.category as any);
      if (params.transmission) q = q.eq("transmission", params.transmission as any);
      if (params.fuel) q = q.eq("fuel", params.fuel as any);
      if (params.city) q = q.ilike("city", `%${params.city}%`);
      if (params.q) q = q.ilike("title", `%${params.q}%`);
      if (params.max) q = q.lte("price_daily", params.max);
      const { data } = await q;
      setItems((data as any) ?? []);
    })();
  }, [params.category, params.transmission, params.fuel, params.city, params.q, params.max]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-3xl font-semibold">Browse rides</h1>
            <p className="text-sm text-muted-foreground">Filter by city, category, and price.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filters */}
          <aside className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:sticky lg:top-20 lg:self-start">
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
              <Input className="mt-1" placeholder="Any city" defaultValue={params.city} onBlur={(e) => update({ city: e.target.value || undefined })} />
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
              <Slider className="mt-3" min={20} max={1000} step={10} value={[maxPrice]} onValueChange={(v) => setMaxPrice(v[0])} onValueCommit={(v) => update({ max: v[0] })} />
            </div>

            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/browse", search: {} as any })}>Clear filters</Button>
          </aside>

          {/* Grid */}
          <div>
            {!items && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            )}
            {items && items.length === 0 && (
              <div className="rounded-2xl border border-border/60 bg-card p-12 text-center">
                <p className="text-muted-foreground">No vehicles match your filters yet.</p>
              </div>
            )}
            {items && items.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((v) => <VehicleCard key={v.id} v={v} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({ v }: { v: Vehicle }) {
  const img = v.vehicle_images?.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
  const url = img ? publicUrl("vehicle-images", img.url) : null;
  return (
    <Link to="/vehicle/$id" params={{ id: v.id }} className="group">
      <Card className="overflow-hidden transition group-hover:border-primary/50">
        <div className="relative aspect-[4/3] bg-muted">
          {url ? (
            <img src={url} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          ) : (
            <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>
          )}
          <Badge className="absolute left-3 top-3 bg-black/60 backdrop-blur">{v.category}</Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{v.title}</div>
              <div className="truncate text-xs text-muted-foreground">{v.brand} {v.model} · {v.year}</div>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              {Number(v.avg_rating).toFixed(1)}
              <span className="text-xs text-muted-foreground">({v.review_count})</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{v.city}</div>
            <div className="text-sm"><span className="font-semibold text-foreground">{currency(v.price_daily)}</span><span className="text-muted-foreground"> / day</span></div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
