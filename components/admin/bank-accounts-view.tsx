"use client";

import * as React from "react";
import {
  getBankAccountsSummaryAction,
  createBankAccountAction,
  updateBankAccountAction,
  bankDepositWithdrawAction,
  deleteBankAccountAction,
} from "@/actions/bankAccounts";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Landmark,
  Download,
  RefreshCw,
  Plus,
  Edit,
  ArrowLeftRight,
  Loader2,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createBankAccountSchema,
  updateBankAccountSchema,
  bankDepositWithdrawSchema,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  BankDepositWithdrawInput,
} from "@/schemas/bankAccount";

interface BankAccountItem {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  currentBalance: number;
  isActive: boolean;
}

interface BankAccountsViewProps {
  initialTotalBankCapital: number;
  initialPeriodInflow: number;
  initialPeriodOutflow: number;
  initialAccounts: BankAccountItem[];
  initialRecords: any[];
  initialTimelineData: Array<{ date: string; income: number; expense: number }>;
}

export function BankAccountsView({
  initialTotalBankCapital,
  initialPeriodInflow,
  initialPeriodOutflow,
  initialAccounts,
  initialRecords,
}: BankAccountsViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const [totalCapital, setTotalCapital] = React.useState<number>(initialTotalBankCapital);
  const [periodInflow, setPeriodInflow] = React.useState<number>(initialPeriodInflow);
  const [periodOutflow, setPeriodOutflow] = React.useState<number>(initialPeriodOutflow);
  const [accounts, setAccounts] = React.useState<BankAccountItem[]>(initialAccounts);
  const [records, setRecords] = React.useState<any[]>(initialRecords);

  const [createAccountOpen, setCreateAccountOpen] = React.useState<boolean>(false);
  const [editAccountOpen, setEditAccountOpen] = React.useState<boolean>(false);
  const [accountToEdit, setAccountToEdit] = React.useState<BankAccountItem | null>(null);

  const [depositWithdrawOpen, setDepositWithdrawOpen] = React.useState<boolean>(false);
  const [selectedAccountForAction, setSelectedAccountForAction] = React.useState<BankAccountItem | null>(null);

  const [deleteAccountOpen, setDeleteAccountOpen] = React.useState<boolean>(false);
  const [accountToDelete, setAccountToDelete] = React.useState<BankAccountItem | null>(null);
  const [deleting, setDeleting] = React.useState<boolean>(false);

  const createForm = useForm<CreateBankAccountInput>({
    resolver: zodResolver(createBankAccountSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      initialBalance: 0,
    },
  });

  const editForm = useForm<UpdateBankAccountInput>({
    resolver: zodResolver(updateBankAccountSchema),
    defaultValues: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      branch: "",
      isActive: true,
    },
  });

  const actionForm = useForm<BankDepositWithdrawInput>({
    resolver: zodResolver(bankDepositWithdrawSchema),
    defaultValues: {
      accountId: "",
      type: "DEPOSIT",
      amount: 0,
      reason: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBankAccountsSummaryAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        accountId: selectedAccountId !== "ALL" ? selectedAccountId : undefined,
      });

      if (res.success) {
        setTotalCapital(res.totalBankCapital || 0);
        setPeriodInflow(res.periodInflow || 0);
        setPeriodOutflow(res.periodOutflow || 0);
        setAccounts(res.accounts || []);
        setRecords(res.records || []);
      }
    } catch (err) {
      console.error("Error fetching bank summary:", err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedAccountId, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onCreateAccountSubmit = async (data: CreateBankAccountInput) => {
    try {
      const res = await createBankAccountAction(data);
      if (res.success) {
        toast.create({
          title: "Account registered",
          description: "New bank account added.",
        });
        setCreateAccountOpen(false);
        createForm.reset();
        fetchData();
      } else {
        toast.create({
          title: "Registration failed",
          description: res.error || "Could not register bank account.",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Failed to connect to server.", type: "error" });
    }
  };

  const onEditAccountSubmit = async (data: UpdateBankAccountInput) => {
    if (!accountToEdit) return;
    try {
      const res = await updateBankAccountAction(accountToEdit._id, data);
      if (res.success) {
        toast.create({
          title: "Account updated",
          description: "Bank details saved.",
        });
        setEditAccountOpen(false);
        fetchData();
      } else {
        toast.create({
          title: "Update failed",
          description: res.error || "Could not save details.",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Failed to connect to server.", type: "error" });
    }
  };

  const onDepositWithdrawSubmit = async (data: BankDepositWithdrawInput) => {
    try {
      const res = await bankDepositWithdrawAction(data);
      if (res.success) {
        toast.create({
          title: "Movement recorded",
          description: "Bank ledger synchronized.",
        });
        setDepositWithdrawOpen(false);
        actionForm.reset();
        fetchData();
      } else {
        toast.create({
          title: "Operation failed",
          description: res.error || "Failed to record movement.",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Could not execute transfer.", type: "error" });
    }
  };

  const openEditModal = (acc: BankAccountItem) => {
    setAccountToEdit(acc);
    editForm.reset({
      bankName: acc.bankName,
      accountName: acc.accountName,
      accountNumber: acc.accountNumber,
      branch: acc.branch || "",
      isActive: acc.isActive,
    });
    setEditAccountOpen(true);
  };

  const openDepositWithdrawModal = (acc: BankAccountItem) => {
    setSelectedAccountForAction(acc);
    actionForm.reset({
      accountId: acc._id,
      type: "DEPOSIT",
      amount: 0,
      reason: "",
      date: new Date().toISOString().split("T")[0],
    });
    setDepositWithdrawOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteBankAccountAction(accountToDelete._id);
      if (res.success) {
        toast.create({
          title: "Account removed",
          description: "Bank account deleted.",
        });
        setDeleteAccountOpen(false);
        setAccountToDelete(null);
        fetchData();
      } else {
        toast.create({
          title: "Deletion failed",
          description: res.error || "Failed to delete account.",
          type: "error",
        });
      }
    } catch {
      toast.create({ title: "Error", description: "Could not execute deletion.", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const exportCSV = () => {
    if (!records.length) {
      toast.create({ title: "Export empty", description: "No records to export." });
      return;
    }

    const headers = ["Date", "Bank Account", "Account No", "Branch", "Bill Number", "Reason", "Type", "Amount (LKR)", "Status"];
    const rows = records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.bankAccount?.bankName || ""}"`,
      `"${r.bankAccount?.accountNumber || ""}"`,
      `"${r.shop?.name || ""}"`,
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
    link.setAttribute("download", `Bank_Transactions_${new Date().toISOString().split("T")[0]}.csv`);
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
      accessorKey: "bankAccount.bankName",
      header: "Account",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-bold text-base text-foreground">
            {row.original.bankAccount?.bankName || "Treasury"}
          </div>
          <div className="font-mono text-sm text-muted-foreground">
            {row.original.bankAccount?.accountNumber || ""}
          </div>
        </div>
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
            Bank Accounts
          </h1>
          <p className="text-base text-muted-foreground">
            Treasury & Central Banking Float
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
            onClick={() => {
              createForm.reset({
                bankName: "",
                accountName: "",
                accountNumber: "",
                branch: "",
                initialBalance: 0,
              });
              setCreateAccountOpen(true);
            }}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-3 justify-between"
          >
            <Plus className="size-5" />
            <span>Add Account</span>
            <ArrowUpRight className="size-5" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Total Capital</span>
            <Landmark className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {Number(totalCapital || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Period Inflows</div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {Number(periodInflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Period Outflows</div>
          <div className="text-3xl font-bold font-mono text-foreground">
            LKR {Number(periodOutflow || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Net Bank Flow</div>
          <div className="text-3xl font-bold font-mono text-stat-2">
            LKR {Number(periodInflow - periodOutflow).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Bank Account Cards Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">
          Active Accounts
        </h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <div
              key={acc._id}
              className="glass-panel rounded-3xl p-8 space-y-6 border-muted/20 flex flex-col justify-between shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold text-foreground">
                    {acc.bankName}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      acc.isActive ? "text-stat-1" : "text-destructive"
                    }`}
                  >
                    {acc.isActive ? "Active" : "Closed"}
                  </span>
                </div>

                <div className="font-mono text-base text-muted-foreground">
                  {acc.accountNumber}
                </div>

                <div className="text-base text-muted-foreground">
                  {acc.accountName} {acc.branch ? `• ${acc.branch}` : ""}
                </div>
              </div>

              <div className="pt-6 border-t border-muted/20 flex items-end justify-between">
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">Balance</div>
                  <div className="text-2xl font-bold font-mono text-stat-1">
                    LKR {Number(acc.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openDepositWithdrawModal(acc)}
                    className="h-10 rounded-xl px-3 border-muted/30 text-foreground hover:bg-surface/50 text-sm font-semibold gap-1.5"
                  >
                    <ArrowLeftRight className="size-4" />
                    <span>In/Out</span>
                  </Button>
                  <button
                    onClick={() => openEditModal(acc)}
                    className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
                    title="Edit"
                  >
                    <Edit className="size-5" />
                  </button>
                  <button
                    onClick={() => {
                      setAccountToDelete(acc);
                      setDeleteAccountOpen(true);
                    }}
                    className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Bank Transactions
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

      {/* CREATE ACCOUNT MODAL */}
      <Dialog open={createAccountOpen} onOpenChange={setCreateAccountOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Add Bank Account
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Register a corporate bank account to track deposits, withdrawals, and settlements.
            </p>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateAccountSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bank Name
                </label>
                <Input
                  placeholder="e.g. Commercial Bank"
                  {...createForm.register("bankName")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
                {createForm.formState.errors.bankName && (
                  <p className="text-xs font-medium text-destructive">
                    {createForm.formState.errors.bankName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Account Name
                </label>
                <Input
                  placeholder="Account Title"
                  {...createForm.register("accountName")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Account Number
                </label>
                <Input
                  placeholder="Account digits"
                  {...createForm.register("accountNumber")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Initial Balance (LKR)
                </label>
                <Input
                  type="number"
                  step="any"
                  {...createForm.register("initialBalance", { valueAsNumber: true })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateAccountOpen(false)}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createForm.formState.isSubmitting}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {createForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span>Save Account</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ACCOUNT MODAL */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Edit Account
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Modify account identification numbers and naming details.
            </p>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditAccountSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bank Name
                </label>
                <Input
                  {...editForm.register("bankName")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Account Name
                </label>
                <Input
                  {...editForm.register("accountName")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Account Number
              </label>
              <Input
                {...editForm.register("accountNumber")}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditAccountOpen(false)}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editForm.formState.isSubmitting}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {editForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span>Save Changes</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIRECT IN/OUT MODAL */}
      <Dialog open={depositWithdrawOpen} onOpenChange={setDepositWithdrawOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Direct Deposit / Withdrawal
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Record a manual cash or electronic fund movement on this account.
            </p>
          </DialogHeader>

          <form onSubmit={actionForm.handleSubmit(onDepositWithdrawSubmit)} className="space-y-5">
            <input type="hidden" {...actionForm.register("accountId")} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Operation Type
                </label>
                <select
                  {...actionForm.register("type")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="DEPOSIT">Direct Deposit (Inflow +)</option>
                  <option value="WITHDRAWAL">Direct Withdrawal (Outflow -)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Date
                </label>
                <Input
                  type="date"
                  {...actionForm.register("date")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Amount (LKR)
                </label>
                <Input
                  type="number"
                  step="any"
                  {...actionForm.register("amount", { valueAsNumber: true })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Reference Number (Optional)
                </label>
                <Input
                  placeholder="Slip / cheque / reference"
                  {...actionForm.register("referenceNumber")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Purpose or reason"
                {...actionForm.register("reason")}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDepositWithdrawOpen(false)}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionForm.formState.isSubmitting}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {actionForm.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span>Record Movement</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ACCOUNT ALERT */}
      <AlertDialog
        open={deleteAccountOpen}
        onOpenChange={(open) => !open && setDeleteAccountOpen(false)}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-destructive">
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{accountToDelete?.bankName}</strong> ({accountToDelete?.accountNumber})?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel disabled={deleting} className="h-12 rounded-2xl text-sm px-6 border-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold px-6"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
