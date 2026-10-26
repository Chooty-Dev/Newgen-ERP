"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getShopDiscrepancyAuditAction,
  recordShopOpeningFloatAction,
  recordShopCashAdjustmentAction,
  recalculateAndSyncShopCashAction,
} from "@/actions/shops";
import { type DiscrepancyAuditData } from "@/lib/balance";
import { toast } from "@/components/ui/toast";
import {
  ScaleIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  Loader2Icon,
  RefreshCwIcon,
  CoinsIcon,
  BanknoteIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  SlidersHorizontalIcon,
  InfoIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "lucide-react";

interface DiscrepancyManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  shopName: string;
  shopCode: string;
  onUpdated?: () => void;
}

export function DiscrepancyManagerDialog({
  open,
  onOpenChange,
  shopId,
  shopName,
  shopCode,
  onUpdated,
}: DiscrepancyManagerDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [auditData, setAuditData] = React.useState<DiscrepancyAuditData | null>(null);
  const [countedCashInput, setCountedCashInput] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [actionLoading, setActionLoading] = React.useState(false);

  // Sub-modal states
  const [subModal, setSubModal] = React.useState<"NONE" | "SET_FLOAT" | "RECORD_ADJUSTMENT">("NONE");
  const [floatAmountInput, setFloatAmountInput] = React.useState<number>(4000);
  const [floatNoteInput, setFloatNoteInput] = React.useState<string>("");
  const [adjAmountInput, setAdjAmountInput] = React.useState<number>(0);
  const [adjTypeInput, setAdjTypeInput] = React.useState<"SURPLUS" | "SHORTAGE">("SURPLUS");
  const [adjReasonInput, setAdjReasonInput] = React.useState<string>("");

  const countedCashInputRef = React.useRef(countedCashInput);
  countedCashInputRef.current = countedCashInput;

  const fetchAudit = React.useCallback(
    async (countedVal?: number | null, overrideDate?: string) => {
      if (!shopId) return;
      setLoading(true);
      try {
        const dateToUse = overrideDate || selectedDate;
        let parsedCount: number | null = null;
        if (typeof countedVal === "number") {
          parsedCount = countedVal;
        } else if (countedVal === null) {
          parsedCount = null;
        } else {
          const currentVal = countedCashInputRef.current.trim();
          parsedCount = currentVal !== "" && !isNaN(Number(currentVal)) ? Number(currentVal) : null;
        }

        const res = await getShopDiscrepancyAuditAction(shopId, parsedCount, dateToUse);
        if (res.success && res.audit) {
          setAuditData(res.audit);
          setCountedCashInput((prev) =>
            prev.trim() === "" ? String(res.audit.expectedPhysicalDrawerCash) : prev
          );
          setFloatAmountInput(res.audit.defaultConfiguredFloat || 4000);
        } else {
          toast.create({
            title: "Error",
            description: res.error || "Failed to load discrepancy audit data.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Discrepancy fetch error:", err);
        toast.create({ title: "Error", description: "Failed to connect to server.", type: "error" });
      } finally {
        setLoading(false);
      }
    },
    [shopId, selectedDate]
  );

  React.useEffect(() => {
    if (open) {
      fetchAudit();
    } else {
      setAuditData(null);
      setCountedCashInput("");
    }
  }, [open, selectedDate, shopId, fetchAudit]);

  const handleCheckCountedCash = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = countedCashInput.trim();
    const parsed = Number(trimmed);
    if (trimmed !== "" && !isNaN(parsed)) {
      fetchAudit(parsed);
    } else {
      toast.create({
        title: "Invalid Input",
        description: "Please enter a valid cash amount.",
        type: "error",
      });
    }
  };

  const handleApplyPreset = (amt: number) => {
    setCountedCashInput(String(amt));
    fetchAudit(amt);
  };

  const handleOpenSetFloat = () => {
    setFloatAmountInput(auditData?.defaultConfiguredFloat || 4000);
    setFloatNoteInput("");
    setSubModal("SET_FLOAT");
  };

  const handleSubmitFloat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (floatAmountInput < 0) {
      toast.create({
        title: "Validation Error",
        description: "Opening float cannot be negative.",
        type: "error",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await recordShopOpeningFloatAction({
        shopId,
        amount: floatAmountInput,
        date: selectedDate,
        note: floatNoteInput,
      });
      if (res.success) {
        toast.create({
          title: "Float Saved",
          description: res.message || "Opening float saved successfully.",
        });
        setSubModal("NONE");
        fetchAudit();
        onUpdated?.();
      } else {
        toast.create({
          title: "Save Failed",
          description: res.error || "Failed to save opening float.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Server Error",
        description: "Server error while saving float.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRecordAdj = (suggestedAmt?: number, suggestedType?: "SURPLUS" | "SHORTAGE") => {
    const amt =
      typeof suggestedAmt === "number"
        ? Math.abs(suggestedAmt)
        : Math.abs(auditData?.variance || 0);
    const type =
      suggestedType || (auditData?.variance && auditData.variance > 0 ? "SURPLUS" : "SHORTAGE");

    setAdjAmountInput(amt);
    setAdjTypeInput(type);
    setAdjReasonInput(
      type === "SURPLUS"
        ? "Till counter surplus / unrecorded walk-in reconciliation"
        : "Till cash shortage reconciliation"
    );
    setSubModal("RECORD_ADJUSTMENT");
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjAmountInput <= 0) {
      toast.create({
        title: "Validation Error",
        description: "Adjustment amount must be greater than zero.",
        type: "error",
      });
      return;
    }
    setActionLoading(true);
    try {
      const res = await recordShopCashAdjustmentAction({
        shopId,
        amount: adjAmountInput,
        type: adjTypeInput,
        reason: adjReasonInput,
        date: selectedDate,
      });
      if (res.success) {
        toast.create({
          title: "Adjustment Recorded",
          description: res.message || "Adjustment recorded successfully.",
        });
        setSubModal("NONE");
        fetchAudit();
        onUpdated?.();
      } else {
        toast.create({
          title: "Operation Failed",
          description: res.error || "Failed to record adjustment.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Server error recording adjustment.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResyncLedger = async () => {
    setActionLoading(true);
    try {
      const res = await recalculateAndSyncShopCashAction(shopId);
      if (res.success) {
        toast.create({
          title: "Ledger Synchronized",
          description: "Ledger running balance resynchronized.",
        });
        fetchAudit();
        onUpdated?.();
      } else {
        toast.create({
          title: "Sync Failed",
          description: res.error || "Failed to resync ledger.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Error resyncing ledger.",
        type: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-panel w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-6 sm:p-10 rounded-3xl border-muted/30">
          <DialogHeader className="border-b border-muted/20 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ScaleIcon className="size-8 text-foreground shrink-0" />
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <span>Discrepancy Diagnostics</span>
                    <span className="font-mono text-sm px-2.5 py-0.5 rounded-full bg-surface/50 border border-muted/30 text-foreground font-semibold">
                      {shopCode}
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    Automated cash drawer reconciliation, float verification, and discrepancy diagnostics for {shopName}.
                  </DialogDescription>
                </div>
              </div>

              {/* Date Filter Picker */}
              <div className="flex items-center gap-3">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-12 text-sm font-mono w-[150px] rounded-2xl bg-surface/40 border-muted/30"
                />
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin" />
              <p className="text-sm font-medium">
                Analyzing till transactions and calculating physical balances...
              </p>
            </div>
          ) : auditData ? (
            <div className="space-y-8 pt-4">
              {/* Top Banner: Real-Time Cash Drawer Status */}
              <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    {auditData.varianceStatus === "BALANCED" ? (
                      <CheckCircle2Icon className="size-8 text-foreground shrink-0 mt-0.5" />
                    ) : auditData.varianceStatus === "SURPLUS" ? (
                      <AlertTriangleIcon className="size-8 text-foreground shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="size-8 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-xl text-foreground">
                          {auditData.varianceStatus === "BALANCED"
                            ? "Cash Drawer 100% Balanced"
                            : auditData.varianceStatus === "SURPLUS"
                            ? `Cash Surplus Detected (+LKR ${auditData.variance.toLocaleString()})`
                            : `Cash Shortage Detected (-LKR ${Math.abs(auditData.variance).toLocaleString()})`}
                        </h4>
                        <span className="text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wider bg-surface/60 border border-muted/30 text-foreground">
                          {auditData.varianceStatus}
                        </span>
                      </div>

                      {/* Plain-Language Explanation */}
                      <p className="text-sm mt-2 leading-relaxed text-muted-foreground font-medium max-w-2xl">
                        {auditData.plainLanguageSummary.en}
                      </p>

                      {/* Action Advice */}
                      <p className="text-sm mt-2 text-foreground font-semibold flex items-center gap-2">
                        <SparklesIcon className="size-4 shrink-0" />
                        <span>{auditData.plainLanguageSummary.actionAdviceEn}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-3 shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => fetchAudit()}
                      disabled={actionLoading}
                      className="h-12 rounded-2xl px-5 text-sm font-semibold gap-2 border-muted/30 bg-surface/30 hover:bg-surface/60"
                    >
                      <RefreshCwIcon className={`size-4 ${loading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </Button>
                    {auditData.variance !== 0 && (
                      <Button
                        onClick={() => handleOpenRecordAdj()}
                        disabled={actionLoading}
                        className="h-12 rounded-2xl px-5 text-sm font-semibold gap-2 bg-foreground text-background hover:opacity-90"
                      >
                        <SlidersHorizontalIcon className="size-4" />
                        <span>Reconcile</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Core Calculator Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Expected Physical Cash in Drawer */}
                <div className="glass-card p-6 rounded-3xl border border-muted/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Expected in Drawer
                      </span>
                      <BanknoteIcon className="size-5 text-foreground" />
                    </div>
                    <div className="text-3xl font-extrabold font-mono mt-3 text-foreground">
                      LKR{" "}
                      {auditData.expectedPhysicalDrawerCash.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-muted/20 flex flex-col gap-1">
                    <span>
                      Opening Float:{" "}
                      <strong className="text-foreground">
                        LKR{" "}
                        {(auditData.hasOpeningFloatRecord
                          ? auditData.openingFloatAmount
                          : auditData.defaultConfiguredFloat
                        ).toLocaleString()}
                      </strong>{" "}
                      {!auditData.hasOpeningFloatRecord && (
                        <span className="text-muted-foreground font-semibold">(Unrecorded)</span>
                      )}
                    </span>
                    {auditData.previousUnsettledCash > 0 && (
                      <span>
                        Prior Unsettled Cash:{" "}
                        <strong className="text-foreground">
                          + LKR {auditData.previousUnsettledCash.toLocaleString()}
                        </strong>
                      </span>
                    )}
                    <span>
                      Today Collections:{" "}
                      <strong className="text-foreground">
                        + LKR {auditData.todayNetCollections.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 2. Physical Counted Cash (Interactive Input) */}
                <div className="glass-card p-6 rounded-3xl border border-muted/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Counted Drawer Cash
                      </span>
                      <CoinsIcon className="size-5 text-foreground" />
                    </div>

                    <form onSubmit={handleCheckCountedCash} className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-muted-foreground">
                          LKR
                        </span>
                        <Input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={countedCashInput}
                          onChange={(e) => setCountedCashInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCheckCountedCash();
                            }
                          }}
                          className="pl-12 h-14 text-base font-bold font-mono text-foreground rounded-2xl bg-surface/40 border-muted/30"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading || countedCashInput.trim() === ""}
                        className="h-14 px-5 rounded-2xl bg-foreground text-background hover:opacity-90 font-bold text-sm gap-2 shrink-0"
                      >
                        {loading ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2Icon className="size-4" />
                        )}
                        <span>Check</span>
                      </Button>
                    </form>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-muted/20">
                    <span className="text-xs text-muted-foreground">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(auditData.expectedPhysicalDrawerCash)}
                      className="text-xs px-3 py-1 rounded-xl bg-surface/50 hover:bg-surface/80 border border-muted/20 text-foreground font-mono transition-colors cursor-pointer"
                    >
                      Expected ({auditData.expectedPhysicalDrawerCash.toLocaleString()})
                    </button>
                  </div>
                </div>

                {/* 3. Variance / Discrepancy Amount */}
                <div className="glass-card p-6 rounded-3xl border border-muted/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Variance (Difference)
                      </span>
                      {auditData.variance > 0 ? (
                        <ArrowUpRightIcon className="size-5 text-foreground" />
                      ) : auditData.variance < 0 ? (
                        <ArrowDownRightIcon className="size-5 text-destructive" />
                      ) : (
                        <CheckCircle2Icon className="size-5 text-foreground" />
                      )}
                    </div>
                    <div className="text-3xl font-extrabold font-mono mt-3 text-foreground">
                      {auditData.variance >= 0 ? "+" : ""}
                      LKR{" "}
                      {auditData.variance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-4 pt-3 border-t border-muted/20 block">
                    {auditData.varianceStatus === "BALANCED"
                      ? "Drawer count exactly matches expected funds."
                      : auditData.varianceStatus === "SURPLUS"
                      ? "Physical cash exceeds system calculations."
                      : "Physical cash is less than system calculations."}
                  </span>
                </div>
              </div>

              {/* Automated Diagnostic Checks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="size-5 text-foreground" />
                    <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Diagnostic Checks
                    </h5>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Rule-based discrepancy engine
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auditData.diagnosticChecks.map((chk) => (
                    <div
                      key={chk.id}
                      className="glass-card p-5 rounded-2xl border border-muted/30 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {chk.status === "PASSED" ? (
                              <CheckCircle2Icon className="size-5 text-foreground shrink-0 mt-0.5" />
                            ) : chk.status === "WARNING" ? (
                              <AlertTriangleIcon className="size-5 text-foreground shrink-0 mt-0.5" />
                            ) : (
                              <XCircleIcon className="size-5 text-destructive shrink-0 mt-0.5" />
                            )}
                            <div>
                              <h6 className="text-sm font-bold text-foreground">
                                {chk.title}
                              </h6>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {chk.summary}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border border-muted/30 bg-surface/50 text-foreground shrink-0">
                            {chk.status}
                          </span>
                        </div>
                      </div>

                      {chk.actionCode && chk.actionCode !== "NONE" && (
                        <div className="mt-4 pt-3 border-t border-muted/20 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Resolution:
                          </span>
                          {chk.actionCode === "SET_OPENING_FLOAT" && (
                            <Button
                              size="sm"
                              onClick={handleOpenSetFloat}
                              disabled={actionLoading}
                              className="h-10 rounded-xl px-4 text-xs font-semibold bg-foreground text-background hover:opacity-90"
                            >
                              <CoinsIcon className="size-3.5 mr-1.5" />
                              Set Opening Float
                            </Button>
                          )}
                          {chk.actionCode === "RECORD_ADJUSTMENT" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenRecordAdj()}
                              disabled={actionLoading}
                              className="h-10 rounded-xl px-4 text-xs font-semibold bg-foreground text-background hover:opacity-90"
                            >
                              <SlidersHorizontalIcon className="size-3.5 mr-1.5" />
                              Reconcile Difference
                            </Button>
                          )}
                          {chk.actionCode === "RESYNC_LEDGER" && (
                            <Button
                              size="sm"
                              onClick={handleResyncLedger}
                              disabled={actionLoading}
                              className="h-10 rounded-xl px-4 text-xs font-semibold bg-foreground text-background hover:opacity-90"
                            >
                              <RefreshCwIcon className="size-3.5 mr-1.5" />
                              Re-sync Ledger
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fund Flow & Inflows Breakdown Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Drawer Cash Inflow Breakdown
                  </h5>
                  <span className="text-xs text-muted-foreground">
                    Physical counter cash receipts only
                  </span>
                </div>

                <div className="glass-card rounded-2xl border border-muted/30 overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-surface/30 border-b border-muted/20 text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 text-left">Category / Stream</th>
                        <th className="py-3.5 px-5 text-left">Description</th>
                        <th className="py-3.5 px-5 text-right font-mono">Amount (LKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/20">
                      <tr>
                        <td className="py-3.5 px-5 font-semibold text-foreground">
                          Opening Cash Float
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          {auditData.hasOpeningFloatRecord
                            ? "Retained cash float in till at shop opening (Active in ERP)"
                            : "Default morning float (Not yet registered in ERP)"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                          LKR{" "}
                          {(auditData.hasOpeningFloatRecord
                            ? auditData.openingFloatAmount
                            : auditData.defaultConfiguredFloat
                          ).toLocaleString()}
                        </td>
                      </tr>

                      {auditData.previousUnsettledCash > 0 && (
                        <tr>
                          <td className="py-3.5 px-5 font-semibold text-foreground">
                            Prior Days&apos; Unsettled Cash Retained
                          </td>
                          <td className="py-3.5 px-5 text-muted-foreground">
                            Un-swept counter balance carried forward from previous days (pending Daily Settlement)
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                            + LKR {auditData.previousUnsettledCash.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td className="py-3.5 px-5 font-semibold text-foreground">
                          Telecom Reloads & Utility Bills
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          Physical cash collected for mobile reloads, data packages, and utility payments
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                          + LKR{" "}
                          {(
                            auditData.inflows.reloadsAndBillsCash ??
                            auditData.inflows.reloadCash + auditData.inflows.utilityBillsCash
                          ).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3.5 px-5 font-semibold text-foreground">
                          Retail Items & Printing
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          Photocopies, printouts, typing, and retail stationary sales
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                          + LKR {auditData.inflows.retailSalesCash.toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3.5 px-5 font-semibold text-foreground">
                          Cross-Branch Tuition/Fees Held
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          Cash collected for other branches, safely held in this counter till
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                          + LKR {auditData.inflows.crossBranchCash.toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3.5 px-5 font-semibold text-foreground">
                          Customer Debt Settlements (Cash)
                        </td>
                        <td className="py-3.5 px-5 text-muted-foreground">
                          Cash debt payments received (enters till, excluded from sales revenue)
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                          + LKR {auditData.inflows.debtRepaymentsCash.toLocaleString()}
                        </td>
                      </tr>

                      {auditData.inflows.otherCash > 0 && (
                        <tr>
                          <td className="py-3.5 px-5 font-semibold text-foreground">
                            Other Counter Cash Inflows
                          </td>
                          <td className="py-3.5 px-5 text-muted-foreground">
                            Miscellaneous counter cash receipts
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                            + LKR {auditData.inflows.otherCash.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {auditData.inflows.cashAdjustmentsInflow > 0 && (
                        <tr>
                          <td className="py-3.5 px-5 font-semibold text-foreground">
                            Cash Surplus Adjustments
                          </td>
                          <td className="py-3.5 px-5 text-muted-foreground">
                            Reconciliation surplus adjustment
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-foreground">
                            + LKR {auditData.inflows.cashAdjustmentsInflow.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {auditData.outflows.totalOutflow > 0 && (
                        <tr>
                          <td className="py-3.5 px-5 font-semibold text-foreground">
                            Today Counter Expenses &amp; Outflows
                          </td>
                          <td className="py-3.5 px-5 text-muted-foreground">
                            Counter cash paid out for expenses or daily sweeps today
                          </td>
                          <td className="py-3.5 px-5 text-right font-mono font-bold text-destructive">
                            - LKR {auditData.outflows.totalOutflow.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      <tr className="bg-surface/40 font-bold border-t border-muted/30">
                        <td className="py-4 px-5 text-foreground">
                          Total Expected Drawer Cash
                        </td>
                        <td className="py-4 px-5 text-muted-foreground text-xs">
                          Float + Prior Cash + Today Net Collections
                        </td>
                        <td className="py-4 px-5 text-right font-mono text-lg text-foreground">
                          LKR{" "}
                          {auditData.expectedPhysicalDrawerCash.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-Cash Segregation Card (Proof of Accuracy) */}
              <div className="glass-card p-6 rounded-3xl border border-muted/30">
                <div className="flex items-start gap-4">
                  <InfoIcon className="size-6 text-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h6 className="font-bold text-foreground text-base">
                      Non-Cash Transaction Isolation Audit
                    </h6>
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      Credit sales (LKR {auditData.nonCashSeparation.creditSalesAmount.toLocaleString()}) and bank transfer debt settlements (LKR {auditData.nonCashSeparation.bankTransferDebtRepayments.toLocaleString()}) were properly excluded from the cash drawer to protect physical till integrity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t border-muted/20 pt-6">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-14 rounded-2xl px-8 text-base font-semibold border-muted/30 bg-surface/30 hover:bg-surface/60"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 1: SET OPENING FLOAT */}
      <Dialog open={subModal === "SET_FLOAT"} onOpenChange={(o) => !o && setSubModal("NONE")}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <CoinsIcon className="size-6 text-foreground" />
              <span>Record Daily Opening Float</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-normal">
              Set the opening cash float kept in the drawer for {shopName} on {selectedDate}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFloat} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Float Amount (LKR) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                  LKR
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={floatAmountInput}
                  onChange={(e) => setFloatAmountInput(Number(e.target.value) || 0)}
                  className="pl-14 h-12 rounded-2xl bg-surface/40 border-muted/30 font-mono font-bold text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Standard drawer float kept at opening (e.g. LKR 4,000).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Remarks (Optional)
              </label>
              <Textarea
                placeholder="e.g. Morning counter drawer cash float"
                value={floatNoteInput}
                onChange={(e) => setFloatNoteInput(e.target.value)}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubModal("NONE")}
                disabled={actionLoading}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {actionLoading ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2Icon className="size-4 mr-2" />
                )}
                Save Float
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 2: RECORD CASH ADJUSTMENT */}
      <Dialog
        open={subModal === "RECORD_ADJUSTMENT"}
        onOpenChange={(o) => !o && setSubModal("NONE")}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <SlidersHorizontalIcon className="size-6 text-foreground" />
              <span>Record Cash Drawer Adjustment</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-normal">
              True-up ledger records to align with actual counted drawer cash.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Adjustment Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAdjTypeInput("SURPLUS")}
                  className={`h-12 rounded-2xl border text-sm font-semibold text-center transition-all cursor-pointer ${
                    adjTypeInput === "SURPLUS"
                      ? "bg-foreground text-background border-foreground"
                      : "border-muted/30 bg-surface/30 text-foreground hover:bg-surface/60"
                  }`}
                >
                  + Surplus Inflow
                </button>
                <button
                  type="button"
                  onClick={() => setAdjTypeInput("SHORTAGE")}
                  className={`h-12 rounded-2xl border text-sm font-semibold text-center transition-all cursor-pointer ${
                    adjTypeInput === "SHORTAGE"
                      ? "bg-foreground text-background border-foreground"
                      : "border-muted/30 bg-surface/30 text-foreground hover:bg-surface/60"
                  }`}
                >
                  - Shortage Outflow
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Adjustment Amount (LKR) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                  LKR
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={adjAmountInput}
                  onChange={(e) => setAdjAmountInput(Number(e.target.value) || 0)}
                  className="pl-14 h-12 rounded-2xl bg-surface/40 border-muted/30 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Reason / Explanation *
              </label>
              <Textarea
                placeholder="e.g. Unrecorded walk-in photocopy sales surplus / rounding"
                value={adjReasonInput}
                onChange={(e) => setAdjReasonInput(e.target.value)}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
                required
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubModal("NONE")}
                disabled={actionLoading}
                className="h-12 rounded-2xl text-sm px-6 border-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading || adjAmountInput <= 0}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {actionLoading ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2Icon className="size-4 mr-2" />
                )}
                Record Adjustment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
