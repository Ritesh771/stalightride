import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin } from "lucide-react";

interface Props {
  query?: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

declare global {
  interface Window {
    __gmapsLoader__?: Promise<void>;
  }
}

function loadGoogleMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmapsLoader__) return window.__gmapsLoader__;
  window.__gmapsLoader__ = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&loading=async&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__gmapsLoader__;
}

/**
 * Interactive map showing the host's exact pickup location with a red pin.
 * Click the pin (or the button) to open Google Maps directions from the user's
 * current location in a new tab.
 */
export function VehicleMap({ query, lat, lng, className }: Props) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  const hasHost =
    typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);

  const directionsUrl = hasHost
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : query
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`
    : null;

  useEffect(() => {
    if (!key || !ref.current) return;
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps(key);
        if (cancelled || !ref.current) return;
        const google = window.google;
        const center = hasHost ? { lat: Number(lat), lng: Number(lng) } : { lat: 20.5937, lng: 78.9629 };
        const map = new google.maps.Map(ref.current, {
          center,
          zoom: hasHost ? 15 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        if (hasHost) {
          const marker = new google.maps.Marker({
            position: center,
            map,
            title: "Pickup location — click for directions",
            animation: google.maps.Animation.DROP,
          });
          const info = new google.maps.InfoWindow({
            content: `<div style="font:500 13px system-ui;padding:2px 4px;">Pickup point<br/><a href="${directionsUrl}" target="_blank" rel="noreferrer" style="color:#111;text-decoration:underline">Get directions →</a></div>`,
          });
          marker.addListener("click", () => {
            info.open({ anchor: marker, map });
            if (directionsUrl) window.open(directionsUrl, "_blank", "noreferrer");
          });
          info.open({ anchor: marker, map });
        } else if (query) {
          // Geocode fallback
          new google.maps.Geocoder().geocode({ address: query }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              map.setCenter(results[0].geometry.location);
              map.setZoom(14);
              new google.maps.Marker({ position: results[0].geometry.location, map, animation: google.maps.Animation.DROP });
            }
          });
        }
        setReady(true);
      } catch {
        setReady(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, lat, lng, query, hasHost, directionsUrl]);

  if (!key) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
          Map unavailable
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <div ref={ref} className="h-full w-full overflow-hidden rounded-xl border border-border bg-muted" />
        {!ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 animate-pulse" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-end">
          {directionsUrl && (
            <Button
              size="sm"
              className="pointer-events-auto shadow"
              onClick={() => window.open(directionsUrl, "_blank", "noreferrer")}
            >
              <Navigation className="mr-1.5 h-4 w-4" /> Directions
            </Button>
          )}
        </div>
      </div>
      {hasHost && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Host: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
        </p>
      )}
    </div>
  );
}
