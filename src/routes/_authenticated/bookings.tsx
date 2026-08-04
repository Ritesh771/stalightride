import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currency } from "@/lib/format";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { useSession } from "@/hooks/use-session";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { MessageSquare, CreditCard, ClipboardCheck, AlertTriangle, Wallet as WalletIcon, ReceiptText } from "lucide-react";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

export const Route = createFileRoute("/_authenticated/bookings")({ component: Bookings });

function Bookings() {
  const { user } = useSession();
  const [asCustomer, setAsCustomer] = useState<any[] | null>(null);
  const [asVendor, setAsVendor] = useState<any[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);

  const load = async () => {
    if (!user) return;
    const sel = "*, vehicles(id,title,city,vehicle_images(url,sort_order))";
    const [c, v, w] = await Promise.all([
      supabase.from("bookings").select(sel).eq("customer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("bookings").select(sel).eq("vendor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setAsCustomer(c.data ?? []);
    setAsVendor(v.data ?? []);
    setWalletBalance(Number(w.data?.balance ?? 0));
  };
  useEffect(() => { load(); }, [user?.id]);

  type BookingStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  const setStatus = async (id: string, status: BookingStatus) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    load();
  };

  const payWithWallet = async (b: any) => {
    setPaying(b.id);
    try {
      const { error } = await supabase.rpc("wallet_pay_booking", { _booking_id: b.id });
      if (error) throw error;
      toast.success("Paid from wallet");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Wallet payment failed");
    } finally {
      setPaying(null);
    }
  };


  const payNow = async (b: any) => {
    if (!user) return;
    setPaying(b.id);
    try {
      const order = await createOrder({ data: { bookingId: b.id } });
      await openRazorpayCheckout({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "Synchoo",
        description: b.vehicles?.title ?? "Vehicle rental",
        prefill: { email: user.email ?? undefined, name: user.user_metadata?.full_name ?? undefined },
        onSuccess: async (resp) => {
          try {
            await verifyPayment({ data: { bookingId: b.id, ...resp } });
            toast.success("Payment successful");
            load();
          } catch (e: any) {
            toast.error(e.message ?? "Payment verification failed");
          }
        },
        onDismiss: () => setPaying(null),
      });
    } catch (e: any) {
      toast.error(e.message ?? "Could not start payment");
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-semibold">Bookings</h1>
          <Link
            to="/wallet"
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <WalletIcon className="h-4 w-4" />
            Wallet: {walletBalance === null ? "…" : currency(walletBalance)}
          </Link>
        </div>
        <Tabs defaultValue="customer" className="mt-6">
          <TabsList>
            <TabsTrigger value="customer">As renter</TabsTrigger>
            <TabsTrigger value="vendor">As host</TabsTrigger>
          </TabsList>
          <TabsContent value="customer" className="mt-4">
            <List items={asCustomer} role="customer" onAction={setStatus} onPay={payNow} onWalletPay={payWithWallet} walletBalance={walletBalance} paying={paying} />
          </TabsContent>
          <TabsContent value="vendor" className="mt-4">
            <List items={asVendor} role="vendor" onAction={setStatus} onPay={payNow} onWalletPay={payWithWallet} walletBalance={walletBalance} paying={paying} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function List({ items, role, onAction, onPay, onWalletPay, walletBalance, paying }: { items: any[] | null; role: "customer" | "vendor"; onAction: (id: string, status: any) => void; onPay: (b: any) => void; onWalletPay: (b: any) => void; walletBalance: number | null; paying: string | null }) {
  const paths = (items ?? []).map((b) =>
    b.vehicles?.vehicle_images?.slice().sort((a: any, x: any) => a.sort_order - x.sort_order)[0]?.url,
  );
  const urls = useSignedUrls("vehicle-images", paths);


  if (!items) return <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>;
  if (items.length === 0) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">No bookings yet.</div>;
  return (
    <ul className="grid gap-3">
      {items.map((b) => {
        const img = b.vehicles?.vehicle_images?.slice().sort((a: any, x: any) => a.sort_order - x.sort_order)[0];
        const url = img ? urls[img.url] : null;
        const canPay = role === "customer" && b.status === "confirmed" && b.payment_status !== "paid";
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
                  <div className="flex items-center gap-2">
                    <StatusBadge s={b.status} />
                    {b.payment_status === "paid" && <Badge className="bg-emerald-600 text-white">Paid</Badge>}
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <div>📅 {b.start_date} → {b.end_date}</div>
                  <div>🕒 {String(b.pickup_time ?? "").slice(0, 5)} → {String(b.dropoff_time ?? "").slice(0, 5)}</div>
                </div>
                <div className="mt-1 text-sm">Total: <span className="font-semibold">{currency(b.total_price)}</span></div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {role === "vendor" && b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => onAction(b.id, "confirmed")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => onAction(b.id, "rejected")}>Reject</Button>
                    </>
                  )}
                  {canPay && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onWalletPay(b)}
                        disabled={paying === b.id || (walletBalance ?? 0) < Number(b.total_price)}
                        title={(walletBalance ?? 0) < Number(b.total_price) ? "Not enough wallet balance" : undefined}
                      >
                        <WalletIcon className="mr-1.5 h-4 w-4" />
                        {paying === b.id ? "Paying…" : "Pay with wallet"}
                      </Button>
                      <Button size="sm" onClick={() => onPay(b)} disabled={paying === b.id}>
                        <CreditCard className="mr-1.5 h-4 w-4" />{paying === b.id ? "Opening…" : "Pay now"}
                      </Button>
                    </>
                  )}
                  {canPay && (walletBalance ?? 0) < Number(b.total_price) && (
                    <Link to="/wallet" className="text-xs text-muted-foreground underline">Add money</Link>
                  )}

                  {role === "customer" && (b.status === "pending" || (b.status === "confirmed" && b.payment_status !== "paid")) && (
                    <Button size="sm" variant="outline" onClick={() => onAction(b.id, "cancelled")}>Cancel</Button>
                  )}
                  {b.status === "confirmed" && b.payment_status === "paid" && role === "vendor" && b.return_checked_at && (
                    <Button size="sm" variant="outline" onClick={() => onAction(b.id, "completed")}>Mark completed</Button>
                  )}
                  {b.status !== "completed" && b.status !== "cancelled" && b.status !== "rejected" && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/messages/$bookingId" params={{ bookingId: b.id }}><MessageSquare className="mr-1.5 h-4 w-4" />Message</Link>
                    </Button>
                  )}
                  {b.status === "confirmed" && b.payment_status === "paid" && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/bookings/$id/trip" params={{ id: b.id }}>
                        <ClipboardCheck className="mr-1.5 h-4 w-4" />
                        {b.return_checked_at ? "Trip summary" : b.pickup_checked_at ? "End trip" : "Start trip"}
                      </Link>
                    </Button>
                  )}
                  {(b.payment_status === "paid" || b.paid_at) && (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/receipt/$kind/$id" params={{ kind: "vehicle", id: b.id }}>
                        <ReceiptText className="mr-1.5 h-4 w-4" />Receipt
                      </Link>
                    </Button>
                  )}
                  {b.status !== "completed" && b.status !== "cancelled" && b.status !== "rejected" && (
                    <Button asChild size="sm" variant="ghost" className="text-destructive">
                      <Link to="/bookings/$id/dispute" params={{ id: b.id }}>
                        <AlertTriangle className="mr-1.5 h-4 w-4" />Report
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
              {b.status === "confirmed" && b.payment_status === "paid" && b.qr_code && (
                <a
                  href={`/booking/qr/${b.qr_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-white p-2 ring-1 ring-border transition-transform hover:scale-[1.03]"
                  title="Scan or open to view booking details"
                >
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/booking/qr/${b.qr_code}`}
                    size={96}
                  />
                  <span className="text-[10px] font-medium text-muted-foreground">Scan for details</span>
                </a>
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
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    confirmed: "bg-blue-100 text-blue-800 border-blue-300",
    rejected: "bg-red-100 text-red-700 border-red-300",
    cancelled: "bg-muted text-muted-foreground",
    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  };
  return <Badge variant="outline" className={map[s] ?? ""}>{s}</Badge>;
}
