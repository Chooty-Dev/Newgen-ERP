"use client";

import * as React from "react";
import { getAuditLogsAction } from "@/actions/audit";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Download,
  RotateCcw,
  Search,
  Eye,
  ShieldCheck,
  Globe,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface AuditLogsViewProps {
  initialLogs: any[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
}

export function AuditLogsView({
  initialLogs,
  initialTotal,
  initialPage,
  initialTotalPages,
}: AuditLogsViewProps) {
  const [logs, setLogs] = React.useState<any[]>(initialLogs);
  const [total, setTotal] = React.useState<number>(initialTotal);
  const [page, setPage] = React.useState<number>(initialPage);
  const [totalPages, setTotalPages] = React.useState<number>(initialTotalPages);
  const [loading, setLoading] = React.useState(false);

  // Progressive Disclosure
  const [showFilters, setShowFilters] = React.useState(false);

  // Filters
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [search, setSearch] = React.useState("");

  // Inspect Modal
  const [inspectLog, setInspectLog] = React.useState<any | null>(null);

  const fetchLogs = async (targetPage = page) => {
    setLoading(true);
    const res = await getAuditLogsAction({
      action: actionFilter !== "ALL" ? actionFilter : undefined,
      targetType: targetTypeFilter !== "ALL" ? targetTypeFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search.trim() || undefined,
      page: targetPage,
      limit: 25,
    });

    if (res.success && res.logs) {
      setLogs(res.logs);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
    } else {
      toast.create({
        title: "Failed to load audit logs",
        description: res.error || "An error occurred.",
        type: "error",
      });
    }
    setLoading(false);
  };

  const handleApplyFilters = () => {
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setActionFilter("ALL");
    setTargetTypeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setTimeout(() => {
      fetchLogs(1);
    }, 50);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.create({
        title: "Export empty",
        description: "No logs to export.",
      });
      return;
    }

    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Action",
      "Target Type",
      "Target ID",
      "Bill Number",
      "Reason",
      "IP Address",
    ];

    const rows = logs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.actorName || l.actor?.name || "System",
      l.actorEmail || l.actor?.email || "",
      l.actorRole || l.actor?.role || "",
      l.action || "",
      l.targetType || "",
      l.targetId ? String(l.targetId) : "",
      l.metadata?.billNumber || "",
      l.metadata?.editReason || l.metadata?.deletionReason || l.metadata?.remarks || "",
      l.ipAddress || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map((row) =>
          row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="font-mono text-base font-semibold text-foreground whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "Actor",
      cell: ({ row }) => {
        const l = row.original;
        const name = l.actorName || l.actor?.name || "System";
        const email = l.actorEmail || l.actor?.email || "";
        const role = l.actorRole || l.actor?.role || "USER";

        return (
          <div className="space-y-0.5">
            <div className="font-bold text-base text-foreground">
              {name} • <span className="text-stat-1 text-sm uppercase">{role}</span>
            </div>
            <div className="text-sm text-muted-foreground">{email}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.original.action || "";
        const isDelete = action.includes("DELETE");
        return (
          <span
            className={`font-mono text-base font-bold uppercase ${
              isDelete ? "text-destructive" : "text-stat-1"
            }`}
          >
            {action.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      accessorKey: "targetType",
      header: "Entity",
      cell: ({ row }) => {
        const l = row.original;
        const billNumber = l.metadata?.billNumber;
        return (
          <div className="space-y-0.5">
            <span className="font-semibold text-base text-foreground">
              {l.targetType}
            </span>
            {billNumber && (
              <span className="font-mono text-sm text-stat-2 block">
                Bill: {billNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "ipAddress",
      header: "Origin",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-base font-mono text-muted-foreground">
          <Globe className="size-4 shrink-0" />
          <span>{row.original.ipAddress || "127.0.0.1"}</span>
        </div>
      ),
    },
    {
      id: "inspect",
      header: "Details",
      cell: ({ row }) => (
        <Button
          variant="outline"
          onClick={() => setInspectLog(row.original)}
          className="h-10 rounded-xl px-4 border-muted/30 text-foreground hover:bg-surface/50 text-sm font-semibold gap-2"
        >
          <Eye className="size-4" />
          <span>Inspect</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Audit Trail
            </h1>
            <ShieldCheck className="size-6 text-stat-1" />
          </div>
          <p className="text-base text-muted-foreground">
            Non-repudiable Security Ledger & System Action Trail
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-2.5"
          >
            <Download className="size-5" />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border-muted/20 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 size-5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search user, action, bill number, or notes..."
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
            Apply
          </Button>
        </div>

        {showFilters && (
          <div className="pt-6 border-t border-muted/20 space-y-6 animate-in fade-in-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Actions</option>
                  <option value="LOGIN_SUCCESS">Login Success</option>
                  <option value="LOGOUT">Logout</option>
                  <option value="TRANSACTION_CREATE">Transaction Create</option>
                  <option value="TRANSACTION_EDIT">Transaction Edit</option>
                  <option value="TRANSACTION_DELETE">Transaction Delete</option>
                  <option value="USER_CREATE">User Create</option>
                  <option value="SHOP_CREATE">Shop Create</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  Target Entity
                </label>
                <select
                  value={targetTypeFilter}
                  onChange={(e) => setTargetTypeFilter(e.target.value)}
                  className="w-full h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-4 text-base font-medium outline-none focus:border-foreground/50"
                >
                  <option value="ALL">All Entities</option>
                  <option value="TRANSACTION">Transaction</option>
                  <option value="USER">User</option>
                  <option value="SHOP">Branch</option>
                  <option value="BANK_ACCOUNT">Bank Account</option>
                  <option value="PETTY_CASH">Petty Cash</option>
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

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                className="h-12 rounded-xl text-base font-semibold text-muted-foreground hover:text-foreground px-5 gap-2"
              >
                <RotateCcw className="size-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
          <span>
            <strong className="text-foreground">{logs.length}</strong> of{" "}
            <strong className="text-foreground">{total}</strong> events
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => fetchLogs(page - 1)}
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
                onClick={() => fetchLogs(page + 1)}
                className="h-11 rounded-xl px-4 text-base font-medium border-muted/20"
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <DataTable
          columns={columns}
          data={logs}
          searchKey="action"
          searchPlaceholder="Quick filter action in view..."
          loading={loading}
        />
      </div>

      {/* INSPECT LOG MODAL */}
      <Dialog open={!!inspectLog} onOpenChange={(open) => !open && setInspectLog(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto glass-panel border border-muted/30 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Event Details
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Full immutable trace and state diff for this audit record.
            </p>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3.5 rounded-2xl bg-surface/30 border border-muted/20">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</div>
                  <div className="font-mono text-base font-bold text-stat-1">{inspectLog.action}</div>
                </div>

                <div className="space-y-1 p-3.5 rounded-2xl bg-surface/30 border border-muted/20">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</div>
                  <div className="text-base font-bold text-foreground">{inspectLog.targetType}</div>
                </div>
              </div>

              <div className="space-y-1 p-3.5 rounded-2xl bg-surface/30 border border-muted/20">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actor</div>
                <div className="text-sm font-semibold text-foreground">
                  {inspectLog.actorName || inspectLog.actor?.name || "System"} <span className="text-muted-foreground font-normal">({inspectLog.actorEmail || inspectLog.actor?.email})</span>
                </div>
              </div>

              {inspectLog.metadata?.editReason && (
                <div className="space-y-1 p-4 rounded-2xl bg-surface/30 border border-muted/20">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edit Reason</div>
                  <div className="text-sm font-medium text-foreground">{inspectLog.metadata.editReason}</div>
                </div>
              )}

              {inspectLog.metadata?.deletionReason && (
                <div className="space-y-1 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                  <div className="text-xs font-semibold text-destructive uppercase tracking-wider">Deletion Reason</div>
                  <div className="text-sm font-medium text-destructive">{inspectLog.metadata.deletionReason}</div>
                </div>
              )}

              {/* State Diff */}
              {inspectLog.metadata?.previousState && inspectLog.metadata?.newState && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Field Changes</h3>
                  <div className="space-y-2">
                    {Object.keys(inspectLog.metadata.newState).map((key) => {
                      const oldVal = inspectLog.metadata.previousState[key];
                      const newVal = inspectLog.metadata.newState[key];
                      if (String(oldVal) === String(newVal)) return null;
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/30 border border-muted/20 text-xs font-mono"
                        >
                          <span className="font-bold text-foreground">{key}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through">{String(oldVal ?? "null")}</span>
                            <ArrowRight className="size-3.5 text-muted-foreground" />
                            <span className="text-stat-1 font-bold">{String(newVal ?? "null")}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
