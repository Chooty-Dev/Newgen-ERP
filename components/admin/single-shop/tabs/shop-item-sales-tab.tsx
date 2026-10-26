"use client";

import React from "react";
import {
  SmartphoneIcon,
  RefreshCwIcon,
  DownloadIcon,
  CalendarIcon,
  SearchIcon,
  XIcon,
  ArrowUpDownIcon,
  PackageIcon,
  FilterIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TelecomOperator } from "@/schemas/communication";

interface ShopItemSalesTabProps {
  commAnalytics: {
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    totalTransactions: number;
    itemBreakdown: Array<{
      itemCode: string;
      itemName: string;
      operator: TelecomOperator;
      quantity: number;
      unitCost: number;
      unitSellingPrice: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }>;
    telecomBreakdown?: any[];
  };
  period: "today" | "week" | "month" | "year" | "custom";
  setPeriod: (p: "today" | "week" | "month" | "year" | "custom") => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  loading: boolean;
  onRefresh: () => void;
  shopName: string;
}

export function ShopItemSalesTab({
  commAnalytics,
  period,
  setPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  loading,
  onRefresh,
  shopName,
}: ShopItemSalesTabProps) {
  const [selectedOperatorFilter, setSelectedOperatorFilter] = React.useState<"ALL" | TelecomOperator>("ALL");
  const [itemSearchQuery, setItemSearchQuery] = React.useState<string>("");
  const [itemSortBy, setItemSortBy] = React.useState<"revenue" | "profit" | "quantity" | "margin" | "code">("revenue");
  const [itemSortOrder, setItemSortOrder] = React.useState<"asc" | "desc">("desc");

  // Aggregated telecom breakdown
  const telecomData = React.useMemo(() => {
    if (commAnalytics.telecomBreakdown && commAnalytics.telecomBreakdown.length > 0) {
      return commAnalytics.telecomBreakdown;
    }
    const map: Record<string, any> = {
      DIALOG: { operator: "DIALOG", name: "Dialog", codePrefix: "D", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      MOBITEL: { operator: "MOBITEL", name: "Mobitel", codePrefix: "M", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      AIRTEL: { operator: "AIRTEL", name: "Airtel", codePrefix: "A", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      HUTCH: { operator: "HUTCH", name: "Hutch", codePrefix: "H", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
      OTHER: { operator: "OTHER", name: "Other Items & Services", codePrefix: "*", revenue: 0, cost: 0, profit: 0, quantity: 0, txCount: 0, marginPct: 0 },
    };
    for (const it of commAnalytics.itemBreakdown || []) {
      const op = it.operator || "OTHER";
      if (map[op]) {
        map[op].revenue += it.revenue || 0;
        map[op].cost += it.cost || 0;
        map[op].profit += it.profit || 0;
        map[op].quantity += it.quantity || 0;
        map[op].txCount += 1;
      }
    }
    return Object.values(map).map((t: any) => ({
      ...t,
      marginPct: t.revenue > 0 ? Number(((t.profit / t.revenue) * 100).toFixed(1)) : 0,
    }));
  }, [commAnalytics.telecomBreakdown, commAnalytics.itemBreakdown]);

  // Filtered and sorted product performance
  const filteredAndSortedItems = React.useMemo(() => {
    let list = (commAnalytics.itemBreakdown || []) as Array<{
      itemCode: string;
      itemName: string;
      operator: TelecomOperator;
      quantity: number;
      unitCost: number;
      unitSellingPrice: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }>;

    if (selectedOperatorFilter !== "ALL") {
      list = list.filter((it) => it.operator === selectedOperatorFilter);
    }

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.trim().toLowerCase();
      list = list.filter(
        (it) =>
          it.itemCode?.toLowerCase().includes(q) ||
          it.itemName?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (itemSortBy === "revenue") comparison = a.revenue - b.revenue;
      else if (itemSortBy === "profit") comparison = a.profit - b.profit;
      else if (itemSortBy === "quantity") comparison = a.quantity - b.quantity;
      else if (itemSortBy === "margin") comparison = a.marginPct - b.marginPct;
      else if (itemSortBy === "code") comparison = a.itemCode.localeCompare(b.itemCode);

      return itemSortOrder === "desc" ? -comparison : comparison;
    });
  }, [commAnalytics.itemBreakdown, selectedOperatorFilter, itemSearchQuery, itemSortBy, itemSortOrder]);

  const filteredTotals = React.useMemo(() => {
    let qty = 0;
    let rev = 0;
    let cost = 0;
    let profit = 0;
    for (const it of filteredAndSortedItems) {
      qty += it.quantity || 0;
      rev += it.revenue || 0;
      cost += it.cost || 0;
      profit += it.profit || 0;
    }
    const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
    return { qty, rev, cost, profit, margin };
  }, [filteredAndSortedItems]);

  const [showAllItems, setShowAllItems] = React.useState(false);
  const displayedItems = React.useMemo(() => {
    if (showAllItems) return filteredAndSortedItems;
    return filteredAndSortedItems.slice(0, 15);
  }, [filteredAndSortedItems, showAllItems]);

  const handleExportCSV = () => {
    const headers = [
      "Item Code",
      "Item Name",
      "Operator",
      "Quantity Sold",
      "Base Cost (LKR)",
      "Total Sales / Revenue (LKR)",
      "Total Cost (LKR)",
      "Net Profit (LKR)",
      "Margin (%)",
    ];
    const rows = filteredAndSortedItems.map((item) => [
      `"${item.itemCode || ""}"`,
      `"${(item.itemName || "").replace(/"/g, '""')}"`,
      `"${item.operator || "OTHER"}"`,
      item.quantity || 0,
      Number(item.unitCost || 0).toFixed(2),
      Number(item.revenue || 0).toFixed(2),
      Number(item.cost || 0).toFixed(2),
      Number(item.profit || 0).toFixed(2),
      `${item.marginPct || 0}%`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `item_wise_sales_${shopName.replace(/\s+/g, "_")}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderOperatorBadge = (operator: TelecomOperator) => {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-muted/30 bg-surface/50 text-foreground">
        <span className="size-1.5 rounded-full bg-foreground" />
        {operator || "OTHER"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header and Controls */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col gap-6 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <SmartphoneIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Item-Wise Sales &amp; Telecom Breakdown
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Aggregated reload sales, base costs, and net profit margins categorized by telecom network and individual item codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center rounded-2xl border border-muted/30 bg-surface/40 p-1.5 gap-1">
            {(["today", "week", "month", "year", "custom"] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="xs"
                onClick={() => setPeriod(p)}
                className={`text-xs capitalize h-9 px-3.5 rounded-xl font-semibold transition-all ${
                  period === p
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "today"
                  ? "Today"
                  : p === "week"
                  ? "This Week"
                  : p === "month"
                  ? "This Month"
                  : p === "year"
                  ? "This Year"
                  : "Custom Range"}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="h-12 px-4 rounded-xl border border-muted/30 gap-2 text-xs font-semibold"
          >
            <RefreshCwIcon className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            className="h-12 px-5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 gap-2 text-xs"
          >
            <DownloadIcon className="size-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {period === "custom" && (
        <div className="glass-card p-4 rounded-2xl border border-muted/30 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarIcon className="size-4 text-foreground" />
            <span>Custom Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 text-xs w-48 rounded-xl border border-muted/30 bg-background/50"
            />
            <span className="text-xs text-muted-foreground font-mono">to</span>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 text-xs w-48 rounded-xl border border-muted/30 bg-background/50"
            />
            <Button
              onClick={onRefresh}
              className="h-11 text-xs font-semibold px-4 rounded-xl bg-foreground text-background hover:opacity-90"
            >
              Apply Filter
            </Button>
          </div>
        </div>
      )}

      {/* Operator Aggregates Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Telecom Network - Operator Aggregates
          </span>
          {selectedOperatorFilter !== "ALL" && (
            <button
              onClick={() => setSelectedOperatorFilter("ALL")}
              className="text-xs text-foreground font-semibold hover:underline flex items-center gap-1"
            >
              <XIcon className="size-3.5" />
              Reset to All Operators
            </button>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {telecomData.map((op: any) => {
            const isSelected = selectedOperatorFilter === op.operator;
            return (
              <Card
                key={op.operator}
                onClick={() =>
                  setSelectedOperatorFilter(isSelected ? "ALL" : op.operator)
                }
                className={`glass-card p-6 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-foreground ring-1 ring-foreground/20 bg-surface/70"
                    : "border-muted/30 hover:border-foreground/30 hover:bg-surface/50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {op.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-muted/30 bg-surface/50 text-foreground font-semibold">
                    {op.quantity || 0} units
                  </span>
                </div>

                <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  LKR {Number(op.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>

                <div className="mt-3 pt-3 border-t border-muted/20 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans block uppercase">Net Profit</span>
                    <span className="font-semibold text-foreground">
                      +LKR {Number(op.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground font-sans block uppercase">Margin</span>
                    <span className="font-bold text-foreground">
                      {op.marginPct}%
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Individual Product & Reload Performance Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-muted/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Individual Product &amp; Reload Performance
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Detailed sales volume, wholesale cost, net profit, and profit margins for every item sold in this period
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                Showing <strong className="text-foreground">{filteredAndSortedItems.length}</strong> items
              </span>
            </div>
          </div>

          {/* Search, Filter Pills & Sort Controls */}
          <div className="mt-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-4 border-t border-muted/20">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by item code or name..."
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                className="h-14 pl-11 pr-10 rounded-2xl border border-muted/30 bg-surface/40 text-sm text-foreground focus:border-foreground/50 transition-colors"
              />
              {itemSearchQuery && (
                <button
                  onClick={() => setItemSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Operator quick pills */}
              <div className="flex items-center rounded-2xl border border-muted/30 bg-surface/40 p-1.5 gap-1">
                {(["ALL", "DIALOG", "MOBITEL", "AIRTEL", "HUTCH", "OTHER"] as const).map((opKey) => (
                  <button
                    key={opKey}
                    onClick={() => setSelectedOperatorFilter(opKey)}
                    className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                      selectedOperatorFilter === opKey
                        ? "bg-foreground text-background shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opKey === "ALL" ? "All" : opKey.charAt(0) + opKey.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <Select
                value={itemSortBy}
                onValueChange={(val: any) => setItemSortBy(val)}
              >
                <SelectTrigger className="h-14 px-4 rounded-2xl border border-muted/30 bg-surface/40 text-xs font-semibold w-44">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit" className="text-xs">Highest Profit</SelectItem>
                  <SelectItem value="revenue" className="text-xs">Highest Sales</SelectItem>
                  <SelectItem value="quantity" className="text-xs">Most Units Sold</SelectItem>
                  <SelectItem value="margin" className="text-xs">Highest Margin %</SelectItem>
                  <SelectItem value="code" className="text-xs">Item Code (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Direction Toggle */}
              <Button
                variant="outline"
                onClick={() => setItemSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                title={`Sort order: ${itemSortOrder === "asc" ? "Ascending" : "Descending"}`}
                className="size-14 rounded-2xl border border-muted/30 shrink-0"
              >
                <ArrowUpDownIcon className="size-4 text-foreground" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface/50 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-muted/20">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Item Code</th>
                  <th className="py-3.5 px-4 font-semibold">Product / Item Name</th>
                  <th className="py-3.5 px-4 font-semibold">Network Operator</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Units Sold</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Base Cost</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Cost</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Sales</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Net Profit</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/20">
                {filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageIcon className="size-8 opacity-40 text-muted-foreground" />
                        <p className="font-semibold text-sm text-foreground">No item sales recorded</p>
                        <p className="text-xs max-w-sm text-muted-foreground">
                          No sales matching this time period or operator filter were found in the shop records.
                        </p>
                        {selectedOperatorFilter !== "ALL" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOperatorFilter("ALL")}
                            className="mt-2 text-xs rounded-xl"
                          >
                            Clear Operator Filter
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => (
                    <tr key={item.itemCode} className="hover:bg-surface/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        <span className="px-2.5 py-1 rounded-lg border border-muted/30 bg-background/50">
                          {item.itemCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {item.itemName}
                      </td>
                      <td className="py-3.5 px-4">
                        {renderOperatorBadge(item.operator)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                        LKR {Number(item.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                        LKR {Number(item.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        LKR {Number(item.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                        {item.profit >= 0 ? "+" : ""}LKR {Number(item.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface/50 text-foreground border border-muted/30">
                          {item.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredAndSortedItems.length > 0 && (
                <tfoot className="bg-surface/40 border-t border-muted/20 font-semibold text-xs">
                  <tr>
                    <td colSpan={3} className="py-4 px-4 text-foreground uppercase tracking-wider text-[11px] font-bold">
                      Filtered Totals ({filteredAndSortedItems.length} Products)
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground font-bold">
                      {filteredTotals.qty.toLocaleString()} units
                    </td>
                    <td className="py-4 px-4 text-right text-muted-foreground font-mono">
                      -
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                      LKR {filteredTotals.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground font-bold">
                      LKR {filteredTotals.rev.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground font-bold">
                      {filteredTotals.profit >= 0 ? "+" : ""}LKR {filteredTotals.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-surface/50 text-foreground border border-muted/30">
                        {filteredTotals.margin}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Bottom Fade Gradient when collapsed */}
          {!showAllItems && filteredAndSortedItems.length > 15 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-3xl bg-gradient-to-t from-background via-background/60 to-transparent" />
          )}
        </CardContent>

        {/* Show More / Show Less Button */}
        {filteredAndSortedItems.length > 15 && (
          <div className="flex justify-center p-4 border-t border-muted/20 bg-surface/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAllItems((prev) => !prev)}
              className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/40 hover:bg-surface/70 text-xs font-semibold text-foreground gap-2 transition-all shadow-xs"
            >
              <span>
                {showAllItems
                  ? "Show Less"
                  : `Show More (${filteredAndSortedItems.length - 15} more items)`}
              </span>
              {showAllItems ? (
                <ChevronUp className="size-4 text-foreground" />
              ) : (
                <ChevronDown className="size-4 text-foreground" />
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
