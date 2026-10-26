"use client";

import React from "react";
import {
  WalletIcon,
  CreditCardIcon,
  ReceiptIcon,
  Building2Icon,
  HandCoinsIcon,
  RefreshCwIcon,
  DownloadIcon,
  CalendarIcon,
  CoinsIcon,
  TrendingUpIcon,
  DollarSignIcon,
  CheckCircle2Icon,
  NetworkIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface ShopOverviewTabProps {
  shop: any;
  stats: any;
  commAnalytics: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    totalDebtRepayments?: number;
    cashDebtRepayments?: number;
    totalTransactions: number;
    branchRelatedCount: number;
    nonBranchCount: number;
    records: any[];
    itemBreakdown: any[];
    periodCashInflow?: number;
    periodCashOutflow?: number;
    periodCashBalance?: number;
    periodClosingCashBalance?: number;
  };
  analytics: {
    kpis: {
      totalCashInflow?: number;
      totalCashOutflow?: number;
      totalIncome?: number;
      totalExpense?: number;
      netBalance: number;
      totalTransactions: number;
      periodCashInflow?: number;
      periodCashOutflow?: number;
      periodCashBalance?: number;
      periodClosingCashBalance?: number;
    };
    records: any[];
    categoryBreakdown: any[];
  };
  isCommunication: boolean;
  isInventoryShop: boolean;
  period: "today" | "week" | "month" | "year" | "custom";
  setPeriod: (p: "today" | "week" | "month" | "year" | "custom") => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  loading: boolean;
  onRefresh: () => void;
  onExportCSV: () => void;
  onOpenSettleModal: (due: any) => void;
  commColumns: ColumnDef<any>[];
  standardColumns: ColumnDef<any>[];
}

