"use client";

import * as React from "react";
import {
  getCategoriesAction,
  createCategoryAction,
  updateCategoryAction,
  toggleCategoryActiveAction,
} from "@/actions/categories";
import { getSummaryAnalyticsAction } from "@/actions/reports";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategorySchema,
  updateCategorySchema,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/schemas/category";
import { CategoryBadge } from "@/components/shared/category-badge";
import {
  Plus,
  Edit,
  Power,
  Loader2,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface CategoryItem {
  _id: string;
  name: string;
  description?: string;
  type: "EXPENSE" | "INCOME";
  colorToken: "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";
  isActive: boolean;
  recordsCount?: number;
}

export function CategoriesView({
  initialCategories,
}: {
  initialCategories: CategoryItem[];
}) {
  const [categories, setCategories] = React.useState<CategoryItem[]>(initialCategories);
  const [loading, setLoading] = React.useState(false);

  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("today");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  const [statsLoading, setStatsLoading] = React.useState(false);
  const [statsData, setStatsData] = React.useState<{
    kpis: {
      totalTransactions: number;
      totalExpense: number;
      totalIncome: number;
      pendingApprovals: number;
      approvedAmount: number;
      rejectedAmount: number;
      netBalance: number;
    };
    categoryBreakdownData: Array<{ category: string; colorToken: string; total: number; type: string; count: number }>;
  }>({
    kpis: {
      totalTransactions: 0,
      totalExpense: 0,
      totalIncome: 0,
      pendingApprovals: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      netBalance: 0,
    },
    categoryBreakdownData: [],
  });

  const fetchCategoryStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getSummaryAnalyticsAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        categoryId: selectedCategoryId,
      });

      if (res.success && res.kpis) {
        setStatsData({
          kpis: res.kpis,
          categoryBreakdownData: (res.categoryBreakdownData as any) || [],
        });
      }
    } catch (err) {
      console.error("Failed to load category stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [period, startDate, endDate, selectedCategoryId]);

  React.useEffect(() => {
    fetchCategoryStats();
  }, [fetchCategoryStats]);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmToggleCat, setConfirmToggleCat] = React.useState<CategoryItem | null>(null);
  const [selectedCat, setSelectedCat] = React.useState<CategoryItem | null>(null);

  const createForm = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "EXPENSE",
      colorToken: "chart-1",
    },
  });

  const editForm = useForm<UpdateCategoryInput>({
    resolver: zodResolver(updateCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: "EXPENSE",
      colorToken: "chart-1",
      isActive: true,
    },
  });

  const refreshCategories = async () => {
    setLoading(true);
    const res = await getCategoriesAction();
    if (res.success && res.categories) {
      setCategories(res.categories);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateCategoryInput) => {
    const res = await createCategoryAction(data);
    if (res.success) {
      toast.create({
        title: "Category registered",
        description: "New classification added.",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshCategories();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not create category.",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateCategoryInput) => {
    if (!selectedCat) return;
    const res = await updateCategoryAction(selectedCat._id, data);
    if (res.success) {
      toast.create({
        title: "Category updated",
        description: "Modifications saved.",
      });
      setEditOpen(false);
      refreshCategories();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not update category.",
        type: "error",
      });
    }
  };

  const openEditModal = (cat: CategoryItem) => {
    setSelectedCat(cat);
    editForm.reset({
      name: cat.name,
      description: cat.description || "",
      type: cat.type,
      colorToken: cat.colorToken,
      isActive: cat.isActive,
    });
    setEditOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmToggleCat) return;
    const res = await toggleCategoryActiveAction(confirmToggleCat._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "Category activated" : "Category disabled",
        description: `Status updated.`,
      });
      setConfirmToggleCat(null);
      refreshCategories();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not change status.",
        type: "error",
      });
    }
  };

  const columns: ColumnDef<CategoryItem>[] = [
    {
      accessorKey: "name",
      header: "Category",
      cell: ({ row }) => (
        <CategoryBadge
          name={row.original.name}
          colorToken={row.original.colorToken}
        />
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
          {row.original.type === "INCOME" ? "Inflow (+)" : "Outflow (-)"}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-base text-muted-foreground truncate max-w-xs block">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`text-base font-semibold ${
            row.original.isActive ? "text-stat-1" : "text-destructive"
          }`}
        >
          {row.original.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(cat)}
              className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
              title="Edit"
            >
              <Edit className="size-5" />
            </button>
            <button
              onClick={() => setConfirmToggleCat(cat)}
              className={`p-2 rounded-xl transition-colors ${
                cat.isActive
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-stat-1 hover:bg-surface/50"
              }`}
              title={cat.isActive ? "Disable" : "Activate"}
            >
              <Power className="size-5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Categories
          </h1>
          <p className="text-base text-muted-foreground">
            Ledger Taxonomy & Transaction Classifications
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-3 justify-between"
        >
          <Plus className="size-5" />
          <span>Add Category</span>
          <ArrowUpRight className="size-5" />
        </Button>
      </div>

      {/* Filter & Metric Bar */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-muted/20 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl bg-surface/40 p-1.5 border border-muted/20">
            {(["today", "week", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-base font-semibold transition-all capitalize ${
                  period === p
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-5 text-base font-semibold outline-none focus:border-foreground/50"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          onClick={fetchCategoryStats}
          disabled={statsLoading}
          className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
        >
          <RefreshCw className={`size-5 ${statsLoading ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Inflows</div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {statsData.kpis.totalIncome.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Outflows</div>
          <div className="text-3xl font-bold font-mono text-foreground">
            LKR {statsData.kpis.totalExpense.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="text-base font-semibold text-muted-foreground">Net Volume</div>
          <div className="text-3xl font-bold font-mono text-stat-2">
            LKR {statsData.kpis.netBalance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <DataTable
          columns={columns}
          data={categories}
          searchKey="name"
          searchPlaceholder="Search category name..."
          loading={loading}
        />
      </div>

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Add Category
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Create an accounting classification for ledger transactions.
            </p>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category Name
              </label>
              <Input
                placeholder="e.g. Utility Bills, Course Fees"
                {...createForm.register("name")}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
              />
              {createForm.formState.errors.name && (
                <p className="text-xs font-medium text-destructive">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Flow Type
              </label>
              <select
                {...createForm.register("type")}
                className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
              >
                <option value="EXPENSE">Expense (Outflow)</option>
                <option value="INCOME">Income (Inflow)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Optional description"
                {...createForm.register("description")}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
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
                  <span>Save Category</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Edit Category
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Update category title, flow type, and accounting details.
            </p>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Category Name
              </label>
              <Input
                {...editForm.register("name")}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Flow Type
              </label>
              <select
                {...editForm.register("type")}
                className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
              >
                <option value="EXPENSE">Expense (Outflow)</option>
                <option value="INCOME">Income (Inflow)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                {...editForm.register("description")}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
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

      {/* TOGGLE ACTIVE DIALOG */}
      <AlertDialog
        open={!!confirmToggleCat}
        onOpenChange={(open) => !open && setConfirmToggleCat(null)}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {confirmToggleCat?.isActive ? "Deactivate Category" : "Activate Category"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to {confirmToggleCat?.isActive ? "deactivate" : "activate"}{" "}
              <strong className="text-foreground">{confirmToggleCat?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel className="h-12 rounded-2xl text-sm px-6 border-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={`h-12 rounded-2xl text-sm font-semibold px-6 ${
                confirmToggleCat?.isActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-foreground text-background hover:opacity-90"
              }`}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
