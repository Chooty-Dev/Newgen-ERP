"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  logoutAction,
  getUserDevicesAction,
  revokeDeviceSessionAction,
  type LoggedDeviceItem,
} from "@/actions/auth";
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
  Sparkles,
  HammerIcon,
  X,
  Laptop,
  Smartphone,
  Tablet,
  ChevronDown,
  ChevronUp,
  MapPin,
  Shield,
} from "lucide-react";
import { GlassFold } from "@/components/ui/glass-fold";
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

function getDetectedClientDevice(): LoggedDeviceItem {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      id: "current-client-session",
      name: "Windows 11 PC • Chrome",
      location: "Colombo, Western Province, LK",
      ip: "127.0.0.1",
      lastActive: "Active Now",
      isCurrent: true,
      type: "desktop",
    };
  }

  const ua = navigator.userAgent;
  let os = "Windows PC";
  let type: "desktop" | "mobile" | "tablet" = "desktop";

  if (/Windows NT 10.0/i.test(ua)) os = "Windows 11 PC";
  else if (/Windows/i.test(ua)) os = "Windows PC";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "MacBook Pro";
  else if (/iPad/i.test(ua)) { os = "Apple iPad"; type = "tablet"; }
  else if (/iPhone/i.test(ua)) { os = "Apple iPhone"; type = "mobile"; }
  else if (/Android/i.test(ua)) { os = "Android Mobile"; type = "mobile"; }
  else if (/Linux/i.test(ua)) os = "Linux Workstation";

  let browser = "Google Chrome";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Google Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Apple Safari";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  let location = "Colombo, Western Province, LK";
  if (tz.includes("Colombo")) location = "Colombo, Western Province, LK";
  else if (tz.includes("Kandy")) location = "Kandy, Central Province, LK";
  else if (tz.includes("Galle")) location = "Galle, Southern Province, LK";
  else if (tz) location = `${tz.replace(/_/g, " ")}, LK`;

  return {
    id: "current-client-session",
    name: `${os} • ${browser}`,
    location,
    ip: "Current Session",
    lastActive: "Active Now",
    isCurrent: true,
    type,
  };
}

