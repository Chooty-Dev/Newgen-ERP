"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/actions/auth";
import { switchActiveShopAction } from "@/actions/users";
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
  LayoutDashboard,
  BarChart3,
  Users,
  Tags,
  Building2,
  Receipt,
  CheckCheck,
  Settings,
  Landmark,
  LogOut,
  Wallet,
  History,
  ArrowLeftRight,
  Package,
  Loader2,
  ArrowUpRight,
  ArrowLeft,
  ShoppingBag,
  Zap,
  AlertTriangle,
  Coins,
  UserCheck,
  Scale,
} from "lucide-react";
import { useShopNav, ShopTabId } from "@/components/shared/shop-nav-context";

interface AppSidebarProps {
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

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { shopNav } = useShopNav();
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isSwitchingShop, setIsSwitchingShop] = React.useState(false);
  const [selectedShopId, setSelectedShopId] = React.useState(user.shop || "");

  React.useEffect(() => {
    if (user.shop) {
      setSelectedShopId(user.shop);
    }
  }, [user.shop]);

  const handleShopChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newShopId = e.target.value;
    if (!newShopId || newShopId === user.shop || isSwitchingShop) return;

    setSelectedShopId(newShopId);
    setIsSwitchingShop(true);

    try {
      const res = await switchActiveShopAction(newShopId);
      if (res.success) {
        toast.create({
          title: "Branch updated",
          description: `Active branch: ${res.shopName}`,
        });
        router.refresh();
      } else {
        setSelectedShopId(user.shop || "");
        toast.create({
          title: "Error",
          description: res.error || "Could not switch branch.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to switch branch:", err);
      setSelectedShopId(user.shop || "");
      toast.create({
        title: "Error",
        description: "Failed to switch branch.",
        type: "error",
      });
    } finally {
      setIsSwitchingShop(false);
    }
  };

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

  const adminNav = [
    { title: "Dashboard", href: "/dashboard/admin/dashboard", icon: LayoutDashboard },
    { title: "Transactions", href: "/dashboard/admin/transactions", icon: ArrowLeftRight },
    { title: "Petty Cash", href: "/dashboard/admin/petty-cash", icon: Wallet },
    { title: "Bank Accounts", href: "/dashboard/admin/bank-accounts", icon: Landmark },
    { title: "Summary", href: "/dashboard/admin/summary", icon: BarChart3 },
    { title: "Branches", href: "/dashboard/admin/shops", icon: Building2 },
    { title: "Categories", href: "/dashboard/admin/categories", icon: Tags },
    { title: "Users", href: "/dashboard/admin/users", icon: Users },
    { title: "Audit Trail", href: "/dashboard/admin/audit", icon: History },
    { title: "Settings", href: "/dashboard/admin/settings", icon: Settings },
  ];

  const currentShopId = selectedShopId || user.shop;
  const activeShop = user.shops?.find((s) => s._id === currentShopId);
  const isInventoryShop = activeShop?.shopType === "INVENTORY";

  const staffNav = isInventoryShop
    ? [
      { title: "Dashboard", href: "/dashboard/staff/dashboard", icon: LayoutDashboard },
      { title: "Inventory", href: "/dashboard/staff/inventory", icon: Package },
      { title: "Settings", href: "/dashboard/staff/settings", icon: Settings },
    ]
    : [
      { title: "Dashboard", href: "/dashboard/staff/dashboard", icon: LayoutDashboard },
      { title: "Finances", href: "/dashboard/staff/finances", icon: Receipt },
      { title: "Settings", href: "/dashboard/staff/settings", icon: Settings },
    ];

  const verifierNav = [
    { title: "Dashboard", href: "/dashboard/verifier/dashboard", icon: LayoutDashboard },
    { title: "Verify Records", href: "/dashboard/verifier/records", icon: CheckCheck },
    { title: "Settings", href: "/dashboard/verifier/settings", icon: Settings },
  ];

  const isSingleShopRoute = pathname.startsWith("/dashboard/admin/shops/") && pathname !== "/dashboard/admin/shops";

  const shopNavItems = React.useMemo(() => {
    if (!shopNav) return [];

    // 1. Warehouse / Inventory Shop
    if (shopNav.isInventoryOnly) {
      return [
        {
          key: "overview" as ShopTabId,
          title: "Overview & Stats",
          icon: LayoutDashboard,
        },
        {
          key: "inventory" as ShopTabId,
          title: "Inventory Items",
          icon: Package,
          count: shopNav.counts?.inventory,
        },
        {
          key: "inventoryHistory" as ShopTabId,
          title: "Usage History",
          icon: History,
        },
        {
          key: "staff" as ShopTabId,
          title: "Assigned Staff",
          icon: UserCheck,
          count: shopNav.counts?.staff,
        },
      ];
    }

    // 2. Communication Shop
    if (shopNav.isCommunication) {
      return [
        {
          key: "overview" as ShopTabId,
          title: "Overview & Analytics",
          icon: LayoutDashboard,
        },
        {
          key: "itemSales" as ShopTabId,
          title: "Item-Wise Sales",
          icon: ShoppingBag,
        },
        {
          key: "items" as ShopTabId,
          title: "Products & Services",
          icon: Package,
          count: shopNav.counts?.inventory,
        },
        {
          key: "utilityBills" as ShopTabId,
          title: "Utility Bill Payments",
          icon: Zap,
          count: shopNav.counts?.utilityBills,
        },
        {
          key: "wastage" as ShopTabId,
          title: "Wastage & Damage",
          icon: AlertTriangle,
        },
        {
          key: "credits" as ShopTabId,
          title: "Credit Customers",
          icon: Users,
          count: shopNav.counts?.credit,
        },
        {
          key: "dailySettlement" as ShopTabId,
          title: "Daily Settlement",
          icon: Coins,
        },
        {
          key: "discrepancies" as ShopTabId,
          title: "Discrepancy Manager",
          icon: Scale,
        },
        {
          key: "staff" as ShopTabId,
          title: "Assigned Staff",
          icon: UserCheck,
          count: shopNav.counts?.staff,
        },
      ];
    }

    // 3. Standard Retail Branches (non-communication, non-inventory)
    return [
      {
        key: "overview" as ShopTabId,
        title: "Overview & Analytics",
        icon: LayoutDashboard,
      },
      {
        key: "staff" as ShopTabId,
        title: "Assigned Staff",
        icon: UserCheck,
        count: shopNav.counts?.staff,
      },
    ];
  }, [shopNav]);

  if (isSingleShopRoute) {
    return (
      <Sidebar className="border-none bg-background text-foreground">
        {/* Brand Header & Back Button */}
        <SidebarHeader className="p-5 space-y-4">
          <Link
            href="/dashboard/admin/shops"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to All Branches</span>
          </Link>

          <div className="rounded-2xl bg-surface/50 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-foreground truncate">
                {shopNav?.shopName || "Branch Workspace"}
              </span>
              {shopNav?.shopCode && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface/70 text-foreground shrink-0">
                  {shopNav.shopCode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {shopNav?.isCommunication
                  ? "Communication Branch"
                  : shopNav?.isInventoryOnly
                    ? "Warehouse / Inventory"
                    : "Retail / Standard Branch"}
              </span>
            </div>
          </div>
        </SidebarHeader>

        {/* Navigation List for Branch Tabs */}
        <SidebarContent className="p-4 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1.5">
                {shopNavItems.map((item) => {
                  const isActive = shopNav?.activeTab === item.key;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.key}>
                      <button
                        type="button"
                        onClick={() => {
                          if (shopNav) {
                            shopNav.setActiveTab(item.key);
                            if (typeof window !== "undefined") {
                              const url = new URL(window.location.href);
                              url.searchParams.set("tab", item.key);
                              window.history.replaceState({}, "", url.toString());
                            }
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition-all text-left ${
                          isActive
                            ? "bg-surface/70 text-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:bg-surface/40 hover:text-foreground font-medium"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="size-4 shrink-0 text-foreground" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.count !== undefined && item.count > 0 && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface/70 text-foreground shrink-0 ml-2">
                            {item.count}
                          </span>
                        )}
                      </button>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer Area with Sign Out */}
        <SidebarFooter className="p-5 space-y-4">
          <button
            type="button"
            onClick={() => setLogoutDialogOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold text-black dark:text-white bg-red-500/20 hover:text-white hover:bg-red-500 transition-colors group"
          >
            <span className="flex items-center gap-3">
              <LogOut className="size-5" />
              Sign Out
            </span>
          </button>
        </SidebarFooter>

        {/* Sign Out Alert Dialog */}
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
      </Sidebar>
    );
  }

  const navItems =
    user.role === "ADMIN"
      ? adminNav
      : user.role === "VERIFIER"
        ? verifierNav
        : staffNav;

  return (
    <Sidebar className="border-none bg-background text-foreground">
      {/* Brand Header */}
      <SidebarHeader className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Landmark className="size-6 text-foreground" />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Newgen ERP
          </span>
        </Link>
      </SidebarHeader>

      {/* Navigation List */}
      <SidebarContent className="p-4 flex flex-col justify-between overflow-y-auto no-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-base transition-all ${isActive
                        ? "bg-surface/70 text-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:bg-surface/40 hover:text-foreground font-medium"
                        }`}
                    >
                      <Icon className="size-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Area */}
      <SidebarFooter className="p-5 space-y-4">
        {/* Branch Selector if multiple */}
        {user.shops && user.shops.length > 1 && (
          <div className="relative">
            <select
              value={selectedShopId}
              onChange={handleShopChange}
              disabled={isSwitchingShop}
              className="w-full h-12 rounded-2xl bg-surface/40 text-foreground px-4 text-sm font-semibold outline-none transition-colors cursor-pointer disabled:opacity-60 pr-8"
            >
              {user.shops.map((s) => (
                <option key={s._id} value={s._id} className="bg-surface text-foreground font-medium">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            {isSwitchingShop && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Loader2 className="size-4 animate-spin text-foreground" />
              </div>
            )}
          </div>
        )}

        {/* Minimal Sign Out Button */}
        <button
          type="button"
          onClick={() => setLogoutDialogOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold text-black dark:text-white bg-red-500/20 hover:text-white hover:bg-red-500 transition-colors group"
        >
          <span className="flex items-center gap-3">
            <LogOut className="size-5" />
            Sign Out
          </span>
        </button>
      </SidebarFooter>

      {/* Sign Out Alert Dialog */}
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
    </Sidebar>
  );
}
