"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getShopsAction,
  createShopAction,
  updateShopAction,
  toggleShopActiveAction,
} from "@/actions/shops";
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
  createShopSchema,
  updateShopSchema,
  CreateShopInput,
  UpdateShopInput,
} from "@/schemas/shop";
import {
  Plus,
  Edit,
  Eye,
  Power,
  Users,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  shopType?: "STANDARD" | "COMMUNICATION" | "INVENTORY";
  isActive: boolean;
  staffCount: number;
  recordsCount: number;
  currentBalance: number;
  totalCustomerCredit?: number;
  interBranchDues?: {
    totalHolding: number;
    totalOwed: number;
  };
}

export function ShopsView({ initialShops }: { initialShops: ShopItem[] }) {
  const router = useRouter();
  const [shops, setShops] = React.useState<ShopItem[]>(initialShops);
  const [loading, setLoading] = React.useState(false);

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmToggleShop, setConfirmToggleShop] = React.useState<ShopItem | null>(null);
  const [selectedShop, setSelectedShop] = React.useState<ShopItem | null>(null);

  const createForm = useForm<CreateShopInput>({
    resolver: zodResolver(createShopSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      address: "",
      shopType: "STANDARD",
    },
  });

  const editForm = useForm<UpdateShopInput>({
    resolver: zodResolver(updateShopSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      address: "",
      shopType: "STANDARD",
      isActive: true,
    },
  });

  const refreshShops = async () => {
    setLoading(true);
    const res = await getShopsAction();
    if (res.success && res.shops) {
      setShops(res.shops);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateShopInput) => {
    const res = await createShopAction(data);
    if (res.success) {
      toast.create({
        title: "Branch created",
        description: "New branch registered successfully.",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshShops();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not register branch.",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateShopInput) => {
    if (!selectedShop) return;
    const res = await updateShopAction(selectedShop._id, data);
    if (res.success) {
      toast.create({
        title: "Branch updated",
        description: "Branch details saved.",
      });
      setEditOpen(false);
      refreshShops();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not save details.",
        type: "error",
      });
    }
  };

  const openEditModal = (shop: ShopItem) => {
    setSelectedShop(shop);
    editForm.reset({
      name: shop.name,
      code: shop.code,
      description: shop.description || "",
      address: shop.address || "",
      shopType: shop.shopType || "STANDARD",
      isActive: shop.isActive,
    });
    setEditOpen(true);
  };

  const handleToggleActive = async () => {
    if (!confirmToggleShop) return;
    const res = await toggleShopActiveAction(confirmToggleShop._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "Branch activated" : "Branch deactivated",
        description: `Status changed to ${res.isActive ? "active" : "inactive"}.`,
      });
      setConfirmToggleShop(null);
      refreshShops();
    } else {
      toast.create({
        title: "Failed",
        description: res.error || "Could not update status.",
        type: "error",
      });
    }
  };

  const columns: ColumnDef<ShopItem>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-base font-bold text-stat-1">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Branch",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <Link
            href={`/dashboard/admin/shops/${row.original._id}`}
            className="font-bold text-base text-foreground hover:underline"
          >
            {row.original.name}
          </Link>
          <div className="text-sm text-muted-foreground">
            {row.original.address || "Unspecified address"} • {row.original.shopType || "STANDARD"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "staffCount",
      header: "Staff",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-base font-medium text-foreground">
          <Users className="size-5 text-muted-foreground" />
          <span>{row.original.staffCount}</span>
        </div>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Balance",
      cell: ({ row }) => {
        if (row.original.shopType === "INVENTORY") {
          return <span className="text-sm text-muted-foreground">Inventory</span>;
        }
        const bal = row.original.currentBalance || 0;
        return (
          <span className="font-mono text-base font-bold text-stat-1">
            LKR {Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
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
        const shop = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/admin/shops/${shop._id}`)}
              className="h-10 rounded-xl px-3 border-muted/30 text-foreground hover:bg-surface/50 text-sm font-semibold gap-1.5"
            >
              <Eye className="size-4" />
              <span>View</span>
            </Button>
            <button
              onClick={() => openEditModal(shop)}
              className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
              title="Edit"
            >
              <Edit className="size-5" />
            </button>
            <button
              onClick={() => setConfirmToggleShop(shop)}
              className={`p-2 rounded-xl transition-colors ${
                shop.isActive
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-stat-1 hover:bg-surface/50"
              }`}
              title={shop.isActive ? "Disable" : "Activate"}
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
            Branches
          </h1>
          <p className="text-base text-muted-foreground">
            Branch Network & Location Directory
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-3 justify-between"
        >
          <Plus className="size-5" />
          <span>Add Branch</span>
          <ArrowUpRight className="size-5" />
        </Button>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <DataTable
          columns={columns}
          data={shops}
          searchKey="name"
          searchPlaceholder="Search branch name..."
          loading={loading}
        />
      </div>

      {/* CREATE SHOP MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Add Branch
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Register a new shop branch to manage staff, inventory, and transactions.
            </p>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch Name
                </label>
                <Input
                  placeholder="e.g. Colombo Campus"
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
                  Branch Code
                </label>
                <Input
                  placeholder="e.g. CMB"
                  {...createForm.register("code")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono uppercase font-bold"
                />
                {createForm.formState.errors.code && (
                  <p className="text-xs font-medium text-destructive">
                    {createForm.formState.errors.code.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch Type
                </label>
                <select
                  {...createForm.register("shopType")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="STANDARD">Standard Branch</option>
                  <option value="COMMUNICATION">Communication & Retail</option>
                  <option value="INVENTORY">Inventory Management</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Physical Address
                </label>
                <Input
                  placeholder="Street address, city"
                  {...createForm.register("address")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              <Textarea
                placeholder="Location details or notes"
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
                  <span>Save Branch</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT SHOP MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Edit Branch
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Update branch information and configuration details.
            </p>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch Name
                </label>
                <Input
                  {...editForm.register("name")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch Code
                </label>
                <Input
                  {...editForm.register("code")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm font-mono uppercase font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Branch Type
                </label>
                <select
                  {...editForm.register("shopType")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium"
                >
                  <option value="STANDARD">Standard Branch</option>
                  <option value="COMMUNICATION">Communication & Retail</option>
                  <option value="INVENTORY">Inventory Management</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Physical Address
                </label>
                <Input
                  {...editForm.register("address")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
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

      {/* TOGGLE ACTIVE ALERT */}
      <AlertDialog
        open={!!confirmToggleShop}
        onOpenChange={(open) => !open && setConfirmToggleShop(null)}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {confirmToggleShop?.isActive ? "Deactivate Branch" : "Activate Branch"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to {confirmToggleShop?.isActive ? "deactivate" : "activate"}{" "}
              <strong className="text-foreground">{confirmToggleShop?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel className="h-12 rounded-2xl text-sm px-6 border-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={`h-12 rounded-2xl text-sm font-semibold px-6 ${
                confirmToggleShop?.isActive
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
