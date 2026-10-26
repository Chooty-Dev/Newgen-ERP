"use client";

import React from "react";
import {
  ZapIcon,
  RefreshCwIcon,
  DownloadIcon,
  CalendarIcon,
  ReceiptIcon,
  WalletIcon,
  DollarSignIcon,
  TrendingUpIcon,
  DropletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface ShopUtilityBillsTabProps {
  utilityAnalytics: {
    totalBillsCount: number;
    totalCollected: number;
    totalBillAmount: number;
    totalServiceCharges: number;
    totalProviderFees: number;
    totalNetProfit: number;
    breakdown: {
      electricity: { count: number; amount: number; profit: number };
      water: { count: number; amount: number; profit: number };
      other: { count: number; amount: number; profit: number };
    };
    records: any[];
  };
  utilityPeriod: "today" | "week" | "month" | "year" | "custom";
  setUtilityPeriod: (p: "today" | "week" | "month" | "year" | "custom") => void;
  utilityStartDate: string;
  setUtilityStartDate: (d: string) => void;
  utilityEndDate: string;
  setUtilityEndDate: (d: string) => void;
  utilityLoading: boolean;
  fetchUtilityData: () => void;
  handleExportCSV: () => void;
  staff: Array<{ _id: string; name: string }>;
  columns: ColumnDef<any>[];
}

export function ShopUtilityBillsTab({
  utilityAnalytics,
  utilityPeriod,
  setUtilityPeriod,
  utilityStartDate,
  setUtilityStartDate,
  utilityEndDate,
  setUtilityEndDate,
  utilityLoading,
  fetchUtilityData,
  handleExportCSV,
  staff,
  columns,
}: ShopUtilityBillsTabProps) {
  const [billTypeFilter, setBillTypeFilter] = React.useState<"ALL" | "ELECTRICITY" | "WATER" | "OTHER">("ALL");
  const [staffFilter, setStaffFilter] = React.useState<string>("ALL");

  const filteredRecords = React.useMemo(() => {
    let list = utilityAnalytics.records || [];
    if (billTypeFilter !== "ALL") {
      list = list.filter((r) => r.utilityBillType === billTypeFilter);
    }
    if (staffFilter !== "ALL") {
      list = list.filter((r) => r.createdBy?._id === staffFilter || r.createdBy === staffFilter);
    }
    return list;
  }, [utilityAnalytics.records, billTypeFilter, staffFilter]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col gap-6 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <ZapIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Utility Bill Payments &amp; Fee Earnings
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Light Bill (Electricity) &amp; Water Bill payments collected at this branch with fee deductions and net profit tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-2xl border border-muted/30 bg-surface/40 p-1.5 gap-1">
            {(["today", "week", "month", "year", "custom"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="xs"
                onClick={() => setUtilityPeriod(p)}
                className={`text-xs capitalize h-9 px-3.5 rounded-xl font-semibold transition-all ${
                  utilityPeriod === p
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "week"
                  ? "This Week"
                  : p === "month"
                  ? "This Month"
                  : p === "year"
                  ? "This Year"
                  : "Custom Range"}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={fetchUtilityData}
            disabled={utilityLoading}
            className="h-12 px-4 rounded-xl border border-muted/30 gap-2 text-xs font-semibold"
          >
            <RefreshCwIcon className={`size-3.5 ${utilityLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-12 px-5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 gap-2 text-xs"
          >
            <DownloadIcon className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {utilityPeriod === "custom" && (
        <div className="glass-card p-4 rounded-2xl border border-muted/30 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="size-4 text-foreground" />
            <span>Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={utilityStartDate}
              onChange={(e) => setUtilityStartDate(e.target.value)}
              className="h-11 text-xs w-40 rounded-xl border border-muted/30 bg-background/50"
            />
            <span className="text-xs text-muted-foreground font-mono">to</span>
            <Input
              type="date"
              value={utilityEndDate}
              onChange={(e) => setUtilityEndDate(e.target.value)}
              className="h-11 text-xs w-40 rounded-xl border border-muted/30 bg-background/50"
            />
            <Button
              onClick={fetchUtilityData}
              className="h-11 text-xs font-semibold px-4 rounded-xl bg-foreground text-background hover:opacity-90"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}

      {/* 4 Spacious KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Bill Volume
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(utilityAnalytics.totalBillAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Across {utilityAnalytics.totalBillsCount} bill{utilityAnalytics.totalBillsCount !== 1 ? "s" : ""} processed
              </p>
            </div>
            <ReceiptIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Customer Collected
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(utilityAnalytics.totalCollected || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Added into physical cash drawer
              </p>
            </div>
            <WalletIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Provider Cost Fees
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-destructive">
                LKR {Number(utilityAnalytics.totalProviderFees || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cost fees deducted per bill transaction
              </p>
            </div>
            <DollarSignIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shop Net Profit
              </span>
              <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
                +LKR {Number(utilityAnalytics.totalNetProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Service charges minus cost fees
              </p>
            </div>
            <TrendingUpIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center justify-between p-5 rounded-2xl border border-muted/30 bg-surface/40">
          <div className="flex items-center gap-3.5">
            <ZapIcon className="size-5 text-foreground shrink-0" />
            <div>
              <span className="text-xs font-bold text-foreground block">Light / Electricity</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {utilityAnalytics.breakdown.electricity.count} bills • LKR {Number(utilityAnalytics.breakdown.electricity.amount).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-foreground block font-mono">
              +LKR {utilityAnalytics.breakdown.electricity.profit.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Profit</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border border-muted/30 bg-surface/40">
          <div className="flex items-center gap-3.5">
            <DropletIcon className="size-5 text-foreground shrink-0" />
            <div>
              <span className="text-xs font-bold text-foreground block">Water Board (NWSDB)</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {utilityAnalytics.breakdown.water.count} bills • LKR {Number(utilityAnalytics.breakdown.water.amount).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-foreground block font-mono">
              +LKR {utilityAnalytics.breakdown.water.profit.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Profit</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-5 rounded-2xl border border-muted/30 bg-surface/40">
          <div className="flex items-center gap-3.5">
            <ReceiptIcon className="size-5 text-foreground shrink-0" />
            <div>
              <span className="text-xs font-bold text-foreground block">Other Utility</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {utilityAnalytics.breakdown.other.count} bills • LKR {Number(utilityAnalytics.breakdown.other.amount).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-foreground block font-mono">
              +LKR {utilityAnalytics.breakdown.other.profit.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase font-sans">Profit</span>
          </div>
        </div>
      </div>

      {/* Utility Bill Payments Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={filteredRecords}
            searchKey="billNumber"
            searchPlaceholder="Search by bill receipt #..."
            loading={utilityLoading}
            filterComponent={
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={billTypeFilter}
                  onChange={(e: any) => setBillTypeFilter(e.target.value)}
                  className="h-14 rounded-2xl border border-muted/30 bg-surface/40 px-4 text-xs font-semibold text-foreground outline-none focus:border-foreground/50 transition-colors"
                >
                  <option value="ALL">All Bill Types</option>
                  <option value="ELECTRICITY">⚡ Light Bills (Electricity)</option>
                  <option value="WATER">💧 Water Bills (NWSDB)</option>
                  <option value="OTHER">📋 Other Utility</option>
                </select>

                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="h-14 rounded-2xl border border-muted/30 bg-surface/40 px-4 text-xs font-semibold text-foreground outline-none focus:border-foreground/50 transition-colors"
                >
                  <option value="ALL">All Officers</option>
                  {staff.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            }
          />
        </CardContent>

        {/* Aggregate Footer Summary */}
        {utilityAnalytics.records.length > 0 && (
          <div className="border-t border-muted/20 bg-surface/30 p-6 flex flex-wrap items-center justify-between gap-6 text-xs font-mono">
            <span className="font-sans font-semibold text-sm text-foreground">
              Aggregate Total ({utilityAnalytics.records.length} Bills Processed)
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans uppercase">Total Bill Value</span>
                <span className="font-bold text-foreground text-sm">
                  LKR {utilityAnalytics.totalBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans uppercase">Service Fee</span>
                <span className="font-bold text-foreground text-sm">
                  +LKR {utilityAnalytics.totalServiceCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans uppercase">Provider Fee</span>
                <span className="font-bold text-destructive text-sm">
                  -LKR {utilityAnalytics.totalProviderFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans uppercase">Customer Paid</span>
                <span className="font-bold text-foreground text-sm">
                  LKR {utilityAnalytics.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] font-sans uppercase">Net Shop Profit</span>
                <span className="font-extrabold text-foreground text-base">
                  +LKR {utilityAnalytics.totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
