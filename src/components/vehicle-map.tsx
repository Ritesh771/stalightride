interface Props { query: string; className?: string }

/** Google Maps Embed pinned to a place (city / address). */
export function VehicleMap({ query, className }: Props) {
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
  const src = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(query)}`;
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