function getDeviceIcon(type: LoggedDeviceItem["type"]) {
  switch (type) {
    case "mobile":
      return <Smartphone className="size-4 text-stat-1" />;
    case "tablet":
      return <Tablet className="size-4 text-stat-1" />;
    case "desktop":
    default:
      return <Laptop className="size-4 text-stat-1" />;
  }
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const { shopNav } = useShopNav();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [devices, setDevices] = React.useState<LoggedDeviceItem[]>([]);
  const [showAllDevices, setShowAllDevices] = React.useState(false);

  React.useEffect(() => {
    if (!profileOpen) return;

    let isMounted = true;

    getUserDevicesAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.devices.length > 0) {
          setDevices(res.devices);
        } else {
          setDevices([getDetectedClientDevice()]);
        }
      })
      .catch((err) => {
        console.error("Failed to load user devices:", err);
        if (isMounted) setDevices([getDetectedClientDevice()]);
      });

    return () => {
      isMounted = false;
    };
  }, [profileOpen]);

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      const res = await revokeDeviceSessionAction(deviceId);
      if (res.success) {
        setDevices((prev) => prev.filter((d) => d.id !== deviceId));
        toast.create({
          title: "Session Terminated",
          description: "Device session has been signed out.",
          type: "info",
        });
      }
    } catch {
      toast.create({
        title: "Action Failed",
        description: "Could not sign out device session.",
        type: "error",
      });
    }
  };

  React.useEffect(() => {
    const handleOpen = () => setProfileOpen(true);
    const handleClose = () => setProfileOpen(false);

    window.addEventListener("newgen-open-profile-dialog", handleOpen);
    window.addEventListener("newgen-close-profile-dialog", handleClose);

    return () => {
      window.removeEventListener("newgen-open-profile-dialog", handleOpen);
      window.removeEventListener("newgen-close-profile-dialog", handleClose);
    };
  }, []);

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
    let url = "/" + segments.slice(0, idx + 1).join("/");
    if (seg === "admin") {
      url = "/dashboard/admin/dashboard";
    } else if (seg === "verifier") {
      url = "/dashboard/verifier/dashboard";
    } else if (seg === "staff") {
      url = "/dashboard/staff/dashboard";
    }
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
                <React.Fragment key={`${item.url}-${index}`}>
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
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("newgen-profile-clicked"));
                }}
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

          <DialogContent
            showCloseButton={false}
            overlayClassName="bg-black/60"
            className="fixed inset-0 z-[105] flex items-center justify-center p-4 sm:p-6 overflow-y-auto outline-none bg-transparent border-0 shadow-none ring-0 w-screen h-screen max-w-none rounded-none"
          >
            {/* Full Viewport WebGL GlassFold Background with sequential line entrance */}
            <GlassFold
              key={profileOpen ? "open" : "closed"}
              interactive={true}
              speed={0.42}
              scale={1.2}
              noise={0.07}
              introDuration={1.6}
              className="absolute inset-0 w-full h-full pointer-events-auto"
            />

            {/* Ambient Darkening Veil for Contrast (Clickable to dismiss backdrop) */}
            <div
              className="absolute inset-0 bg-black/45 dark:bg-black/60 cursor-pointer"
              onClick={() => setProfileOpen(false)}
            />

            {/* Foreground Centered Cards: Smooth 5s Fade Entrance */}
            <div
              className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 max-w-5xl w-full my-auto animate-profile-entrance pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side: Account & Profile Details Card */}
              <div className="w-full max-w-[340px] sm:w-[360px] md:w-[380px] rounded-3xl p-7 sm:p-8 bg-surface/85 dark:bg-[#1e2722]/85 backdrop-blur-2xl border border-muted/30 shadow-2xl relative shrink-0 flex flex-col justify-between">
                <DialogHeader className="space-y-0">
                  <div className="flex items-center justify-between pb-3 border-b border-muted/20">
                    <DialogTitle className="text-2xl font-bold text-foreground">
                      Account
                    </DialogTitle>
                    <DialogClose
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full size-8 hover:bg-muted/20 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        />
                      }
                    >
                      <X className="size-4" />
                      <span className="sr-only">Close</span>
                    </DialogClose>
                  </div>
                </DialogHeader>

                {/* User Profile Info with newgen-logo.png inside the profile card */}
                <div className="flex flex-col items-center text-center pt-2 pb-5">
                  <div className="relative size-24 rounded-full overflow-hidden shrink-0 select-none shadow-md mb-3 border border-muted/20">
                    <Image
                      src="/newgen-logo.png"
                      alt={user.name || "User Avatar"}
                      fill
                      sizes="96px"
                      className="object-contain pointer-events-none"
                      priority
                    />
                  </div>
                  <div className="text-xl font-bold text-foreground truncate w-full">{user.name}</div>
                  <div className="text-sm text-muted-foreground truncate w-full">{user.email}</div>
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stat-1/15 text-stat-1 text-xs font-semibold tracking-wide uppercase">
                    <span className="size-1.5 rounded-full bg-stat-1" />
                    {user.role} {user.shopName ? `• ${user.shopName}` : ""}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    className="w-full justify-between h-14 rounded-2xl bg-surface/60 hover:bg-surface/90 text-foreground border border-muted/20 text-base font-medium px-5 cursor-pointer"
                    render={<Link href={settingsHref} onClick={() => setProfileOpen(false)} />}
                  >
                    <span className="flex items-center gap-3">
                      <Settings className="size-5" />
                      Settings
                    </span>
                    <ArrowUpRight className="size-5" />
                  </Button>

                  {user.role === "ADMIN" && (
                    <Button
                      data-tour="header-changelog"
                      className="w-full justify-between h-14 rounded-2xl bg-surface/60 hover:bg-surface/90 text-foreground border border-muted/20 text-base font-medium px-5 cursor-pointer"
                      render={<Link href="/dashboard/admin/changelog" onClick={() => setProfileOpen(false)} />}
                    >
                      <span className="flex items-center gap-3">
                        <HammerIcon className="size-5 text-text" />
                        <span>Changelog</span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          v2.1.1
                        </span>
                      </span>
                      <ArrowUpRight className="size-5" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setLogoutDialogOpen(true);
                    }}
                    className="w-full justify-between h-14 rounded-2xl border-destructive/40 text-destructive hover:bg-destructive/30 bg-destructive/10 text-base font-medium px-5 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <LogOut className="size-5" />
                      Sign Out
                    </span>
                    <ArrowUpRight className="size-5" />
                  </Button>
                </div>
              </div>

              {/* Right Side: Logged Device Details Card */}
              <div
                data-tour="header-logged-devices"
                className="w-full max-w-[420px] sm:w-[440px] rounded-3xl p-6 sm:p-7 bg-surface/85 dark:bg-[#1e2722]/85 backdrop-blur-2xl border border-muted/30 shadow-2xl relative shrink-0 flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-muted/20">
                    <div className="flex items-center gap-2.5">
                      <Shield className="size-5 text-stat-1" />
                      <h3 className="text-xl font-bold text-foreground">Logged Devices</h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {devices.length} Active {devices.length === 1 ? "Session" : "Sessions"}
                    </span>
                  </div>

                  {/* Device List (Shows 5 by default, expands on 'See more') */}
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 select-none">
                    {(showAllDevices ? devices : devices.slice(0, 5)).map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-2xl bg-surface/50 dark:bg-black/20 border border-muted/20 hover:border-muted/40 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                            {getDeviceIcon(dev.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
                              {dev.name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                              <MapPin className="size-3 text-muted-foreground/70 shrink-0" />
                              <span className="truncate">{dev.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {dev.isCurrent ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Now
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {dev.lastActive}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRevokeDevice(dev.id)}
                                title="Sign out device"
                                className="size-6 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* See More / Show Less Toggle Button */}
                {devices.length > 5 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllDevices((prev) => !prev)}
                    className="w-full justify-center h-10 rounded-2xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface/60 border border-muted/20 cursor-pointer transition-all mt-1"
                  >
                    {showAllDevices ? (
                      <span className="flex items-center gap-1.5">
                        Show Less
                        <ChevronUp className="size-4" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        See More ({devices.length - 5} more {devices.length - 5 === 1 ? "device" : "devices"})
                        <ChevronDown className="size-4" />
                      </span>
                    )}
                  </Button>
                )}
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
