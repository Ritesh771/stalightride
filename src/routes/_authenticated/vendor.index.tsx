import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { currency } from "@/lib/format";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { toast } from "sonner";
import { Plus, Car, DollarSign, Calendar, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendor/")({ component: VendorDashboard });

function VendorDashboard() {
  const { user } = useSession();
  const [vendor, setVendor] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[] | null>(null);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: vend }, { data: vhs }, { data: bks }] = await Promise.all([
      supabase.from("vendors").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("vehicles").select("*, vehicle_images(url,sort_order)").eq("vendor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("bookings").select("*, vehicles(title)").eq("vendor_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setVendor(vend);
    setVehicles(vhs ?? []);
    setBookings(bks ?? []);
    if (vend) { setBusinessName(vend.business_name); setBio(vend.bio ?? ""); }
  };
  useEffect(() => { load(); }, [user?.id]);

  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { id: user.id, business_name: businessName, bio };
    const { error } = await supabase.from("vendors").upsert(payload);
    if (error) toast.error(error.message);
    else {
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "vendor" as const }, { onConflict: "user_id,role" });
      toast.success("Host profile saved");
      load();
    }
    setSaving(false);
  };

  if (!user) return null;

  const earnings = (bookings ?? [])
    .filter((b) => b.status === "completed" || b.status === "confirmed")
    .reduce((s, b) => s + Number(b.total_price), 0);

  if (!vendor) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
          <h1 className="font-display text-3xl font-semibold">Become a host</h1>
          <p className="mt-1 text-muted-foreground">Set up your host profile to start listing vehicles.</p>
          <Card className="mt-6"><CardContent className="p-6">
            <form onSubmit={saveVendor} className="space-y-4">
              <div>
                <Label>Business / display name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
              </div>
              <div>
                <Label>Short bio</Label>
                <Textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell renters about yourself" />
              </div>
              <Button type="submit" className="w-full shadow-glow" disabled={saving}>{saving ? "Saving…" : "Create host profile"}</Button>
            </form>
          </CardContent></Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">Host dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {vendor.business_name}</p>
          </div>
          <Button asChild className="shadow-glow"><Link to="/vendor/vehicles/new"><Plus className="mr-1.5 h-4 w-4" />Add vehicle</Link></Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={Car} label="Vehicles" value={vehicles?.length ?? 0} />
          <Stat icon={Calendar} label="Bookings" value={bookings?.length ?? 0} />
          <Stat icon={DollarSign} label="Earnings" value={currency(earnings)} />
        </div>

        {vendor.kyc_status !== "approved" && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium">Identity verification: {vendor.kyc_status}</p>
                <p className="text-xs text-muted-foreground">Verified hosts get a badge and higher visibility.</p>
              </div>
            </div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Your vehicles</h2>
          {!vehicles && <div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>}
          {vehicles && vehicles.length === 0 && <p className="mt-4 text-muted-foreground">No vehicles yet.</p>}
          {vehicles && vehicles.length > 0 && (
            <VehiclesGrid vehicles={vehicles} />
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Recent booking activity</h2>
          {!bookings || bookings.length === 0 ? (
            <p className="mt-4 text-muted-foreground">No bookings yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border/60 bg-card">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{b.vehicles?.title}</p>
                    <p className="text-xs text-muted-foreground">{b.start_date} → {b.end_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{currency(b.total_price)}</p>
                    <Badge variant="outline" className="mt-1">{b.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card><CardContent className="flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
      <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-2xl font-semibold">{value}</div></div>
    </CardContent></Card>
  );
}
