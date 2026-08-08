import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  MapPin,
  Clock,
  ArrowRight,
  Star,
  Car,
  UserRound,
  Droplets,
  Wallet,
  Navigation,
  ReceiptText,
  MessageSquare,
  BadgeCheck,
  CircleAlert,
  QrCode,
  
  Quote,
} from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { HeroIllustration } from "@/components/hero-illustration";
import { HomeActivity } from "@/components/home-activity";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Synchoo — Premium car, bike & EV rentals near you" },
      { name: "description", content: "Book cars, motorcycles, scooters and EVs from verified local hosts. Instant confirmation, QR handover, live GPS tracking and secure wallet payments." },
      { property: "og:title", content: "Synchoo — Premium car, bike & EV rentals near you" },
      { property: "og:description", content: "Book cars, motorcycles, scooters and EVs from verified local hosts. Instant confirmation, QR handover, live GPS tracking and secure wallet payments." },
      { property: "og:url", content: "https://stalightride.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://stalightride.lovable.app/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Synchoo",
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

const TESTIMONIALS = [
  {
    quote: "Booked an EV in Bengaluru at 11pm, scanned the QR at pickup and was on the road in four minutes. Cleanest rental flow I've used.",
    name: "Aarav Menon",
    role: "Weekend traveller",
    tint: "text-brand",
  },
  {
    quote: "As a host, the earnings panel and availability calendar are exactly what I needed. Payouts land without me chasing anyone.",
    name: "Divya Rao",
    role: "Host · 3 vehicles",
    tint: "text-cyan",
  },
  {
    quote: "The fuel and damage inspection with photos saved a dispute for me. Support closed it in a day with the evidence already there.",
    name: "Karthik S.",
    role: "Frequent renter",
    tint: "text-violet",
  },
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

      {/* ————— Hero ————— */}
      <section className="aurora relative overflow-hidden">
        <div aria-hidden className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_1fr] md:items-center md:py-28">
          <div className="rise flex flex-col justify-center">
            <h1 className="font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-[4.2rem]">
              Move like the
              <br />
              <span className="text-gradient">future arrived.</span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Cars, motorcycles, scooters and EVs from verified local hosts — booked in seconds,
              unlocked with a QR scan, tracked in real time.
            </p>

            <form onSubmit={search} className="mt-9 flex w-full max-w-lg flex-col gap-3 sm:flex-row">
              <label htmlFor="hero-city" className="sr-only">City</label>
              <div className="relative flex-1">
                <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="hero-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Where are you riding?"
                  className="h-14 rounded-2xl border-border/70 bg-card/60 pl-11 text-base backdrop-blur-xl"
                />
              </div>
              <Button type="submit" size="lg" className="btn-gradient h-14 gap-2 rounded-2xl px-7 text-base">
                Find a ride <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-7 flex flex-wrap gap-2">
              {CATS.map((c) => (
                <Link
                  key={c.key}
                  to="/browse"
                  search={{ category: c.key } as any}
                  className="glass group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <CategoryIcon name={c.key} className="h-4 w-4" />
                  {c.label}
                </Link>
              ))}
            </div>

            <dl className="mt-11 grid max-w-lg grid-cols-3 gap-4 text-left">
              {[
                { k: "10k+", v: "Trips completed" },
                { k: "4.8", v: "Average rating", star: true },
                { k: "24/7", v: "Rider support" },
              ].map((s) => (
                <div key={s.v} className="glass px-4 py-3">
                  <dt className="flex items-center gap-1 font-display text-2xl font-bold text-foreground">
                    {s.k}
                    {s.star ? <Star className="h-4 w-4 fill-current text-ember" aria-hidden /> : null}
                  </dt>
                  <dd className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="glow-border glass-strong floaty relative p-5 sm:p-7">
              <HeroIllustration className="mx-auto h-auto w-full max-w-xl" />
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="glass flex items-center gap-2 px-3 py-2.5">
                  <QrCode className="h-4 w-4 text-cyan" aria-hidden />
                  QR handover
                </div>
                <div className="glass flex items-center gap-2 px-3 py-2.5">
                  <Navigation className="h-4 w-4 text-emerald" aria-hidden />
                  Live GPS trip
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————— Services ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything mobility, one platform</h2>
            <p className="mt-3 text-base text-muted-foreground">
              Rent a vehicle, hire a verified driver, or book a doorstep wash — pay by card or Synchoo wallet.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/browse", icon: Car, title: "Rent a vehicle", body: "Cars, bikes, scooters and EVs by hour, day or week.", cta: "Browse rides", tint: "text-brand" },
              { to: "/drivers", icon: UserRound, title: "Hire a driver", body: "Licence-verified drivers on hourly or daily rates.", cta: "Find drivers", tint: "text-cyan" },
              { to: "/wash", icon: Droplets, title: "Vehicle wash", body: "Pick a slot at your address — approved by our team.", cta: "Book a wash", tint: "text-violet" },
              { to: "/wallet", icon: Wallet, title: "Synchoo wallet", body: "Top up once, pay instantly, refunds back in seconds.", cta: "Open wallet", tint: "text-emerald" },
            ].map((s, i) => (
              <Link
                key={s.title}
                to={s.to}
                className="glass lift group flex flex-col p-6"
                style={{ animation: `sy-rise 620ms ${i * 90}ms both` }}
              >
                <div className="glass grid h-12 w-12 place-items-center rounded-xl">
                  <s.icon className={`h-5 w-5 ${s.tint}`} aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand">
                  {s.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Your bookings ————— */}
      <HomeActivity />

      {/* ————— Trip experience ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for every step of the trip</h2>
            <p className="mt-3 text-base text-muted-foreground">From pickup checks to bills — nothing left to paperwork.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: QrCode, title: "QR check-in & check-out", body: "Scan at pickup and return to confirm the handover instantly.", tint: "text-brand" },
              { icon: BadgeCheck, title: "Fuel & damage inspection", body: "Log fuel level, odometer and photos of any damage, both ways.", tint: "text-cyan" },
              { icon: Navigation, title: "Live GPS tracking", body: "Share your live location during a trip with turn-by-turn directions.", tint: "text-emerald" },
              { icon: MessageSquare, title: "In-trip chat", body: "Message your host with photos — unlocked once a booking exists.", tint: "text-violet" },
              { icon: CircleAlert, title: "Disputes & damage claims", body: "Raise an issue with evidence; our team resolves it end to end.", tint: "text-ember" },
              { icon: ReceiptText, title: "Invoices & refunds", body: "Printable GST-style bill for every paid booking, refunds to the rupee.", tint: "text-silver" },
            ].map((f) => (
              <div key={f.title} className="glass lift p-6">
                <div className="glass grid h-11 w-11 place-items-center rounded-xl">
                  <f.icon className={`h-5 w-5 ${f.tint}`} aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Categories ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">Choose your ride</h2>
              <p className="mt-3 text-base text-muted-foreground">Every vehicle verified, insured, and ready to roll.</p>
            </div>
            <Link to="/browse" className="hidden text-sm font-medium text-brand hover:opacity-80 sm:inline-flex">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CATS.map((c) => (
              <Link
                key={c.key}
                to="/browse"
                search={{ category: c.key } as any}
                className="glass lift group relative flex flex-col items-start justify-between overflow-hidden p-5"
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/20 blur-xl transition-transform duration-500 group-hover:scale-150"
                  aria-hidden
                />
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

      {/* ————— How it works ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { n: "01", title: "Find your ride", body: "Search by city and category. Compare verified vehicles with real photos and ratings." },
              { n: "02", title: "Book in seconds", body: "Pick your dates, pay by card or wallet, and get instant confirmation." },
              { n: "03", title: "Unlock & go", body: "Meet your host, scan the QR to verify, and start your trip. Support 24/7." },
            ].map((s, i) => (
              <div
                key={s.n}
                className="glass glow-border relative p-7"
                style={{ animation: `sy-rise 620ms ${i * 110}ms both` }}
              >
                <div className="font-display text-5xl font-bold text-gradient">{s.n}</div>
                <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Testimonials ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Riders and hosts, in their words</h2>
            <p className="mt-3 text-base text-muted-foreground">Real trips, real handovers, real payouts.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className="glass lift flex flex-col p-7" style={{ animation: `sy-rise 620ms ${i * 100}ms both` }}>
                <Quote className={`h-6 w-6 ${t.tint}`} aria-hidden />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground/90">“{t.quote}”</blockquote>
                <figcaption className="mt-5 border-t border-border pt-4">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Trust ————— */}
      <section className="cv-auto relative py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Verified hosts", body: "Every host completes ID & document checks before going live.", tint: "text-emerald" },
              { icon: MapPin, title: "Precise pickup", body: "Live map pin with the exact vehicle location — no guesswork.", tint: "text-brand" },
              { icon: Clock, title: "Flexible pricing", body: "Rent by the hour, day, or week — pay only for what you use.", tint: "text-cyan" },
            ].map((f) => (
              <div key={f.title} className="glass lift group p-7">
                <div className="glass grid h-12 w-12 place-items-center rounded-xl">
                  <f.icon className={`h-5 w-5 ${f.tint}`} />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Host CTA ————— */}
      <section className="cv-auto py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="aurora glow-border glass-strong relative overflow-hidden p-8 sm:p-14">
            <div className="relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold sm:text-4xl">Turn your idle vehicle into income</h2>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
                  List your car, bike, or scooter in minutes. You control availability and pricing — we handle
                  payments, verification, and support.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="btn-gradient h-12 rounded-2xl px-7">
                    <Link to="/vendor">Become a host</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 rounded-2xl border-border/70 bg-card/40 px-7 backdrop-blur">
                    <Link to="/browse">Browse rides</Link>
                  </Button>
                </div>
              </div>
              <ul className="grid gap-3 text-sm">
                {["Free listing, no monthly fees", "Fast payouts to your wallet", "Insurance-ready documents", "24/7 host support"].map((t) => (
                  <li key={t} className="glass flex items-center gap-2.5 px-4 py-3">
                    <ShieldCheck className="h-4 w-4 text-emerald" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Synchoo — Ride. Share. Explore.</span>
          <div className="flex gap-5">
            <Link to="/browse" className="hover:text-foreground">Browse</Link>
            <Link to="/vendor" className="hover:text-foreground">Become a host</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
