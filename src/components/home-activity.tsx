import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currency } from "@/lib/format";
import { Car, Droplets, ReceiptText, UserRound, Wallet as WalletIcon } from "lucide-react";

type Item = {
  id: string;
  kind: "rental" | "hire" | "wash";
  title: string;
  when: string;
  status: string;
  paid: boolean;
  total: number;
  href: string;
};

function StatusBadge({ s }: { s: string }) {
  if (s === "confirmed") return <Badge className="bg-emerald-600 text-white">Confirmed</Badge>;
  if (s === "completed") return <Badge variant="secondary">Completed</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (s === "cancelled") return <Badge variant="outline">Cancelled</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

const ICONS = { rental: Car, hire: UserRound, wash: Droplets } as const;

export function HomeActivity() {
  const { user, loading } = useSession();
  const [items, setItems] = useState<Item[] | null>(null);
  const [wallet, setWallet] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setItems(null);
      return;
    }
    let alive = true;
    (async () => {
      const [rentals, hires, washes, w] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, start_date, end_date, status, payment_status, total_price, vehicles(title)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("driver_bookings")
          .select("id, start_date, end_date, status, payment_status, total_price, drivers(full_name)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("wash_bookings")
          .select("id, slot_date, slot_time, status, payment_status, price, wash_services(name)")
          .eq("customer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!alive) return;
      setWallet(w.data ? Number(w.data.balance) : 0);

      const list: Item[] = [
        ...(rentals.data ?? []).map((b: any) => ({
          id: b.id,
          kind: "rental" as const,
          title: b.vehicles?.title ?? "Vehicle rental",
          when: `${b.start_date} → ${b.end_date}`,
          status: b.status,
          paid: b.payment_status === "paid",
          total: Number(b.total_price),
          href: "/bookings",
        })),
        ...(hires.data ?? []).map((b: any) => ({
          id: b.id,
          kind: "hire" as const,
          title: b.drivers?.full_name ? `Driver — ${b.drivers.full_name}` : "Driver hire",
          when: `${b.start_date} → ${b.end_date}`,
          status: b.status,
          paid: b.payment_status === "paid",
          total: Number(b.total_price),
          href: "/hires",
        })),
        ...(washes.data ?? []).map((b: any) => ({
          id: b.id,
          kind: "wash" as const,
          title: b.wash_services?.name ?? "Vehicle wash",
          when: `${b.slot_date} · ${String(b.slot_time).slice(0, 5)}`,
          status: b.status,
          paid: b.payment_status === "paid",
          total: Number(b.price),
          href: "/washes",
        })),
      ].slice(0, 5);
      setItems(list);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Your bookings, all in one place</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Sign in to see your rentals, driver hires and wash slots, track live trips, download bills and pay from your
              RideShare wallet.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/browse">Browse rides</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Your bookings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recent rentals, driver hires and wash slots.</p>
          </div>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-foreground/40"
          >
            <WalletIcon className="h-4 w-4" />
            Wallet {wallet === null ? "—" : currency(wallet)}
          </Link>
        </div>

        {items === null ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No bookings yet.{" "}
            <Link to="/browse" className="font-medium text-foreground underline">
              Find a ride
            </Link>{" "}
            or{" "}
            <Link to="/wash" className="font-medium text-foreground underline">
              book a wash
            </Link>
            .
          </div>
        ) : (
          <ul className="grid gap-3">
            {items.map((it) => {
              const Icon = ICONS[it.kind];
              return (
                <li
                  key={`${it.kind}-${it.id}`}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{it.when}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge s={it.status} />
                    <span className="font-display text-base font-bold">{currency(it.total)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={it.href}>Details</Link>
                    </Button>
                    {it.paid ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link
                          to="/receipt/$kind/$id"
                          params={{ kind: it.kind === "rental" ? "vehicle" : it.kind === "hire" ? "driver" : "wash", id: it.id }}
                        >
                          <ReceiptText className="h-4 w-4" />
                          <span className="sr-only">Receipt</span>
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
