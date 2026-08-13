import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { LatLng } from "@/lib/pool-match";

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.google?.maps) return Promise.resolve();
  if (w.__gmapsLoader__) return w.__gmapsLoader__;
  w.__gmapsLoader__ = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&loading=async&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return w.__gmapsLoader__;
}

interface Props {
  route: LatLng[];
  pickup?: LatLng | null;
  drop?: LatLng | null;
  className?: string;
}

/** Draws a pooling trip's route with the passenger's pickup / drop-off pins. */
export function PoolRouteMap({ route, pickup, drop, className }: Props) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!key || !ref.current || route.length < 2) return;
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(key);
        if (cancelled || !ref.current) return;
        const google = (window as any).google;
        const map = new google.maps.Map(ref.current, {
          center: route[0],
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });
        const bounds = new google.maps.LatLngBounds();
        route.forEach((p) => bounds.extend(p));
        new google.maps.Polyline({
          path: route,
          map,
          strokeColor: "#38bdf8",
          strokeOpacity: 0.95,
          strokeWeight: 5,
        });
        const pin = (pos: LatLng, title: string, color: string) => {
          bounds.extend(pos);
          new google.maps.Marker({
            position: pos,
            map,
            title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#0b1120",
              strokeWeight: 2,
            },
          });
        };
        pin(route[0]!, "Trip start", "#22c55e");
        pin(route[route.length - 1]!, "Trip destination", "#ef4444");
        if (pickup) pin(pickup, "Your pickup", "#f59e0b");
        if (drop) pin(drop, "Your drop-off", "#a855f7");
        map.fitBounds(bounds, 48);
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, JSON.stringify(route), JSON.stringify(pickup), JSON.stringify(drop)]);

  if (!key || route.length < 2) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
          Route map unavailable
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={ref} className="h-full w-full overflow-hidden rounded-xl border border-border bg-muted" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-muted-foreground">
          <MapPin className="h-4 w-4 animate-pulse" />
        </div>
      )}
    </div>
  );
}
