"use client";

import * as React from "react";
import {
  getPettyCashSummaryAction,
  topUpWithdrawPettyCashAction,
} from "@/actions/pettyCash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  Download,
  RefreshCw,
  Plus,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pettyCashTransactionSchema, PettyCashTransactionInput } from "@/schemas/pettyCash";

interface PettyCashViewProps {
  initialAccount: {
    _id: string;
    name: string;
    currentBalance: number;
    initialFloat: number;
    lastTopUpAt?: string | null;
    lastTopUpAmount?: number;
  };
  initialPeriodInflow: number;
  initialPeriodOutflow: number;
  initialRecords: any[];
  initialTimelineData: Array<{ date: string; income: number; expense: number }>;
  bankAccounts: Array<{ _id: string; bankName: string; accountNumber: string; currentBalance: number }>;
}

export function PettyCashView({
  initialAccount,
  initialPeriodInflow,
  initialPeriodOutflow,
  initialRecords,
  bankAccounts,
}: PettyCashViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const [account, setAccount] = React.useState(initialAccount);
  const [periodInflow, setPeriodInflow] = React.useState(initialPeriodInflow);
  const [periodOutflow, setPeriodOutflow] = React.useState(initialPeriodOutflow);
  const [records, setRecords] = React.useState(initialRecords);

  const [actionOpen, setActionOpen] = React.useState(false);

  const form = useForm<PettyCashTransactionInput>({
    resolver: zodResolver(pettyCashTransactionSchema),
    defaultValues: {
      type: "TOP_UP",
      amount: 10000,
      reason: "",
      date: new Date().toISOString().split("T")[0],
      sourceBankAccount: "",
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPettyCashSummaryAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
      });

      if (res.success && res.account) {
        setAccount(res.account);
        setPeriodInflow(res.periodInflow || 0);
        setPeriodOutflow(res.periodOutflow || 0);
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error(err);
      toast.create({
        title: "Error",
        description: "Failed to load petty cash data.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onActionSubmit = async (data: PettyCashTransactionInput) => {
    try {
      const res = await topUpWithdrawPettyCashAction(data);
      if (res.success) {
        toast.create({
          title: "Operation recorded",
          description: "Petty cash updated.",
        });
        setActionOpen(false);
        form.reset();
        fetchData();
      } else {
        toast.create({
          title: "Failed",
          description: res.error || "Could not process transaction.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred.",
        type: "error",
      });
    }
  };

  const exportCSV = () => {
    if (!records.length) {
      toast.create({
        title: "Export empty",
        description: "No records found.",
      });
      return;
    }

    const headers = ["Date", "Branch", "Bill Number", "Reason", "Type", "Amount (LKR)", "Status"];
    const rows = records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.shop?.name || "Central"}"`,
      `"${r.billNumber || ""}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      `"${r.type}"`,
      r.approvedAmount ?? r.amount,
      `"${r.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Petty_Cash_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="font-mono text-base font-semibold text-foreground">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="text-base font-bold text-foreground">
          {row.original.shop?.name || "Central Petty Cash"}
        </span>
      ),
    },
    {
      accessorKey: "billNumber",
      header: "Bill No",
      cell: ({ row }) => (
        <span className="font-mono text-base font-bold text-stat-1">
          {row.original.billNumber}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-base text-muted-foreground truncate max-w-xs block">
          {row.original.reason || "—"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        const val = row.original.approvedAmount ?? row.original.amount;
        return (
          <span className={`font-mono text-base font-bold ${isIncome ? "text-stat-1" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} LKR {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Petty Cash
          </h1>
          <p className="text-base text-muted-foreground">
            Central Float & Immediate Operational Disbursements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button
            onClick={() => setActionOpen(true)}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-3 justify-between"
          >
            <Plus className="size-5" />
            <span>Top-up / Withdraw</span>
            <ArrowUpRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Float Balance</span>
            <Wallet className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {Number(account.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Period Top-ups</div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {Number(periodInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Period Disbursements</div>
          <div className="text-3xl font-bold font-mono text-foreground">
            LKR {Number(periodOutflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Net Float Movement</div>
          <div className="text-3xl font-bold font-mono text-stat-2">
            LKR {Number(periodInflow - periodOutflow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Disbursements & Top-ups
          </h2>
          <Button
            onClick={exportCSV}
            className="h-12 rounded-xl bg-surface/50 hover:bg-surface/80 border border-muted/20 text-foreground text-sm font-semibold px-4 gap-2"
          >
            <Download className="size-4" />
            <span>CSV</span>
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={records}
          searchKey="billNumber"
          searchPlaceholder="Search bill number..."
          loading={loading}
        />
      </div>

      {/* TOP-UP / WITHDRAW MODAL */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Petty Cash Operation
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Record a float replenishment or cash disbursement for this branch.
            </p>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onActionSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Action Type
                </label>
                <select
                  {...form.register("type")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="TOP_UP">Replenish / Top-up Float (+)</option>
                  <option value="WITHDRAW">Emergency Disbursement (-)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Amount (LKR)
                </label>
                <Input
                  type="number"
                  step="any"
                  {...form.register("amount", { valueAsNumber: true })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Date
                </label>
                <Input
                  type="date"
                  {...form.register("date")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Funding Bank Account (Optional)
                </label>
                <select
                  {...form.register("sourceBankAccount")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="">Direct Cash / External</option>
                  {bankAccounts.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bankName} ({b.accountNumber.slice(-4)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Disbursement purpose or cashier voucher note"
                {...form.register("reason")}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionOpen(false)}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span>Record Transaction</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
