import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Zap, Heart, CalendarDays, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initial = (user?.user_metadata?.full_name || user?.email || "U")
    .toString().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-gradient">RideShare</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/browse" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Browse</Link>
          {user && (
            <>
              <Link to="/bookings" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Bookings</Link>
              <Link to="/wishlist" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Wishlist</Link>
              <Link to="/vendor" className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Host</Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-1.5 py-1 hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">{initial}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/bookings"><CalendarDays className="mr-2 h-4 w-4" />Bookings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="mr-2 h-4 w-4" />Wishlist</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/vendor"><LayoutDashboard className="mr-2 h-4 w-4" />Host dashboard</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm" className="shadow-glow"><Link to="/auth" search={{ mode: "signup" } as any}>Get started</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
