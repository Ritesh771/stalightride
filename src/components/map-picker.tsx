import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair, MapPin } from "lucide-react";

declare global { interface Window { google: any; __gmapInit?: () => void } }

let loaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) return Promise.reject(new Error("Maps key missing"));
  loaderPromise = new Promise<void>((resolve, reject) => {
    window.__gmapInit = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({ key, loading: "async", callback: "__gmapInit", libraries: "marker" });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

interface Props {
  value: { lat: number | null; lng: number | null };
  onChange: (v: { lat: number; lng: number }) => void;
  className?: string;
}

export function MapPicker({ value, onChange, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !ref.current) return;
      const center = value.lat && value.lng ? { lat: value.lat, lng: value.lng } : { lat: 20.5937, lng: 78.9629 };
      const map = new window.google.maps.Map(ref.current, {
        center, zoom: value.lat ? 14 : 5,
        streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
      });
      mapRef.current = map;
      const marker = new window.google.maps.Marker({ position: center, map, draggable: true });
      markerRef.current = marker;
      const commit = (latLng: any) => onChange({ lat: latLng.lat(), lng: latLng.lng() });
      map.addListener("click", (e: any) => { marker.setPosition(e.latLng); commit(e.latLng); });
      marker.addListener("dragend", () => commit(marker.getPosition()));
      setReady(true);
    }).catch((e) => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !value.lat || !value.lng) return;
    const p = { lat: value.lat, lng: value.lng };
    markerRef.current?.setPosition(p);
    mapRef.current?.panTo(p);
  }, [ready, value.lat, value.lng]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(p);
        mapRef.current?.setZoom(15);
        mapRef.current?.panTo(p);
        markerRef.current?.setPosition(p);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={ref} className="h-64 w-full bg-muted" />
        {error && (
          <div className="absolute inset-0 grid place-items-center bg-muted text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{error}</div>
          </div>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={useMyLocation}
          className="absolute right-2 top-2 shadow-md">
          <Crosshair className="mr-1 h-3.5 w-3.5" /> Use my location
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {value.lat && value.lng
          ? `Pin: ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)} — drag the marker or tap the map to adjust.`
          : "Tap the map or use your current location to drop a pickup pin."}
      </p>
    </div>
  );
}
