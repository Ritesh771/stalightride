import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Zap } from "lucide-react";

const search = z.object({ mode: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  component: AuthPage,
});

function AuthPage() {
  const { mode = "signin" } = useSearch({ from: "/auth" });
  const [tab, setTab] = useState<"signin" | "signup">(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setTab(mode); }, [mode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/browse" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Welcome to RideShare!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/browse" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally { setLoading(false); }
  };

  const google = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); setLoading(false); return; }
    if (res.redirected) return;
    navigate({ to: "/browse" });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="gradient-hero relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md shadow-card">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold">
                  {tab === "signup" ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {tab === "signup" ? "Start renting or hosting in minutes." : "Sign in to continue."}
                </p>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.7 12 2.7 6.9 2.7 2.8 6.9 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/></svg>
              Continue with Google
            </Button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3">
              {tab === "signup" && (
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full shadow-glow" disabled={loading}>
                {loading ? "…" : tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {tab === "signup" ? "Already have an account? " : "New to RideShare? "}
              <button
                className="font-medium text-primary hover:underline"
                onClick={() => setTab(tab === "signup" ? "signin" : "signup")}
              >
                {tab === "signup" ? "Sign in" : "Create account"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