export function ShopOverviewTab({
  shop,
  stats,
  commAnalytics,
  analytics,
  isCommunication,
  isInventoryShop,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  loading,
  onRefresh,
  onExportCSV,
  onOpenSettleModal,
  commColumns,
  standardColumns,
}: ShopOverviewTabProps) {
  // Margin computation
  const marginPct = commAnalytics.totalRevenue > 0
    ? ((commAnalytics.netProfit / commAnalytics.totalRevenue) * 100).toFixed(1)
    : "0";

  const [showAllItems, setShowAllItems] = React.useState(false);

  return (
    <div className="space-y-8">
      {/* 1. Primary Financial Overview Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Cash Balance */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isCommunication ? "Cash Drawer Balance" : "Current Cash Balance"}
            </span>
            <WalletIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-4">
            <div
              className={`text-2xl md:text-3xl font-bold font-mono tracking-tight ${
                (stats.currentBalance || 0) >= 0 ? "text-foreground" : "text-destructive"
              }`}
            >
              LKR {Number(stats.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {isCommunication
                ? "Physical cash retained in this branch drawer"
                : "Active branch balance"}
            </p>
          </div>
        </div>

        {/* Credit Customer Balance */}
        {isCommunication && (
          <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Customer Credit
              </span>
              <CreditCardIcon className="size-5 text-foreground shrink-0" />
            </div>
            <div className="mt-4">
              <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(stats.totalCustomerCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Across {stats.creditCustomerCount || 0} active credit accounts
              </p>
            </div>
          </div>
        )}

        {/* Total Lifetime Transactions */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              All-Time Transactions
            </span>
            <ReceiptIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-4">
            <div className="text-2xl md:text-3xl font-bold font-mono tracking-tight text-foreground">
              {Number(stats.recordsCount || commAnalytics.totalTransactions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {stats.pendingCount || 0} pending audit verification
            </p>
          </div>
        </div>
      </div>

      {/* 2. Inter-Branch Cash Settlement Dues */}
      {(() => {
        const interBranchDues = stats?.interBranchDues;
        const holdingForOthers: any[] = Array.isArray(interBranchDues?.holdingForOthers)
          ? interBranchDues.holdingForOthers
          : [];
        const owedFromOthers: any[] = Array.isArray(interBranchDues?.owedFromOthers)
          ? interBranchDues.owedFromOthers
          : Array.isArray(interBranchDues?.owedByOthers)
          ? interBranchDues.owedByOthers
          : [];
        const totalHolding = Number(interBranchDues?.totalHolding || 0);
        const totalOwed = Number(
          interBranchDues?.totalOwed !== undefined
            ? interBranchDues.totalOwed
            : interBranchDues?.totalOwedToThisShop || 0
        );

        if (!interBranchDues || (holdingForOthers.length === 0 && owedFromOthers.length === 0)) {
          return null;
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2Icon className="size-5 text-foreground" />
              <h3 className="text-base font-bold text-foreground">Inter-Branch Cash Liabilities &amp; Receivables</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Cash This Branch Is Holding for Other Branches */}
              <div className="glass-card p-6 rounded-3xl border border-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Holding for Other Branches</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Physical cash collected at {shop.name} for transactions belonging to other branches.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted-foreground uppercase block text-[10px]">Total Due</span>
                    <span className="text-base font-bold font-mono text-foreground">
                      LKR {totalHolding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {holdingForOthers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No outstanding cash held for other branches.</p>
                ) : (
                  <div className="space-y-2.5">
                    {holdingForOthers.map((due: any) => (
                      <div
                        key={due.shopId}
                        className="flex items-center justify-between p-4 rounded-2xl border border-muted/30 bg-surface/40 hover:bg-surface/60 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground">
                            {due.shopName}{" "}
                            <span className="font-mono font-normal text-muted-foreground text-[11px]">({due.shopCode})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {due.count} transaction{due.count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold font-mono text-foreground">
                            LKR {Number(due.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <Button
                            size="xs"
                            onClick={() => onOpenSettleModal(due)}
                            className="h-8 px-3 rounded-xl bg-foreground text-background font-semibold text-xs hover:opacity-90 gap-1.5"
                          >
                            <HandCoinsIcon className="size-3.5" />
                            Settle
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cash Other Branches Are Holding for This Branch */}
              <div className="glass-card p-6 rounded-3xl border border-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Receivables from Other Branches</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Payments collected at other branches for products or debts issued by {shop.name}.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-muted-foreground uppercase block text-[10px]">Total Receivable</span>
                    <span className="text-base font-bold font-mono text-foreground">
                      LKR {totalOwed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {owedFromOthers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No pending cash receivables from other branches.</p>
                ) : (
                  <div className="space-y-2.5">
                    {owedFromOthers.map((due: any) => (
                      <div
                        key={due.shopId}
                        className="flex items-center justify-between p-4 rounded-2xl border border-muted/30 bg-surface/40"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-foreground">
                            {due.shopName}{" "}
                            <span className="font-mono font-normal text-muted-foreground text-[11px]">({due.shopCode})</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {due.count} transaction{due.count !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <span className="text-xs font-bold font-mono text-foreground">
                          LKR {Number(due.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. Period Filter and Actions Bar */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col gap-6 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="space-y-1.5">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Financial Analytics &amp; Ledger
          </h3>
          <p className="text-xs text-muted-foreground">
            Aggregated period metrics, profit analytics, and sequential audit trail for {shop.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Pills */}
          <div className="flex items-center rounded-2xl border border-muted/30 bg-surface/40 p-1.5 gap-1">
            {(["today", "week", "month", "year", "custom"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="xs"
                onClick={() => setPeriod(p)}
                className={`text-xs capitalize h-9 px-3.5 rounded-xl font-semibold transition-all ${
                  period === p
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
            onClick={onRefresh}
            disabled={loading}
            className="h-12 px-4 rounded-xl border border-muted/30 gap-2 text-xs font-semibold"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={onExportCSV}
            className="h-12 px-5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 gap-2 text-xs"
          >
            <DownloadIcon className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === "custom" && (
        <div className="glass-card p-4 rounded-2xl border border-muted/30 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="size-4 text-foreground" />
            <span>Custom Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 text-xs w-48 rounded-xl border border-muted/30 bg-background/50"
            />
            <span className="text-xs text-muted-foreground font-mono">to</span>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 text-xs w-48 rounded-xl border border-muted/30 bg-background/50"
            />
            <Button
              onClick={onRefresh}
              className="h-11 text-xs font-semibold px-4 rounded-xl bg-foreground text-background hover:opacity-90"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}

      {/* 4. SPACIOUS, CLEAR KPI STATS GRID (Redesigned from cramped strip) */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
          Key Performance Indicators ({period.toUpperCase()})
        </span>

        {isCommunication ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Sales Revenue */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Sales Revenue
                </span>
                <DollarSignIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {commAnalytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Customer payments collected
              </p>
            </Card>

            {/* Card 2: Wholesale Procurement Cost */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Wholesale Procurement Cost
                </span>
                <ReceiptIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {commAnalytics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Base procurement &amp; stock cost
              </p>
            </Card>

            {/* Card 3: Total Net Profit */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Net Profit
                </span>
                <TrendingUpIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-extrabold font-mono tracking-tight text-foreground">
                +LKR {commAnalytics.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Revenue minus actual wholesale cost
              </p>
            </Card>

            {/* Card 4: Profit Margin % */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Profit Margin
                </span>
                <CoinsIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-extrabold font-mono tracking-tight text-foreground">
                {marginPct}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Overall return on sales
              </p>
            </Card>

            {/* Card 5: Direct Walk-In Sales */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Direct / Walk-In Sales
                </span>
                <CheckCircle2Icon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                {commAnalytics.nonBranchCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Auto-approved immediate walk-in transactions
              </p>
            </Card>

            {/* Card 6: Branch Related Sales */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Branch Related Sales
                </span>
                <NetworkIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                {commAnalytics.branchRelatedCount}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cross-campus transactions requiring verification
              </p>
            </Card>

            {/* Card 7: Period Closing Cash Balance */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Closing Cash Balance
                </span>
                <WalletIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div
                className={`mt-3 text-2xl font-bold font-mono tracking-tight ${
                  Number(commAnalytics.periodClosingCashBalance || 0) >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                LKR {Number(commAnalytics.periodClosingCashBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Physical drawer balance at end of selected period
              </p>
            </Card>

            {/* Card 8: Debt Collections (Non-Sales) */}
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Debt Collections
                </span>
                <HandCoinsIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(commAnalytics.totalDebtRepayments || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Credit debts paid (Excluded from sales revenue)
              </p>
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Cash Inflow
                </span>
                <DollarSignIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(analytics.kpis.totalCashInflow ?? analytics.kpis.totalIncome ?? 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">All recorded branch collections</p>
            </Card>

            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Cash Outflow
                </span>
                <ReceiptIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(analytics.kpis.totalCashOutflow ?? analytics.kpis.totalExpense ?? 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Payments &amp; expenses logged</p>
            </Card>

            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Net Period Flow
                </span>
                <TrendingUpIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div
                className={`mt-3 text-2xl font-bold font-mono tracking-tight ${
                  analytics.kpis.netBalance >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                LKR {analytics.kpis.netBalance.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Inflows minus outflows</p>
            </Card>

            <Card className="glass-card p-6 rounded-3xl border border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Transactions Count
                </span>
                <ReceiptIcon className="size-5 text-foreground shrink-0" />
              </div>
              <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
                {analytics.kpis.totalTransactions}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Total recorded transactions in period</p>
            </Card>
          </div>
        )}
      </div>

      {/* 5. Item-Wise Sales & Profit Breakdown Table (Communication Shops) */}
      {isCommunication && commAnalytics.itemBreakdown.length > 0 && (() => {
        const hasMore = commAnalytics.itemBreakdown.length > 15;
        const visibleItems = showAllItems
          ? commAnalytics.itemBreakdown
          : commAnalytics.itemBreakdown.slice(0, 15);

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Item-Wise Sales &amp; Profit Breakdown</h3>
              <span className="text-xs text-muted-foreground font-mono">
                {showAllItems
                  ? `${commAnalytics.itemBreakdown.length} items recorded (showing all)`
                  : `Showing 15 of ${commAnalytics.itemBreakdown.length} items`}
              </span>
            </div>

            <div className="relative">
              <div className="overflow-x-auto rounded-3xl border border-muted/30 glass-card">
                <table className="w-full text-xs">
                  <thead className="bg-surface/50 border-b border-muted/20 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 text-left">Code</th>
                      <th className="py-3.5 px-4 text-left">Item Name</th>
                      <th className="py-3.5 px-4 text-right">Qty Sold</th>
                      <th className="py-3.5 px-4 text-right">Total Revenue</th>
                      <th className="py-3.5 px-4 text-right">Total Cost</th>
                      <th className="py-3.5 px-4 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/20">
                    {visibleItems.map((row) => (
                      <tr key={row.itemCode} className="hover:bg-surface/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          <span className="px-2.5 py-1 rounded-lg border border-muted/30 bg-background/50">
                            {row.itemCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">{row.itemName}</td>
                        <td className="py-3.5 px-4 font-mono text-right font-semibold text-foreground">{row.quantity}</td>
                        <td className="py-3.5 px-4 font-mono text-right font-semibold text-foreground">
                          LKR {Number(row.revenue || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right text-muted-foreground">
                          LKR {Number(row.cost || 0).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-right font-bold text-foreground">
                          +LKR {Number(row.profit || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Fade Gradient when collapsed */}
              {!showAllItems && hasMore && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-3xl bg-gradient-to-t from-background via-background/60 to-transparent" />
              )}
            </div>

            {/* Show More / Show Less Button */}
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAllItems((prev) => !prev)}
                  className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-xs font-semibold text-foreground gap-2 transition-all shadow-xs"
                >
                  <span>
                    {showAllItems
                      ? "Show Less"
                      : `Show More (${commAnalytics.itemBreakdown.length - 15} more items)`}
                  </span>
                  {showAllItems ? (
                    <ChevronUp className="size-4 text-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-foreground" />
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 6. Sequential Transactions Ledger */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {isCommunication ? "Communication Sales Ledger" : "Branch Ledger Records"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isCommunication
              ? "Sequential chronological transactions, base cost deductions, and verification audit statuses"
              : "Sequential chronological ledger for this branch"}
          </p>
        </div>

        <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
          <div className="p-6">
            <DataTable
              columns={isCommunication ? commColumns : standardColumns}
              data={isCommunication ? commAnalytics.records : analytics.records}
              searchKey={isCommunication ? "itemName" : "reason"}
              searchPlaceholder="Filter records..."
              loading={loading}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
