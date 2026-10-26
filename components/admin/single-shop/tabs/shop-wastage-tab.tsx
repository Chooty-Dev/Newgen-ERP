"use client";

import React from "react";
import {
  AlertOctagonIcon,
  DownloadIcon,
  PackageIcon,
  ReceiptIcon,
  FlameIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShopWastageTabProps {
  wastageAnalytics: {
    totalWastedUnits: number;
    totalMonetaryLoss: number;
    incidentCount: number;
    itemBreakdown: Array<{
      itemCode: string;
      itemName: string;
      unitsWasted: number;
      totalLoss: number;
    }>;
    incidents: any[];
  };
  onExportCSV: () => void;
}

export function ShopWastageTab({
  wastageAnalytics,
  onExportCSV,
}: ShopWastageTabProps) {
  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-muted/30 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <AlertOctagonIcon className="size-6 text-foreground shrink-0" />
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Item Wastage &amp; Damage Loss Ledger
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Track misprinted sheets, damaged inventory, and defective production losses computed strictly at wholesale base unit cost.
          </p>
        </div>

        <Button
          onClick={onExportCSV}
          className="h-12 px-5 rounded-xl bg-foreground text-background font-semibold hover:opacity-90 gap-2 text-xs shrink-0"
        >
          <DownloadIcon className="size-3.5" />
          <span>Export Wastage CSV</span>
        </Button>
      </div>

      {/* 4 Spacious KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Financial Loss
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-destructive">
                LKR {Number(wastageAnalytics.totalMonetaryLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                At wholesale procurement unit cost
              </p>
            </div>
            <AlertOctagonIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Units Wasted
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {Number(wastageAnalytics.totalWastedUnits || 0).toLocaleString()}{" "}
                <span className="text-xs font-sans font-normal text-muted-foreground">units</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Misprints, spoiled sheets, or broken items
              </p>
            </div>
            <PackageIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Incidents Logged
              </span>
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {wastageAnalytics.incidentCount}{" "}
                <span className="text-xs font-sans font-normal text-muted-foreground">events</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Recorded by branch staff officers
              </p>
            </div>
            <ReceiptIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>

        <Card className="glass-card border border-muted/30 p-6 rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Top Loss Item
              </span>
              <div className="text-base font-bold truncate max-w-[180px] text-foreground">
                {wastageAnalytics.itemBreakdown[0]?.itemName || "None"}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                {wastageAnalytics.itemBreakdown[0]
                  ? `LKR ${Number(wastageAnalytics.itemBreakdown[0].totalLoss).toLocaleString()} (${wastageAnalytics.itemBreakdown[0].unitsWasted} units)`
                  : "No wastage recorded"}
              </p>
            </div>
            <FlameIcon className="size-5 text-foreground shrink-0" />
          </div>
        </Card>
      </div>

      {/* Product Wastage Breakdown Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-muted/20">
          <CardTitle className="text-base font-bold text-foreground flex items-center justify-between">
            <span>Wastage &amp; Defect Breakdown by Item</span>
            <Badge variant="outline" className="text-xs font-mono border-muted/30 bg-surface/50">
              {wastageAnalytics.itemBreakdown.length} affected product{wastageAnalytics.itemBreakdown.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Summary of spoiled inventory items and their cumulative financial impact
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface/50 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-muted/20">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-left">Item Code</th>
                  <th className="py-3.5 px-4 font-semibold text-left">Product Name</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Units Spoiled</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Financial Loss (LKR)</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Share of Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/20">
                {wastageAnalytics.itemBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                      No item wastage or defect records found for this time period.
                    </td>
                  </tr>
                ) : (
                  wastageAnalytics.itemBreakdown.map((item) => {
                    const sharePct = wastageAnalytics.totalMonetaryLoss > 0
                      ? ((item.totalLoss / wastageAnalytics.totalMonetaryLoss) * 100).toFixed(1)
                      : "0";
                    return (
                      <tr key={item.itemCode} className="hover:bg-surface/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          <span className="px-2.5 py-1 rounded-lg border border-muted/30 bg-background/50">
                            {item.itemCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {item.itemName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                          {Number(item.unitsWasted).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-destructive">
                          LKR {Number(item.totalLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] bg-destructive/10 text-destructive border border-destructive/20 font-semibold">
                            {sharePct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Incidents Audit Table */}
      <Card className="glass-card border border-muted/30 rounded-3xl overflow-hidden">
        <CardHeader className="p-6 pb-4 border-b border-muted/20">
          <CardTitle className="text-base font-bold text-foreground">
            Damage &amp; Misprint Incidents Audit Log ({wastageAnalytics.incidents.length})
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Detailed ledger of all registered damage and misprint occurrences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface/50 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-muted/20">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-left">Date &amp; Time</th>
                  <th className="py-3.5 px-4 font-semibold text-left">Item Code</th>
                  <th className="py-3.5 px-4 font-semibold text-left">Item Name</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Qty</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Base Unit Cost</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Calculated Loss</th>
                  <th className="py-3.5 px-4 font-semibold text-left">Reason / Defect Note</th>
                  <th className="py-3.5 px-4 font-semibold text-left">Reported By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/20 font-mono">
                {wastageAnalytics.incidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs font-sans">
                      No wastage incidents recorded for this time range.
                    </td>
                  </tr>
                ) : (
                  wastageAnalytics.incidents.map((inc: any) => (
                    <tr key={inc._id} className="hover:bg-surface/40 transition-colors">
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(inc.date).toLocaleDateString()} {new Date(inc.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        {inc.itemCode}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-foreground">
                        {inc.itemName}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-foreground">
                        {inc.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right text-muted-foreground">
                        LKR {Number(inc.unitBasePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-destructive">
                        LKR {Number(inc.totalLoss || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-muted-foreground max-w-[200px] truncate" title={inc.reason}>
                        {inc.reason}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-muted-foreground whitespace-nowrap">
                        {inc.reportedBy?.name || "Staff"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
