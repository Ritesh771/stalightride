import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSignedUrls } from "@/hooks/use-signed-urls";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any }).then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  if (isAdmin === null) return <div className="min-h-screen"><SiteHeader /><div className="p-8"><Skeleton className="h-40" /></div></div>;
  if (!isAdmin) return (
    <div className="min-h-screen"><SiteHeader />
      <div className="mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Admins only.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Admin verification</h1>
        <Tabs defaultValue="vehicles" className="mt-6">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="hosts">Hosts (KYC)</TabsTrigger>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="licences">Driving licences</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
          </TabsList>
          <TabsContent value="vehicles"><VehicleQueue /></TabsContent>
          <TabsContent value="hosts"><HostQueue /></TabsContent>
          <TabsContent value="drivers"><DriverQueue /></TabsContent>
          <TabsContent value="licences"><LicenceQueue /></TabsContent>
          <TabsContent value="disputes"><DisputeQueue /></TabsContent>

        </Tabs>

      </div>
    </div>
  );
}

function VehicleQueue() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id,title,brand,model,year,city,vendor_id,rc_url,insurance_url,pollution_url,fitness_url,verification_status,rejection_reason,created_at,vendors:vendor_id(business_name,kyc_status)" as any)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);

  };
  useEffect(() => { load(); }, []);

  const paths = (items ?? []).flatMap((v) => [v.rc_url, v.insurance_url, v.pollution_url, v.fitness_url].filter(Boolean));
  const signed = useSignedUrls("verification-docs", paths);

  const decide = async (id: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Rejection reason?") || null;
      if (!reason) return;
    }
    const { error } = await supabase.from("vehicles").update({
      verification_status: status,
      rejection_reason: reason,
      verified_at: status === "approved" ? new Date().toISOString() : null,
      status: status === "approved" ? "active" : "draft",
    } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Vehicle ${status}`);
    load();
  };

  if (!items) return <Skeleton className="mt-4 h-40" />;
  if (items.length === 0) return <p className="mt-6 text-sm text-muted-foreground">Nothing to review.</p>;

  return (
    <div className="mt-4 space-y-3">
      {items.map((v) => (
        <Card key={v.id}><CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Link to="/vehicle/$id" params={{ id: v.id }} className="font-medium hover:underline">{v.title}</Link>
                <StatusBadge status={v.verification_status} />
              </div>
              <p className="text-xs text-muted-foreground">{v.brand} {v.model} · {v.year} · {v.city} · Host: {v.vendors?.business_name ?? v.vendor_id.slice(0, 8)} · KYC: {v.vendors?.kyc_status ?? "—"}</p>
            </div>
            <div className="flex gap-2">
              {v.verification_status !== "approved" && <Button size="sm" onClick={() => decide(v.id, "approved")}><ShieldCheck className="mr-1 h-3 w-3" />Approve</Button>}
              {v.verification_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => decide(v.id, "rejected")}>Reject</Button>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <DocLink label="RC" url={v.rc_url ? signed[v.rc_url] : null} />
            <DocLink label="Insurance" url={v.insurance_url ? signed[v.insurance_url] : null} />
            <DocLink label="Pollution" url={v.pollution_url ? signed[v.pollution_url] : null} />
            <DocLink label="Fitness" url={v.fitness_url ? signed[v.fitness_url] : null} />
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function LicenceQueue() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,full_name,dl_number,dl_expiry,dl_front_url,dl_back_url,dl_status,dl_rejection_reason" as any)
      .in("dl_status" as any, ["pending", "rejected", "approved"])
      .order("dl_status", { ascending: true } as any)
      .limit(200);
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const paths = (items ?? []).flatMap((p) => [p.dl_front_url, p.dl_back_url].filter(Boolean));
  const signed = useSignedUrls("verification-docs", paths);

  const decide = async (id: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = window.prompt("Rejection reason?") || null;
      if (!reason) return;
    }
    const { error } = await supabase.from("profiles").update({
      dl_status: status, dl_rejection_reason: reason, dl_verified_at: status === "approved" ? new Date().toISOString() : null,
    } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Licence ${status}`);
    load();
  };

  if (!items) return <Skeleton className="mt-4 h-40" />;
  const pending = items.filter((p) => p.dl_status === "pending");
  if (pending.length === 0) return <p className="mt-6 text-sm text-muted-foreground">Nothing pending.</p>;

  return (
    <div className="mt-4 space-y-3">
      {pending.map((p) => (
        <Card key={p.id}><CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{p.full_name || p.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground">Licence: {p.dl_number} · Expiry: {p.dl_expiry}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => decide(p.id, "approved")}><ShieldCheck className="mr-1 h-3 w-3" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => decide(p.id, "rejected")}>Reject</Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {p.dl_front_url && signed[p.dl_front_url] && <a href={signed[p.dl_front_url]} target="_blank" rel="noreferrer"><img src={signed[p.dl_front_url]} className="aspect-[16/10] w-full rounded-md border object-cover" alt="front" /></a>}
            {p.dl_back_url && signed[p.dl_back_url] && <a href={signed[p.dl_back_url]} target="_blank" rel="noreferrer"><img src={signed[p.dl_back_url]} className="aspect-[16/10] w-full rounded-md border object-cover" alt="back" /></a>}
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
function DocLink({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) return <span className="rounded border border-dashed border-border px-2 py-1 text-muted-foreground">{label}: —</span>;
  return <a className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 hover:bg-accent" href={url} target="_blank" rel="noreferrer">{label}<ExternalLink className="h-3 w-3" /></a>;
}

function DisputeQueue() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = async () => {
    const { data } = await supabase
      .from("disputes")
      .select("*, bookings(id,vehicles(title))")
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    const resolution = window.prompt("Resolution notes (visible to both parties)?");
    if (!resolution?.trim()) return;
    const { error } = await supabase
      .from("disputes")
      .update({ status: "resolved", resolution: resolution.trim(), resolved_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dispute resolved");
    load();
  };
  const startReview = async (id: string) => {
    const { error } = await supabase.from("disputes").update({ status: "in_review" } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked in review");
    load();
  };

  if (!items) return <Skeleton className="mt-4 h-40" />;
  if (items.length === 0) return <p className="mt-6 text-sm text-muted-foreground">No disputes filed.</p>;

  return (
    <div className="mt-4 space-y-3">
      {items.map((d) => (
        <DisputeCard key={d.id} d={d} onResolve={() => resolve(d.id)} onReview={() => startReview(d.id)} />
      ))}
    </div>
  );
}

function DisputeCard({ d, onResolve, onReview }: { d: any; onResolve: () => void; onReview: () => void }) {
  const urls = useSignedUrls("trip-photos", d.photos ?? []);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{d.subject}</p>
            <p className="text-xs text-muted-foreground">
              {d.category} · {d.bookings?.vehicles?.title ?? "—"} · {new Date(d.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={d.status === "resolved" ? "secondary" : "outline"}>{d.status}</Badge>
            {d.status === "open" && <Button size="sm" variant="outline" onClick={onReview}>Mark in review</Button>}
            {d.status !== "resolved" && <Button size="sm" onClick={onResolve}><ShieldCheck className="mr-1 h-3 w-3" />Resolve</Button>}
          </div>
        </div>
        <p className="mt-2 whitespace-pre-line text-sm">{d.detail}</p>
        {d.photos && d.photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {d.photos.map((p: string) => (
              <a key={p} href={urls[p] ?? "#"} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg border">
                {urls[p] && <img src={urls[p]!} alt="" className="h-full w-full object-cover" />}
              </a>
            ))}
          </div>
        )}
        {d.resolution && (
          <div className="mt-3 rounded-md bg-muted p-3 text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Resolution</span>
            <p className="mt-1 whitespace-pre-line">{d.resolution}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HostQueue() {
  const [items, setItems] = useState<any[] | null>(null);
  const load = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id,business_name,bio,kyc_status,id_document_url,payout_email,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setItems((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const paths = (items ?? []).map((v) => v.id_document_url).filter(Boolean);
  const signed = useSignedUrls("kyc-docs", paths);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("vendors").update({ kyc_status: status } as any).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Host ${status}`);
    load();
  };

  if (!items) return <Skeleton className="mt-4 h-40" />;
  if (items.length === 0) return <p className="mt-6 text-sm text-muted-foreground">No hosts yet.</p>;

  return (
    <div className="mt-4 space-y-3">
      {items.map((v) => (
        <Card key={v.id}><CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{v.business_name}</p>
                <Badge variant={v.kyc_status === "approved" ? "secondary" : v.kyc_status === "rejected" ? "destructive" : "outline"}>{v.kyc_status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{v.bio || "No bio"} · Joined {new Date(v.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              {v.kyc_status !== "approved" && <Button size="sm" onClick={() => decide(v.id, "approved")}><ShieldCheck className="mr-1 h-3 w-3" />Approve host</Button>}
              {v.kyc_status !== "rejected" && <Button size="sm" variant="outline" onClick={() => decide(v.id, "rejected")}>Reject</Button>}
            </div>
          </div>
          <div className="mt-3 text-xs">
            <DocLink label="ID document" url={v.id_document_url ? signed[v.id_document_url] : null} />
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}
