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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  HelpCircleIcon,
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
  const [lang, setLang] = React.useState<"si" | "en">("si");
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
          // Only prefill input if currently empty (e.g. initial dialog open)
          setCountedCashInput((prev) =>
            prev.trim() === "" ? String(res.audit.expectedPhysicalDrawerCash) : prev
          );
          setFloatAmountInput(res.audit.defaultConfiguredFloat || 4000);
        } else {
          toast.error(res.error || "Failed to load discrepancy audit data.");
        }
      } catch (err) {
        console.error("Discrepancy fetch error:", err);
        toast.error("Failed to connect to server.");
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
      toast.error(
        lang === "si" ? "කරුණාකර නිවැරදි මුදලක් ඇතුළත් කරන්න." : "Please enter a valid cash amount."
      );
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
      toast.error("Opening float cannot be negative.");
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
        toast.success(res.message || "Opening float saved successfully.");
        setSubModal("NONE");
        fetchAudit();
        onUpdated?.();
      } else {
        toast.error(res.error || "Failed to save opening float.");
      }
    } catch {
      toast.error("Server error while saving float.");
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
        ? "Till counter surplus / unrecorded walk-in printing reconciliation"
        : "Till cash shortage reconciliation"
    );
    setSubModal("RECORD_ADJUSTMENT");
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjAmountInput <= 0) {
      toast.error("Adjustment amount must be greater than zero.");
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
        toast.success(res.message || "Adjustment recorded successfully.");
        setSubModal("NONE");
        fetchAudit();
        onUpdated?.();
      } else {
        toast.error(res.error || "Failed to record adjustment.");
      }
    } catch {
      toast.error("Server error recording adjustment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResyncLedger = async () => {
    setActionLoading(true);
    try {
      const res = await recalculateAndSyncShopCashAction(shopId);
      if (res.success) {
        toast.success("Ledger running balance resynchronized.");
        fetchAudit();
        onUpdated?.();
      } else {
        toast.error(res.error || "Failed to resync ledger.");
      }
    } catch {
      toast.error("Error resyncing ledger.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <ScaleIcon className="size-6" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <span>Discrepancy Management System</span>
                    <Badge variant="outline" className="font-mono text-xs uppercase bg-primary/5">
                      {shopCode}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {lang === "si"
                      ? `${shopName} මුදල් ලාච්චුවේ ශේෂය, ලැබීම්, ආරම්භක මුදල් සහ වෙනස්කම් ස්වයංක්‍රීයව පරීක්ෂා කර සත්‍යාපනය කරන්න.`
                      : `Automated cash drawer reconciliation, float verification & discrepancy diagnostic for ${shopName}.`}
                  </DialogDescription>
                </div>
              </div>

              {/* Language Switcher & Date Picker */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-8 text-xs font-mono w-[130px]"
                />
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setLang("si")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      lang === "si"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    සිංහල
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang("en")}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      lang === "en"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="text-xs">
                {lang === "si"
                  ? "මුදල් ලාච්චුවේ ගනුදෙනු හා ශේෂයන් විශ්ලේෂණය කරමින් පවතී..."
                  : "Analyzing till transactions & calculating physical balances..."}
              </p>
            </div>
          ) : auditData ? (
            <div className="space-y-6 pt-2">
              {/* Top Banner: Real-Time Cash Drawer Status */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  auditData.varianceStatus === "BALANCED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                    : auditData.varianceStatus === "SURPLUS"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {auditData.varianceStatus === "BALANCED" ? (
                      <CheckCircle2Icon className="size-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : auditData.varianceStatus === "SURPLUS" ? (
                      <AlertTriangleIcon className="size-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircleIcon className="size-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base">
                          {lang === "si"
                            ? auditData.varianceStatus === "BALANCED"
                              ? "මුදල් ලාච්චුව 100% ක් සමබරයි"
                              : auditData.varianceStatus === "SURPLUS"
                              ? `ලාච්චුවේ අතිරික්තයක් ඇත (+LKR ${auditData.variance.toLocaleString()})`
                              : `ලාච්චුවේ හිඟ මුදලක් ඇත (-LKR ${Math.abs(auditData.variance).toLocaleString()})`
                            : auditData.varianceStatus === "BALANCED"
                            ? "Cash Drawer 100% Balanced"
                            : auditData.varianceStatus === "SURPLUS"
                            ? `Cash Surplus Detected (+LKR ${auditData.variance.toLocaleString()})`
                            : `Cash Shortage Detected (-LKR ${Math.abs(auditData.variance).toLocaleString()})`}
                        </h4>
                        <Badge
                          className={`text-[10px] px-2 py-0 uppercase font-semibold ${
                            auditData.varianceStatus === "BALANCED"
                              ? "bg-emerald-600 text-white"
                              : auditData.varianceStatus === "SURPLUS"
                              ? "bg-amber-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {auditData.varianceStatus}
                        </Badge>
                      </div>

                      {/* Plain-Language Explanation */}
                      <p className="text-xs mt-1.5 leading-relaxed font-medium opacity-90 max-w-2xl">
                        {lang === "si"
                          ? auditData.plainLanguageSummary.si
                          : auditData.plainLanguageSummary.en}
                      </p>

                      {/* Action Advice */}
                      <p className="text-[11px] mt-1 text-primary dark:text-primary-foreground font-semibold flex items-center gap-1">
                        <SparklesIcon className="size-3.5 shrink-0" />
                        <span>
                          {lang === "si"
                            ? auditData.plainLanguageSummary.actionAdviceSi
                            : auditData.plainLanguageSummary.actionAdviceEn}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchAudit()}
                      disabled={actionLoading}
                      className="text-xs gap-1.5 bg-background shadow-xs"
                    >
                      <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                      <span>{lang === "si" ? "යාවත්කාලීන" : "Refresh"}</span>
                    </Button>
                    {auditData.variance !== 0 && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenRecordAdj()}
                        disabled={actionLoading}
                        className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                      >
                        <SlidersHorizontalIcon className="size-3.5" />
                        <span>{lang === "si" ? "සමබර කරන්න" : "Reconcile"}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Core Calculator Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Expected Physical Cash in Drawer */}
                <Card className="p-4 bg-card border-border shadow-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      {lang === "si" ? "ලාච්චුවේ තිබිය යුතු මුදල" : "Expected in Drawer"}
                    </span>
                    <BanknoteIcon className="size-4 text-primary" />
                  </div>
                  <div className="text-2xl font-black font-mono mt-1 text-foreground">
                    LKR{" "}
                    {auditData.expectedPhysicalDrawerCash.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                    <span>
                      {lang === "si" ? "ආරම්භක මුදල (Float)" : "Opening Float"}:{" "}
                      <strong className="text-foreground">
                        LKR{" "}
                        {(auditData.hasOpeningFloatRecord
                          ? auditData.openingFloatAmount
                          : auditData.defaultConfiguredFloat
                        ).toLocaleString()}
                      </strong>{" "}
                      {!auditData.hasOpeningFloatRecord && (
                        <span className="text-amber-600 font-semibold">(Unrecorded)</span>
                      )}
                    </span>
                    <span>
                      {lang === "si" ? "දවසේ ලැබීම් (Net Cash)" : "Today's Collections"}:{" "}
                      <strong className="text-foreground">
                        LKR {auditData.todayNetCollections.toLocaleString()}
                      </strong>
                    </span>
                  </div>
                </Card>

                {/* 2. Physical Counted Cash (Interactive Input) */}
                <Card className="p-4 bg-card border-primary/40 shadow-xs relative ring-1 ring-primary/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                        {lang === "si" ? "ගණන් කළ මුදල (Counted Cash)" : "Physical Counted Cash"}
                      </span>
                      <CoinsIcon className="size-4 text-primary" />
                    </div>

                    <form onSubmit={handleCheckCountedCash} className="mt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs font-mono font-bold text-muted-foreground">
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
                          className="pl-12 h-9 text-base font-bold font-mono text-foreground"
                        />
                      </div>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={loading || countedCashInput.trim() === ""}
                        className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shrink-0 shadow-xs cursor-pointer"
                      >
                        {loading ? (
                          <Loader2Icon className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2Icon className="size-3.5" />
                        )}
                        <span>{lang === "si" ? "Check" : "Check"}</span>
                      </Button>
                    </form>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(auditData.expectedPhysicalDrawerCash)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-mono transition-colors"
                    >
                      Expected ({auditData.expectedPhysicalDrawerCash.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(25020)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-mono transition-colors"
                    >
                      Oct 13 (25,020)
                    </button>
                  </div>
                </Card>

                {/* 3. Variance / Discrepancy Amount */}
                <Card
                  className={`p-4 border shadow-xs ${
                    auditData.varianceStatus === "BALANCED"
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : auditData.varianceStatus === "SURPLUS"
                      ? "bg-amber-500/5 border-amber-500/30"
                      : "bg-rose-500/5 border-rose-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">
                      {lang === "si" ? "මුදල් වෙනස (Discrepancy)" : "Variance (Counted - Expected)"}
                    </span>
                    {auditData.variance > 0 ? (
                      <ArrowUpRightIcon className="size-4 text-amber-600" />
                    ) : auditData.variance < 0 ? (
                      <ArrowDownRightIcon className="size-4 text-rose-600" />
                    ) : (
                      <CheckCircle2Icon className="size-4 text-emerald-600" />
                    )}
                  </div>
                  <div
                    className={`text-2xl font-black font-mono mt-1 ${
                      auditData.varianceStatus === "BALANCED"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : auditData.varianceStatus === "SURPLUS"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {auditData.variance >= 0 ? "+" : ""}
                    LKR{" "}
                    {auditData.variance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {auditData.varianceStatus === "BALANCED"
                      ? lang === "si"
                        ? "මුදල් ලාච්චුව සම්පූර්ණයෙන්ම සමපාතයි."
                        : "Drawer count exactly matches expected funds."
                      : auditData.varianceStatus === "SURPLUS"
                      ? lang === "si"
                        ? "සිස්ටම් එකට වඩා ලාච්චුවේ මුදල් වැඩියෙන් තිබේ."
                        : "Physical cash exceeds system calculation."
                      : lang === "si"
                        ? "සිස්ටම් එකට වඩා ලාච්චුවේ මුදල් අඩුවෙන් තිබේ."
                        : "Physical cash is less than system calculation."}
                  </span>
                </Card>
              </div>

              {/* Automated Diagnostic Checks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="size-4 text-primary" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {lang === "si" ? "ස්වයංක්‍රීය පරීක්ෂණ වාර්තාව" : "Diagnostic Health Checks"}
                    </h5>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {lang === "si" ? "දෝෂ සහ වෙනස්කම් ස්වයංක්‍රීයව හඳුනාගැනීම" : "Rule-based discrepancy engine"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auditData.diagnosticChecks.map((chk) => (
                    <Card
                      key={chk.id}
                      className={`p-3.5 border transition-all ${
                        chk.status === "PASSED"
                          ? "bg-card border-border/80"
                          : chk.status === "WARNING"
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-rose-500/5 border-rose-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {chk.status === "PASSED" ? (
                            <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : chk.status === "WARNING" ? (
                            <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircleIcon className="size-4 text-rose-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <h6 className="text-xs font-bold text-foreground">
                              {lang === "si" ? chk.titleSi : chk.title}
                            </h6>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {lang === "si" ? chk.summarySi : chk.summary}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={chk.status === "PASSED" ? "secondary" : "outline"}
                          className={`text-[10px] shrink-0 ${
                            chk.status === "PASSED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : chk.status === "WARNING"
                              ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                              : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {chk.status}
                        </Badge>
                      </div>

                      {chk.actionCode && chk.actionCode !== "NONE" && (
                        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">
                            {lang === "si" ? "නිවැරදි කිරීමේ පියවර:" : "Recommended resolution:"}
                          </span>
                          {chk.actionCode === "SET_OPENING_FLOAT" && (
                            <Button
                              size="sm"
                              onClick={handleOpenSetFloat}
                              disabled={actionLoading}
                              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                              <CoinsIcon className="size-3 mr-1" />
                              {lang === "si" ? "ආරම්භක මුදල සටහන් කරන්න" : "Set Opening Float"}
                            </Button>
                          )}
                          {chk.actionCode === "RECORD_ADJUSTMENT" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenRecordAdj()}
                              disabled={actionLoading}
                              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                              <SlidersHorizontalIcon className="size-3 mr-1" />
                              {lang === "si" ? "වෙනස සමබර කරන්න" : "Reconcile Difference"}
                            </Button>
                          )}
                          {chk.actionCode === "RESYNC_LEDGER" && (
                            <Button
                              size="sm"
                              onClick={handleResyncLedger}
                              disabled={actionLoading}
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                              <RefreshCwIcon className="size-3 mr-1" />
                              {lang === "si" ? "ශේෂය නැවත ගණනය කරන්න" : "Re-sync Ledger"}
                            </Button>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>

              {/* Fund Flow & Inflows Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {lang === "si"
                      ? "අද දවසේ මුදල් ලාච්චුවේ ලැබීම් වර්ගීකරණය"
                      : "Today's Drawer Cash Inflow Breakdown"}
                  </h5>
                  <span className="text-[11px] text-muted-foreground">
                    {lang === "si" ? "භෞතික මුදල් ගනුදෙනු පමණි" : "Physical cash receipts only"}
                  </span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden bg-card text-xs">
                  <table className="w-full">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-3.5 text-left">
                          {lang === "si" ? "ලැබීම් වර්ගය" : "Category / Stream"}
                        </th>
                        <th className="py-2.5 px-3.5 text-left">
                          {lang === "si" ? "විස්තරය" : "Description & Notes"}
                        </th>
                        <th className="py-2.5 px-3.5 text-right font-mono">
                          {lang === "si" ? "මුදල (LKR)" : "Amount (LKR)"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {lang === "si" ? "ආරම්භක මුදල (Opening Float)" : "Opening Cash Float"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {auditData.hasOpeningFloatRecord
                            ? lang === "si"
                              ? "උදෑසන ලාච්චුවේ තිබූ ආරම්භක මුදල (සිස්ටම් එකේ සටහන්ව ඇත)"
                              : "Retained cash float in till at shop opening (Active in ERP)"
                            : lang === "si"
                              ? "උදෑසන ආරම්භක මුදල (සිස්ටම් එකේ සටහන් කර නැත)"
                              : "Default morning float (Not yet registered in ERP)"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                          LKR{" "}
                          {(auditData.hasOpeningFloatRecord
                            ? auditData.openingFloatAmount
                            : auditData.defaultConfiguredFloat
                          ).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {lang === "si"
                            ? "රීලෝඩ් සහ බිල්පත් ගෙවීම් (Reloads & Bills)"
                            : "Telecom Reloads & Utility Bills (Cash)"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {lang === "si"
                            ? "Dialog, Mobitel, Airtel, Hutch රීලෝඩ්/පැකේජ් සහ ජල/විදුලි බිල්පත් සඳහා කවුන්ටරයෙන් ගත් මුදල්"
                            : "Physical cash collected from customers for telecom reloads, packages & utility bills"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600">
                          + LKR{" "}
                          {(
                            auditData.inflows.reloadsAndBillsCash ??
                            auditData.inflows.reloadCash + auditData.inflows.utilityBillsCash
                          ).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {lang === "si" ? "විකුණුම් ලැබීම් (Retail Sales)" : "Retail Items & Printing"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {lang === "si"
                            ? "ෆොටෝකොපි, මුද්‍රණ, ලිපිද්‍රව්‍ය ආදී විකුණුම් සඳහා මුදලින් ගත් ආදායම"
                            : "Photocopies, printouts, typing, and retail stationary sales"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600">
                          + LKR {auditData.inflows.retailSalesCash.toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {lang === "si" ? "අනෙක් ශාඛා පන්ති ගාස්තු" : "Cross-Branch Tuition/Fees Held"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {lang === "si"
                            ? "වෙනත් ශාඛා (උදා: මාතලේ) සඳහා මෙහිදී ගෙවූ පන්ති ගාස්තු මුදල්"
                            : "Cash collected for other branches, safely held in this counter till"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-blue-600">
                          + LKR {auditData.inflows.crossBranchCash.toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 px-3.5 font-semibold text-foreground">
                          {lang === "si" ? "ණය පියවීම් (Debt Repayments Cash)" : "Customer Debt Settlements (Cash)"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground">
                          {lang === "si"
                            ? "පෙර ණය මුදලින් පියවූ මුදල් (විකුණුම් වලට එකතු නොවේ)"
                            : "Cash debt payments received (enters till, excluded from sales revenue)"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground">
                          + LKR {auditData.inflows.debtRepaymentsCash.toLocaleString()}
                        </td>
                      </tr>

                      {auditData.inflows.cashAdjustmentsInflow > 0 && (
                        <tr>
                          <td className="py-2.5 px-3.5 font-semibold text-foreground">
                            {lang === "si" ? "මුදල් අතිරික්ත ගැලපුම්" : "Cash Surplus Adjustments"}
                          </td>
                          <td className="py-2.5 px-3.5 text-muted-foreground">
                            {lang === "si" ? "ලාච්චුව සමබර කිරීමට සටහන් කළ අතිරික්ත" : "Reconciliation surplus adjustment"}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-600">
                            + LKR {auditData.inflows.cashAdjustmentsInflow.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      <tr className="bg-muted/30 font-bold">
                        <td className="py-2.5 px-3.5 text-foreground">
                          {lang === "si" ? "මුළු එකතුව (Total Expected Drawer)" : "Total Expected Drawer Cash"}
                        </td>
                        <td className="py-2.5 px-3.5 text-muted-foreground text-[11px]">
                          {lang === "si" ? "ආරම්භක මුදල + අද දවසේ ලැබීම්" : "Float + Collections"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-base text-foreground">
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
              <Card className="p-4 bg-muted/20 border-border">
                <div className="flex items-start gap-3">
                  <InfoIcon className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <h6 className="font-bold text-foreground">
                      {lang === "si"
                        ? "මුදල් නොවන ගනුදෙනු වෙන් කර තැබීම (Non-Cash Fund Segregation)"
                        : "Non-Cash Transaction Isolation Audit"}
                    </h6>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      {lang === "si"
                        ? `අද දින ණය විකුණුම් (LKR ${auditData.nonCashSeparation.creditSalesAmount.toLocaleString()}) සහ බැංකුවට ලැබුණු ණය පියවීම් (LKR ${auditData.nonCashSeparation.bankTransferDebtRepayments.toLocaleString()}) කිසිවක් මුදල් ලාච්චුවේ ශේෂයට එකතු වී නැත. එමඟින් ලාච්චුවේ භෞතික මුදල් ශේෂය 100% ක් නිවැරදිව පවත්වා ගනී.`
                        : `Credit sales (LKR ${auditData.nonCashSeparation.creditSalesAmount.toLocaleString()}) and bank transfer debt settlements (LKR ${auditData.nonCashSeparation.bankTransferDebtRepayments.toLocaleString()}) were properly excluded from the cash drawer to protect physical till integrity.`}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          <DialogFooter className="border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {lang === "si" ? "වසන්න" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL 1: SET OPENING FLOAT */}
      <Dialog open={subModal === "SET_FLOAT"} onOpenChange={(o) => !o && setSubModal("NONE")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CoinsIcon className="size-4 text-amber-600" />
              <span>{lang === "si" ? "ආරම්භක මුදල සටහන් කරන්න" : "Record Daily Opening Float"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {lang === "si"
                ? `${shopName} සඳහා ${selectedDate} දින ආරම්භක මුදල ලේඛනයට ඇතුළත් කරන්න.`
                : `Set the opening cash float kept in the drawer for ${shopName} on ${selectedDate}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFloat} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {lang === "si" ? "ආරම්භක මුදල (LKR) *" : "Float Amount (LKR) *"}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">
                  LKR
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={floatAmountInput}
                  onChange={(e) => setFloatAmountInput(Number(e.target.value) || 0)}
                  className="pl-12 font-mono font-bold text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lang === "si"
                  ? "සාමාන්‍යයෙන් ලාච්චුවේ තබා ගන්නා මුදල (උදා: LKR 4,000)."
                  : "Standard drawer float kept at opening (e.g. LKR 4,000)."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {lang === "si" ? "සටහන (අත්‍යවශ්‍ය නොවේ)" : "Note / Remarks (Optional)"}
              </label>
              <Textarea
                placeholder="e.g. Counter drawer cash float"
                value={floatNoteInput}
                onChange={(e) => setFloatNoteInput(e.target.value)}
                className="text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubModal("NONE")}
                disabled={actionLoading}
              >
                {lang === "si" ? "අවලංගු කරන්න" : "Cancel"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {actionLoading ? (
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2Icon className="size-3.5 mr-1.5" />
                )}
                {lang === "si" ? "තහවුරු කරන්න" : "Save Opening Float"}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <SlidersHorizontalIcon className="size-4 text-amber-600" />
              <span>
                {lang === "si" ? "මුදල් වෙනස සමබර කිරීමේ ගැලපුම" : "Record Cash Drawer Adjustment"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {lang === "si"
                ? "භෞතික මුදල් ලාච්චුව සහ සිස්ටම් එක 100% ක් සමපාත කිරීම සඳහා ගැලපුමක් සටහන් කරන්න."
                : "True-up ledger records to align with actual counted drawer cash."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdjustment} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {lang === "si" ? "ගැලපුම් වර්ගය *" : "Adjustment Type *"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjTypeInput("SURPLUS")}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                    adjTypeInput === "SURPLUS"
                      ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {lang === "si" ? "+ අතිරික්තයක් (Surplus)" : "+ Surplus Inflow"}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjTypeInput("SHORTAGE")}
                  className={`p-2.5 rounded-lg border text-xs font-bold text-center transition-all ${
                    adjTypeInput === "SHORTAGE"
                      ? "bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {lang === "si" ? "- හිඟයක් (Shortage)" : "- Shortage Outflow"}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {lang === "si" ? "ගැලපුම් මුදල (LKR) *" : "Adjustment Amount (LKR) *"}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-mono text-muted-foreground">
                  LKR
                </span>
                <Input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={adjAmountInput}
                  onChange={(e) => setAdjAmountInput(Number(e.target.value) || 0)}
                  className="pl-12 font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {lang === "si" ? "හේතුව / විස්තරය *" : "Reason / Explanation *"}
              </label>
              <Textarea
                placeholder="e.g. Unrecorded walk-in photocopy sales surplus / rounding"
                value={adjReasonInput}
                onChange={(e) => setAdjReasonInput(e.target.value)}
                className="text-xs"
                rows={2}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubModal("NONE")}
                disabled={actionLoading}
              >
                {lang === "si" ? "අවලංගු කරන්න" : "Cancel"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading || adjAmountInput <= 0}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {actionLoading ? (
                  <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2Icon className="size-3.5 mr-1.5" />
                )}
                {lang === "si" ? "ගැලපුම සටහන් කරන්න" : "Record Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
