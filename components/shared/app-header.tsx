"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logoutAction } from "@/actions/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/toast";
import {
  LogOut,
  Settings,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { useShopNav } from "@/components/shared/shop-nav-context";
import { SunMoonThemeToggle } from "./animated-theme-toggle";

interface AppHeaderProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: "STAFF" | "VERIFIER" | "ADMIN" | string;
    shop?: string | null;
    shopName?: string | null;
    shops?: Array<{ _id: string; name: string; code: string; shopType?: string }>;
  };
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const { shopNav } = useShopNav();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsLoggingOut(true);
    toast.create({
      title: "Signing out",
      description: "Ending session...",
      type: "info",
    });
    try {
      await logoutAction();
    } catch (err) {
      console.error("Logout error:", err);
      setIsLoggingOut(false);
    }
  };

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDarkMode =
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems = segments.map((seg, idx) => {
    const url = "/" + segments.slice(0, idx + 1).join("/");
    let formatted = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(seg);
    if (shopNav && (shopNav.shopId === seg || shopNav.shopId.toLowerCase() === seg.toLowerCase())) {
      formatted = shopNav.shopName;
    } else if (isMongoId) {
      const matched = user.shops?.find((s: any) => s._id === seg || s.id === seg);
      if (matched) {
        formatted = matched.name;
      }
    }

    const isLast = idx === segments.length - 1;
    return { name: formatted, url, isLast };
  });

  const initials = user.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "U";

  const settingsHref =
    user.role === "ADMIN"
      ? "/dashboard/admin/settings"
      : user.role === "VERIFIER"
        ? "/dashboard/verifier/settings"
        : "/dashboard/staff/settings";

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full shrink-0 items-center justify-between bg-background px-6 backdrop-blur-md transition-all">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="size-9 text-foreground hover:opacity-70 transition-opacity" />
        <div className="hidden sm:block">
          <Breadcrumb>
            <BreadcrumbList className="text-base font-medium">
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.url}>
                  {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/60" />}
                  <BreadcrumbItem>
                    {item.isLast ? (
                      <BreadcrumbPage className="font-semibold text-foreground text-base">
                        {item.name}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={item.url} />} className="text-muted-foreground hover:text-foreground text-base">
                        {item.name}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Animated Sun / Moon Theme Switcher */}
        <div data-tour="header-theme" className="inline-flex">
          <SunMoonThemeToggle
            size={40}
            duration={1200}
            sky={true}
            storageKey="theme"
            syncDocument={true}
            onThemeChange={(theme) => {
              document.documentElement.style.colorScheme = theme;
            }}
            className="border-muted/30 hover:border-muted/60 transition-all shadow-xs"
          />
        </div>

        {/* Minimalist Profile Trigger */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogTrigger
            render={
              <button
                data-tour="header-profile"
                className="flex items-center gap-3 rounded-2xl px-3 py-2 text-foreground hover:bg-surface/50 transition-colors"
              />
            }
          >
            <span className="hidden md:inline-block text-base font-semibold text-foreground">
              {user.name}
            </span>
            <Avatar className="size-9">
              <AvatarFallback className="bg-surface/60 text-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DialogTrigger>

          <DialogContent className="glass-panel max-w-sm rounded-3xl p-8 border-muted/30 shadow-2xl">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Account
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <div className="text-xl font-bold text-foreground">{user.name}</div>
                <div className="text-base text-muted-foreground">{user.email}</div>
                <div className="text-sm font-semibold tracking-wide text-stat-1 uppercase pt-1">
                  {user.role} {user.shopName ? `• ${user.shopName}` : ""}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  className="w-full justify-between h-14 rounded-2xl bg-surface/60 hover:bg-surface/90 text-foreground border border-muted/20 text-base font-medium px-5"
                  render={<Link href={settingsHref} onClick={() => setProfileOpen(false)} />}
                >
                  <span className="flex items-center gap-3">
                    <Settings className="size-5" />
                    Settings
                  </span>
                  <ArrowUpRight className="size-5" />
                </Button>

                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setLogoutDialogOpen(true);
                  }}
                  className="w-full justify-between h-14 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/30 bg-destructive/10 text-base font-medium px-5"
                >
                  <span className="flex items-center gap-3">
                    <LogOut className="size-5" />
                    Sign Out
                  </span>
                  <ArrowUpRight className="size-5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Minimal Sign Out Dialog */}
        <AlertDialog
          open={logoutDialogOpen}
          onOpenChange={(open) => !isLoggingOut && setLogoutDialogOpen(open)}
        >
          <AlertDialogContent className="glass-panel max-w-md rounded-3xl p-8 border-muted/30">
            <AlertDialogHeader className="space-y-3">
              <AlertDialogTitle className="text-2xl font-bold text-foreground">
                Sign Out
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base text-muted-foreground">
                Confirm ending your session.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 pt-4">
              <AlertDialogCancel
                disabled={isLoggingOut}
                className="h-12 rounded-xl text-base px-6 border-muted/30 hover:bg-surface/50 text-foreground"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-12 rounded-xl text-base px-6 bg-foreground text-background hover:opacity-90 font-semibold gap-2"
              >
                {isLoggingOut ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <span>Sign Out</span>
                    <ArrowUpRight className="size-5" />
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
