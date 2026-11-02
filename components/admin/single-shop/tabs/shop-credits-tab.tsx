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
  DownloadIcon,
  ChevronDown,
  ChevronUp,
  PackageIcon,
  ZapIcon,
  PhoneIcon,
  ReceiptIcon,
  CheckCircle2Icon,
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
import { exportCustomerCreditStatementPDF } from "@/lib/pdf/customer-credit-statement-pdf";

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
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const [expandedRows, setExpandedRows] = React.useState<Record<string, boolean>>({});
  const [customerStatement, setCustomerStatement] = React.useState<{
    customer: any;
    transactions: any[];
  } | null>(null);

  const toggleRowExpansion = (txId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  const handleOpenStatement = async (customerId: string) => {
    setStatementLoading(true);
    setStatementOpen(true);
    setCustomerStatement(null);
    setExpandedRows({});
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

  const handleExportPdf = () => {
    if (!customerStatement) return;
    try {
      setIsExportingPdf(true);
      exportCustomerCreditStatementPDF({
        customer: customerStatement.customer,
        transactions: customerStatement.transactions,
        generatedBy: "Shop Admin",
      });
      toast.create({
        title: "Statement Downloaded",
        description: `Customer credit statement for ${customerStatement.customer.name} has been generated.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Statement PDF export error:", err);
      toast.create({
        title: "Export Failed",
        description: err?.message || "Failed to export statement PDF.",
        type: "error",
      });
    } finally {
      setIsExportingPdf(false);
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
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${debt > 0
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
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-[95vw] lg:max-w-[92vw] xl:max-w-[1400px] max-h-[92vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-muted/20">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
                <FileTextIcon className="size-5 text-foreground" />
                <span>Customer Credit Statement</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Complete itemized ledger of credit purchases, items taken, utilities, and repayments.
              </DialogDescription>
            </div>
            {customerStatement && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="h-9 px-3.5 rounded-xl border border-muted/30 text-xs font-semibold gap-2 hover:bg-surface/50 self-start sm:self-auto shrink-0"
              >
                <DownloadIcon className="size-3.5" />
                <span>{isExportingPdf ? "Generating PDF..." : "Export PDF"}</span>
              </Button>
            )}
          </div>

          {statementLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-foreground" />
              <span>Loading customer ledger transactions...</span>
            </div>
          ) : customerStatement ? (
            <div className="space-y-5 py-2">
              {/* Profile & KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl border border-muted/30 bg-surface/30">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Customer Info
                  </span>
                  <div className="flex items-center gap-2">
                    <UserIcon className="size-4 text-foreground shrink-0" />
                    <h4 className="text-sm font-bold text-foreground truncate">{customerStatement.customer.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <PhoneIcon className="size-3 text-muted-foreground shrink-0" />
                    <span>{customerStatement.customer.phone || "No phone"}</span>
                  </div>
                  {customerStatement.customer.shop?.name && (
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      Shop: {customerStatement.customer.shop.name}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-surface/50 border border-muted/20">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Total Credit Taken
                  </span>
                  <span className="text-base font-bold font-mono text-foreground">
                    LKR {Number(customerStatement.customer.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/50 border border-muted/20">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Total Repaid
                  </span>
                  <span className="text-base font-bold font-mono text-foreground">
                    LKR {Number(customerStatement.customer.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface/50 border border-muted/20">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Outstanding Debt
                  </span>
                  <span className="text-base font-bold font-mono text-foreground">
                    LKR {Number(customerStatement.customer.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl border border-muted/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface/50 text-muted-foreground uppercase text-[10px] font-semibold tracking-wider border-b border-muted/20">
                      <tr>
                        <th className="py-3 px-3.5 whitespace-nowrap">Date & Time</th>
                        <th className="py-3 px-3 whitespace-nowrap">Bill / Ref #</th>
                        <th className="py-3 px-3 whitespace-nowrap">Type</th>
                        <th className="py-3 px-3 min-w-[240px]">Particulars & Item Details</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Credit Taken (+)</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Repaid (-)</th>
                        <th className="py-3 px-3 text-right whitespace-nowrap">Balance (LKR)</th>
                        <th className="py-3 px-3 whitespace-nowrap">Staff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/15">
                      {customerStatement.transactions?.length > 0 ? (
                        customerStatement.transactions.map((t: any) => {
                          const isRepay = t.type === "REPAYMENT" || t.type === "DEBT_REPAYMENT";
                          const isExpanded = !!expandedRows[t._id];
                          const hasItems = Array.isArray(t.items) && t.items.length > 0;

                          return (
                            <React.Fragment key={t._id}>
                              <tr className="hover:bg-surface/40 transition-colors">
                                <td className="py-3 px-3.5 text-muted-foreground font-mono text-[11px] whitespace-nowrap align-top">
                                  <div>{t.date ? new Date(t.date).toLocaleDateString() : "-"}</div>
                                  <div className="text-[10px] text-muted-foreground/70">
                                    {t.date ? new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                  </div>
                                </td>

                                <td className="py-3 px-3 font-mono font-bold text-foreground text-[11px] align-top whitespace-nowrap">
                                  {t.billNumber ? (
                                    <div className="flex items-center gap-1">
                                      <ReceiptIcon className="size-3 text-muted-foreground" />
                                      <span>{t.billNumber}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground font-normal">-</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 align-top whitespace-nowrap">
                                  {isRepay ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-muted/30 bg-surface/60 text-foreground">
                                      <CheckCircle2Icon className="size-2.5" />
                                      <span>Repayment</span>
                                    </span>
                                  ) : t.categoryType === "UTILITY" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-muted/30 bg-surface/50 text-foreground">
                                      <ZapIcon className="size-2.5" />
                                      <span>Utility Bill</span>
                                    </span>
                                  ) : t.categoryType === "RELOAD" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-muted/30 bg-surface/50 text-foreground">
                                      <PhoneIcon className="size-2.5" />
                                      <span>Reload</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-muted/30 bg-background/60 text-foreground">
                                      <PackageIcon className="size-2.5" />
                                      <span>Credit Sale</span>
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 align-top">
                                  <div className="space-y-1">
                                    {isRepay ? (
                                      <div>
                                        <p className="font-semibold text-foreground text-xs">
                                          Debt Settlement via {t.paymentMethod || "CASH"}
                                        </p>
                                        {t.note && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5">
                                            {t.note}
                                          </p>
                                        )}
                                        {t.bankAccount && (
                                          <p className="text-[10px] font-mono text-muted-foreground">
                                            Bank: {t.bankAccount}
                                          </p>
                                        )}
                                      </div>
                                    ) : t.categoryType === "UTILITY" ? (
                                      <div>
                                        <p className="font-semibold text-foreground text-xs">
                                          {t.detailsSummary || "Utility Bill Payment"}
                                        </p>
                                        {t.note && t.note !== t.detailsSummary && (
                                          <p className="text-[11px] text-muted-foreground">{t.note}</p>
                                        )}
                                      </div>
                                    ) : t.categoryType === "RELOAD" ? (
                                      <div>
                                        <p className="font-semibold text-foreground text-xs">
                                          {t.detailsSummary || "Telecom Reload"}
                                        </p>
                                        {t.note && t.note !== t.detailsSummary && (
                                          <p className="text-[11px] text-muted-foreground">{t.note}</p>
                                        )}
                                      </div>
                                    ) : hasItems ? (
                                      <div>
                                        <p className="font-semibold text-foreground text-xs">
                                          {t.detailsSummary || `${t.items.length} items purchased on credit`}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => toggleRowExpansion(t._id)}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors mt-1 py-0.5"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <ChevronUp className="size-3" />
                                              <span>Hide item breakdown ({t.items.length})</span>
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="size-3" />
                                              <span>View item breakdown ({t.items.length})</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <div>
                                        <p className="font-semibold text-foreground text-xs">
                                          {t.detailsSummary || t.note || "POS Credit Purchase"}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs align-top whitespace-nowrap">
                                  {!isRepay ? (
                                    <span className="font-bold text-foreground">
                                      +LKR {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40">-</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs align-top whitespace-nowrap">
                                  {isRepay ? (
                                    <span className="font-bold text-foreground">
                                      -LKR {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40">-</span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-xs align-top whitespace-nowrap">
                                  <span className="font-bold text-foreground">
                                    LKR {Number(t.runningDebtBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-muted-foreground text-[11px] align-top whitespace-nowrap">
                                  {t.recordedBy || "Staff"}
                                </td>
                              </tr>

                              {/* Expanded Item Breakdown Sub-row */}
                              {isExpanded && hasItems && (
                                <tr className="bg-surface/20 border-b border-muted/20">
                                  <td colSpan={8} className="py-3 px-4 sm:px-6">
                                    <div className="p-3.5 rounded-xl border border-muted/30 bg-surface/40 space-y-2">
                                      <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                                        <span className="flex items-center gap-1.5">
                                          <PackageIcon className="size-3.5 text-muted-foreground" />
                                          <span>Itemized Purchase Breakdown ({t.items.length} items)</span>
                                        </span>
                                        <span className="font-mono text-muted-foreground">
                                          Bill #{t.billNumber || "-"}
                                        </span>
                                      </div>
                                      <div className="rounded-lg border border-muted/20 overflow-hidden">
                                        <table className="w-full text-[11px] text-left">
                                          <thead className="bg-surface/70 text-muted-foreground uppercase text-[9px] font-bold tracking-wider border-b border-muted/20">
                                            <tr>
                                              <th className="py-1.5 px-3">Item Name</th>
                                              <th className="py-1.5 px-2">Code</th>
                                              <th className="py-1.5 px-2 text-right">Qty</th>
                                              <th className="py-1.5 px-2 text-right">Unit Price</th>
                                              <th className="py-1.5 px-2 text-right">Discount</th>
                                              <th className="py-1.5 px-3 text-right">Line Total</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-muted/15 font-mono">
                                            {t.items.map((item: any, idx: number) => (
                                              <tr key={item._id || idx} className="hover:bg-surface/40">
                                                <td className="py-1.5 px-3 font-sans font-medium text-foreground">
                                                  {item.itemName}
                                                </td>
                                                <td className="py-1.5 px-2 text-muted-foreground">
                                                  {item.itemCode || "-"}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-foreground">
                                                  {item.quantity}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-muted-foreground">
                                                  {Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-1.5 px-2 text-right text-muted-foreground">
                                                  {item.discountPrice && item.discountPrice > 0
                                                    ? Number(item.discountPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                                    : "-"}
                                                </td>
                                                <td className="py-1.5 px-3 text-right font-bold text-foreground">
                                                  {Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                            No transactions recorded for this customer yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-3 border-t border-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-muted-foreground">
              {customerStatement?.transactions?.length ? (
                <span>Total {customerStatement.transactions.length} statement records</span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {customerStatement && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="h-10 px-4 rounded-xl border border-muted/30 text-xs font-semibold gap-2"
                >
                  <DownloadIcon className="size-4" />
                  <span>{isExportingPdf ? "Exporting..." : "Download PDF Statement"}</span>
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                onClick={() => setStatementOpen(false)}
                className="h-10 px-5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 text-xs"
              >
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
