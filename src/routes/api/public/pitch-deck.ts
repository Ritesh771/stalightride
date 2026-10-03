import { createFileRoute } from "@tanstack/react-router";
import { PITCH_DECK_BASE64 } from "@/lib/pitch-deck-data";

export const Route = createFileRoute("/api/public/pitch-deck")({
  server: {
    handlers: {
      GET: async () => {
        const bytes = Uint8Array.from(atob(PITCH_DECK_BASE64), (c) =>
          c.charCodeAt(0),
        );
        return new Response(bytes, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition":
              'attachment; filename="synchoo-enterprise-pitch.pdf"',
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
