"use client";

import React from "react";
import Link from "next/link";
import {
  Building2Icon,
  WalletIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopHeaderBannerProps {
  shop: {
    _id: string;
    name: string;
    code: string;
    shopType?: string;
  };
  stats: {
    currentBalance: number;
    totalCustomerCredit?: number;
    inventoryItemCount?: number;
    creditCustomerCount?: number;
  };
  commAnalytics?: {
    totalRevenue: number;
    totalTransactions: number;
  };
  staffCount: number;
  isCommunication: boolean;
  isInventoryShop: boolean;
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

export function ShopHeaderBanner({
  shop,
  stats,
  commAnalytics,
  staffCount,
  isCommunication,
  isInventoryShop,
  onRefresh,
  refreshLoading,
}: ShopHeaderBannerProps) {
  const currentCash = Number(stats.currentBalance || 0);
  const outstandingCredit = Number(stats.totalCustomerCredit || 0);

  return (
    <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 shadow-xs">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Branch Identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-3.5">
            <Building2Icon className="size-8 text-foreground shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                {shop.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono font-bold px-2.5 py-0.5 rounded-lg border border-muted/30 bg-surface/50 text-foreground">
                  {shop.code}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-muted/30 bg-surface/40 text-foreground font-semibold">
                  <span className="size-1.5 rounded-full bg-foreground" />
                  {isCommunication
                    ? "COMMUNICATION BRANCH"
                    : isInventoryShop
                    ? "CENTRAL WAREHOUSE / INVENTORY"
                    : "STANDARD RETAIL BRANCH"}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <PackageIcon className="size-3.5" />
                  {stats.inventoryItemCount || 0} Registered Items
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <UsersIcon className="size-3.5" />
                  {staffCount} Officers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Branch Financial Balances */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Drawer Cash in Hand */}
          <div className="p-4 rounded-2xl border border-muted/30 bg-surface/40 min-w-[200px] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Drawer Cash In Hand
              </span>
              <div
                className={`text-xl md:text-2xl font-bold font-mono tracking-tight ${
                  currentCash >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                LKR {currentCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
            <WalletIcon className="size-5 text-foreground shrink-0" />
          </div>

          {/* Outstanding Customer Credit */}
          {isCommunication && (
            <div className="p-4 rounded-2xl border border-muted/30 bg-surface/40 min-w-[200px] flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Customer Debt Balance
                </span>
                <div className="text-xl md:text-2xl font-bold font-mono tracking-tight text-foreground">
                  LKR {outstandingCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <CreditCardIcon className="size-5 text-foreground shrink-0" />
            </div>
          )}

          {/* Quick Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={refreshLoading}
              className="size-14 rounded-2xl border border-muted/30 hover:border-foreground/40 transition-colors shrink-0"
              title="Refresh branch data"
            >
              <RefreshCwIcon className={`size-5 text-foreground ${refreshLoading ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
