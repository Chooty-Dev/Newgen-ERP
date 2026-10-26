"use client";

import React from "react";
import {
  Building2Icon,
  HandCoinsIcon,
  LandmarkIcon,
  ArrowUpDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { settleInterBranchCashAction } from "@/actions/finances";

interface InterBranchSettleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHoldingDue: {
    shopId: string;
    shopName: string;
    shopCode: string;
    totalAmount: number;
    count: number;
    recordIds: string[];
  } | null;
  shopId: string;
  shopName: string;
  bankAccounts: any[];
  onSuccess: () => void;
}

export function InterBranchSettleDialog({
  open,
  onOpenChange,
  selectedHoldingDue,
  shopId,
  shopName,
  bankAccounts,
  onSuccess,
}: InterBranchSettleDialogProps) {
  const [settlementType, setSettlementType] = React.useState<"HANDOVER_TO_BRANCH" | "DEPOSITED_TO_BANK" | "DIRECT_OFFSET">("HANDOVER_TO_BRANCH");
  const [settlementBankId, setSettlementBankId] = React.useState<string | null>(null);
  const [settlementRef, setSettlementRef] = React.useState("");
  const [settlementNote, setSettlementNote] = React.useState("");
  const [submittingSettlement, setSubmittingSettlement] = React.useState(false);

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldingDue) return;

    if (settlementType === "DEPOSITED_TO_BANK" && !settlementBankId) {
      toast.create({
        title: "Bank Account Required",
        description: "Please select a bank account to record the deposit.",
        type: "error",
      });
      return;
    }

    setSubmittingSettlement(true);
    try {
      const res = await settleInterBranchCashAction({
        recordIds: selectedHoldingDue.recordIds,
        holdingShopId: shopId,
        targetShopId: selectedHoldingDue.shopId,
        settlementType,
        bankAccountId: settlementType === "DEPOSITED_TO_BANK" ? settlementBankId : null,
        reference: settlementRef,
        note: settlementNote,
      });

      if (res.success) {
        toast.create({
          title: "Inter-Branch Cash Settled",
          description: res.message || "Settlement completed successfully.",
          type: "success",
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast.create({
          title: "Settlement Failed",
          description: res.error || "Failed to settle inter-branch cash.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setSubmittingSettlement(false);
    }
  };

  if (!selectedHoldingDue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-xl font-bold text-foreground">
            <Building2Icon className="size-5 text-foreground" />
            <span>Settle Inter-Branch Cash</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record physical cash handover, bank deposit, or debt offset for cross-branch payments collected at {shopName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSettleSubmit} className="space-y-4 pt-2">
          {/* Summary Card */}
          <div className="p-4 rounded-2xl border border-muted/30 bg-surface/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Beneficiary Branch:</span>
              <span className="font-bold text-foreground">
                {selectedHoldingDue.shopName} ({selectedHoldingDue.shopCode})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Total Cash to Settle:</span>
              <span className="text-base font-bold font-mono text-foreground">
                LKR {Number(selectedHoldingDue.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground uppercase font-semibold text-[10px]">Transactions Included:</span>
              <span className="font-mono text-muted-foreground font-medium">
                {selectedHoldingDue.count} record(s)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Settlement Method *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSettlementType("HANDOVER_TO_BRANCH")}
                className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  settlementType === "HANDOVER_TO_BRANCH"
                    ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                    : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                }`}
              >
                <HandCoinsIcon className="size-4 text-foreground" />
                <span>Physical Handover</span>
              </button>
              <button
                type="button"
                onClick={() => setSettlementType("DEPOSITED_TO_BANK")}
                className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  settlementType === "DEPOSITED_TO_BANK"
                    ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                    : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                }`}
              >
                <LandmarkIcon className="size-4 text-foreground" />
                <span>Bank Deposit</span>
              </button>
              <button
                type="button"
                onClick={() => setSettlementType("DIRECT_OFFSET")}
                className={`p-3 rounded-2xl text-xs font-semibold border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                  settlementType === "DIRECT_OFFSET"
                    ? "border-foreground bg-foreground/5 text-foreground ring-1 ring-foreground/20"
                    : "border-muted/30 bg-surface/40 text-muted-foreground hover:bg-surface/70"
                }`}
              >
                <ArrowUpDownIcon className="size-4 text-foreground" />
                <span>Direct Offset</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {settlementType === "HANDOVER_TO_BRANCH" && "Physical cash is transferred from this shop drawer directly to the target branch drawer."}
              {settlementType === "DEPOSITED_TO_BANK" && "Physical cash from this drawer is deposited directly into a company bank account."}
              {settlementType === "DIRECT_OFFSET" && "Offsets mutual debt balances between the two branches without moving cash."}
            </p>
          </div>

          {settlementType === "DEPOSITED_TO_BANK" && (
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-muted/30 bg-surface/40">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <LandmarkIcon className="size-3.5 text-foreground" />
                Select Company Bank Account *
              </label>
              <select
                value={settlementBankId || ""}
                onChange={(e) => setSettlementBankId(e.target.value || null)}
                className="w-full h-14 rounded-2xl border border-muted/30 bg-background/50 text-foreground px-4 text-xs font-medium outline-none focus:border-foreground"
              >
                <option value="">Choose Bank Account...</option>
                {bankAccounts.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bankName} - {b.accountName} ({b.accountNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Reference / Slip No.
              </label>
              <Input
                placeholder="e.g. SLIP-10293 or Handover ID"
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
                className="h-14 rounded-2xl font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Settlement Date
              </label>
              <Input
                value={new Date().toLocaleDateString()}
                disabled
                className="h-14 bg-surface/40 font-mono rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">
              Settlement Notes / Handed Over By
            </label>
            <Textarea
              placeholder="e.g. Physical cash handed over to branch manager / deposit slip verified..."
              value={settlementNote}
              onChange={(e) => setSettlementNote(e.target.value)}
              className="rounded-2xl min-h-[80px]"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-6 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-2xl border border-muted/30 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingSettlement}
              className="h-12 px-8 rounded-2xl bg-foreground text-background font-semibold hover:opacity-90 shadow-xs"
            >
              Confirm Settlement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
