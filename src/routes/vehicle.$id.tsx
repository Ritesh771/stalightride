import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { currency, daysBetween } from "@/lib/format";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { VehicleMap } from "@/components/vehicle-map";
import { toast } from "sonner";
import { Star, MapPin, Users, Fuel, Cog, Gauge, Heart, ShieldCheck } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/vehicle/$id")({ component: VehiclePage });

function VehiclePage() {
  const { id } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [v, setV] = useState<any>(null);
  const [vendor, setVendor] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[] | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("vehicles")
        .select("*, vehicle_images(url,sort_order)")
        .eq("id", id).maybeSingle();
      setV(data);
      if (data) {
        const { data: vend } = await supabase.from("vendors").select("*").eq("id", data.vendor_id).maybeSingle();
        setVendor(vend);
        const { data: prof } = await supabase.from("profiles").select("*").eq("id", data.vendor_id).maybeSingle();
        setVendorProfile(prof);
        const { data: r } = await supabase.from("reviews").select("*, profiles(full_name,avatar_url)").eq("vehicle_id", id).order("created_at", { ascending: false }).limit(20);
        setReviews(r ?? []);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from("wishlists").select("id").eq("user_id", user.id).eq("vehicle_id", id).maybeSingle()
      .then(({ data }) => setWished(!!data));
  }, [user, id]);

  const images = (v?.vehicle_images ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
  const urls = useSignedUrls("vehicle-images", images.map((im: any) => im.url));
  const imgUrl = images[activeImg] ? urls[images[activeImg].url] : null;

  const days = start && end ? daysBetween(start, end) : 0;
  const subtotal = useMemo(() => (v ? days * Number(v.price_daily) : 0), [days, v]);
  const total = subtotal + (v ? Number(v.security_deposit) : 0);

  const book = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!start || !end) { toast.error("Pick dates first"); return; }
    setBooking(true);
    try {
      const qrPayload = crypto.randomUUID();
      const { error } = await supabase.from("bookings").insert({
        vehicle_id: v.id,
        vendor_id: v.vendor_id,
        customer_id: user.id,
        start_date: start,
        end_date: end,
        base_price: subtotal,
        security_deposit: v.security_deposit,
        total_price: total,
        status: "pending",
        qr_code: qrPayload,
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Booking requested! The host will confirm shortly.");
      navigate({ to: "/bookings" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not book");
    } finally { setBooking(false); }
  };

  const toggleWish = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (wished) {
      await supabase.from("wishlists").delete().eq("user_id", user.id).eq("vehicle_id", id);
      setWished(false);
    } else {
      await supabase.from("wishlists").insert({ user_id: user.id, vehicle_id: id });
      setWished(true);
    }
  };

  if (!v) return (
    <div className="min-h-screen bg-background"><SiteHeader />
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
        <Skeleton className="aspect-[16/10] rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </div>
  );

  const mapQuery = [v.address, v.city].filter(Boolean).join(", ") || v.city;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{v.city}
              <span>·</span>
              <Star className="h-3.5 w-3.5 fill-foreground text-foreground" />{Number(v.avg_rating).toFixed(1)} ({v.review_count})
            </div>
            <h1 className="mt-1 font-display text-3xl font-semibold">{v.title}</h1>
            <p className="text-sm text-muted-foreground">{v.brand} {v.model} · {v.year}</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleWish}>
            <Heart className={`mr-2 h-4 w-4 ${wished ? "fill-foreground text-foreground" : ""}`} />
            {wished ? "Saved" : "Save"}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[16/10] bg-muted">
                {imgUrl ? <img src={imgUrl} alt={v.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground">No image</div>}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-2">
                  {images.map((im: any, i: number) => (
                    <button key={i} onClick={() => setActiveImg(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border ${i === activeImg ? "border-foreground" : "border-border"}`}>
                      {urls[im.url] && <img src={urls[im.url]} alt="" className="h-full w-full object-cover" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Spec icon={Cog} label="Transmission" value={v.transmission} />
              <Spec icon={Fuel} label="Fuel" value={v.fuel} />
              <Spec icon={Users} label="Seats" value={v.seats ?? "—"} />
              <Spec icon={Gauge} label="Mileage" value={v.mileage_kmpl ? `${v.mileage_kmpl} kmpl` : "—"} />
            </div>

            <section className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">About this ride</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{v.description || "No description provided."}</p>
              {v.address && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{v.address}</div>
              )}
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Pickup location</h2>
              <p className="mt-1 text-sm text-muted-foreground">{mapQuery}</p>
              <VehicleMap query={mapQuery} className="mt-4 aspect-[16/9]" />
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={vendorProfile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(vendorProfile?.full_name || vendor?.business_name || "H").charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{vendor?.business_name || vendorProfile?.full_name || "Host"}</p>
                    {vendor?.kyc_status === "approved" && <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" />Verified</Badge>}
                  </div>
                  {vendor?.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{vendor.bio}</p>}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Reviews</h2>
              {!reviews && <Skeleton className="mt-3 h-16" />}
              {reviews && reviews.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No reviews yet.</p>}
              {reviews && reviews.length > 0 && (
                <ul className="mt-4 space-y-4">
                  {reviews.map((r: any) => (
                    <li key={r.id} className="border-t border-border pt-4 first:border-0 first:pt-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarImage src={r.profiles?.avatar_url} /><AvatarFallback>{(r.profiles?.full_name || "U").charAt(0)}</AvatarFallback></Avatar>
                        <span className="text-sm font-medium">{r.profiles?.full_name || "User"}</span>
                        <span className="ml-2 flex items-center text-xs text-muted-foreground"><Star className="mr-1 h-3 w-3 fill-foreground text-foreground" />{r.rating}</span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold">{currency(v.price_daily)}</span>
                  <span className="text-sm text-muted-foreground">/ day</span>
                </div>
                {v.price_hourly && <div className="text-xs text-muted-foreground">{currency(v.price_hourly)} / hour</div>}
                {v.price_weekly && <div className="text-xs text-muted-foreground">{currency(v.price_weekly)} / week</div>}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pickup</Label>
                    <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                  </div>
                  <div>
                    <Label>Return</Label>
                    <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} min={start || new Date().toISOString().slice(0, 10)} />
                  </div>
                </div>

                <div className="mt-3">
                  <Label>Notes (optional)</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the host should know?" />
                </div>

                {days > 0 && (
                  <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                    <Row label={`${currency(v.price_daily)} × ${days} day${days > 1 ? "s" : ""}`} value={currency(subtotal)} />
                    <Row label="Security deposit" value={currency(v.security_deposit)} />
                    <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
                      <span>Total</span><span>{currency(total)}</span>
                    </div>
                  </div>
                )}

                <Button onClick={book} disabled={booking || !start || !end} className="mt-4 w-full">
                  {booking ? "Requesting…" : user ? "Request to book" : "Sign in to book"}
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">You won't be charged until the host accepts.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Spec({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-sm font-medium capitalize">{String(value)}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
