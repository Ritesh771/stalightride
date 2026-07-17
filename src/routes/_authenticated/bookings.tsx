import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { publicUrl, currency } from "@/lib/format";
import { useSession } from "@/hooks/use-session";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bookings")({ component: Bookings });

function Bookings() {
  const { user } = useSession();
  const [asCustomer, setAsCustomer] = useState<any[] | null>(null);
  const [asVendor, setAsVendor] = useState<any[] | null>(null);

  const load = async () => {
    if (!user) return;
    const sel = "*, vehicles(id,title,city,vehicle_images(url,sort_order))";
    const [c, v] = await Promise.all([
      supabase.from("bookings").select(sel).eq("customer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("bookings").select(sel).eq("vendor_id", user.id).order("created_at", { ascending: false }),
    ]);
    setAsCustomer(c.data ?? []);
    setAsVendor(v.data ?? []);
  };
  useEffect(() => { load(); }, [user?.id]);

  type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  const setStatus = async (id: string, status: BookingStatus) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    load();
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Bookings</h1>
        <Tabs defaultValue="customer" className="mt-6">
          <TabsList>
            <TabsTrigger value="customer">As renter</TabsTrigger>
            <TabsTrigger value="vendor">As host</TabsTrigger>
          </TabsList>
          <TabsContent value="customer" className="mt-4">
            <List items={asCustomer} role="customer" onAction={setStatus} />
          </TabsContent>
          <TabsContent value="vendor" className="mt-4">
            <List items={asVendor} role="vendor" onAction={setStatus} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function List({ items, role, onAction }: { items: any[] | null; role: "customer" | "vendor"; onAction: (id: string, status: any) => void }) {
  if (!items) return <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  if (items.length === 0) return <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-muted-foreground">No bookings yet.</div>;
  return (
    <ul className="grid gap-3">
      {items.map((b) => {
        const img = b.vehicles?.vehicle_images?.slice().sort((a: any, x: any) => a.sort_order - x.sort_order)[0];
        const url = img ? publicUrl("vehicle-images", img.url) : null;
        return (
          <Card key={b.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
              <div className="h-32 w-full overflow-hidden rounded-lg bg-muted sm:w-48">
                {url && <img src={url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link to="/vehicle/$id" params={{ id: b.vehicles?.id }} className="font-medium hover:underline">{b.vehicles?.title}</Link>
                    <div className="text-xs text-muted-foreground">{b.vehicles?.city}</div>
                  </div>
                  <StatusBadge s={b.status} />
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{b.start_date} → {b.end_date}</div>
                <div className="mt-1 text-sm">Total: <span className="font-semibold">{currency(b.total_price)}</span></div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {role === "vendor" && b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => onAction(b.id, "confirmed")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => onAction(b.id, "rejected")}>Reject</Button>
                    </>
                  )}
                  {role === "customer" && (b.status === "pending" || b.status === "confirmed") && (
                    <Button size="sm" variant="outline" onClick={() => onAction(b.id, "cancelled")}>Cancel</Button>
                  )}
                  {b.status === "confirmed" && role === "vendor" && (
                    <Button size="sm" variant="outline" onClick={() => onAction(b.id, "completed")}>Mark completed</Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/messages/$bookingId" params={{ bookingId: b.id }}><MessageSquare className="mr-1.5 h-4 w-4" />Message</Link>
                  </Button>
                </div>
              </div>
              {b.status === "confirmed" && b.qr_code && (
                <div className="flex shrink-0 items-center justify-center rounded-lg bg-white p-2">
                  <QRCodeSVG value={b.qr_code} size={80} />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </ul>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
    cancelled: "bg-muted text-muted-foreground",
    completed: "bg-primary/15 text-primary border-primary/30",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}
