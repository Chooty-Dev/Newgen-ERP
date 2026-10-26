"use client";

import * as React from "react";
import {
  getUsersAction,
  createUserAction,
  updateUserAction,
  toggleUserActiveAction,
  reassignShopAction,
  unassignShopAction,
} from "@/actions/users";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  UpdateUserInput,
} from "@/schemas/user";
import {
  UserPlus,
  Edit,
  Store,
  UserX,
  UserCheck,
  Building,
  Loader2,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "STAFF" | "VERIFIER" | "ADMIN";
  shop?: { _id: string; name: string; code: string } | null;
  shops?: Array<{ _id: string; name: string; code: string }>;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

function BranchCheckboxList({
  shops,
  selectedShopIds,
  onChange,
}: {
  shops: ShopOption[];
  selectedShopIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected = shops.length > 0 && selectedShopIds.length === shops.length;

  const toggleShop = (shopId: string) => {
    if (selectedShopIds.includes(shopId)) {
      onChange(selectedShopIds.filter((id) => id !== shopId));
    } else {
      onChange([...selectedShopIds, shopId]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(shops.map((s) => s._id));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-base font-semibold text-foreground">
          Assigned Branches
        </label>
        {shops.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        )}
      </div>

      <div className="max-h-48 overflow-y-auto rounded-2xl border border-muted/30 bg-surface/30 p-3 space-y-2 no-scrollbar">
        {shops.map((s) => {
          const isChecked = selectedShopIds.includes(s._id);
          return (
            <label
              key={s._id}
              onClick={() => toggleShop(s._id)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface/50 cursor-pointer transition-colors"
            >
              <div
                className={`flex size-6 items-center justify-center rounded-lg border transition-colors ${
                  isChecked
                    ? "border-foreground bg-foreground text-background"
                    : "border-muted/40 bg-surface/30"
                }`}
              >
                {isChecked && <Check className="size-4" />}
              </div>
              <span className="text-base font-medium text-foreground">
                {s.name} ({s.code})
              </span>
            </label>
          );
        })}
        {shops.length === 0 && (
          <p className="text-sm text-muted-foreground py-2 text-center">
            No branches found.
          </p>
        )}
      </div>
    </div>
  );
}

export function UsersView({
  initialUsers,
  shops,
}: {
  initialUsers: UserItem[];
  shops: ShopOption[];
}) {
  const [users, setUsers] = React.useState<UserItem[]>(initialUsers);
  const [loading, setLoading] = React.useState(false);

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [reassignOpen, setReassignOpen] = React.useState(false);
  const [confirmToggleUser, setConfirmToggleUser] = React.useState<UserItem | null>(null);

  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [createShopIds, setCreateShopIds] = React.useState<string[]>([]);
  const [editShopIds, setEditShopIds] = React.useState<string[]>([]);
  const [reassignShopIds, setReassignShopIds] = React.useState<string[]>([]);

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "STAFF",
      phone: "",
      shop: "",
      shops: [],
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "STAFF",
      shop: "",
      shops: [],
      isActive: true,
      password: "",
    },
  });

  const refreshUsers = async () => {
    setLoading(true);
    const res = await getUsersAction();
    if (res.success && res.users) {
      setUsers(res.users);
    }
    setLoading(false);
  };

  const onCreateSubmit = async (data: CreateUserInput) => {
    const payload = {
      ...data,
      shops: data.role === "STAFF" ? createShopIds : [],
      shop: data.role === "STAFF" && createShopIds.length > 0 ? createShopIds[0] : undefined,
    };
    const res = await createUserAction(payload);
    if (res.success) {
      toast.create({
        title: "User registered",
        description: "New account created successfully.",
      });
      setCreateOpen(false);
      createForm.reset();
      setCreateShopIds([]);
      refreshUsers();
    } else {
      toast.create({
        title: "Registration failed",
        description: res.error || "An error occurred.",
        type: "error",
      });
    }
  };

  const onEditSubmit = async (data: UpdateUserInput) => {
    if (!selectedUser) return;
    const payload = {
      ...data,
      shops: data.role === "STAFF" ? editShopIds : [],
      shop: data.role === "STAFF" && editShopIds.length > 0 ? editShopIds[0] : undefined,
    };
    const res = await updateUserAction(selectedUser._id, payload);
    if (res.success) {
      toast.create({
        title: "User updated",
        description: "Account details saved.",
      });
      setEditOpen(false);
      refreshUsers();
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "An error occurred.",
        type: "error",
      });
    }
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    const existingShopIds =
      user.shops && user.shops.length > 0
        ? user.shops.map((s) => s._id)
        : user.shop
        ? [user.shop._id]
        : [];
    setEditShopIds(existingShopIds);

    editForm.reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      shop: user.shop?._id || "",
      isActive: user.isActive,
      password: "",
    });
    setEditOpen(true);
  };

  const openReassignModal = (user: UserItem) => {
    setSelectedUser(user);
    const existingShopIds =
      user.shops && user.shops.length > 0
        ? user.shops.map((s) => s._id)
        : user.shop
        ? [user.shop._id]
        : [];
    setReassignShopIds(existingShopIds);
    setReassignOpen(true);
  };

  const handleReassignSubmit = async () => {
    if (!selectedUser || reassignShopIds.length === 0) {
      toast.create({
        title: "Selection required",
        description: "Select at least one branch.",
        type: "error",
      });
      return;
    }
    const res = await reassignShopAction({
      userId: selectedUser._id,
      shopIds: reassignShopIds,
    });
    if (res.success) {
      toast.create({
        title: "Branch assignment updated",
        description: res.message || "Updated successfully.",
      });
      setReassignOpen(false);
      refreshUsers();
    } else {
      toast.create({
        title: "Assignment failed",
        description: res.error || "Could not reassign branches.",
        type: "error",
      });
    }
  };

  const handleUnassignShop = async (userId: string) => {
    const res = await unassignShopAction(userId);
    if (res.success) {
      toast.create({
        title: "Unassigned",
        description: res.message,
      });
      refreshUsers();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Could not unassign branches.",
        type: "error",
      });
    }
  };

  const handleToggleActive = async () => {
    if (!confirmToggleUser) return;
    const res = await toggleUserActiveAction(confirmToggleUser._id);
    if (res.success) {
      toast.create({
        title: res.isActive ? "User activated" : "User deactivated",
        description: `Status updated.`,
      });
      setConfirmToggleUser(null);
      refreshUsers();
    } else {
      toast.create({
        title: "Action failed",
        description: res.error || "Could not toggle status.",
        type: "error",
      });
    }
  };

  const columns: ColumnDef<UserItem>[] = [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <div className="font-bold text-base text-foreground">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="text-base font-semibold text-stat-1 uppercase">
          {row.original.role}
        </span>
      ),
    },
    {
      accessorKey: "shop.name",
      header: "Assigned Branches",
      cell: ({ row }) => {
        const user = row.original;
        if (user.role !== "STAFF") {
          return <span className="text-base text-muted-foreground">Global Access</span>;
        }

        const userShops =
          user.shops && user.shops.length > 0
            ? user.shops
            : user.shop
            ? [user.shop]
            : [];

        if (userShops.length === 0) {
          return <span className="text-base text-destructive font-semibold">Unassigned</span>;
        }

        return (
          <span className="text-base font-medium text-foreground">
            {userShops.map((s) => s.name).join(", ")}
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
        const user = row.original;
        const hasAssignedShops = Boolean(
          (user.shops && user.shops.length > 0) || user.shop
        );

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(user)}
              className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
              title="Edit"
            >
              <Edit className="size-5" />
            </button>

            {user.role === "STAFF" && (
              <>
                <button
                  onClick={() => openReassignModal(user)}
                  className="p-2 rounded-xl text-foreground hover:bg-surface/50 transition-colors"
                  title="Assign Branches"
                >
                  <Store className="size-5" />
                </button>
                {hasAssignedShops && (
                  <button
                    onClick={() => handleUnassignShop(user._id)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                    title="Unassign Branches"
                  >
                    <Building className="size-5" />
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setConfirmToggleUser(user)}
              className={`p-2 rounded-xl transition-colors ${
                user.isActive
                  ? "text-destructive hover:bg-destructive/10"
                  : "text-stat-1 hover:bg-surface/50"
              }`}
              title={user.isActive ? "Deactivate" : "Activate"}
            >
              {user.isActive ? <UserX className="size-5" /> : <UserCheck className="size-5" />}
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
            Users
          </h1>
          <p className="text-base text-muted-foreground">
            Account Privileges & Branch Assignments
          </p>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-3 justify-between"
        >
          <UserPlus className="size-5" />
          <span>Add User</span>
          <ArrowUpRight className="size-5" />
        </Button>
      </div>

      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <DataTable
          columns={columns}
          data={users}
          searchKey="name"
          searchPlaceholder="Search user name..."
          loading={loading}
        />
      </div>

      {/* CREATE USER DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Add User
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Register a new administrative or branch staff user profile.
            </p>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  placeholder="e.g. John Silva"
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
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@newgen.lk"
                  {...createForm.register("email")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
                {createForm.formState.errors.email && (
                  <p className="text-xs font-medium text-destructive">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Temporary Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...createForm.register("password")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
                {createForm.formState.errors.password && (
                  <p className="text-xs font-medium text-destructive">
                    {createForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Access Role
                </label>
                <select
                  {...createForm.register("role")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="STAFF">Finance Officer (Branch Staff)</option>
                  <option value="VERIFIER">Verifier (Cross-Branch Reviewer)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>
            </div>

            {createForm.watch("role") === "STAFF" && (
              <BranchCheckboxList
                shops={shops}
                selectedShopIds={createShopIds}
                onChange={setCreateShopIds}
              />
            )}

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
                  <span>Save User</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Edit User
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Modify account credentials, permissions, and shop allocations.
            </p>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Full Name
                </label>
                <Input
                  {...editForm.register("name")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <Input
                  type="email"
                  {...editForm.register("email")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Reset Password (Optional)
                </label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  {...editForm.register("password")}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Access Role
                </label>
                <select
                  {...editForm.register("role")}
                  className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-sm font-medium outline-none focus:border-foreground/50"
                >
                  <option value="STAFF">Finance Officer (Branch Staff)</option>
                  <option value="VERIFIER">Verifier (Cross-Branch Reviewer)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>
            </div>

            {editForm.watch("role") === "STAFF" && (
              <BranchCheckboxList
                shops={shops}
                selectedShopIds={editShopIds}
                onChange={setEditShopIds}
              />
            )}

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

      {/* REASSIGN SHOPS DIALOG */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Assign Branches
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Select the branches this staff member is authorized to access and reconcile.
            </p>
          </DialogHeader>

          <div className="py-2">
            <BranchCheckboxList
              shops={shops}
              selectedShopIds={reassignShopIds}
              onChange={setReassignShopIds}
            />
          </div>

          <DialogFooter className="gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReassignOpen(false)}
              className="h-12 rounded-2xl text-sm px-6 border-muted/30"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReassignSubmit}
              className="h-12 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm px-8"
            >
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TOGGLE ACTIVE DIALOG */}
      <AlertDialog
        open={!!confirmToggleUser}
        onOpenChange={(open) => !open && setConfirmToggleUser(null)}
      >
        <AlertDialogContent className="sm:max-w-md glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-4">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {confirmToggleUser?.isActive ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to {confirmToggleUser?.isActive ? "deactivate" : "activate"}{" "}
              <strong className="text-foreground">{confirmToggleUser?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel className="h-12 rounded-2xl text-sm px-6 border-muted/30">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              className={`h-12 rounded-2xl text-sm font-semibold px-6 ${
                confirmToggleUser?.isActive
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
