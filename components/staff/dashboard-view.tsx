"use client";

import * as React from "react";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  WalletIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  ClockIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  BuildingIcon,
  AlertTriangleIcon,
  CalendarIcon,
  RefreshCwIcon,
} from "lucide-react";

type Period = "today" | "week" | "month" | "custom";

interface DashboardViewProps {
  initialKpis: {
    totalTransactions: number;
    totalExpense: number;
    totalIncome: number;
    pendingApprovals: number;
    approvedAmount: number;
    rejectedAmount: number;
    netBalance: number;
  };
  initialRecords: any[];
  userShopId: string | null;
  userShopName: string | null;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom Range" },
];

export function StaffDashboardView({
  initialKpis,
  initialRecords,
  userShopId,
  userShopName,
}: DashboardViewProps) {
  const [period, setPeriod] = React.useState<Period>("today");
  const [customStart, setCustomStart] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [customEnd, setCustomEnd] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [kpis, setKpis] = React.useState(initialKpis);
  const [recentRecords, setRecentRecords] = React.useState(initialRecords);
  const [loading, setLoading] = React.useState(false);

  const fetchStats = React.useCallback(
    async (p: Period, start?: string, end?: string) => {
      setLoading(true);
      try {
        const res = await getSummaryAnalyticsAction({
          period: p,
          startDate: p === "custom" ? start : undefined,
          endDate: p === "custom" ? end : undefined,
        });
        if (res.success && res.kpis) {
          setKpis(res.kpis);
          const recs = res.records ? [...res.records].reverse().slice(0, 6) : [];
          setRecentRecords(recs);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (period !== "custom") {
      fetchStats(period);
    }
  }, [period, fetchStats]);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Today";
  const latestBalance = recentRecords.length > 0 ? recentRecords[0].runningBalance || 0 : 0;

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* Warning for unassigned staff */}
      {!userShopId && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
          <AlertTriangleIcon className="size-5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block text-sm">No Branch Assigned</span>
            You are not currently assigned to an operational branch. Please contact an Administrator to assign your branch.
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Branch Finance Overview
            </h1>
            {userShopName && (
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-muted/30 bg-surface/50 text-foreground flex items-center gap-1.5">
                <BuildingIcon className="size-3.5" />
                {userShopName}
              </span>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor daily branch expenditures, fee collections, and verifier approval queues.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/staff/finances"
            className="h-12 rounded-2xl px-6 bg-foreground text-background hover:opacity-90 font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
          >
            <PlusCircleIcon className="size-4" />
            <span>Open Ledger / Record</span>
          </Link>
        </div>
      </div>

      {/* Modern Period Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-2xl bg-surface/40 p-1.5 border border-muted/20 w-fit">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                period === opt.value
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="flex items-center gap-2 flex-wrap bg-surface/30 p-1.5 rounded-2xl border border-muted/20">
            <div className="flex items-center gap-2 pl-2">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 text-xs w-36 font-mono rounded-xl bg-surface/40 border-muted/30"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 text-xs w-36 font-mono rounded-xl bg-surface/40 border-muted/30"
            />
            <Button
              size="sm"
              className="h-9 rounded-xl px-4 text-xs font-semibold bg-foreground text-background hover:opacity-90 cursor-pointer"
              onClick={() => fetchStats("custom", customStart, customEnd)}
              disabled={loading}
            >
              {loading && <RefreshCwIcon className="size-3.5 animate-spin mr-1.5" />}
              Apply
            </Button>
          </div>
        )}

        {loading && period !== "custom" && (
          <RefreshCwIcon className="size-4 text-muted-foreground animate-spin ml-2" />
        )}
      </div>

      {/* Modern KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ledger Balance */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Branch Ledger Balance
            </span>
            <div className="size-10 rounded-2xl bg-surface/40 border border-muted/20 flex items-center justify-center text-foreground">
              <WalletIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <Skeleton className="h-10 w-36 rounded-xl" />
            ) : (
              <div
                className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
                  latestBalance >= 0 ? "text-foreground" : "text-destructive"
                }`}
              >
                LKR {latestBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Current sequential cash balance
            </p>
          </div>
        </div>

        {/* Period Income */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {periodLabel} Income
            </span>
            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <TrendingUpIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <Skeleton className="h-10 w-36 rounded-xl" />
            ) : (
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                LKR {kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Course fees &amp; sales collections
            </p>
          </div>
        </div>

        {/* Period Outflows */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {periodLabel} Outflows
            </span>
            <div className="size-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
              <TrendingDownIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <Skeleton className="h-10 w-36 rounded-xl" />
            ) : (
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                LKR {kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Daily petty expenses &amp; bills
            </p>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Awaiting Verification
            </span>
            <div className="size-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <ClockIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <Skeleton className="h-10 w-20 rounded-xl" />
            ) : (
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                {kpis.pendingApprovals}
              </div>
            )}
            <p className="text-xs text-muted-foreground font-medium">
              Entries in verifier review queue
            </p>
          </div>
        </div>
      </div>

      {/* Recent Records List */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-muted/30 shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Recent Branch Transactions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest financial submissions for {periodLabel.toLowerCase()}
            </p>
          </div>
          <Link
            href="/dashboard/staff/finances"
            className="h-9 px-4 rounded-xl border border-muted/30 bg-surface/30 hover:bg-surface/60 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Ledger</span>
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl border border-muted/20 bg-surface/20 flex items-center justify-between"
              >
                <Skeleton className="h-6 w-48 rounded-lg" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
            ))
          ) : (
            recentRecords.map((rec: any) => (
              <div
                key={rec._id}
                className="glass-card p-4 rounded-2xl border border-muted/20 hover:border-muted/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {rec.billNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(rec.date).toLocaleDateString()} • {rec.paymentMethod}
                    </span>
                  </div>
                  <CategoryBadge name={rec.category?.name || "General"} colorToken={rec.category?.colorToken} />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground truncate max-w-[200px] block" title={rec.reason}>
                    {rec.reason}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold whitespace-nowrap ${
                      rec.type === "INCOME" ? "text-emerald-500" : "text-foreground"
                    }`}
                  >
                    {rec.type === "INCOME" ? "+" : "-"} LKR {Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <StatusBadge status={rec.status} />
                </div>
              </div>
            ))
          )}

          {!loading && recentRecords.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No transactions found for {periodLabel.toLowerCase()}. Click &quot;Open Ledger&quot; to record your first transaction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
