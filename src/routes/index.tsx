import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Bike, Car, Zap, Search, Shield, Sparkles, MapPin, Star } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const CATS = [
  { key: "car", label: "Cars", icon: Car },
  { key: "ev", label: "EVs", icon: Zap },
  { key: "motorcycle", label: "Motorcycles", icon: Bike },
  { key: "scooter", label: "Scooters", icon: Bike },
  { key: "bike", label: "Bikes", icon: Bike },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Peer-to-peer vehicle rentals
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-6xl">
              Rent any ride. <span className="text-gradient">Anywhere.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              From scooters to EVs, book vehicles by the hour, day, or week — straight from
              trusted local hosts.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/browse"><Search className="mr-2 h-4 w-4" />Find a ride</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/vendor">Become a host</Link>
              </Button>
            </div>
          </div>

          {/* Category chips */}
          <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-5">
            {CATS.map((c) => (
              <Link
                key={c.key}
                to="/browse"
                search={{ category: c.key } as any}
                className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur transition hover:border-primary/50 hover:bg-card"
              >
                <c.icon className="h-6 w-6 text-primary transition group-hover:scale-110" />
                <span className="text-sm">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: Shield, title: "Verified hosts", body: "Every host completes identity checks before their vehicles go live." },
              { icon: MapPin, title: "Local & convenient", body: "Find vehicles near you with map-powered search." },
              { icon: Star, title: "Rated by real riders", body: "Transparent reviews from customers who've actually booked." },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 pb-24 pt-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold sm:text-4xl">Ready to hit the road?</h2>
          <p className="mt-3 text-muted-foreground">Sign up in seconds. Book in minutes.</p>
          <Button asChild size="lg" className="mt-6 shadow-glow"><Link to="/auth">Get started</Link></Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} RideShare</span>
          <span>Built with care.</span>
        </div>
      </footer>
    </div>
  );
}
