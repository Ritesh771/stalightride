import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: Profile });

function Profile() {
  const { user } = useSession();
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? { id: user.id, full_name: "", phone: "", city: "", avatar_url: "" }));
  }, [user?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({ ...profile, id: user.id });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data, error: sErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !data) { toast.error(sErr?.message ?? "Could not sign URL"); setUploading(false); return; }
    setProfile({ ...profile, avatar_url: data.signedUrl });
    setUploading(false);
  };

  if (!user || !profile) return null;
  const initial = (profile.full_name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Your profile</h1>
        <Card className="mt-6"><CardContent className="p-6">
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16"><AvatarImage src={profile.avatar_url} /><AvatarFallback>{initial}</AvatarFallback></Avatar>
              <div>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
                  {uploading ? "Uploading…" : "Change photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={upload} />
                </label>
              </div>
            </div>
            <div>
              <Label>Full name</Label>
              <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Phone</Label><Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div><Label>City</Label><Input value={profile.city ?? ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></div>
            </div>
            <div>
              <Label>Email</Label>
              <Input value={user.email ?? ""} disabled />
            </div>
            <Button type="submit" disabled={saving} className="shadow-glow">{saving ? "Saving…" : "Save changes"}</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  );
}
