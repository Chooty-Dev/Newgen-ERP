"use client";

import * as React from "react";
import {
  getInventoryItemsAction,
  createInventoryItemAction,
  updateInventoryItemAction,
  deleteInventoryItemAction,
  recordInventoryUsageAction,
  getInventoryUsageHistoryAction,
  getInventoryAnalyticsAction,
} from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  PackageIcon,
  LayersIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  EditIcon,
  Trash2Icon,
  SearchIcon,
  DownloadIcon,
  RefreshCwIcon,
  Loader2Icon,
  LayoutDashboardIcon,
  HistoryIcon,
  MapPinIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";

interface InventoryViewProps {
  shopId: string;
  shopName: string;
  shopCode: string;
  isStaff?: boolean;
  controlledTab?: "dashboard" | "items" | "history";
  onTabChange?: (tab: "dashboard" | "items" | "history") => void;
}

export function InventoryView({
  shopId,
  shopName,
  shopCode,
  isStaff = false,
  controlledTab,
  onTabChange,
}: InventoryViewProps) {
  const [internalTab, setInternalTab] = React.useState<"dashboard" | "items" | "history">("dashboard");
  const activeTab = controlledTab !== undefined ? controlledTab : internalTab;

  const handleTabSelect = (val: "dashboard" | "items" | "history") => {
    setInternalTab(val);
    onTabChange?.(val);
  };

  // Data states
  const [items, setItems] = React.useState<any[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [usages, setUsages] = React.useState<any[]>([]);
  const [analytics, setAnalytics] = React.useState<{
    totalItems: number;
    totalStockCount: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockItems: any[];
    categoryBreakdown: Array<{ category: string; itemCount: number; totalValue: number }>;
    recentUsages: any[];
  }>({
    totalItems: 0,
    totalStockCount: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    lowStockItems: [],
    categoryBreakdown: [],
    recentUsages: [],
  });

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Filters
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  // Create Modal
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: "",
    itemCode: "",
    category: "General",
    quantity: 0,
    unit: "pcs",
    unitPrice: 0,
    minStockThreshold: 5,
    description: "",
    location: "",
  });
  const [isCreating, setIsCreating] = React.useState(false);

  // Edit Modal
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [editForm, setEditForm] = React.useState({
    name: "",
    itemCode: "",
    category: "General",
    quantity: 0,
    unit: "pcs",
    unitPrice: 0,
    minStockThreshold: 5,
    description: "",
    location: "",
  });
  const [isUpdating, setIsUpdating] = React.useState(false);

  // Delete Modal
  const [deleteConfirmItem, setDeleteConfirmItem] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Record Usage Modal
  const [usageOpen, setUsageOpen] = React.useState(false);
  const [usageForm, setUsageForm] = React.useState({
    itemId: "",
    quantityUsed: 1,
    purpose: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [isRecordingUsage, setIsRecordingUsage] = React.useState(false);

  // Post-usage low stock alert banner
  const [recentLowStockAlert, setRecentLowStockAlert] = React.useState<{
    itemName: string;
    itemCode: string;
    remaining: number;
    unit: string;
    threshold: number;
  } | null>(null);

  const fetchData = React.useCallback(async () => {
    if (!shopId) return;
    setLoading(true);

    try {
      const [itemsRes, analyticsRes, usagesRes] = await Promise.all([
        getInventoryItemsAction(
          shopId,
          search.trim() || undefined,
          categoryFilter !== "ALL" ? categoryFilter : undefined,
          statusFilter !== "ALL" ? statusFilter : undefined
        ),
        getInventoryAnalyticsAction(shopId),
        getInventoryUsageHistoryAction(shopId, undefined, 50),
      ]);

      if (itemsRes.success && itemsRes.items) {
        setItems(itemsRes.items);
        setCategories(itemsRes.categories || []);
      }
      if (analyticsRes.success && analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }
      if (usagesRes.success && usagesRes.usages) {
        setUsages(usagesRes.usages);
      }
    } catch (err) {
      console.error("Inventory fetch error:", err);
      toast.create({
        title: "Error",
        description: "Failed to load branch inventory data.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, search, categoryFilter, statusFilter]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.itemCode.trim()) {
      toast.create({
        title: "Required Fields",
        description: "Please specify item name and item code.",
        type: "error",
      });
      return;
    }

    setIsCreating(true);
    const res = await createInventoryItemAction({
      shopId,
      ...createForm,
      quantity: Number(createForm.quantity) || 0,
      unitPrice: Number(createForm.unitPrice) || 0,
      minStockThreshold: Number(createForm.minStockThreshold) || 0,
    });
    setIsCreating(false);

    if (res.success) {
      toast.create({
        title: "Item Registered",
        description: res.message,
      });
      setCreateOpen(false);
      setCreateForm({
        name: "",
        itemCode: "",
        category: "General",
        quantity: 0,
        unit: "pcs",
        unitPrice: 0,
        minStockThreshold: 5,
        description: "",
        location: "",
      });
      fetchData();
    } else {
      toast.create({
        title: "Creation Failed",
        description: res.error || "Failed to create item.",
        type: "error",
      });
    }
  };

  // Handle Edit Submit
  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      itemCode: item.itemCode || "",
      category: item.category || "General",
      quantity: item.quantity || 0,
      unit: item.unit || "pcs",
      unitPrice: item.unitPrice || 0,
      minStockThreshold: item.minStockThreshold || 5,
      description: item.description || "",
      location: item.location || "",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    const res = await updateInventoryItemAction({
      itemId: editingItem._id,
      ...editForm,
      quantity: Number(editForm.quantity) || 0,
      unitPrice: Number(editForm.unitPrice) || 0,
      minStockThreshold: Number(editForm.minStockThreshold) || 0,
    });
    setIsUpdating(false);

    if (res.success) {
      toast.create({
        title: "Item Updated",
        description: res.message,
      });
      setEditOpen(false);
      setEditingItem(null);
      fetchData();
    } else {
      toast.create({
        title: "Update Failed",
        description: res.error || "Failed to update item.",
        type: "error",
      });
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteConfirmItem) return;

    setIsDeleting(true);
    const res = await deleteInventoryItemAction(deleteConfirmItem._id);
    setIsDeleting(false);

    if (res.success) {
      toast.create({
        title: "Item Deleted",
        description: res.message,
      });
      setDeleteConfirmItem(null);
      fetchData();
    } else {
      toast.create({
        title: "Delete Failed",
        description: res.error || "Failed to delete item.",
        type: "error",
      });
    }
  };

  // Handle Record Usage
  const handleOpenRecordUsage = (preselectedItemId?: string) => {
    setUsageForm({
      itemId: preselectedItemId || (items.length > 0 ? items[0]._id : ""),
      quantityUsed: 1,
      purpose: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
    setUsageOpen(true);
  };

  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageForm.itemId) {
      toast.create({
        title: "Item Required",
        description: "Please select an inventory item.",
        type: "error",
      });
      return;
    }
    if (!usageForm.purpose.trim()) {
      toast.create({
        title: "Purpose Required",
        description: "Please enter the usage purpose or department.",
        type: "error",
      });
      return;
    }

    setIsRecordingUsage(true);
    const res = await recordInventoryUsageAction({
      shopId,
      ...usageForm,
      quantityUsed: Number(usageForm.quantityUsed),
    });
    setIsRecordingUsage(false);

    if (res.success) {
      toast.create({
        title: "Usage Recorded",
        description: res.message,
      });

      if (res.isLowStock || res.isOutOfStock) {
        setRecentLowStockAlert({
          itemName: res.itemName,
          itemCode: res.itemCode,
          remaining: res.remainingQuantity,
          unit: res.unit,
          threshold: res.minStockThreshold,
        });
        toast.create({
          title: "Low Stock Alert",
          description: `Warning: "${res.itemName}" is running low on stock! Remaining: ${res.remainingQuantity} ${res.unit} (Threshold: ${res.minStockThreshold}).`,
          type: "error",
        });
      } else {
        setRecentLowStockAlert(null);
      }

      setUsageOpen(false);
      fetchData();
    } else {
      toast.create({
        title: "Usage Failed",
        description: res.error || "Failed to record usage.",
        type: "error",
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.create({ title: "No Data", description: "No inventory items to export." });
      return;
    }

    const headers = [
      "Item Code",
      "Item Name",
      "Category",
      "Stock Quantity",
      "Unit",
      "Unit Price (LKR)",
      "Total Value (LKR)",
      "Min Threshold",
      "Status",
      "Location",
      "Description",
    ];

    const rows = items.map((i) => [
      `"${i.itemCode || ""}"`,
      `"${(i.name || "").replace(/"/g, '""')}"`,
      `"${i.category || "General"}"`,
      i.quantity || 0,
      `"${i.unit || "pcs"}"`,
      (i.unitPrice || 0).toFixed(2),
      ((i.quantity || 0) * (i.unitPrice || 0)).toFixed(2),
      i.minStockThreshold || 0,
      i.isOutOfStock ? "OUT_OF_STOCK" : i.isLowStock ? "LOW_STOCK" : "IN_STOCK",
      `"${(i.location || "").replace(/"/g, '""')}"`,
      `"${(i.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventory_${shopCode}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedUsageItem = items.find((i) => i._id === usageForm.itemId);

  return (
    <div className="space-y-8">
      {/* Low Stock Alert Notification Banner if any */}
      {recentLowStockAlert && (
        <div className="glass-card p-6 rounded-3xl border border-destructive/40 text-foreground flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <AlertTriangleIcon className="size-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-lg text-foreground">Low Stock Alert Triggered</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Item <strong className="text-foreground">{recentLowStockAlert.itemName} ({recentLowStockAlert.itemCode})</strong> has fallen to{" "}
                <span className="font-mono font-bold text-destructive">{recentLowStockAlert.remaining} {recentLowStockAlert.unit}</span>.
                The minimum reorder threshold is <span className="font-mono">{recentLowStockAlert.threshold} {recentLowStockAlert.unit}</span>.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setRecentLowStockAlert(null)}
            className="h-10 rounded-xl px-4 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header and Quick Actions Bar */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <PackageIcon className="size-8 text-foreground" />
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                {shopName} Inventory
              </h2>
              <span className="font-mono text-sm px-3 py-1 rounded-full bg-surface/50 border border-muted/30 font-semibold text-foreground">
                {shopCode}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Track stock levels, monitor low stock reorder alerts, and record consumables usage.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-14 rounded-2xl px-6 bg-foreground text-background hover:opacity-90 font-semibold text-base gap-2"
            >
              <PlusCircleIcon className="size-5" />
              Add Item
            </Button>

            <Button
              onClick={() => handleOpenRecordUsage()}
              variant="outline"
              disabled={items.length === 0}
              className="h-14 rounded-2xl px-6 text-base font-semibold border-muted/30 bg-surface/30 hover:bg-surface/60 gap-2"
            >
              <MinusCircleIcon className="size-5" />
              Record Usage
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={refreshing}
              title="Refresh Data"
              className="size-14 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60"
            >
              <RefreshCwIcon className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val: any) => handleTabSelect(val)} className="space-y-6">
        <TabsList className="h-16 p-2 rounded-2xl bg-surface/40 border border-muted/30 flex gap-2 w-fit">
          <TabsTrigger value="dashboard" className="h-12 px-6 rounded-xl text-sm font-semibold gap-2 data-[state=active]:bg-foreground data-[state=active]:text-background">
            <LayoutDashboardIcon className="size-4" />
            <span>Overview &amp; Stats</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="h-12 px-6 rounded-xl text-sm font-semibold gap-2 data-[state=active]:bg-foreground data-[state=active]:text-background">
            <PackageIcon className="size-4" />
            <span>Inventory Items ({items.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="h-12 px-6 rounded-xl text-sm font-semibold gap-2 data-[state=active]:bg-foreground data-[state=active]:text-background">
            <HistoryIcon className="size-4" />
            <span>Usage History ({usages.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* 1. DASHBOARD TAB CONTENT */}
        <TabsContent value="dashboard" className="space-y-8 mt-0">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Total Items
                </span>
                <PackageIcon className="size-6 text-foreground" />
              </div>
              <div className="mt-4">
                <div className="text-4xl font-extrabold font-mono text-foreground">
                  {analytics.totalItems}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across {analytics.categoryBreakdown.length} categories
                </p>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Stock Units
                </span>
                <LayersIcon className="size-6 text-foreground" />
              </div>
              <div className="mt-4">
                <div className="text-4xl font-extrabold font-mono text-foreground">
                  {analytics.totalStockCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Cumulative branch inventory
                </p>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Low Stock Items
                </span>
                <AlertTriangleIcon className="size-6 text-destructive" />
              </div>
              <div className="mt-4">
                <div className="text-4xl font-extrabold font-mono text-destructive">
                  {analytics.lowStockCount + analytics.outOfStockCount}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Below reorder safety threshold
                </p>
              </div>
            </div>

            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Inventory Value
                </span>
                <DollarSignIcon className="size-6 text-foreground" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold font-mono text-foreground">
                  LKR {analytics.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  At base unit cost price
                </p>
              </div>
            </div>
          </div>

          {/* LOW STOCK ITEMS ALERT LIST */}
          {analytics.lowStockItems.length > 0 && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-destructive/30 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangleIcon className="size-6 text-destructive" />
                  <h4 className="text-lg font-bold text-foreground">
                    Reorder Required: Low Stock Items ({analytics.lowStockItems.length})
                  </h4>
                </div>
                <span className="text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-destructive/40 text-destructive bg-surface/50">
                  Needs Attention
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.lowStockItems.map((item) => (
                  <div
                    key={item._id}
                    className="glass-card p-5 rounded-2xl border border-muted/30 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {item.itemCode}
                        </span>
                        <h5 className="font-semibold text-base text-foreground truncate max-w-[200px]">
                          {item.name}
                        </h5>
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border border-destructive/40 text-destructive">
                        {item.isOutOfStock ? "OUT OF STOCK" : "LOW STOCK"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-muted/20 text-sm">
                      <div>
                        <span className="text-muted-foreground">Remaining: </span>
                        <span className="font-mono font-bold text-destructive">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Min: {item.minStockThreshold} {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHARTS & RECENT USAGE SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Category Breakdown Chart */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 space-y-6">
              <div>
                <h4 className="text-lg font-bold text-foreground">Stock Units by Category</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Distribution of inventory volume across registered categories
                </p>
              </div>

              {analytics.categoryBreakdown.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  No category data available
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} interval={0} angle={-25} textAnchor="end" />
                      <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                      <RechartsTooltip
                        formatter={(value: any) => [`${Number(value).toLocaleString()} units`, "Stock Quantity"]}
                        contentStyle={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", fontSize: "14px", borderRadius: "16px" }}
                      />
                      <Bar dataKey="itemCount" fill="var(--foreground)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent Consumption Activity */}
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-muted/30 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-foreground">Recent Consumables Usage</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Latest recorded inventory deductions and usage purposes
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => handleTabSelect("history")}
                  className="text-sm font-semibold text-foreground hover:bg-surface/50"
                >
                  View All
                </Button>
              </div>

              {analytics.recentUsages.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  No recorded usages yet. Click &quot;Record Usage&quot; to log consumption.
                </div>
              ) : (
                <div className="divide-y divide-muted/20">
                  {analytics.recentUsages.slice(0, 5).map((u) => (
                    <div key={u._id} className="py-4 flex items-center justify-between text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            {u.item?.itemCode}
                          </span>
                          <span className="font-semibold text-foreground">{u.item?.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Purpose: <strong className="text-foreground">{u.purpose}</strong>
                          {u.recordedBy?.name && ` • By ${u.recordedBy.name}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-destructive">
                          -{u.quantityUsed} {u.item?.unit}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {new Date(u.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 2. INVENTORY ITEMS TAB CONTENT */}
        <TabsContent value="items" className="space-y-6 mt-0">
          {/* Filters Bar */}
          <div className="glass-card p-4 sm:p-6 rounded-3xl border border-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-14 rounded-2xl bg-surface/40 border-muted/30 pl-11 text-base font-medium"
                />
              </div>

              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "ALL")}>
                <SelectTrigger className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base font-medium">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="glass-panel rounded-2xl border-muted/30">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base font-medium">
                  <SelectValue placeholder="All Stock Statuses" />
                </SelectTrigger>
                <SelectContent className="glass-panel rounded-2xl border-muted/30">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="IN_STOCK">In Stock Only</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock Alert</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="h-14 rounded-2xl px-6 text-base font-semibold border-muted/30 bg-surface/30 hover:bg-surface/60 gap-2 w-full sm:w-auto"
                >
                  <DownloadIcon className="size-5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="glass-card rounded-3xl border border-muted/30 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface/30 border-b border-muted/20">
                  <TableRow className="border-muted/20 hover:bg-transparent">
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Code</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Stock</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Cost</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Value</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Limit</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center text-sm text-muted-foreground">
                        <Loader2Icon className="size-6 animate-spin inline mr-2" />
                        Loading inventory records...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-48 text-center text-base font-medium text-muted-foreground">
                        No inventory items found. Click &quot;Add Item&quot; to register your first item.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item._id} className="hover:bg-surface/40 border-muted/20 transition-colors">
                        <TableCell className="py-5 px-6 font-mono text-sm font-bold text-foreground">
                          {item.itemCode}
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-base text-foreground">{item.name}</span>
                            {item.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          <span className="text-sm px-3 py-1 rounded-full bg-surface/50 border border-muted/30 font-medium text-foreground">
                            {item.category || "General"}
                          </span>
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-base font-bold">
                          <span className={item.isOutOfStock ? "text-destructive" : item.isLowStock ? "text-destructive" : "text-foreground"}>
                            {item.quantity} {item.unit}
                          </span>
                        </TableCell>
                        <TableCell className="py-5 px-6">
                          {item.isOutOfStock ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase border border-destructive/40 text-destructive">
                              Out of Stock
                            </span>
                          ) : item.isLowStock ? (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase border border-destructive/40 text-destructive">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase border border-muted/30 text-foreground">
                              In Stock
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-sm text-foreground">
                          LKR {Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-sm font-bold text-foreground">
                          LKR {Number(item.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-sm text-muted-foreground">
                          {item.minStockThreshold} {item.unit}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-sm text-muted-foreground">
                          {item.location ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPinIcon className="size-3.5" />
                              {item.location}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenRecordUsage(item._id)}
                              title="Record Usage"
                              className="h-10 px-3 rounded-xl text-xs font-semibold border-muted/30 hover:bg-surface/60 gap-1.5"
                            >
                              <MinusCircleIcon className="size-4" />
                              <span>Use</span>
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit Item"
                              className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                            >
                              <EditIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setDeleteConfirmItem(item)}
                              title="Delete Item"
                              className="size-10 rounded-xl text-destructive hover:bg-destructive/10"
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* 3. USAGE HISTORY TAB CONTENT */}
        <TabsContent value="history" className="space-y-6 mt-0">
          <div className="glass-card rounded-3xl border border-muted/30 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xl font-bold text-foreground">Usage &amp; Consumption Log</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Audit trail of all materials, components, and items issued or consumed
                </p>
              </div>
              <Button
                onClick={() => handleOpenRecordUsage()}
                className="h-12 rounded-2xl px-6 bg-foreground text-background hover:opacity-90 font-semibold text-sm gap-2"
              >
                <MinusCircleIcon className="size-4" />
                Record Usage
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface/30 border-b border-muted/20">
                  <TableRow className="border-muted/20 hover:bg-transparent">
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Code</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Qty Deducted</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Remaining</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose / Department</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Issued By</TableHead>
                    <TableHead className="h-14 px-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-base font-medium text-muted-foreground">
                        No usage entries recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usages.map((u) => (
                      <TableRow key={u._id} className="hover:bg-surface/40 border-muted/20 transition-colors">
                        <TableCell className="py-5 px-6 font-mono text-sm text-muted-foreground">
                          {new Date(u.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-sm font-bold text-foreground">
                          {u.item?.itemCode}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-semibold text-base text-foreground">
                          {u.item?.name}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-base font-bold text-destructive">
                          -{u.quantityUsed} {u.item?.unit}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-mono text-sm text-foreground">
                          {u.remainingQuantity} {u.item?.unit}
                        </TableCell>
                        <TableCell className="py-5 px-6 font-medium text-sm text-foreground">
                          {u.purpose}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-sm text-muted-foreground">
                          {u.recordedBy?.name || "System"}
                        </TableCell>
                        <TableCell className="py-5 px-6 text-sm text-muted-foreground max-w-xs truncate">
                          {u.note || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* CREATE ITEM MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <PackageIcon className="size-6 text-foreground" />
              <span>Register New Inventory Item</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-normal">
              Add a new component, consumable, or item to branch stock.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item Name *</label>
                <Input
                  placeholder="e.g. Arduino Uno R3, Copper Wire"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item Code / SKU *</label>
                <Input
                  placeholder="e.g. ARD-001, WIRE-CU"
                  value={createForm.itemCode}
                  onChange={(e) => setCreateForm({ ...createForm, itemCode: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Input
                  placeholder="e.g. Electronics, Stationary, Tools"
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unit of Measure</label>
                <Input
                  placeholder="e.g. pcs, box, kg, pack"
                  value={createForm.unit}
                  onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Initial Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.quantity}
                  onChange={(e) => setCreateForm({ ...createForm, quantity: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unit Cost (LKR)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={createForm.unitPrice}
                  onChange={(e) => setCreateForm({ ...createForm, unitPrice: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Min Alert Level</label>
                <Input
                  type="number"
                  min="0"
                  value={createForm.minStockThreshold}
                  onChange={(e) => setCreateForm({ ...createForm, minStockThreshold: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                  title="Alert is triggered when stock drops below this number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shelf / Location</label>
              <Input
                placeholder="e.g. Shelf A-3, Cabinet 2, Bin 12"
                value={createForm.location}
                onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description / Specifications</label>
              <Textarea
                placeholder="Product details, voltage, tolerance, supplier..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-12 rounded-2xl text-sm px-6 border-muted/30">
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8">
                {isCreating ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
                Save Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <EditIcon className="size-6 text-foreground" />
              <span>Edit Inventory Item</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-normal">
              Update item specifications, stock quantity, or low stock threshold.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item Name *</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item Code / SKU *</label>
                <Input
                  value={editForm.itemCode}
                  onChange={(e) => setEditForm({ ...editForm, itemCode: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unit of Measure</label>
                <Input
                  value={editForm.unit}
                  onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Current Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Unit Cost (LKR)</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={editForm.unitPrice}
                  onChange={(e) => setEditForm({ ...editForm, unitPrice: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Min Alert Level</label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.minStockThreshold}
                  onChange={(e) => setEditForm({ ...editForm, minStockThreshold: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shelf / Location</label>
              <Input
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="h-12 rounded-2xl text-sm px-6 border-muted/30">
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating} className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8">
                {isUpdating ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
                Update Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECORD USAGE MODAL */}
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2.5 text-foreground">
              <MinusCircleIcon className="size-6 text-foreground" />
              <span>Record Inventory Usage</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground font-normal">
              Deduct consumed parts, materials, or supplies from available branch inventory.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUsageSubmit} className="space-y-5">
            {/* Item selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Item *</label>
              <Select
                value={usageForm.itemId}
                onValueChange={(val) => setUsageForm({ ...usageForm, itemId: val || "" })}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-medium">
                  <SelectValue placeholder="Choose an item..." />
                </SelectTrigger>
                <SelectContent className="glass-panel rounded-2xl border-muted/30 max-h-60">
                  {items.map((i) => (
                    <SelectItem key={i._id} value={i._id} className="text-sm">
                      {i.itemCode} - {i.name} (Stock: {i.quantity} {i.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected item stock status card */}
            {selectedUsageItem && (
              <div className="p-4 rounded-2xl bg-surface/30 border border-muted/20 space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Available Stock:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedUsageItem.quantity} {selectedUsageItem.unit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reorder Threshold:</span>
                  <span className="font-mono text-muted-foreground">
                    {selectedUsageItem.minStockThreshold} {selectedUsageItem.unit}
                  </span>
                </div>
                {selectedUsageItem.quantity <= selectedUsageItem.minStockThreshold && (
                  <div className="text-xs text-destructive font-medium pt-2 border-t border-muted/20 flex items-center gap-2">
                    <AlertTriangleIcon className="size-3.5 shrink-0" />
                    <span>This item is currently at or below minimum threshold!</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quantity Used *</label>
                <Input
                  type="number"
                  min="1"
                  max={selectedUsageItem ? selectedUsageItem.quantity : undefined}
                  value={usageForm.quantityUsed}
                  onChange={(e) => setUsageForm({ ...usageForm, quantityUsed: Number(e.target.value) })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 font-mono font-bold text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date *</label>
                <Input
                  type="date"
                  value={usageForm.date}
                  onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Purpose / Recipient *
              </label>
              <Input
                placeholder="e.g. Lab Project #4, Student Demo, Maintenance"
                value={usageForm.purpose}
                onChange={(e) => setUsageForm({ ...usageForm, purpose: e.target.value })}
                className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Additional Note</label>
              <Textarea
                placeholder="Optional notes or authorization details..."
                value={usageForm.note}
                onChange={(e) => setUsageForm({ ...usageForm, note: e.target.value })}
                className="rounded-2xl bg-surface/40 border-muted/30 text-sm p-4"
                rows={3}
              />
            </div>

            <DialogFooter className="gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setUsageOpen(false)} className="h-12 rounded-2xl text-sm px-6 border-muted/30">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRecordingUsage || !selectedUsageItem || selectedUsageItem.quantity <= 0}
                className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
              >
                {isRecordingUsage ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
                Confirm Usage
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <AlertDialog
        open={!!deleteConfirmItem}
        onOpenChange={(open) => !open && setDeleteConfirmItem(null)}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="flex items-center gap-2.5 text-destructive text-2xl font-bold tracking-tight">
              <Trash2Icon className="size-6" />
              <span>Delete Inventory Item?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                {deleteConfirmItem?.name} ({deleteConfirmItem?.itemCode})
              </strong>{" "}
              from branch inventory? Past usage logs remain intact for auditing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel disabled={isDeleting} className="h-12 rounded-2xl text-sm px-6 border-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              disabled={isDeleting}
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold px-6"
            >
              {isDeleting ? <Loader2Icon className="size-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
