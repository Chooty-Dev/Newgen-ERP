"use client";

import * as React from "react";
import {
  getAllTransactionsAdminAction,
  getFilteredTransactionsForPdfAction,
  adminEditTransactionAction,
  adminDeleteTransactionAction,
  adminBulkPermanentDeleteTransactionsAction,
  adminGetBulkDeleteEligibleCountAction,
} from "@/actions/adminTransactions";
import { exportTransactionsStatementPDF } from "@/lib/pdf/transactions-statement-pdf";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminEditFinanceRecordSchema,
  AdminEditFinanceRecordInput,
} from "@/schemas/finance";
import {
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Loader2,
  Search,
  ArrowUpRight,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
  shopType?: string;
}

interface CategoryOption {
  _id: string;
  name: string;
  type: string;
  colorToken?: string;
}

interface BankAccountOption {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface AllTransactionsViewProps {
  initialRecords: any[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  shops: ShopOption[];
  categories: CategoryOption[];
  bankAccounts: BankAccountOption[];
}

export function AllTransactionsView({
  initialRecords,
  initialTotal,
  initialPage,
  initialTotalPages,
  shops,
  categories,
  bankAccounts,
}: AllTransactionsViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [total, setTotal] = React.useState<number>(initialTotal);
  const [page, setPage] = React.useState<number>(initialPage);
  const [totalPages, setTotalPages] = React.useState<number>(initialTotalPages);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Progressive Disclosure: Filters expansion
  const [showFilters, setShowFilters] = React.useState<boolean>(false);

  // Filter States
  const [search, setSearch] = React.useState<string>("");
  const [shopFilter, setShopFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = React.useState<string>("ALL");
  const [bankAccountFilter, setBankAccountFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  // Modal States
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null);
  const [editOpen, setEditOpen] = React.useState<boolean>(false);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = React.useState<any | null>(null);
  const [deletionReason, setDeletionReason] = React.useState<string>("");
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  // Bulk Delete Modal
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState<boolean>(false);
  const [bulkDeleteCount, setBulkDeleteCount] = React.useState<number | null>(null);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = React.useState<string>("");
  const [isCheckingEligible, setIsCheckingEligible] = React.useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

  const fetchRecords = React.useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const filters: any = { page: targetPage, limit: 25 };
        if (search.trim()) filters.search = search.trim();
        if (shopFilter !== "ALL") filters.shop = shopFilter;
        if (categoryFilter !== "ALL") filters.category = categoryFilter;
        if (typeFilter !== "ALL") filters.type = typeFilter;
        if (paymentMethodFilter !== "ALL") filters.paymentMethod = paymentMethodFilter;
        if (bankAccountFilter !== "ALL") filters.bankAccount = bankAccountFilter;
        if (statusFilter !== "ALL") filters.status = statusFilter;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const res = await getAllTransactionsAdminAction(filters);
        if (res.success) {
          setRecords(res.records || []);
          setTotal(res.total || 0);
          setPage(res.page || 1);
          setTotalPages(res.totalPages || 1);
        } else {
          toast.create({
            title: "Error",
            description: res.error || "Failed to load transactions.",
            type: "error",
          });
        }
      } catch (err) {
        console.error("Fetch records error:", err);
        toast.create({
          title: "System Error",
          description: "Could not retrieve transaction records.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      page,
      search,
      shopFilter,
      categoryFilter,
      typeFilter,
      paymentMethodFilter,
      bankAccountFilter,
      statusFilter,
      startDate,
      endDate,
    ]
  );

  const handleApplyFilters = () => {
    setPage(1);
    fetchRecords(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setShopFilter("ALL");
    setCategoryFilter("ALL");
    setTypeFilter("ALL");
    setPaymentMethodFilter("ALL");
    setBankAccountFilter("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);

    getAllTransactionsAdminAction({ page: 1, limit: 25 }).then((res) => {
      if (res.success) {
        setRecords(res.records || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
      }
    });
  };

  const editForm = useForm<AdminEditFinanceRecordInput>({
    resolver: zodResolver(adminEditFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      shop: "",
      date: "",
      billNumber: "",
      type: "EXPENSE",
      category: "",
      amount: 0,
      paymentMethod: "CASH",
      bankAccount: null,
      reason: "",
      status: "PENDING",
      approvedAmount: null,
      editReason: "",
    },
  });

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec);
    const d = rec.date ? new Date(rec.date).toISOString().split("T")[0] : "";
    editForm.reset({
      recordId: rec._id,
      shop: rec.shop?._id || rec.shop || "",
      date: d,
      billNumber: rec.billNumber || "",
      type: rec.type || "EXPENSE",
      category: rec.category?._id || rec.category || "",
      amount: Number(rec.amount || 0),
      paymentMethod: rec.paymentMethod || "CASH",
      bankAccount: rec.bankAccount?._id || rec.bankAccount || null,
      reason: rec.reason || "",
      status: rec.status || "PENDING",
      approvedAmount: rec.approvedAmount !== undefined ? rec.approvedAmount : null,
      editReason: "",
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: AdminEditFinanceRecordInput) => {
    try {
      const res = await adminEditTransactionAction(data);
      if (res.success) {
        toast.create({
          title: "Updated",
          description: "Transaction updated and ledger recalculated.",
        });
        setEditOpen(false);
        fetchRecords(page);
      } else {
        toast.create({
          title: "Update Failed",
          description: res.error || "Could not save modifications.",
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

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmRecord || deletionReason.trim().length < 3) return;
    setIsDeleting(true);
    try {
      const res = await adminDeleteTransactionAction({
        recordId: deleteConfirmRecord._id,
        deletionReason: deletionReason.trim(),
      });
      if (res.success) {
        toast.create({
          title: "Deleted",
          description: "Transaction removed and balances restored.",
        });
        setDeleteConfirmRecord(null);
        setDeletionReason("");
        fetchRecords(page);
      } else {
        toast.create({
          title: "Error",
          description: res.error || "Could not delete record.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Could not execute safe deletion.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenBulkDelete = async () => {
    setIsCheckingEligible(true);
    try {
      const filters: any = {};
      if (search.trim()) filters.search = search.trim();
      if (shopFilter !== "ALL") filters.shop = shopFilter;
      if (categoryFilter !== "ALL") filters.category = categoryFilter;
      if (typeFilter !== "ALL") filters.type = typeFilter;
      if (paymentMethodFilter !== "ALL") filters.paymentMethod = paymentMethodFilter;
      if (bankAccountFilter !== "ALL") filters.bankAccount = bankAccountFilter;
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const res = await adminGetBulkDeleteEligibleCountAction(filters);
      if (res.success) {
        setBulkDeleteCount(res.count ?? 0);
        setBulkDeleteConfirmation("");
        setBulkDeleteOpen(true);
      } else {
        toast.create({
          title: "Error",
          description: res.error || "Could not verify eligible records.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "System Error",
        description: "Failed to determine bulk delete scope.",
        type: "error",
      });
    } finally {
      setIsCheckingEligible(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    if (bulkDeleteConfirmation !== "PERMANENT DELETE") return;
    setIsBulkDeleting(true);
    try {
      const res = await adminBulkPermanentDeleteTransactionsAction({
        shopId: shopFilter !== "ALL" ? shopFilter : undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        paymentMethod: paymentMethodFilter !== "ALL" ? paymentMethodFilter : undefined,
        bankAccountId: bankAccountFilter !== "ALL" ? bankAccountFilter : undefined,
        categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        confirmationPhrase: bulkDeleteConfirmation,
      });

      if (res.success) {
        toast.create({
          title: "Completed",
          description: `Permanently removed ${res.deletedCount} transaction(s).`,
        });
        setBulkDeleteOpen(false);
        setBulkDeleteConfirmation("");
        fetchRecords(1);
      } else {
        toast.create({
          title: "Failed",
          description: res.error || "Bulk deletion failed.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred during execution.",
        type: "error",
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (!records.length) {
      toast.create({ title: "Export empty", description: "No records to export." });
      return;
    }

    const headers = [
      "Date",
      "Branch",
      "Bill Number",
      "Category",
      "Type",
      "Payment Method",
      "Amount",
      "Status",
      "Reason",
    ];

    const rows = records.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.shop?.name || "",
      r.billNumber,
      r.category?.name || "",
      r.type,
      r.paymentMethod,
      r.amount,
      r.status,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transactions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStatementPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const filters: any = {};
      if (search.trim()) filters.search = search.trim();
      if (shopFilter !== "ALL") filters.shopId = shopFilter;
      if (categoryFilter !== "ALL") filters.categoryId = categoryFilter;
      if (typeFilter !== "ALL") filters.type = typeFilter;
      if (paymentMethodFilter !== "ALL") filters.paymentMethod = paymentMethodFilter;
      if (bankAccountFilter !== "ALL") filters.bankAccountId = bankAccountFilter;
      if (statusFilter !== "ALL") filters.status = statusFilter;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const res = await getFilteredTransactionsForPdfAction(filters);
      if (!res.success || !res.records || !res.summary || !res.appliedFilters) {
        toast.create({
          title: "PDF Error",
          description: res.error || "Could not retrieve records for PDF.",
          type: "error",
        });
        return;
      }

      await exportTransactionsStatementPDF({
        records: res.records,
        summary: res.summary,
        filters: res.appliedFilters,
      });

      toast.create({
        title: "Export Complete",
        description: "Statement PDF generated successfully.",
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.create({
        title: "PDF Generation Failed",
        description: "An unexpected error occurred while compiling PDF.",
        type: "error",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const d = new Date(row.original.createdAt || row.original.date);
        return (
          <span className="font-mono text-base font-semibold text-foreground whitespace-nowrap">
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="text-base font-bold text-foreground">
          {row.original.shop?.name || "Global"}
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
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => (
        <CategoryBadge
          name={row.original.category?.name || "General"}
          colorToken={row.original.category?.colorToken}
        />
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-base font-medium text-foreground">
          {row.original.paymentMethod.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Flow",
      cell: ({ row }) => (
        <span
          className={`text-base font-bold ${
            row.original.type === "INCOME" ? "text-stat-1" : "text-foreground"
          }`}
        >
          {row.original.type === "INCOME" ? "Inflow" : "Outflow"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amt = Number(row.original.amount || 0);
        return (
          <span className="font-mono text-base font-bold text-foreground">
            LKR {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const rec = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenEdit(rec)}
              className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
              title="Edit"
            >
              <Edit className="size-5" />
            </button>
            <button
              onClick={() => setDeleteConfirmRecord(rec)}
              className="p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-10">
      {/* Top Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Transactions
          </h1>
          <p className="text-base text-muted-foreground">
            Unified Central Ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchRecords(page)}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadStatementPDF}
            disabled={isGeneratingPdf}
            className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            {isGeneratingPdf ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5" />}
            <span>PDF</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-14 rounded-2xl bg-surface/50 hover:bg-surface/80 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            <Download className="size-5" />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* Main Search & Progressive Filters */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border-muted/20 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 size-5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search bill number or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              className="h-14 rounded-2xl bg-surface/30 border-muted/30 pl-12 pr-4 text-base font-medium placeholder:text-muted-foreground/60 focus:border-foreground/50"
            />
          </div>

          <Button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="h-14 rounded-2xl bg-surface/50 hover:bg-surface/80 text-foreground border border-muted/20 text-base font-semibold px-6 justify-between gap-3"
          >
            <span className="flex items-center gap-2.5">
              <Filter className="size-5" />
              <span>Filters</span>
            </span>
            {showFilters ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
          </Button>

          <Button
            type="button"
            onClick={handleApplyFilters}
            disabled={loading}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-8"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : "Apply"}
          </Button>
        </div>

        {/* Expandable Filter Grid (Progressive Disclosure) */}
        {showFilters && (
          <div className="pt-6 border-t border-muted/20 space-y-6 animate-in fade-in-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Branch
                </label>
                <select
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Branches</option>
                  {shops.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Flow
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Flows</option>
                  <option value="INCOME">Inflow (+)</option>
                  <option value="EXPENSE">Outflow (-)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Method
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Bank Account
                </label>
                <select
                  value={bankAccountFilter}
                  onChange={(e) => setBankAccountFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Accounts</option>
                  {bankAccounts.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bankName} - {b.accountNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Date From
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-14 rounded-2xl bg-surface/40 border-muted/30 px-4 text-base font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Date To
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-14 rounded-2xl bg-surface/40 border-muted/30 px-4 text-base font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenBulkDelete}
                disabled={loading || isCheckingEligible}
                className="h-12 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 text-base font-semibold px-5 gap-2"
              >
                {isCheckingEligible ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                <span>Delete Filtered Records</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="h-12 rounded-xl text-base font-semibold text-muted-foreground hover:text-foreground px-5 gap-2"
              >
                <RotateCcw className="size-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Table Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
          <span>
            <strong className="text-foreground">{records.length}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> records
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => fetchRecords(page - 1)}
                className="h-11 rounded-xl px-4 text-base font-medium border-muted/20"
              >
                Previous
              </Button>
              <span className="font-mono text-base font-bold text-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => fetchRecords(page + 1)}
                className="h-11 rounded-xl px-4 text-base font-medium border-muted/20"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={records}
          searchKey="billNumber"
          searchPlaceholder="Quick filter bill number..."
          loading={loading}
        />
      </div>

      {/* EDIT MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Modify Transaction
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Adjust transaction metadata, status, or accounting amounts with audit traceability.
            </p>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Date
                </label>
                <Input
                  type="date"
                  {...editForm.register("date")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bill Number
                </label>
                <Input
                  {...editForm.register("billNumber")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch
                </label>
                <select
                  {...editForm.register("shop")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  {shops.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Category
                </label>
                <select
                  {...editForm.register("category")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Flow
                </label>
                <select
                  {...editForm.register("type")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="EXPENSE">Outflow (-)</option>
                  <option value="INCOME">Inflow (+)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Method
                </label>
                <select
                  {...editForm.register("paymentMethod")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="CASH">Cash</option>
                  <option value="PETTY_CASH">Petty Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <select
                  {...editForm.register("status")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Amount (LKR)
                </label>
                <Input
                  type="number"
                  step="any"
                  {...editForm.register("amount", { valueAsNumber: true })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Approved Amount
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Defaults to Amount"
                  {...editForm.register("approvedAmount", {
                    setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
                  })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Audit Reason
              </label>
              <Input
                placeholder="Reason for modifying this ledger entry..."
                {...editForm.register("editReason")}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
              />
              {editForm.formState.errors.editReason && (
                <p className="text-xs font-medium text-destructive">
                  {editForm.formState.errors.editReason.message}
                </p>
              )}
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
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

      {/* SAFE DELETE ALERT DIALOG */}
      <AlertDialog
        open={!!deleteConfirmRecord}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmRecord(null);
            setDeletionReason("");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-destructive">
              Delete Transaction
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Confirm deletion of bill {deleteConfirmRecord?.billNumber} (LKR{" "}
              {Number(deleteConfirmRecord?.amount || 0).toLocaleString()}).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reason
            </label>
            <Input
              placeholder="Reason for deletion..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
            />
          </div>

          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel
              disabled={isDeleting}
              className="h-12 rounded-2xl text-sm px-6 border-muted/30"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={isDeleting || deletionReason.trim().length < 3}
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold px-6"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BULK DELETE DIALOG */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isBulkDeleting) {
            setBulkDeleteOpen(false);
            setBulkDeleteConfirmation("");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-destructive">
              Bulk Permanent Delete
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Permanently delete {bulkDeleteCount ?? 0} filtered records prior to cutoff date.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {bulkDeleteCount && bulkDeleteCount > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Type PERMANENT DELETE to confirm:
              </label>
              <Input
                placeholder="PERMANENT DELETE"
                value={bulkDeleteConfirmation}
                onChange={(e) => setBulkDeleteConfirmation(e.target.value)}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono font-bold"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No matching records eligible for bulk deletion.
            </p>
          )}

          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel
              disabled={isBulkDeleting}
              className="h-12 rounded-2xl text-sm px-6 border-muted/30"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleBulkDeleteSubmit}
              disabled={
                isBulkDeleting ||
                bulkDeleteCount === 0 ||
                bulkDeleteConfirmation !== "PERMANENT DELETE"
              }
              className="h-12 rounded-2xl text-sm font-semibold px-6"
            >
              {isBulkDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete All"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
