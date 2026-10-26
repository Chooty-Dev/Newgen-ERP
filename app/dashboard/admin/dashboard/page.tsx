import { auth } from "@/auth";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { getShopsAction } from "@/actions/shops";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export default async function AdminDashboardPage() {
  await auth();
  const [analyticsRes, shopsRes] = await Promise.all([
    getSummaryAnalyticsAction({ period: "month" }),
    getShopsAction(),
  ]);

  const kpis = analyticsRes.success && analyticsRes.kpis ? analyticsRes.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const shops = shopsRes.success && shopsRes.shops ? shopsRes.shops : [];
  const recentRecords = analyticsRes.records ? analyticsRes.records.slice(-6).reverse() : [];

  return (
    <div className="space-y-12">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-base text-muted-foreground">
            Executive Ledger & Branch Operations
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            render={<Link href="/dashboard/admin/summary" />}
            className="h-14 rounded-2xl bg-surface/50 hover:bg-surface/80 border border-muted/20 text-foreground text-base font-semibold px-6 justify-between gap-3"
          >
            <span>Summary</span>
            <ArrowUpRight className="size-5" />
          </Button>

          <Button
            render={<Link href="/dashboard/admin/transactions" />}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 justify-between gap-3"
          >
            <span>Transactions</span>
            <ArrowUpRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* KPI Matrix (Large Glassmorphic Cards, Raw Icons, Distinct Accents) */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Net Cash Balance */}
        <div className="glass-panel rounded-3xl p-8 space-y-4 border-muted/20 transition-all hover:bg-surface/50">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              Net Balance
            </span>
            <DollarSign className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-stat-2 font-mono">
            LKR {kpis.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Income */}
        <div className="glass-panel rounded-3xl p-8 space-y-4 border-muted/20 transition-all hover:bg-surface/50">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              Total Inflows
            </span>
            <TrendingUp className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-stat-1 font-mono">
            LKR {kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total Expense */}
        <div className="glass-panel rounded-3xl p-8 space-y-4 border-muted/20 transition-all hover:bg-surface/50">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              Total Outflows
            </span>
            <TrendingDown className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
            LKR {kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Pending Verification */}
        <div className="glass-panel rounded-3xl p-8 space-y-4 border-muted/20 transition-all hover:bg-surface/50">
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              Pending Review
            </span>
            <Clock className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-foreground font-mono">
            {kpis.pendingApprovals}
          </div>
        </div>
      </div>

      {/* Primary Content Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Branches Overview (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-8 sm:p-10 space-y-8 border-muted/20">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Branches
            </h2>
            <Link
              href="/dashboard/admin/shops"
              className="flex items-center gap-1 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Manage</span>
              <ArrowUpRight className="size-5" />
            </Link>
          </div>

          <div className="space-y-4">
            {shops.slice(0, 6).map((shop: any) => (
              <Link
                key={shop._id}
                href={`/dashboard/admin/shops/${shop._id}`}
                className="flex items-center justify-between rounded-2xl bg-surface/30 hover:bg-surface/60 border border-muted/20 p-5 transition-all"
              >
                <div className="space-y-1">
                  <div className="text-lg font-bold text-foreground">
                    {shop.name}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {shop.code} • {shop.staffCount} Staff
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-stat-1">
                    LKR {Number(shop.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-muted-foreground">Balance</div>
                </div>
              </Link>
            ))}

            {shops.length === 0 && (
              <div className="py-12 text-center text-base text-muted-foreground">
                No branches registered.
              </div>
            )}
          </div>
        </div>

        {/* Latest Activity (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl p-8 sm:p-10 space-y-8 border-muted/20">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/admin/transactions"
              className="flex items-center gap-1 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>All</span>
              <ArrowUpRight className="size-5" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentRecords.map((rec: any) => (
              <div
                key={rec._id}
                className="rounded-2xl bg-surface/30 border border-muted/20 p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-foreground">
                    {rec.billNumber}
                  </span>
                  <StatusBadge status={rec.status} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-base text-muted-foreground truncate max-w-[200px]">
                    {rec.reason || rec.category?.name || "Entry"}
                  </span>
                  <span className="font-mono text-base font-bold text-foreground">
                    {rec.type === "INCOME" ? "+" : "-"} LKR {Number(rec.amount).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground/80 pt-2 border-t border-muted/20">
                  <span>{rec.shop?.name || "Global"}</span>
                  <span>{new Date(rec.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {recentRecords.length === 0 && (
              <div className="py-12 text-center text-base text-muted-foreground">
                No recent transactions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
