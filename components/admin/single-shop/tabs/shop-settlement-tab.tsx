"use client";

import React from "react";
import {
  CoinsIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  WalletIcon,
  BanknoteIcon,
  ArrowRightLeftIcon,
  LandmarkIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  recordDailyCashSettlementAction,
  getDailySettlementHistoryAction,
} from "@/actions/dailySettlement";

interface ShopSettlementTabProps {
  shopId: string;
  shopName: string;
  currentBalance: number;
  onRefreshShop: () => void;
}

export function ShopSettlementTab({
  shopId,
  shopName,
  currentBalance,
  onRefreshShop,
}: ShopSettlementTabProps) {
  const [dailySettlements, setDailySettlements] = React.useState<any[]>([]);
  const [dailySettlementBankAccounts, setDailySettlementBankAccounts] = React.useState<any[]>([]);
  const [dailySettlementSummary, setDailySettlementSummary] = React.useState<{
    totalSettled: number;
    totalToPettyCash: number;
    totalToBank: number;
    settlementCount: number;
    lastSettlementDate: string | Date | null;
  }>({
    totalSettled: 0,
    totalToPettyCash: 0,
    totalToBank: 0,
    settlementCount: 0,
    lastSettlementDate: null,
  });
  const [dailySettlementCurrentCash, setDailySettlementCurrentCash] = React.useState<number>(currentBalance || 0);
  const [dailySettlementLoading, setDailySettlementLoading] = React.useState(false);
  const [dailySettlementDialogOpen, setDailySettlementDialogOpen] = React.useState(false);
  const [isSubmittingDailySettlement, setIsSubmittingDailySettlement] = React.useState(false);

  // Settlement Form State
  const [dailySettleDate, setDailySettleDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [dailySettleRetainedFloat, setDailySettleRetainedFloat] = React.useState<number>(4000);
  const [dailySettleTransferAmount, setDailySettleTransferAmount] = React.useState<number>(
    Math.max(0, (currentBalance || 0) - 4000)
  );
  const [dailySettleDestinationType, setDailySettleDestinationType] = React.useState<"PETTY_CASH" | "BANK_ACCOUNT" | "PHYSICAL_HANDOVER">("PETTY_CASH");
  const [dailySettleBankAccountId, setDailySettleBankAccountId] = React.useState<string>("");
  const [dailySettleReference, setDailySettleReference] = React.useState<string>("");
  const [dailySettleNote, setDailySettleNote] = React.useState<string>("");

  const fetchDailySettlements = React.useCallback(async () => {
    if (!shopId) return;
    setDailySettlementLoading(true);
    const res = await getDailySettlementHistoryAction(shopId);
    if (res.success) {
      setDailySettlements(res.settlements || []);
      setDailySettlementBankAccounts(res.bankAccounts || []);
      if (res.bankAccounts?.length > 0 && !dailySettleBankAccountId) {
        setDailySettleBankAccountId(res.bankAccounts[0]._id);
      }
      if (res.summary) {
        setDailySettlementSummary(res.summary);
      }
      if (typeof res.currentCashBalance === "number") {
        setDailySettlementCurrentCash(res.currentCashBalance);
        const surplus = Math.max(0, res.currentCashBalance - dailySettleRetainedFloat);
        setDailySettleTransferAmount(surplus);
      }
    } else {
      toast.create({
        title: "Settlement data error",
        description: res.error || "Failed to load daily settlement history.",
        type: "error",
      });
    }
    setDailySettlementLoading(false);
  }, [shopId, dailySettleRetainedFloat, dailySettleBankAccountId]);

  React.useEffect(() => {
    fetchDailySettlements();
  }, [fetchDailySettlements]);

  const handleOpenDailySettlementDialog = () => {
    const currentCash = dailySettlementCurrentCash || currentBalance || 0;
    const defaultFloat = 4000;
    const defaultTransfer = Math.max(0, currentCash - defaultFloat);

    setDailySettleDate(new Date().toISOString().split("T")[0]);
    setDailySettleRetainedFloat(defaultFloat);
    setDailySettleTransferAmount(defaultTransfer);
    setDailySettleDestinationType("PETTY_CASH");
    setDailySettleReference("");
    setDailySettleNote("");
    setDailySettlementDialogOpen(true);
  };

  const handleSubmitDailySettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailySettleDate) {
      toast.create({ title: "Date required", description: "Please enter settlement date.", type: "error" });
      return;
    }
    if (dailySettleTransferAmount <= 0) {
      toast.create({
        title: "Invalid Transfer Amount",
        description: "Transfer amount must be greater than zero.",
        type: "error",
      });
      return;
    }
    if (dailySettleTransferAmount > dailySettlementCurrentCash) {
      toast.create({
        title: "Insufficient cash balance",
        description: `Current drawer cash is LKR ${dailySettlementCurrentCash.toLocaleString()}, cannot sweep LKR ${dailySettleTransferAmount.toLocaleString()}.`,
        type: "error",
      });
      return;
    }

    if (dailySettleDestinationType === "BANK_ACCOUNT" && !dailySettleBankAccountId) {
      toast.create({
        title: "Bank Account Required",
        description: "Please select an active destination bank account.",
        type: "error",
      });
      return;
    }

    setIsSubmittingDailySettlement(true);
    const res = await recordDailyCashSettlementAction({
      shopId,
      date: dailySettleDate,
      totalCashBefore: dailySettlementCurrentCash,
      retainedFloat: Number(dailySettleRetainedFloat),
      transferAmount: Number(dailySettleTransferAmount),
      destinationType: dailySettleDestinationType,
      bankAccountId: dailySettleDestinationType === "BANK_ACCOUNT" ? dailySettleBankAccountId : null,
      reference: dailySettleReference.trim(),
      note: dailySettleNote.trim(),
    });

    if (res.success) {
      toast.create({
        title: "Settlement Recorded",
        description: res.message || "Daily cash settlement successfully recorded.",
        type: "success",
      });
      setDailySettlementDialogOpen(false);
      fetchDailySettlements();
      onRefreshShop();
    } else {
      toast.create({
        title: "Settlement Failed",
        description: res.error || "Failed to record daily settlement.",
        type: "error",
      });
    }
    setIsSubmittingDailySettlement(false);
  };

  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Settlement Date",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            {new Date(row.original.date).toLocaleDateString()}
          </span>
        ),
      },
      {
        accessorKey: "reference",
        header: "Reference #",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {row.original.reference || "-"}
          </span>
        ),
      },
      {
        accessorKey: "retainedFloat",
        header: () => <div className="text-right">Retained Float</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs text-muted-foreground font-semibold">
            LKR {Number(row.original.retainedFloat || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: "transferAmount",
        header: () => <div className="text-right">Surplus Transferred</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs font-bold text-foreground">
            LKR {Number(row.original.transferAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        ),
      },
      {
        accessorKey: "destinationType",
        header: "Destination",
        cell: ({ row }) => {
          const isPetty = row.original.destinationType === "PETTY_CASH";
          const isHandover = row.original.destinationType === "PHYSICAL_HANDOVER";
          const bank = row.original.bankAccount;
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border border-muted/30 bg-surface/50 text-foreground">
              {isPetty ? (
                <>
                  <CoinsIcon className="size-3.5 text-foreground" />
                  Central Petty Cash
                </>
              ) : isHandover ? (
                <>
                  <BanknoteIcon className="size-3.5 text-foreground" />
                  Physical Handover
                </>
              ) : (
                <>
                  <LandmarkIcon className="size-3.5 text-foreground" />
                  {bank ? `${bank.bankName} (${bank.accountNumber})` : "Bank Account"}
                </>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "settledBy",
        header: "Settled By",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.settledBy?.name || row.original.settledBy?.email || "Admin"}
          </span>
        ),
      },
      {
        accessorKey: "note",
        header: "Note",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground truncate max-w-[150px] inline-block" title={row.original.note}>
            {row.original.note || "-"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Action Button */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <CoinsIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Daily Cash Float &amp; Surplus Settlement
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Retain standard opening float (default LKR 4,000) in communication drawer and sweep excess balance to Petty Cash or Bank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchDailySettlements}
            disabled={dailySettlementLoading}
            className="h-12 px-4 rounded-2xl border border-muted/30 gap-2 text-xs font-semibold"
          >
            <RefreshCwIcon className={`size-3.5 ${dailySettlementLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleOpenDailySettlementDialog}
            className="h-12 px-6 rounded-2xl bg-foreground text-background font-semibold hover:opacity-90 gap-2 text-xs shadow-xs"
          >
            <PlusCircleIcon className="size-4" />
            <span>Record Daily Settlement</span>
          </Button>
        </div>
      </div>

      {/* 4 Spacious KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drawer Cash In Hand</span>
            <WalletIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
            LKR {dailySettlementCurrentCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Active physical balance in communication drawer
          </p>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Standard Opening Float</span>
            <BanknoteIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
            LKR 4,000.00
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Default retained float for starting daily operations
          </p>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Surplus</span>
            <ArrowRightLeftIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
            LKR {Math.max(0, dailySettlementCurrentCash - 4000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Drawer balance exceeding the 4,000 LKR float
          </p>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Swept to Date</span>
            <LandmarkIcon className="size-5 text-foreground shrink-0" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tracking-tight text-foreground">
            LKR {dailySettlementSummary.totalSettled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across {dailySettlementSummary.settlementCount} settlement records
          </p>
        </Card>
      </div>

      {/* Settlements History Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-muted/20">
          <CardTitle className="text-base font-bold text-foreground">Settlement Audit Ledger</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Historical log of daily drawer sweeps, retained floats, and destination accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={dailySettlements}
            searchKey="reference"
            searchPlaceholder="Filter by reference #..."
            loading={dailySettlementLoading}
          />
        </CardContent>
      </Card>

      {/* RECORD DAILY SETTLEMENT MODAL */}
      <Dialog open={dailySettlementDialogOpen} onOpenChange={setDailySettlementDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
              <CoinsIcon className="size-5 text-foreground" />
              <span>Record Daily Cash Settlement</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Retain opening float (LKR 4,000) in drawer and transfer the remaining surplus cash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitDailySettlement} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Settlement Date *</label>
                <Input
                  type="date"
                  value={dailySettleDate}
                  onChange={(e) => setDailySettleDate(e.target.value)}
                  className="h-14 rounded-2xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Current Drawer Cash</label>
                <div className="h-14 px-4 rounded-2xl border border-muted/30 bg-surface/50 flex items-center font-mono font-bold text-foreground text-sm">
                  LKR {dailySettlementCurrentCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Retained Float (LKR) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={dailySettleRetainedFloat}
                  onChange={(e) => {
                    const f = parseFloat(e.target.value) || 0;
                    setDailySettleRetainedFloat(f);
                    setDailySettleTransferAmount(Math.max(0, dailySettlementCurrentCash - f));
                  }}
                  className="h-14 rounded-2xl font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Surplus to Transfer *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={dailySettleTransferAmount}
                  onChange={(e) => setDailySettleTransferAmount(parseFloat(e.target.value) || 0)}
                  className="h-14 rounded-2xl font-mono font-bold text-foreground"
                  required
                />
              </div>
            </div>

            {/* Destination Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Destination Account *</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDailySettleDestinationType("PETTY_CASH")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    dailySettleDestinationType === "PETTY_CASH"
                      ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                      : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                  }`}
                >
                  <CoinsIcon className="size-4 text-foreground mb-1.5" />
                  <span className="text-xs font-bold block text-foreground">Petty Cash</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 leading-snug">
                    Deposit to Central Petty Cash.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailySettleDestinationType("BANK_ACCOUNT")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    dailySettleDestinationType === "BANK_ACCOUNT"
                      ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                      : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                  }`}
                >
                  <LandmarkIcon className="size-4 text-foreground mb-1.5" />
                  <span className="text-xs font-bold block text-foreground">Bank Account</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 leading-snug">
                    Deposit to company bank account.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDailySettleDestinationType("PHYSICAL_HANDOVER")}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    dailySettleDestinationType === "PHYSICAL_HANDOVER"
                      ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                      : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                  }`}
                >
                  <BanknoteIcon className="size-4 text-foreground mb-1.5" />
                  <span className="text-xs font-bold block text-foreground">Handover</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5 leading-snug">
                    Direct physical cash handover.
                  </span>
                </button>
              </div>
            </div>

            {/* Bank Account Dropdown if selected */}
            {dailySettleDestinationType === "BANK_ACCOUNT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Select Company Bank Account *</label>
                <Select
                  value={dailySettleBankAccountId}
                  onValueChange={(val) => setDailySettleBankAccountId(val || "")}
                >
                  <SelectTrigger className="h-14 rounded-2xl">
                    <SelectValue placeholder="Choose bank account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dailySettlementBankAccounts.map((b) => (
                      <SelectItem key={b._id} value={b._id} className="text-xs">
                        {b.bankName} - {b.accountName} ({b.accountNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Reference / Slip #</label>
                <Input
                  placeholder="e.g. SLIP-10293"
                  value={dailySettleReference}
                  onChange={(e) => setDailySettleReference(e.target.value)}
                  className="h-14 rounded-2xl font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Settlement Note</label>
                <Input
                  placeholder="Optional audit notes"
                  value={dailySettleNote}
                  onChange={(e) => setDailySettleNote(e.target.value)}
                  className="h-14 rounded-2xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-6 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDailySettlementDialogOpen(false)}
                className="h-12 px-6 rounded-2xl border border-muted/30 font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingDailySettlement}
                className="h-12 px-8 rounded-2xl bg-foreground text-background font-semibold hover:opacity-90 shadow-xs"
              >
                Confirm Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
