import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bike, Car, Zap, ShieldCheck, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Index });

const CATS = [
  { key: "car", label: "Cars", icon: Car },
  { key: "ev", label: "EVs", icon: Zap },
  { key: "motorcycle", label: "Motorcycles", icon: Bike },
  { key: "scooter", label: "Scooters", icon: Bike },
  { key: "bike", label: "Bikes", icon: Bike },
];

function Index() {
  const navigate = useNavigate();
  const [city, setCity] = useState("");

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/browse", search: { city: city || undefined } as any });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Go anywhere,<br />rent anything.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              Book cars, bikes, scooters and EVs from trusted local hosts. By the hour, day or week.
            </p>

            <form onSubmit={search} className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                  className="h-12 pl-9"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">Search</Button>
            </form>

            <div className="mt-8 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <Link
                  key={c.key}
                  to="/browse"
                  search={{ category: c.key } as any}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <c.icon className="h-4 w-4" />
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted">
              <img
                src="https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
                alt="Person driving a car"
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories grid (mobile-friendly) */}
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Choose your ride</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {CATS.map((c) => (
              <Link
                key={c.key}
                to="/browse"
                search={{ category: c.key } as any}
                className="group flex flex-col items-start justify-between rounded-xl border border-border bg-card p-5 transition hover:border-foreground/40"
              >
                <c.icon className="h-8 w-8 text-foreground" />
                <span className="mt-8 text-base font-semibold">{c.label}</span>
                <span className="text-xs text-muted-foreground">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Verified hosts", body: "Every host completes identity checks before their vehicles go live." },
              { icon: MapPin, title: "Local & convenient", body: "Find vehicles near you in seconds." },
              { icon: Clock, title: "Flexible pricing", body: "Rent by the hour, day, or week — whatever suits you." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6">
                <f.icon className="h-6 w-6 text-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Driver CTA */}
      <section className="py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Earn by sharing your vehicle</h2>
            <p className="mt-3 text-muted-foreground">List your car, bike, or scooter in minutes. You control availability and pricing.</p>
            <Button asChild size="lg" className="mt-6"><Link to="/vendor">Get started</Link></Button>
          </div>
          <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
            <img
              src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80"
              alt="Car parked on street"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} RideShare</span>
          <div className="flex gap-4">
            <Link to="/browse" className="hover:text-foreground">Browse</Link>
            <Link to="/vendor" className="hover:text-foreground">Become a host</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
