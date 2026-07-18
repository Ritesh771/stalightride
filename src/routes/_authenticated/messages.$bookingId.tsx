import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$bookingId")({ component: MessagesPage });

function MessagesPage() {
  const { bookingId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<any[] | null>(null);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase
        .from("bookings")
        .select("*, vehicles(title)")
        .eq("id", bookingId)
        .maybeSingle();
      if (!b) {
        toast.error("Booking not found");
        setAllowed(false);
        navigate({ to: "/bookings" });
        return;
      }
      const party = b.customer_id === user.id || b.vendor_id === user.id;
      if (!party) {
        toast.error("You can only chat about your own bookings");
        setAllowed(false);
        navigate({ to: "/bookings" });
        return;
      }
      setBooking(b);
      setAllowed(true);
      const { data: m } = await supabase
        .from("messages")
        .select("*, profiles(full_name,avatar_url)")
        .eq("booking_id", bookingId)
        .order("created_at");
      setMessages(m ?? []);
    })();
  }, [bookingId, user, navigate]);

  useEffect(() => {
    if (!allowed) return;
    const ch = supabase.channel(`msgs-${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        async (payload) => {
          const { data: prof } = await supabase.from("profiles").select("full_name,avatar_url").eq("id", (payload.new as any).sender_id).maybeSingle();
          setMessages((prev) => [...(prev ?? []), { ...(payload.new as any), profiles: prof }]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId, allowed]);

  useEffect(() => { listRef.current?.scrollTo({ top: 999999 }); }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !allowed) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user.id, body });
    if (error) toast.error(error.message);
  };

  if (allowed === false) return null;


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Button asChild variant="ghost" size="sm" className="mb-3"><Link to="/bookings"><ArrowLeft className="mr-1 h-4 w-4" />Back to bookings</Link></Button>
        <Card className="overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3">
            <p className="text-sm text-muted-foreground">Conversation for</p>
            <p className="font-medium">{booking?.vehicles?.title ?? "…"}</p>
          </div>
          <div ref={listRef} className="max-h-[60vh] min-h-[320px] space-y-3 overflow-y-auto p-5">
            {!messages && <>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-2/3 rounded-2xl" />)}</>}
            {messages && messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet — say hi.</p>}
            {messages?.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
                  {!mine && <Avatar className="h-7 w-7"><AvatarImage src={m.profiles?.avatar_url} /><AvatarFallback>{(m.profiles?.full_name || "?").charAt(0)}</AvatarFallback></Avatar>}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.body}</div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="flex items-center gap-2 border-t border-border/60 p-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
            <Button type="submit" size="icon" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
