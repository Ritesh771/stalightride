import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, MapPin, Clock, ArrowRight, Star } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { HeroIllustration } from "@/components/hero-illustration";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "RideShare — Rent cars, bikes & EVs near you" },
      { name: "description", content: "Book cars, motorcycles, scooters and EVs from verified local hosts. Hourly, daily or weekly rentals with instant confirmation and secure payments." },
      { property: "og:title", content: "RideShare — Rent cars, bikes & EVs near you" },
      { property: "og:description", content: "Verified hosts, transparent pricing, real-time tracking. Ride, share, explore." },
      { property: "og:url", content: "https://stalightride.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://stalightride.lovable.app/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "RideShare",
        url: "https://stalightride.lovable.app/",
        slogan: "Ride. Share. Explore.",
      }),
    }],
  }),
});

const CATS = [
  { key: "car", label: "Cars", desc: "Sedans & SUVs" },
  { key: "ev", label: "Electric", desc: "Zero-emission rides" },
  { key: "motorcycle", label: "Motorcycles", desc: "Cruisers & sport" },
  { key: "scooter", label: "Scooters", desc: "Zip through the city" },
  { key: "bike", label: "Bicycles", desc: "Pedal on your terms" },
] as const;

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
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.9 0 0) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.9 0 0) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at top, black 40%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-24">
          <div className="flex flex-col justify-center">
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Go anywhere.<br />
              <span className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Rent anything.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground sm:text-lg">
              Cars, bikes, scooters and EVs from verified local hosts. Instant booking, real-time tracking, and secure payments.
            </p>

            <form onSubmit={search} className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <label htmlFor="hero-city" className="sr-only">City</label>
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hero-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Enter your city"
                  className="h-12 pl-9"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 gap-1 px-6">
                Search <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-8 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <Link
                  key={c.key}
                  to="/browse"
                  search={{ category: c.key } as any}
                  className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm"
                >
                  <CategoryIcon name={c.key} className="h-4 w-4" />
                  {c.label}
                </Link>
              ))}
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-left">
              {[
                { k: "10k+", v: "Trips completed" },
                { k: "4.8", v: "Avg rating", star: true },
                { k: "24/7", v: "Support" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="flex items-center gap-1 font-display text-2xl font-bold text-foreground">
                    {s.k}
                    {s.star ? <Star className="h-4 w-4 fill-current" aria-hidden /> : null}
                  </dt>
                  <dd className="text-xs text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <HeroIllustration className="mx-auto h-auto w-full max-w-xl" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Choose your ride</h2>
              <p className="mt-1 text-sm text-muted-foreground">Every vehicle verified, insured, and ready to roll.</p>
            </div>
            <Link to="/browse" className="hidden text-sm font-medium text-foreground/70 hover:text-foreground sm:inline-flex">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATS.map((c) => (
              <Link
                key={c.key}
                to="/browse"
                search={{ category: c.key } as any}
                className="group relative flex flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-foreground/40 hover:shadow-lg"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-muted transition-transform duration-500 group-hover:scale-125" aria-hidden />
                <CategoryIcon name={c.key} className="relative h-10 w-10 text-foreground" />
                <div className="relative mt-10">
                  <div className="text-base font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", title: "Find your ride", body: "Search by city and category. Compare verified vehicles with real photos and ratings." },
              { n: "02", title: "Book in seconds", body: "Pick your dates, pay securely with Razorpay, and get instant confirmation." },
              { n: "03", title: "Unlock & go", body: "Meet your host, scan the QR to verify, and start your trip. Support 24/7." },
            ].map((s, i) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-border bg-card p-6"
                style={{ animation: `rs-pin-drop 500ms ${i * 100}ms both` }}
              >
                <div className="font-display text-4xl font-bold text-muted-foreground/40">{s.n}</div>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Verified hosts", body: "Every host completes ID & document checks before going live." },
              { icon: MapPin, title: "Precise pickup", body: "Live map pin with the exact vehicle location — no guesswork." },
              { icon: Clock, title: "Flexible pricing", body: "Rent by the hour, day, or week — pay only for what you use." },
            ].map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted transition-colors group-hover:bg-foreground group-hover:text-background">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Host CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-foreground to-foreground/80 p-8 text-background sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, oklch(1 0 0 / 0.3) 0, transparent 40%), radial-gradient(circle at 80% 80%, oklch(1 0 0 / 0.2) 0, transparent 40%)",
              }}
            />
            <div className="relative grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Turn your idle vehicle into income</h2>
                <p className="mt-3 max-w-lg text-background/80">
                  List your car, bike, or scooter in minutes. You control availability and pricing — we handle payments, verification, and support.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg" variant="secondary">
                    <Link to="/vendor">Become a host</Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost" className="text-background hover:bg-background/10 hover:text-background">
                    <Link to="/browse">Browse rides</Link>
                  </Button>
                </div>
              </div>
              <ul className="grid gap-3 text-sm">
                {["Free listing, no monthly fees", "Instant Razorpay payouts", "Insurance-ready documents", "24/7 host support"].map((t) => (
                  <li key={t} className="flex items-center gap-2 rounded-lg bg-background/10 px-4 py-3 backdrop-blur">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} RideShare — Ride. Share. Explore.</span>
          <div className="flex gap-4">
            <Link to="/browse" className="hover:text-foreground">Browse</Link>
            <Link to="/vendor" className="hover:text-foreground">Become a host</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
