"use client";

import * as React from "react";
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface SummaryReportsViewProps {
  initialShops: ShopOption[];
  userRole?: string;
  userShopId?: string | null;
}

export function SummaryReportsView({
  initialShops,
  userRole = "ADMIN",
  userShopId,
}: SummaryReportsViewProps) {
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "custom">("month");
  const [selectedShop, setSelectedShop] = React.useState<string>(userShopId || "ALL");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  const [data, setData] = React.useState<{
    kpis: {
      totalTransactions: number;
      totalExpense: number;
      totalIncome: number;
      pendingApprovals: number;
      approvedAmount: number;
      rejectedAmount: number;
      netBalance: number;
    };
    timelineData: Array<{ date: string; income: number; expense: number }>;
    shopComparisonData: Array<{ shop: string; code: string; income: number; expense: number }>;
    categoryBreakdownData: Array<{ category: string; colorToken: string; total: number; type: string }>;
    records: Array<any>;
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
    timelineData: [],
    shopComparisonData: [],
    categoryBreakdownData: [],
    records: [],
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSummaryAnalyticsAction({
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
        shopId: selectedShop,
      });

      if (res.success && res.kpis) {
        setData({
          kpis: res.kpis,
          timelineData: res.timelineData || [],
          shopComparisonData: res.shopComparisonData || [],
          categoryBreakdownData: res.categoryBreakdownData || [],
          records: res.records || [],
        });
      } else {
        toast.create({
          title: "Error",
          description: res.error || "Failed to load summary.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Failed to connect to analytics server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [period, selectedShop, startDate, endDate]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const exportCSV = () => {
    if (!data.records.length) {
      toast.create({
        title: "Export empty",
        description: "No ledger records matching active filters.",
      });
      return;
    }

    const headers = [
      "Date",
      "Branch",
      "Bill Number",
      "Payment Method",
      "Category",
      "Type",
      "Reason",
      "Submitted Amount",
      "Status",
      "Approved Amount",
      "Running Balance",
    ];

    const rows = data.records.map((r) => [
      `"${new Date(r.date).toISOString().split("T")[0]}"`,
      `"${r.shop?.name || ""}"`,
      `"${r.billNumber || ""}"`,
      `"${r.paymentMethod || ""}"`,
      `"${r.category?.name || ""}"`,
      `"${r.type || ""}"`,
      `"${(r.reason || "").replace(/"/g, '""')}"`,
      r.amount,
      `"${r.status}"`,
      r.approvedAmount ?? "",
      r.runningBalance ?? "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Summary_${period}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Export complete",
      description: `Exported ${data.records.length} records to CSV.`,
    });
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const d = new Date(row.original.date);
        return <span className="font-mono text-base font-semibold">{d.toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: "shop.name",
      header: "Branch",
      cell: ({ row }) => (
        <span className="font-bold text-base text-foreground">
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
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <span className={`font-mono text-base font-bold ${isIncome ? "text-stat-1" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} LKR {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  const lineChartConfig: ChartConfig = {
    income: {
      label: "Inflows",
      color: "var(--stat-1)",
    },
    expense: {
      label: "Outflows",
      color: "var(--stat-2)",
    },
  };

  const barChartConfig: ChartConfig = {
    income: {
      label: "Income",
      color: "var(--stat-1)",
    },
    expense: {
      label: "Expense",
      color: "var(--stat-2)",
    },
  };

  return (
    <div className="space-y-10">
      {/* Range and Branch Selector Bar */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-muted/20 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Minimal Period Selector */}
          <div className="flex rounded-2xl bg-surface/40 p-1.5 border border-muted/20">
            {(["today", "week", "month", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-5 py-2.5 rounded-xl text-base font-semibold transition-all capitalize ${
                  period === p
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "today" ? "Today" : p === "week" ? "Week" : p === "month" ? "Month" : "Custom"}
              </button>
            ))}
          </div>

          {/* Branch Filter */}
          {userRole !== "STAFF" && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="h-14 rounded-2xl border border-muted/30 bg-surface/40 text-foreground px-5 text-base font-semibold outline-none focus:border-foreground/50"
            >
              <option value="ALL">All Branches</option>
              {initialShops.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base font-medium px-4"
              />
              <span className="text-base text-muted-foreground font-semibold">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-14 rounded-2xl bg-surface/40 border-muted/30 text-base font-medium px-4"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="h-14 rounded-2xl bg-surface/40 hover:bg-surface/70 border border-muted/20 text-foreground text-base font-semibold px-5 gap-2.5"
          >
            <RefreshCw className={`size-5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </Button>

          <Button
            onClick={exportCSV}
            className="h-14 rounded-2xl bg-foreground text-background hover:opacity-90 text-base font-semibold px-6 gap-2.5"
          >
            <Download className="size-5" />
            <span>CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Net Balance</span>
            <DollarSign className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-stat-2">
            LKR {data.kpis.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Inflows</span>
            <TrendingUp className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-stat-1">
            LKR {data.kpis.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Outflows</span>
            <TrendingDown className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground">
            LKR {data.kpis.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 space-y-3 border-muted/20">
          <div className="flex items-center justify-between text-base font-semibold text-muted-foreground">
            <span>Pending Review</span>
            <Clock className="size-6 text-foreground" />
          </div>
          <div className="text-3xl font-bold font-mono text-foreground">
            {data.kpis.pendingApprovals}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border-muted/20 shadow-lg">
          <h2 className="text-2xl font-bold text-foreground">
            Cash Flow Trajectory
          </h2>
          <div className="h-80 w-full pt-4">
            {data.timelineData.length > 0 ? (
              <ChartContainer config={lineChartConfig} className="h-full w-full">
                <LineChart data={data.timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#819A91"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#D6BD98"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-base text-muted-foreground">
                No time-series data available.
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border-muted/20 shadow-lg">
          <h2 className="text-2xl font-bold text-foreground">
            Branch Comparison
          </h2>
          <div className="h-80 w-full pt-4">
            {data.shopComparisonData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-full w-full">
                <BarChart data={data.shopComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                  <XAxis
                    dataKey="code"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="#819A91" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expense" fill="#D6BD98" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-base text-muted-foreground">
                No branch comparison data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <h2 className="text-2xl font-bold text-foreground">
          Categories
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {data.categoryBreakdownData.map((cat) => (
            <div
              key={cat.category}
              className="rounded-2xl bg-surface/30 border border-muted/20 p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">
                  {cat.category}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.type}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-stat-1">
                LKR {cat.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}

          {data.categoryBreakdownData.length === 0 && (
            <div className="col-span-full py-12 text-center text-base text-muted-foreground">
              No category volume recorded.
            </div>
          )}
        </div>
      </div>

      {/* Tabular Ledger */}
      <div className="glass-panel rounded-3xl p-8 sm:p-10 space-y-6 border-muted/20 shadow-lg">
        <h2 className="text-2xl font-bold text-foreground">
          Ledger Records
        </h2>
        <DataTable
          columns={columns}
          data={data.records}
          searchKey="billNumber"
          searchPlaceholder="Search bill number..."
          loading={loading}
        />
      </div>
    </div>
  );
}
