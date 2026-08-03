import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { currency } from "@/lib/format";
import { toast } from "sonner";
import { CreditCard, Wallet as WalletIcon, Droplets, ReceiptText } from "lucide-react";
import { createWashRazorpayOrder, verifyWashRazorpayPayment } from "@/lib/wash-payments.functions";
import { openRazorpayCheckout } from "@/lib/razorpay-checkout";

export const Route = createFileRoute("/_authenticated/washes")({
  component: WashesPage,
  head: () => ({
    meta: [
      { title: "My vehicle washes — RideShare" },
      { name: "description", content: "Track your doorstep wash slots, see approval status and pay by wallet or card." },
      { property: "og:title", content: "My vehicle washes — RideShare" },
      { property: "og:description", content: "Track wash slot approvals and pay securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/** Refund on a customer cancellation: 100% >24h before the slot, 50% >2h, else nothing. */
function refundPercent(b: any) {
  const start = new Date(`${b.slot_date}T${String(b.slot_time).slice(0, 8)}`);
  const hoursLeft = (start.getTime() - Date.now()) / 3600000;
  if (hoursLeft >= 24) return 100;
  if (hoursLeft >= 2) return 50;
  return 0;
}

function StatusBadge({ s }: { s: string }) {
  if (s === "confirmed") return <Badge className="bg-emerald-600 text-white">Approved</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  if (s === "completed") return <Badge variant="secondary">Completed</Badge>;
  return <Badge variant="outline">Awaiting approval</Badge>;
}

function WashesPage() {
  const { user } = useSession();
  const [items, setItems] = useState<any[] | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const createOrder = useServerFn(createWashRazorpayOrder);
  const verifyPayment = useServerFn(verifyWashRazorpayPayment);

  const load = async () => {
    if (!user) return;
    const [{ data, error }, { data: w }] = await Promise.all([
      supabase
        .from("wash_bookings")
        .select("*, wash_services:service_id(name,duration_minutes,vehicle_category)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setWallet(Number(w?.balance ?? 0));
  };
  useEffect(() => {
    load();
  }, [user?.id]);

  const cancel = async (b: any) => {
    const paid = b.payment_status === "paid";
    const pct = refundPercent(b);
    const msg = paid
      ? pct === 100
        ? `Cancel this wash? You'll get a full refund of ${currency(b.price)} to your wallet.`
        : pct === 50
          ? `Cancel this wash? The slot is within 24 hours, so 50% (${currency(Number(b.price) / 2)}) will be refunded.`
          : "Cancel this wash? The slot starts in under 2 hours, so no refund is available."
      : "Cancel this wash request?";
    if (!window.confirm(msg)) return;
    setBusy(b.id);
    const { data, error } = await supabase.rpc("cancel_wash_booking", { _wash_booking_id: b.id, _reason: null } as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    const refund = Number((data as any)?.refund ?? 0);
    toast.success(refund > 0 ? `Cancelled — ${currency(refund)} refunded to your wallet` : "Wash cancelled");
    load();
  };

  const payWallet = async (b: any) => {
    setBusy(b.id);
    const { error } = await supabase.rpc("wallet_pay_wash_booking", { _wash_booking_id: b.id } as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Paid from wallet");
    load();
  };

  const payCard = async (b: any) => {
    if (!user) return;
    setBusy(b.id);
    try {
      const order = await createOrder({ data: { washBookingId: b.id } });
      await openRazorpayCheckout({
        keyId: order.keyId,
        amount: order.amount,
        currency: order.currency,
        orderId: order.orderId,
        name: "RideShare",
        description: `Vehicle wash — ${b.wash_services?.name ?? ""}`,
        prefill: { email: user.email ?? undefined, name: user.user_metadata?.full_name ?? undefined },
        onSuccess: async (resp) => {
          try {
            await verifyPayment({ data: { washBookingId: b.id, ...resp } });
            toast.success("Payment successful");
            load();
          } catch (e: any) {
            toast.error(e.message ?? "Payment verification failed");
          }
        },
        onDismiss: () => setBusy(null),
      });
    } catch (e: any) {
      toast.error(e.message ?? "Could not start payment");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold">My vehicle washes</h1>
            <p className="text-sm text-muted-foreground">Slot requests, approvals and payments.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/wallet"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <WalletIcon className="h-4 w-4" />
              {wallet === null ? "…" : currency(wallet)}
            </Link>
            <Button asChild size="sm" variant="outline">
              <Link to="/wash">Book a wash</Link>
            </Button>
          </div>
        </div>

        {!items && (
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}

        {items && items.length === 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
            <Droplets className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">No wash bookings yet</p>
            <Button asChild className="mt-4">
              <Link to="/wash">Book a doorstep wash</Link>
            </Button>
          </div>
        )}

        <ul className="mt-6 grid gap-3">
          {(items ?? []).map((b) => {
            const canPay = b.status === "confirmed" && b.payment_status !== "paid";
            const canCancel = b.status === "pending" || b.status === "confirmed";
            return (
              <Card key={b.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{b.wash_services?.name ?? "Vehicle wash"}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.slot_date} · {String(b.slot_time).slice(0, 5)} · {b.wash_services?.duration_minutes ?? 45} min
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge s={b.status} />
                      {b.payment_status === "paid" && <Badge className="bg-emerald-600 text-white">Paid</Badge>}
                      {b.payment_status === "refunded" && (
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
                          Refunded
                        </Badge>
                      )}
                      {b.payment_status === "partially_refunded" && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700">
                          Partly refunded
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>📍 {b.address}, {b.city}</div>
                    {b.vehicle_label && <div>🚗 {b.vehicle_label}</div>}
                    {b.notes && <div className="sm:col-span-2">📝 {b.notes}</div>}
                  </div>
                  <p className="mt-1 text-sm">
                    Total: <span className="font-semibold">{currency(b.price)}</span>
                  </p>

                  {b.status === "pending" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Our team is checking washer availability for this slot. You can pay once it's approved.
                    </p>
                  )}
                  {b.status === "rejected" && b.rejection_reason && (
                    <p className="mt-1 text-sm text-destructive">Rejected: {b.rejection_reason}</p>
                  )}
                  {b.admin_note && <p className="mt-1 text-xs text-muted-foreground">Note from team: {b.admin_note}</p>}
                  {Number(b.refund_amount ?? 0) > 0 && (
                    <p className="text-sm text-emerald-700">Refunded {currency(b.refund_amount)} to your wallet</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canPay && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === b.id || (wallet ?? 0) < Number(b.price)}
                          onClick={() => payWallet(b)}
                        >
                          <WalletIcon className="mr-1.5 h-4 w-4" />
                          {busy === b.id ? "Paying…" : "Pay with wallet"}
                        </Button>
                        <Button size="sm" disabled={busy === b.id} onClick={() => payCard(b)}>
                          <CreditCard className="mr-1.5 h-4 w-4" />
                          Pay by card / UPI
                        </Button>
                      </>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="ghost" disabled={busy === b.id} onClick={() => cancel(b)}>
                        Cancel
                      </Button>
                    )}
                    {(b.payment_status === "paid" || b.paid_at || Number(b.refund_amount ?? 0) > 0) && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/receipt/$kind/$id" params={{ kind: "wash", id: b.id }}>
                          <ReceiptText className="mr-1.5 h-4 w-4" />Receipt
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
