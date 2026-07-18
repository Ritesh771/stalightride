interface Props {
  query?: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

/** Google Maps Embed — pins by lat/lng when available, else falls back to place query. */
export function VehicleMap({ query, lat, lng, className }: Props) {
  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  if (!key) {
    return (
      <div className={className}>
        <div className="grid h-full w-full place-items-center rounded-xl border border-border bg-muted text-xs text-muted-foreground">
          Map unavailable
        </div>
      </div>
    );
  }
  const hasCoords = typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng);
  const src = hasCoords
    ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(key)}&center=${lat},${lng}&zoom=15&maptype=roadmap`
    : `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query ?? "")}`;
  return (
    <div className={className}>
      <iframe
        title="Location"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-full w-full rounded-xl border border-border"
        allowFullScreen
      />
    </div>
  );
}
