import { auth } from "@/auth";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ClockIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ArrowRightIcon,
  BuildingIcon,
  ShieldCheckIcon,
} from "lucide-react";

export default async function VerifierDashboardPage() {
  const [monthRes, todayRes] = await Promise.all([
    getSummaryAnalyticsAction({ period: "month" }),
    getSummaryAnalyticsAction({ period: "today" }),
  ]);

  const monthKpis = monthRes.success && monthRes.kpis ? monthRes.kpis : {
    totalTransactions: 0,
    totalExpense: 0,
    totalIncome: 0,
    pendingApprovals: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    netBalance: 0,
  };

  const todayRecords = todayRes.records || [];
  const approvedToday = todayRecords.filter((r: any) => r.status === "APPROVED").length;
  const rejectedToday = todayRecords.filter((r: any) => r.status === "REJECTED").length;

  const pendingRecords = (monthRes.records || [])
    .filter((r: any) => r.status === "PENDING")
    .slice(0, 6);

  const shopComparison = monthRes.shopComparisonData || [];

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Finance Verification Control
            </h1>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-muted/30 bg-surface/50 text-foreground">
              AUDIT QUEUE
            </span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Audit branch ledger submissions, enforce financial compliance, and authorize ledger entries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/verifier/records"
            className="h-12 rounded-2xl px-6 bg-foreground text-background hover:opacity-90 font-semibold text-sm flex items-center gap-2 transition-all shadow-md"
          >
            <CheckCircle2Icon className="size-4" />
            <span>Open Review Queue</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div data-tour="verifier-queue" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Approvals */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Awaiting Verification
            </span>
            <div className="size-10 rounded-2xl bg-surface/40 border border-muted/20 flex items-center justify-center text-foreground">
              <ClockIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
              {monthKpis.pendingApprovals}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {monthKpis.pendingApprovals === 0 ? "Queue completely cleared" : "Action required on submissions"}
            </p>
          </div>
        </div>

        {/* Approved Today */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Approved Today
            </span>
            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <CheckCircle2Icon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
              {approvedToday}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Cleared for branch ledger finalization
            </p>
          </div>
        </div>

        {/* Rejected Today */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Declined Today
            </span>
            <div className="size-10 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
              <XCircleIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
              {rejectedToday}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Declined with mandatory remarks
            </p>
          </div>
        </div>

        {/* Total Value Approved */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Approved Value
            </span>
            <div className="size-10 rounded-2xl bg-surface/40 border border-muted/20 flex items-center justify-center text-foreground">
              <ShieldCheckIcon className="size-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
              LKR {monthKpis.approvedAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Authorized capital across all branches
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Pending Items Queue & Branch Distribution */}
      <div className="grid gap-8 lg:grid-cols-7">
        {/* Pending Items List (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl p-6 sm:p-8 border border-muted/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Immediate Review Queue
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transactions requiring verifier authorization
              </p>
            </div>
            <Link
              href="/dashboard/verifier/records"
              className="h-9 px-4 rounded-xl border border-muted/30 bg-surface/30 hover:bg-surface/60 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors"
            >
              <span>View All</span>
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {pendingRecords.map((rec: any) => (
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
                      {rec.shop?.name} • {new Date(rec.date).toLocaleDateString()}
                    </span>
                  </div>
                  <CategoryBadge name={rec.category?.name || "Expense"} colorToken={rec.category?.colorToken} />
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
                    {rec.reason}
                  </span>
                  <span className="font-mono text-sm font-bold text-foreground whitespace-nowrap">
                    LKR {Number(rec.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <Link
                    href="/dashboard/verifier/records"
                    className="h-9 px-4 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center justify-center hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}

            {pendingRecords.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No records currently waiting for review. The verification queue is clean.
              </div>
            )}
          </div>
        </div>

        {/* Branch Distribution (3 cols) */}
        <div className="lg:col-span-3 glass-panel rounded-3xl p-6 sm:p-8 border border-muted/30 shadow-xl space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Branch Inflow / Outflow
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly activity across monitored branches
            </p>
          </div>

          <div className="space-y-3">
            {shopComparison.slice(0, 6).map((item) => (
              <div
                key={item.shop}
                className="glass-card p-3.5 rounded-2xl border border-muted/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-surface/50 border border-muted/30 font-mono font-bold text-xs text-foreground uppercase">
                    {item.code}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                    {item.shop}
                  </span>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-foreground">
                    +LKR {Number(item.income).toLocaleString()}
                  </div>
                  <div className="font-mono text-muted-foreground text-[10px]">
                    -LKR {Number(item.expense).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}

            {shopComparison.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No branch activity recorded yet this month.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
