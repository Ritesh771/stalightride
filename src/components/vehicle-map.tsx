import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation, LocateFixed, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Props {
  query?: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

type Coords = { lat: number; lng: number };

/** Google Maps Embed with live user location tracking and driving directions to the host. */
export function VehicleMap({ query, lat, lng, className }: Props) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const [me, setMe] = useState<Coords | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  const hasHost =
    typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);

  useEffect(() => {
    return () => {
      if (watchId.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const startTracking = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported on this device");
      return;
    }
    setTracking(true);
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => {
        setTracking(false);
        toast.error(err.message || "Could not get your location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    watchId.current = navigator.geolocation.watchPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    setShowRoute(false);
  };

  if (!key) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
          Map unavailable
        </div>
      </div>
    );
  }

  const src = (() => {
    if (showRoute && me && hasHost) {
      return `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(key)}&origin=${me.lat},${me.lng}&destination=${lat},${lng}&mode=driving`;
    }
    if (hasHost) {
      return `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${lat},${lng}&zoom=15&maptype=roadmap`;
    }
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query ?? "")}`;
  })();

  const externalDirections =
    hasHost && me
      ? `https://www.google.com/maps/dir/?api=1&origin=${me.lat},${me.lng}&destination=${lat},${lng}&travelmode=driving`
      : hasHost
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
      : null;

  return (
    <div className={className}>
      <div className="relative h-full w-full">
        <iframe
          key={src}
          title="Location"
          src={src}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full rounded-xl border border-border"
          allowFullScreen
        />
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-center justify-between gap-2">
          <div className="pointer-events-auto flex gap-2">
            {!tracking ? (
              <Button size="sm" variant="secondary" onClick={startTracking} className="shadow">
                <LocateFixed className="mr-1.5 h-4 w-4" />
                Track my location
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={stopTracking} className="shadow">
                <MapPin className="mr-1.5 h-4 w-4" />
                Stop tracking
              </Button>
            )}
            {hasHost && me && (
              <Button
                size="sm"
                variant={showRoute ? "default" : "secondary"}
                onClick={() => setShowRoute((s) => !s)}
                className="shadow"
              >
                <Navigation className="mr-1.5 h-4 w-4" />
                {showRoute ? "Hide route" : "Show route"}
              </Button>
            )}
          </div>
          {externalDirections && (
            <a
              href={externalDirections}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium shadow ring-1 ring-border hover:bg-background"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>
      {me && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          You: {me.lat.toFixed(5)}, {me.lng.toFixed(5)}
          {hasHost && (
            <>
              {" · "}Host: {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
            </>
          )}
        </p>
      )}
    </div>
  );
}
