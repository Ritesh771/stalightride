import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, Heart, CalendarDays, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
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

  const navLinks = (
    <>
      <Link to="/browse" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Ride</Link>
      {user && (
        <>
          <Link to="/bookings" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Trips</Link>
          <Link to="/wishlist" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Saved</Link>
          <Link to="/vendor" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground">Drive</Link>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          RideShare
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-border bg-background p-1 hover:bg-muted">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-muted text-foreground text-xs">{initial}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/bookings"><CalendarDays className="mr-2 h-4 w-4" />Trips</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="mr-2 h-4 w-4" />Saved</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/vendor"><LayoutDashboard className="mr-2 h-4 w-4" />Host</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                  <div className="mt-6 flex flex-col gap-1">
                    <Link to="/browse" className="rounded-md px-3 py-3 text-base hover:bg-muted">Ride</Link>
                    <Link to="/bookings" className="rounded-md px-3 py-3 text-base hover:bg-muted">Trips</Link>
                    <Link to="/wishlist" className="rounded-md px-3 py-3 text-base hover:bg-muted">Saved</Link>
                    <Link to="/vendor" className="rounded-md px-3 py-3 text-base hover:bg-muted">Drive</Link>
                    <Link to="/profile" className="rounded-md px-3 py-3 text-base hover:bg-muted">Profile</Link>
                    <button onClick={signOut} className="mt-2 rounded-md px-3 py-3 text-left text-base hover:bg-muted">Sign out</button>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/auth" search={{ mode: "signup" } as any}>Get started</Link></Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
                  <div className="mt-6 flex flex-col gap-1">
                    <Link to="/browse" className="rounded-md px-3 py-3 text-base hover:bg-muted">Ride</Link>
                    <Link to="/auth" className="rounded-md px-3 py-3 text-base hover:bg-muted">Sign in</Link>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
