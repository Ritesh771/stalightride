import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, Heart, CalendarDays, LayoutDashboard, LogOut, User as UserIcon, MessageSquare } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoAsset from "@/assets/rideshare-logo.asset.json";
import { InstallPwaButton } from "@/components/install-pwa-button";

const linkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground data-[status=active]:text-foreground data-[status=active]:bg-muted";

export function SiteHeader() {
  const { user } = useSession();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initial = (user?.user_metadata?.full_name || user?.email || "U")
    .toString().charAt(0).toUpperCase();

  const items: Array<{ to: any; label: string; auth?: boolean }> = [
    { to: "/browse", label: "Browse rides" },
    { to: "/bookings", label: "My trips", auth: true },
    { to: "/wishlist", label: "Saved", auth: true },
    { to: "/vendor", label: "Become a host", auth: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <img src={logoAsset.url} alt="RideShare" className="h-9 w-9 rounded-md object-contain transition-transform group-hover:-translate-y-0.5" />
          <span className="font-display text-lg font-bold tracking-tight text-foreground">RideShare</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.filter((i) => !i.auth || user).map((i) => (
            <Link key={i.to} to={i.to} className={linkClass} activeOptions={{ exact: false }}>
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <InstallPwaButton className="hidden sm:inline-flex" />
          {user ? (
            <>
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full border border-border bg-background p-1 transition-colors hover:bg-muted">
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
                    <DropdownMenuItem asChild><Link to="/bookings"><CalendarDays className="mr-2 h-4 w-4" />My trips</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/wishlist"><Heart className="mr-2 h-4 w-4" />Saved</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/vendor"><LayoutDashboard className="mr-2 h-4 w-4" />Host dashboard</Link></DropdownMenuItem>
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
                    {items.map((i) => (
                      <SheetClose asChild key={i.to}>
                        <Link to={i.to} className="rounded-md px-3 py-3 text-base hover:bg-muted data-[status=active]:bg-muted data-[status=active]:font-semibold">{i.label}</Link>
                      </SheetClose>
                    ))}
                    <SheetClose asChild>
                      <Link to="/profile" className="rounded-md px-3 py-3 text-base hover:bg-muted"><UserIcon className="mr-2 inline h-4 w-4" />Profile</Link>
                    </SheetClose>
                    <button onClick={signOut} className="mt-2 rounded-md px-3 py-3 text-left text-base hover:bg-muted"><LogOut className="mr-2 inline h-4 w-4" />Sign out</button>
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
                    <SheetClose asChild><Link to="/browse" className="rounded-md px-3 py-3 text-base hover:bg-muted">Browse rides</Link></SheetClose>
                    <SheetClose asChild><Link to="/auth" className="rounded-md px-3 py-3 text-base hover:bg-muted">Sign in</Link></SheetClose>
                    <SheetClose asChild><Link to="/auth" search={{ mode: "signup" } as any} className="rounded-md px-3 py-3 text-base hover:bg-muted">Get started</Link></SheetClose>
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
