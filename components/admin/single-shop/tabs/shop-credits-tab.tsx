"use client";

import React from "react";
import {
  CreditCardIcon,
  HandCoinsIcon,
  TrendingUpIcon,
  SparklesIcon,
  SearchIcon,
  RefreshCwIcon,
  FileTextIcon,
  Loader2Icon,
  UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { getCustomerCreditStatementAction } from "@/actions/credit";

interface ShopCreditsTabProps {
  creditCustomers: any[];
  creditStats: {
    totalCreditIssued: number;
    totalPaid: number;
    totalOutstanding: number;
    debtorCount: number;
  };
  creditSearch: string;
  setCreditSearch: (s: string) => void;
  creditLoading: boolean;
  fetchCreditCustomers: (q?: string) => void;
}

export function ShopCreditsTab({
  creditCustomers,
  creditStats,
  creditSearch,
  setCreditSearch,
  creditLoading,
  fetchCreditCustomers,
}: ShopCreditsTabProps) {
  // Statement Modal State
  const [statementOpen, setStatementOpen] = React.useState(false);
  const [statementLoading, setStatementLoading] = React.useState(false);
  const [customerStatement, setCustomerStatement] = React.useState<{
    customer: any;
    transactions: any[];
  } | null>(null);

  const handleOpenStatement = async (customerId: string) => {
    setStatementLoading(true);
    setStatementOpen(true);
    setCustomerStatement(null);
    try {
      const res = await getCustomerCreditStatementAction(customerId);
      if (res.success && res.customer && res.transactions) {
        setCustomerStatement({
          customer: res.customer,
          transactions: res.transactions,
        });
      } else {
        toast.create({
          title: "Statement Failed",
          description: res.error || "Failed to load customer statement.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred while loading customer statement.",
        type: "error",
      });
    } finally {
      setStatementLoading(false);
    }
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-foreground">{row.original.name}</span>
            <span className="text-[11px] font-mono text-muted-foreground">{row.original.phone}</span>
          </div>
        ),
      },
      {
        accessorKey: "totalCredit",
        header: () => <div className="text-right">Total Credit Taken</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs text-muted-foreground font-semibold">
            LKR {Number(row.original.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: "totalPaid",
        header: () => <div className="text-right">Total Repaid</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs text-foreground font-semibold">
            LKR {Number(row.original.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: "currentBalance",
        header: () => <div className="text-right">Outstanding Debt</div>,
        cell: ({ row }) => {
          const debt = row.original.currentBalance || 0;
          return (
            <div className="text-right">
              <span className={`font-mono text-xs font-bold ${debt > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                LKR {Number(debt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => {
          const debt = row.original.currentBalance || 0;
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  debt > 0
                    ? "border-muted/30 bg-surface/50 text-foreground"
                    : "border-muted/30 bg-background/50 text-muted-foreground"
                }`}
              >
                <span className={`size-1.5 rounded-full ${debt > 0 ? "bg-foreground" : "bg-muted-foreground"}`} />
                {debt > 0 ? "Debt Pending" : "Settled"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "lastActivityDate",
        header: "Last Activity",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.lastActivityDate
              ? new Date(row.original.lastActivityDate).toLocaleDateString()
              : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Statement</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="xs"
              onClick={() => handleOpenStatement(row.original._id)}
              className="h-8 px-3 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 gap-1.5 text-xs shadow-xs"
            >
              <FileTextIcon className="size-3.5" />
              <span>Statement</span>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const recoveryRate = creditStats.totalCreditIssued > 0
    ? ((creditStats.totalPaid / creditStats.totalCreditIssued) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* 4 Spacious KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outstanding Debt
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(creditStats.totalOutstanding || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {creditStats.debtorCount} Customer{creditStats.debtorCount !== 1 ? "s" : ""} with pending balances
              </p>
            </div>
            <HandCoinsIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Credit Issued
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(creditStats.totalCreditIssued || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cumulative credit purchases logged
              </p>
            </div>
            <CreditCardIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Repaid
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                LKR {Number(creditStats.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Recovered directly into branch drawer
              </p>
            </div>
            <TrendingUpIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recovery Rate
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {recoveryRate}%
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Percentage of credit collected
              </p>
            </div>
            <SparklesIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {/* Header and Search Bar */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Customer Credit Accounts
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Track individual customer debt, repayments, and print or view detailed transaction statements.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchCreditCustomers()}
          disabled={creditLoading}
          className="h-12 px-5 rounded-2xl border border-muted/30 gap-2 text-xs font-semibold shrink-0"
        >
          <RefreshCwIcon className={`size-3.5 ${creditLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Credit Accounts Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <div className="p-6">
          <DataTable
            columns={columns}
            data={creditCustomers}
            searchKey="name"
            searchPlaceholder="Filter credit customers by name or phone..."
            loading={creditLoading}
          />
        </div>
      </Card>

      {/* STATEMENT DIALOG */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
              <FileTextIcon className="size-5 text-foreground" />
              <span>Customer Credit Statement</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete historical transaction ledger of credit purchases and debt settlements for this customer.
            </DialogDescription>
          </DialogHeader>

          {statementLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-foreground" />
              <span>Loading customer ledger transactions...</span>
            </div>
          ) : customerStatement ? (
            <div className="space-y-4 py-1">
              {/* Profile Card */}
              <div className="p-5 rounded-2xl border border-muted/30 bg-surface/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-4 text-foreground" />
                    <h4 className="text-sm font-bold text-foreground">{customerStatement.customer.name}</h4>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    Mobile: {customerStatement.customer.phone}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Outstanding Balance
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    LKR {Number(customerStatement.customer.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-muted/30 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-surface/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-muted/20">
                    <tr>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3">Bill / Ref #</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3 text-right">Amount (LKR)</th>
                      <th className="py-3 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/20">
                    {customerStatement.transactions?.length > 0 ? (
                      customerStatement.transactions.map((t: any) => {
                        const isRepay = t.type === "DEBT_REPAYMENT";
                        return (
                          <tr key={t._id} className="hover:bg-surface/40 transition-colors">
                            <td className="py-3 px-3.5 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                              {new Date(t.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  isRepay
                                    ? "border-muted/30 bg-surface/50 text-foreground"
                                    : "border-muted/30 bg-background/50 text-muted-foreground"
                                }`}
                              >
                                {isRepay ? "Debt Repayment" : "Credit Purchase"}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-foreground">
                              {t.billNumber || "-"}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {t.paymentMethod || "CASH"}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                              {isRepay ? "-" : "+"}LKR {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-[11px]">
                              {t.recordedBy || "Staff"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                          No transactions recorded for this customer yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatementOpen(false)}
              className="h-11 px-5 rounded-xl border border-muted/30 text-xs"
            >
              Close Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
