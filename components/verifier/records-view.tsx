"use client";

import * as React from "react";
import {
  getFinanceRecordsAction,
  reviewFinanceRecordAction,
} from "@/actions/finances";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reviewFinanceRecordSchema,
  ReviewFinanceRecordInput,
} from "@/schemas/finance";
import {
  CheckCheckIcon,
  CheckCircle2Icon,
  XCircleIcon,
  BuildingIcon,
  CalendarIcon,
  UserIcon,
  DollarSignIcon,
  Loader2Icon,
  LockIcon,
  FileTextIcon,
  ShieldCheckIcon,
  PhoneIcon,
  ZapIcon,
  TagIcon,
  CreditCardIcon,
  HelpCircleIcon,
  WalletIcon,
  ArrowRightIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  type: string;
  colorToken: string;
}

interface RecordsViewProps {
  initialRecords: any[];
  shops: ShopOption[];
  categories: CategoryOption[];
}

export function RecordsView({
  initialRecords,
  shops,
  categories,
}: RecordsViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [shopFilter, setShopFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("PENDING");

  // Review Dialog
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null);
  const [actionType, setActionType] = React.useState<"APPROVE" | "REJECT">("APPROVE");

  const reviewForm = useForm<ReviewFinanceRecordInput>({
    resolver: zodResolver(reviewFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      status: "APPROVED",
      approvedAmount: 0,
      reviewRemarks: "",
    },
  });

  const refreshRecords = async () => {
    setLoading(true);
    const res = await getFinanceRecordsAction({
      shopId: shopFilter !== "ALL" ? shopFilter : undefined,
      categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });
    if (res.success && res.records) {
      setRecords(res.records);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    refreshRecords();
  }, [shopFilter, categoryFilter, statusFilter]);

  const openReviewModal = (record: any) => {
    setSelectedRecord(record);
    setActionType("APPROVE");
    reviewForm.reset({
      recordId: record._id,
      status: "APPROVED",
      approvedAmount: Number(record.amount) || 0,
      reviewRemarks: "",
    });
    setReviewOpen(true);
  };

  const onReviewSubmit = async (data: ReviewFinanceRecordInput) => {
    const res = await reviewFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Review submitted",
        description: res.message || "Transaction decision recorded.",
        type: "success",
      });
      setReviewOpen(false);
      refreshRecords();
    } else {
      toast.create({
        title: "Review failed",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  // Minimal Clean Table Columns - Only Essentials, No Vertical Bloat
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: () => <span className="whitespace-nowrap">Date</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap block">
          {new Date(row.original.date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "billNumber",
      header: () => <span className="whitespace-nowrap">Bill No</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground whitespace-nowrap block">
          {row.original.billNumber}
        </span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: () => <span className="whitespace-nowrap">Branch</span>,
      cell: ({ row }) => {
        const r = row.original;
        const isCross = Boolean(r.isCrossBranchPayment || r.isRelatedToBranch);
        return (
          <div className="flex flex-col min-w-0 max-w-[170px]">
            <span className="font-semibold text-xs text-foreground truncate block">
              {r.shop?.name || "—"}
            </span>
            {isCross && (
              <span className="text-[10px] text-muted-foreground truncate block font-medium">
                → {r.beneficiaryShop?.name || r.relatedBranch?.name || "Target Branch"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => (
        <div className="max-w-[160px] min-w-0">
          <CategoryBadge
            name={row.original.category?.name || (row.original.isUtilityBill ? "Utility Bill" : "Uncategorized")}
            colorToken={row.original.category?.colorToken}
          />
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Description",
      cell: ({ row }) => {
        const r = row.original;
        const itemText = r.itemName ? `${r.itemName}${r.quantity && r.quantity > 1 ? ` (×${r.quantity})` : ""}` : null;
        const displayText = itemText || r.reason || "—";
        return (
          <span
            className="text-xs text-muted-foreground truncate max-w-[220px] block"
            title={r.reason || itemText || ""}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <span className="text-right block whitespace-nowrap">Amount (LKR)</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground text-right block whitespace-nowrap">
          {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="text-right block whitespace-nowrap">Action</span>,
      cell: ({ row }) => {
        const rec = row.original;
        const isPending = rec.status === "PENDING";

        return (
          <div className="flex justify-end whitespace-nowrap">
            <Button
              variant={isPending ? "default" : "outline"}
              size="sm"
              onClick={() => openReviewModal(rec)}
              className={
                isPending
                  ? "h-8 px-3.5 rounded-xl bg-foreground text-background font-semibold text-xs gap-1.5 hover:opacity-90 transition-opacity shadow-xs cursor-pointer whitespace-nowrap"
                  : "h-8 px-3.5 rounded-xl border border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs gap-1.5 cursor-pointer whitespace-nowrap"
              }
            >
              {isPending ? (
                <>
                  <CheckCheckIcon className="size-3.5" />
                  Review
                </>
              ) : (
                <>
                  <LockIcon className="size-3 text-muted-foreground" />
                  View
                </>
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Transaction Verification Queue
            </h1>
            <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-muted/30 bg-surface/50 text-foreground">
              {records.length} Submissions
            </span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Validate branch expenses and deposits, adjust approved amounts, and record audit remarks.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-3xl p-6 border border-muted/30 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="space-y-1.5 min-w-[200px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Verification Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="REJECTED">Rejected Only</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[220px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Branch
          </span>
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Branches</option>
            {shops.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 min-w-[220px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sleek Minimal Data Table */}
      <DataTable
        columns={columns}
        data={records}
        searchKey="billNumber"
        searchPlaceholder="Search bill number or reason..."
        loading={loading}
      />

      {/* COMPREHENSIVE VERIFY & AUDIT MODAL DIALOG */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="glass-panel sm:max-w-4xl lg:max-w-5xl xl:max-w-6xl h-[90vh] max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl overflow-hidden">
          {/* Header */}
          <DialogHeader className="shrink-0 pb-4 border-b border-muted/20">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-2xl font-extrabold text-foreground">
                  {selectedRecord?.billNumber}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  • {selectedRecord?.shop?.name} ({selectedRecord?.shop?.code})
                </span>
                <Badge
                  variant={selectedRecord?.type === "INCOME" ? "default" : "secondary"}
                  className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    selectedRecord?.type === "INCOME"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  }`}
                >
                  {selectedRecord?.type || "EXPENSE"}
                </Badge>
                <StatusBadge status={selectedRecord?.status || "PENDING"} />
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Logged on {selectedRecord?.date ? new Date(selectedRecord.date).toLocaleDateString() : "—"}
              {selectedRecord?.createdBy?.name && (
                <> • Submitted by <strong className="text-foreground">{selectedRecord.createdBy.name}</strong> ({selectedRecord.createdBy.email || "Staff"})</>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* TWO COLUMN CONTENT */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1 min-h-0 overflow-hidden pt-4">
            {/* LEFT COLUMN: All Record Details & Breakdown */}
            <div className="md:col-span-7 flex flex-col min-h-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-3 shrink-0">
                <FileTextIcon className="size-4 text-foreground" />
                <span>Comprehensive Transaction Details</span>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-2">
                {/* 1. Core Financial Card */}
                <div className="glass-card rounded-2xl border border-muted/20 p-5 space-y-4 shadow-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Submitted Amount
                      </span>
                      <span className="font-extrabold font-mono text-base text-foreground mt-0.5 block">
                        LKR {Number(selectedRecord?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Payment Method
                      </span>
                      <span className="font-bold text-foreground uppercase font-mono text-xs mt-0.5 block">
                        {selectedRecord?.paymentMethod}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Category
                      </span>
                      <span className="font-semibold text-foreground block truncate mt-0.5">
                        {selectedRecord?.category?.name || (selectedRecord?.isUtilityBill ? "Utility Bill" : "General")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-muted/20">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Originating Branch
                      </span>
                      <span className="font-semibold text-foreground text-xs mt-0.5 block">
                        {selectedRecord?.shop?.name} ({selectedRecord?.shop?.code || "—"})
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Staff Submitter
                      </span>
                      <span className="font-semibold text-foreground text-xs mt-0.5 block">
                        {selectedRecord?.createdBy?.name || "Branch Staff"}
                      </span>
                    </div>
                  </div>

                  {/* Bank Account Details if applicable */}
                  {selectedRecord?.bankAccount && (
                    <div className="pt-3 border-t border-muted/20 text-xs">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                        Bank Account Information
                      </span>
                      <div className="mt-1 flex items-center gap-2 text-foreground font-mono text-xs">
                        <CreditCardIcon className="size-3.5 text-muted-foreground" />
                        <span>{selectedRecord.bankAccount.bankName}</span>
                        <span>•</span>
                        <span>{selectedRecord.bankAccount.accountNumber}</span>
                        {selectedRecord.bankAccount.accountName && (
                          <span className="text-muted-foreground font-sans">({selectedRecord.bankAccount.accountName})</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Full Purpose / Reason */}
                  <div className="text-xs pt-3 border-t border-muted/20">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                      Purpose / Reason / Description
                    </span>
                    <p className="mt-1.5 text-foreground font-medium bg-surface/30 p-3.5 rounded-xl border border-muted/20 text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedRecord?.reason || "No description provided"}
                    </p>
                  </div>
                </div>

                {/* 2. Customer Credit & Debt Repayment Details */}
                {(selectedRecord?.customerName || selectedRecord?.customerPhone || selectedRecord?.customerCredit || selectedRecord?.isDebtRepayment) && (
                  <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground flex items-center gap-2">
                        <UserIcon className="size-4 text-primary" />
                        <span className="font-bold text-xs">Customer Credit &amp; Debt Repayment</span>
                      </span>
                      {selectedRecord.isDebtRepayment && (
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                          Debt Clearance
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px] pt-2 border-t border-muted/20">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Customer Name</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {selectedRecord.customerName || "Customer Record"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-bold">Phone Number</span>
                        <span className="font-mono text-foreground mt-0.5 block">
                          {selectedRecord.customerPhone || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Communication / Inventory Item Details */}
                {(selectedRecord?.isCommunicationItem || selectedRecord?.itemName) && (
                  <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                          {selectedRecord.itemCode || "COMM"}
                        </Badge>
                        <span className="font-bold text-xs">{selectedRecord.itemName}</span>
                      </span>
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-muted/30 bg-background/50">
                        Qty: {selectedRecord.quantity || 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono pt-2 border-t border-muted/20">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Unit Selling</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.sellingPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Unit Cost</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.actualPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Discount</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.discountPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Est. Margin</span>
                        <span className="font-bold text-emerald-500 mt-0.5 block">
                          +LKR {(
                            (Number(selectedRecord.sellingPrice || 0) -
                              Number(selectedRecord.actualPrice || 0) -
                              Number(selectedRecord.discountPrice || 0)) *
                            (Number(selectedRecord.quantity) || 1)
                          ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Telecom Reload Details */}
                {selectedRecord?.isTelecomReload && (
                  <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground flex items-center gap-2">
                        <PhoneIcon className="size-4 text-emerald-500" />
                        <span className="font-bold text-xs">Telecom Reload / Package</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-muted/30 bg-background/50 uppercase">
                        {selectedRecord.telecomOperator || "Operator"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-[11px] font-mono pt-2 border-t border-muted/20">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Type</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {selectedRecord.telecomType || "CUSTOM"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Commission</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {selectedRecord.commissionRate ? `${selectedRecord.commissionRate}%` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Earned</span>
                        <span className="font-bold text-emerald-500 mt-0.5 block">
                          LKR {Number(selectedRecord.commissionEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Utility Bill Details */}
                {selectedRecord?.isUtilityBill && (
                  <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground flex items-center gap-2">
                        <ZapIcon className="size-4 text-amber-500" />
                        <span className="font-bold text-xs">Utility Bill Payment</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-muted/30 bg-background/50 uppercase">
                        {selectedRecord.utilityBillType || "ELECTRICITY"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono pt-2 border-t border-muted/20">
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Account No</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          {selectedRecord.utilityAccountNumber || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Bill Amount</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.billAmount || selectedRecord.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Service Fee</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.serviceCharge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground uppercase font-sans font-bold">Provider Fee</span>
                        <span className="font-semibold text-foreground mt-0.5 block">
                          LKR {Number(selectedRecord.providerFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Cross-Branch & Inter-Branch Settlement Details */}
                {(selectedRecord?.isCrossBranchPayment || selectedRecord?.isRelatedToBranch) && (() => {
                  const isBranchExpense = selectedRecord.type === "EXPENSE" || Boolean(selectedRecord.isCommunicationItem);
                  return (
                    <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-foreground">
                          <BuildingIcon className="size-4 text-primary" />
                          <span>{isBranchExpense ? "Inter-Branch Expense Details" : "Cross-Branch Transaction Details"}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                          selectedRecord.interBranchSettlementStatus === "SETTLED"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                          {selectedRecord.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled Inter-Branch"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] bg-background/50 p-3.5 rounded-xl border border-muted/20">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                            {isBranchExpense ? "Fulfillment Branch (Source)" : "Cash Drawer (Collecting)"}
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {selectedRecord?.collectingShop?.name || selectedRecord?.shop?.name} ({selectedRecord?.collectingShop?.code || selectedRecord?.shop?.code})
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                            {isBranchExpense ? "Expense Incurred By" : "Income Beneficiary"}
                          </span>
                          <span className="font-bold text-foreground mt-0.5 block">
                            {selectedRecord?.beneficiaryShop?.name || selectedRecord?.relatedBranch?.name || "Specified Branch"} ({selectedRecord?.beneficiaryShop?.code || selectedRecord?.relatedBranch?.code || "—"})
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-background/40 border border-muted/20 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                        <InfoIcon className="size-4 shrink-0 text-primary mt-0.5" />
                        <div>
                          {isBranchExpense ? (
                            <>
                              <strong>Ledger Impact:</strong> Approving this transaction charges an <strong>operational expense</strong> of LKR {Number(selectedRecord.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} to <strong>{selectedRecord?.beneficiaryShop?.name || selectedRecord?.relatedBranch?.name}</strong>, fulfilled by <strong>{selectedRecord?.collectingShop?.name || selectedRecord?.shop?.name}</strong>.
                            </>
                          ) : (
                            <>
                              <strong>Ledger Impact:</strong> Approving this transaction accounts physical cash in <strong>{selectedRecord?.collectingShop?.name || selectedRecord?.shop?.name}</strong> drawer, and credits income to <strong>{selectedRecord?.beneficiaryShop?.name || selectedRecord?.relatedBranch?.name}</strong>.
                            </>
                          )}
                        </div>
                      </div>

                      {selectedRecord?.relatedBranchNote && (
                        <div className="pt-2 border-t border-muted/20">
                          <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                            Branch Transfer Note:
                          </span>
                          <p className="mt-1 text-xs text-foreground font-medium bg-background/60 p-3 rounded-xl border border-muted/20 whitespace-pre-wrap">
                            {selectedRecord.relatedBranchNote}
                          </p>
                        </div>
                      )}

                      {/* Settlement details if settled */}
                      {selectedRecord.interBranchSettlementStatus === "SETTLED" && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-muted/20 text-[10px] font-mono text-muted-foreground">
                          <div>
                            <span className="block font-sans font-bold uppercase text-[9px]">Settlement Method</span>
                            <span className="font-semibold text-foreground">{selectedRecord.settlementType || "DIRECT"}</span>
                          </div>
                          <div>
                            <span className="block font-sans font-bold uppercase text-[9px]">Settled Date</span>
                            <span className="font-semibold text-foreground">
                              {selectedRecord.settledAt ? new Date(selectedRecord.settledAt).toLocaleDateString() : "—"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 7. Cash Drawer Adjustment / Float */}
                {(selectedRecord?.isCashAdjustment || selectedRecord?.isOpeningFloat) && (
                  <div className="glass-card p-5 rounded-2xl border border-muted/30 bg-surface/30 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-foreground">
                      <WalletIcon className="size-4 text-primary" />
                      <span>Cash Reconciliation &amp; Float Entry</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Adjustment Type: <strong className="text-foreground uppercase">{selectedRecord.adjustmentType || (selectedRecord.isOpeningFloat ? "OPENING FLOAT" : "CASH ADJUSTMENT")}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Verify Action & Decision Area */}
            <div className="md:col-span-5 flex flex-col min-h-0 border-t md:border-t-0 md:border-l border-muted/20 md:pl-8 pt-4 md:pt-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-3 shrink-0">
                <ShieldCheckIcon className="size-4 text-foreground" />
                <span>Verification Decision</span>
              </div>

              {selectedRecord?.status !== "PENDING" ? (
                /* Already Finalized View */
                <div className="flex flex-col flex-1 min-h-0 justify-between">
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                    <div className="glass-card rounded-2xl border border-muted/20 p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <LockIcon className="size-3.5 text-muted-foreground" />
                          Verification Finalized
                        </span>
                        <StatusBadge status={selectedRecord?.status} />
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs pt-2 border-t border-muted/20">
                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase block font-bold tracking-wider">
                            Verified By
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {selectedRecord?.reviewedBy?.name || "System Verifier"}
                            {selectedRecord?.reviewedBy?.email && (
                              <span className="text-muted-foreground font-normal ml-1">({selectedRecord.reviewedBy.email})</span>
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-muted-foreground text-[10px] uppercase block font-bold tracking-wider">
                            Verified Date &amp; Time
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {selectedRecord?.reviewedAt
                              ? new Date(selectedRecord.reviewedAt).toLocaleString()
                              : "—"}
                          </span>
                        </div>

                        {selectedRecord?.status === "APPROVED" && (
                          <div className="pt-2 border-t border-muted/20">
                            <span className="text-muted-foreground text-[10px] uppercase block font-bold tracking-wider">
                              Final Approved Amount
                            </span>
                            <span className="font-extrabold text-foreground font-mono text-xl mt-0.5 block">
                              LKR {Number(selectedRecord?.approvedAmount ?? selectedRecord?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        {selectedRecord?.reviewRemarks && (
                          <div className="pt-2 border-t border-muted/20">
                            <span className="text-muted-foreground text-[10px] uppercase block font-bold tracking-wider">
                              Verification Remarks / Reason
                            </span>
                            <p className="mt-1 text-foreground bg-surface/30 p-3 rounded-xl border border-muted/20 text-xs whitespace-pre-wrap">
                              {selectedRecord.reviewRemarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-muted/20 bg-surface/20 text-center text-xs text-muted-foreground leading-relaxed">
                      🔒 This transaction has been {selectedRecord?.status?.toLowerCase()} and locked for branch ledger accounting.
                    </div>
                  </div>

                  <div className="pt-4 border-t border-muted/20 flex justify-end shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReviewOpen(false)}
                      className="h-12 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-sm cursor-pointer"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                /* Action Form for Pending Records */
                <form
                  onSubmit={reviewForm.handleSubmit(onReviewSubmit)}
                  className="flex flex-col flex-1 min-h-0 justify-between"
                >
                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pr-1">
                    {/* Decision Selector */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Select Decision
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActionType("APPROVE");
                            reviewForm.setValue("status", "APPROVED");
                            reviewForm.setValue("approvedAmount", Number(selectedRecord?.amount) || 0);
                          }}
                          className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                            actionType === "APPROVE"
                              ? "bg-foreground text-background shadow-md"
                              : "border border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground"
                          }`}
                        >
                          <CheckCircle2Icon className="size-4" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setActionType("REJECT");
                            reviewForm.setValue("status", "REJECTED");
                            reviewForm.setValue("approvedAmount", null);
                          }}
                          className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                            actionType === "REJECT"
                              ? "bg-destructive text-destructive-foreground shadow-md"
                              : "border border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground"
                          }`}
                        >
                          <XCircleIcon className="size-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    {actionType === "APPROVE" ? (
                      <div className="space-y-4">
                        {/* Adjustable Approved Amount */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Approved Amount (LKR)
                            </label>
                            <span className="text-[10px] text-muted-foreground">
                              Requested: LKR {Number(selectedRecord?.amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            {...reviewForm.register("approvedAmount", { valueAsNumber: true })}
                            className="h-12 rounded-2xl bg-surface/30 border-muted/30 font-mono text-base font-bold text-foreground focus:border-foreground/50 transition-colors"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Defaults to submitted amount. You can adjust if partial approval is authorized.
                          </p>
                        </div>

                        {/* Optional Remarks */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Verification Remarks (Optional)
                          </label>
                          <Textarea
                            placeholder="e.g. Verified with physical invoice and cross-checked drawer receipt..."
                            {...reviewForm.register("reviewRemarks")}
                            className="text-sm rounded-2xl border-muted/30 bg-surface/30 p-4 text-foreground focus:border-foreground/50 transition-colors resize-none"
                            rows={4}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Mandatory Rejection Reason */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-destructive flex items-center justify-between">
                            <span>Reason for Rejection *</span>
                            <span className="text-[10px] text-destructive font-normal">(mandatory)</span>
                          </label>
                          <Textarea
                            placeholder="Clearly explain why this entry is declined (e.g., incorrect branch allocation, missing physical bill, unauthorized expense)..."
                            {...reviewForm.register("reviewRemarks")}
                            className="text-sm rounded-2xl border-destructive/40 bg-surface/30 p-4 text-foreground focus:border-destructive resize-none"
                            rows={4}
                          />
                          {reviewForm.formState.errors.reviewRemarks && (
                            <p className="text-xs text-destructive font-medium">
                              {reviewForm.formState.errors.reviewRemarks.message}
                            </p>
                          )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive leading-relaxed">
                          ⚠️ Declining this record will cancel the entry and notify the submitting branch staff.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Buttons */}
                  <div className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReviewOpen(false)}
                      className="h-12 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-sm cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={reviewForm.formState.isSubmitting}
                      className={`h-12 px-8 rounded-2xl font-semibold text-sm transition-all shadow-md cursor-pointer ${
                        actionType === "APPROVE"
                          ? "bg-foreground text-background hover:opacity-90"
                          : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      }`}
                    >
                      {reviewForm.formState.isSubmitting ? (
                        <Loader2Icon className="size-4 animate-spin mr-2" />
                      ) : null}
                      Confirm {actionType === "APPROVE" ? "Approval" : "Rejection"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
