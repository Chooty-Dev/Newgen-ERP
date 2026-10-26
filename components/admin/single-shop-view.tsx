"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { ColumnDef } from "@tanstack/react-table";
import { useShopNav, ShopTabId } from "@/components/shared/shop-nav-context";
import { CategoryBadge } from "@/components/shared/category-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";

// Sub-components
import { ShopHeaderBanner } from "./single-shop/shop-header-banner";
import { ShopOverviewTab } from "./single-shop/tabs/shop-overview-tab";
import { ShopItemSalesTab } from "./single-shop/tabs/shop-item-sales-tab";
import { ShopProductsTab } from "./single-shop/tabs/shop-products-tab";
import { ShopUtilityBillsTab } from "./single-shop/tabs/shop-utility-bills-tab";
import { ShopWastageTab } from "./single-shop/tabs/shop-wastage-tab";
import { ShopCreditsTab } from "./single-shop/tabs/shop-credits-tab";
import { ShopSettlementTab } from "./single-shop/tabs/shop-settlement-tab";
import { ShopDiscrepancyTab } from "./single-shop/tabs/shop-discrepancy-tab";
import { ShopStaffTab } from "./single-shop/tabs/shop-staff-tab";
import { InventoryView } from "../inventory/inventory-view";
import { InterBranchSettleDialog } from "./single-shop/modals/inter-branch-settle-dialog";

// Actions
import { getSummaryAnalyticsAction } from "@/actions/reports";
import { getShopDetailsAction } from "@/actions/shops";
import {
  getCommunicationAnalyticsAction,
  getCommunicationItemsAction,
  getItemWastageAnalyticsAction,
} from "@/actions/communication";
import { getShopCreditCustomersAction } from "@/actions/credit";
import { getUtilityBillAnalyticsAction } from "@/actions/finances";
import { getDailySettlementHistoryAction } from "@/actions/dailySettlement";

export interface SingleShop {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  shopType?: string;
  assignedStaff?: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
    assignedAt?: string;
  }>;
}

export interface AssignedStaff {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedAt?: string;
}

export interface ShopStats {
  recordsCount: number;
  pendingCount: number;
  approvedCount: number;
  currentBalance: number;
  totalCustomerCredit?: number;
  creditCustomerCount?: number;
  inventoryItemCount?: number;
  interBranchDues?: {
    totalHolding: number;
    totalOwedToThisShop: number;
    holdingForOthers: Array<{
      shopId: string;
      shopName: string;
      shopCode: string;
      totalAmount: number;
      count: number;
      recordIds: string[];
    }>;
    owedByOthers: Array<{
      shopId: string;
      shopName: string;
      shopCode: string;
      totalAmount: number;
      count: number;
      recordIds: string[];
    }>;
  };
}

interface SingleShopViewProps {
  initialShop: SingleShop;
  initialStaff: AssignedStaff[];
  initialStats: ShopStats;
  bankAccounts?: any[];
}

export function SingleShopView({
  initialShop,
  initialStaff,
  initialStats,
  bankAccounts = [],
}: SingleShopViewProps) {
  const isCommunication = initialShop.shopType === "COMMUNICATION";
  const isInventoryShop = initialShop.shopType === "INVENTORY";

  const { setShopNav } = useShopNav();
  const [activeTab, setActiveTab] = React.useState<ShopTabId>("overview");

  // Synchronize active tab from URL query parameter e.g. ?tab=utilityBills
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as ShopTabId;
      const validTabs: ShopTabId[] = [
        "overview",
        "itemSales",
        "items",
        "inventory",
        "inventoryHistory",
        "utilityBills",
        "wastage",
        "credits",
        "dailySettlement",
        "discrepancies",
        "staff",
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = React.useCallback((val: ShopTabId) => {
    setActiveTab(val);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", val);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Main Period & Filter State
  const [period, setPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);

  // Main shop state
  const [shop, setShop] = React.useState(initialShop);
  const [staff, setStaff] = React.useState<AssignedStaff[]>(initialStaff);
  const [stats, setStats] = React.useState(initialStats);
  const [companyBankAccounts, setCompanyBankAccounts] = React.useState<any[]>(bankAccounts);

  // Credit Customers & Debt Ledger State
  const [creditCustomers, setCreditCustomers] = React.useState<any[]>([]);
  const [creditStats, setCreditStats] = React.useState<{
    totalCreditIssued: number;
    totalPaid: number;
    totalOutstanding: number;
    debtorCount: number;
  }>({
    totalCreditIssued: 0,
    totalPaid: 0,
    totalOutstanding: initialStats.totalCustomerCredit || 0,
    debtorCount: initialStats.creditCustomerCount || 0,
  });
  const [creditSearch, setCreditSearch] = React.useState("");
  const [creditLoading, setCreditLoading] = React.useState(false);

  // Wastage & Defect Loss State
  const [wastageAnalytics, setWastageAnalytics] = React.useState<{
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
  }>({
    totalWastedUnits: 0,
    totalMonetaryLoss: 0,
    incidentCount: 0,
    itemBreakdown: [],
    incidents: [],
  });

  // Registered Communication Products
  const [commItems, setCommItems] = React.useState<any[]>([]);
  const [commAnalytics, setCommAnalytics] = React.useState<{
    totalRevenue: number;
    totalCost: number;
    netProfit: number;
    totalDebtRepayments?: number;
    cashDebtRepayments?: number;
    totalTransactions: number;
    branchRelatedCount: number;
    nonBranchCount: number;
    records: any[];
    itemBreakdown: any[];
    telecomBreakdown?: any[];
    periodCashInflow?: number;
    periodCashOutflow?: number;
    periodCashBalance?: number;
    periodClosingCashBalance?: number;
  }>({
    totalRevenue: 0,
    totalCost: 0,
    netProfit: 0,
    totalDebtRepayments: 0,
    cashDebtRepayments: 0,
    totalTransactions: 0,
    branchRelatedCount: 0,
    nonBranchCount: 0,
    records: [],
    itemBreakdown: [],
    telecomBreakdown: [],
    periodCashInflow: 0,
    periodCashOutflow: 0,
    periodCashBalance: 0,
    periodClosingCashBalance: 0,
  });

  // Standard Analytics State
  const [analytics, setAnalytics] = React.useState<{
    kpis: any;
    records: any[];
    categoryBreakdown: any[];
  }>({
    kpis: {
      totalCashInflow: 0,
      totalCashOutflow: 0,
      netBalance: 0,
      totalTransactions: 0,
      periodCashInflow: 0,
      periodCashOutflow: 0,
      periodCashBalance: 0,
      periodClosingCashBalance: 0,
    },
    records: [],
    categoryBreakdown: [],
  });

  // Utility Bill Payments Analytics State
  const [utilityPeriod, setUtilityPeriod] = React.useState<"today" | "week" | "month" | "year" | "custom">("month");
  const [utilityStartDate, setUtilityStartDate] = React.useState("");
  const [utilityEndDate, setUtilityEndDate] = React.useState("");
  const [utilityLoading, setUtilityLoading] = React.useState(false);
  const [utilityAnalytics, setUtilityAnalytics] = React.useState<{
    totalBillsCount: number;
    totalCollected: number;
    totalBillAmount: number;
    totalServiceCharges: number;
    totalProviderFees: number;
    totalNetProfit: number;
    breakdown: {
      electricity: { count: number; amount: number; profit: number };
      water: { count: number; amount: number; profit: number };
      other: { count: number; amount: number; profit: number };
    };
    records: any[];
  }>({
    totalBillsCount: 0,
    totalCollected: 0,
    totalBillAmount: 0,
    totalServiceCharges: 0,
    totalProviderFees: 0,
    totalNetProfit: 0,
    breakdown: {
      electricity: { count: 0, amount: 0, profit: 0 },
      water: { count: 0, amount: 0, profit: 0 },
      other: { count: 0, amount: 0, profit: 0 },
    },
    records: [],
  });

  // Inter-branch cash settle dialog
  const [settleOpen, setSettleOpen] = React.useState(false);
  const [selectedHoldingDue, setSelectedHoldingDue] = React.useState<any | null>(null);

  // Synchronize dedicated branch sidebar
  React.useEffect(() => {
    setShopNav({
      shopId: shop._id,
      shopName: shop.name,
      shopCode: shop.code,
      shopType: shop.shopType || "STANDARD",
      isCommunication,
      isInventoryOnly: isInventoryShop,
      activeTab,
      setActiveTab: (t: ShopTabId) => handleTabChange(t),
      counts: {
        inventory: (stats as any).inventoryItemCount || commItems.length || 0,
        utilityBills: utilityAnalytics.totalBillsCount || 0,
        credit: creditStats.debtorCount || creditCustomers.length || 0,
        staff: staff.length || 0,
      },
    });

    return () => {
      setShopNav(null);
    };
  }, [
    shop._id,
    shop.name,
    shop.code,
    shop.shopType,
    isCommunication,
    isInventoryShop,
    activeTab,
    (stats as any).inventoryItemCount,
    commItems.length,
    utilityAnalytics.totalBillsCount,
    creditStats.debtorCount,
    creditCustomers.length,
    staff.length,
    setShopNav,
    handleTabChange,
  ]);

  // Main Data Loader
  const fetchShopData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, shopRes] = await Promise.all([
        getSummaryAnalyticsAction({
          period,
          startDate: period === "custom" ? startDate : undefined,
          endDate: period === "custom" ? endDate : undefined,
          shopId: shop._id,
        }),
        getShopDetailsAction(shop._id),
      ]);

      if (analyticsRes.success && analyticsRes.kpis) {
        setAnalytics({
          kpis: analyticsRes.kpis,
          records: analyticsRes.records || [],
          categoryBreakdown: analyticsRes.categoryBreakdownData || [],
        });
      }

      if (shopRes.success && shopRes.shop) {
        setShop(shopRes.shop);
        setStaff(shopRes.assignedStaff || []);
        if (shopRes.stats) {
          setStats(shopRes.stats);
        }
      }

      if (isCommunication) {
        const [itemsRes, commAnalyticsRes, creditRes, wastageRes, utilityRes, settlementRes] =
          await Promise.all([
            getCommunicationItemsAction(shop._id),
            getCommunicationAnalyticsAction({
              shopId: shop._id,
              period,
              startDate: period === "custom" ? startDate : undefined,
              endDate: period === "custom" ? endDate : undefined,
            }),
            getShopCreditCustomersAction(shop._id, creditSearch),
            getItemWastageAnalyticsAction({
              shopId: shop._id,
              period,
              startDate: period === "custom" ? startDate : undefined,
              endDate: period === "custom" ? endDate : undefined,
            }),
            getUtilityBillAnalyticsAction({
              shopId: shop._id,
              period: utilityPeriod,
              startDate: utilityPeriod === "custom" ? utilityStartDate : undefined,
              endDate: utilityPeriod === "custom" ? utilityEndDate : undefined,
            }),
            getDailySettlementHistoryAction(shop._id),
          ]);

        if (itemsRes.success) setCommItems(itemsRes.items || []);
        if (commAnalyticsRes.success) {
          setCommAnalytics({
            totalRevenue: commAnalyticsRes.totalRevenue || 0,
            totalCost: commAnalyticsRes.totalCost || 0,
            netProfit: commAnalyticsRes.netProfit || 0,
            totalDebtRepayments: (commAnalyticsRes as any).totalDebtRepayments || 0,
            cashDebtRepayments: (commAnalyticsRes as any).cashDebtRepayments || 0,
            totalTransactions: commAnalyticsRes.totalTransactions || 0,
            branchRelatedCount: commAnalyticsRes.branchRelatedCount || 0,
            nonBranchCount: commAnalyticsRes.nonBranchCount || 0,
            records: commAnalyticsRes.records || [],
            itemBreakdown: commAnalyticsRes.itemBreakdown || [],
            telecomBreakdown: (commAnalyticsRes as any).telecomBreakdown || [],
            periodCashInflow: commAnalyticsRes.periodCashInflow || 0,
            periodCashOutflow: commAnalyticsRes.periodCashOutflow || 0,
            periodCashBalance: commAnalyticsRes.periodCashBalance || 0,
            periodClosingCashBalance: commAnalyticsRes.periodClosingCashBalance || 0,
          });
        }
        if (creditRes.success && creditRes.customers) {
          setCreditCustomers(creditRes.customers);
          if (creditRes.stats) {
            setCreditStats(creditRes.stats);
          }
        }
        if (wastageRes?.success) {
          setWastageAnalytics({
            totalWastedUnits: wastageRes.totalWastedUnits || 0,
            totalMonetaryLoss: wastageRes.totalMonetaryLoss || 0,
            incidentCount: wastageRes.incidentCount || 0,
            itemBreakdown: wastageRes.itemBreakdown || [],
            incidents: wastageRes.incidents || [],
          });
        }
        if (utilityRes?.success) {
          setUtilityAnalytics({
            totalBillsCount: utilityRes.totalBillsCount || 0,
            totalCollected: utilityRes.totalCollected || 0,
            totalBillAmount: utilityRes.totalBillAmount || 0,
            totalServiceCharges: utilityRes.totalServiceCharges || 0,
            totalProviderFees: utilityRes.totalProviderFees || 0,
            totalNetProfit: utilityRes.totalNetProfit || 0,
            breakdown: utilityRes.breakdown || {
              electricity: { count: 0, amount: 0, profit: 0 },
              water: { count: 0, amount: 0, profit: 0 },
              other: { count: 0, amount: 0, profit: 0 },
            },
            records: utilityRes.records || [],
          });
        }
        if (settlementRes?.success && settlementRes.bankAccounts) {
          setCompanyBankAccounts(settlementRes.bankAccounts);
        }
      }
    } catch (err) {
      console.error("Failed to load shop data:", err);
      toast.create({
        title: "Error loading shop records",
        description: "Failed to connect to branch server.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    period,
    startDate,
    endDate,
    shop._id,
    isCommunication,
    creditSearch,
    utilityPeriod,
    utilityStartDate,
    utilityEndDate,
  ]);

  React.useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  // Utility Data Loader
  const fetchUtilityData = React.useCallback(async () => {
    if (!isCommunication) return;
    setUtilityLoading(true);
    try {
      const res = await getUtilityBillAnalyticsAction({
        shopId: shop._id,
        period: utilityPeriod,
        startDate: utilityPeriod === "custom" ? utilityStartDate : undefined,
        endDate: utilityPeriod === "custom" ? utilityEndDate : undefined,
      });
      if (res.success) {
        setUtilityAnalytics({
          totalBillsCount: res.totalBillsCount || 0,
          totalCollected: res.totalCollected || 0,
          totalBillAmount: res.totalBillAmount || 0,
          totalServiceCharges: res.totalServiceCharges || 0,
          totalProviderFees: res.totalProviderFees || 0,
          totalNetProfit: res.totalNetProfit || 0,
          breakdown: res.breakdown || {
            electricity: { count: 0, amount: 0, profit: 0 },
            water: { count: 0, amount: 0, profit: 0 },
            other: { count: 0, amount: 0, profit: 0 },
          },
          records: res.records || [],
        });
      }
    } finally {
      setUtilityLoading(false);
    }
  }, [
    isCommunication,
    shop._id,
    utilityPeriod,
    utilityStartDate,
    utilityEndDate,
  ]);

  // Credit Customers Loader
  const fetchCreditCustomers = React.useCallback(async (q?: string) => {
    if (!shop._id) return;
    setCreditLoading(true);
    try {
      const res = await getShopCreditCustomersAction(shop._id, q !== undefined ? q : creditSearch);
      if (res.success && res.customers) {
        setCreditCustomers(res.customers);
        if (res.stats) {
          setCreditStats(res.stats);
        }
      }
    } finally {
      setCreditLoading(false);
    }
  }, [shop._id, creditSearch]);

  const handleExportCSV = () => {
    const recordsToExport = isCommunication ? commAnalytics.records : analytics.records;
    if (!recordsToExport.length) {
      toast.create({
        title: "No records to export",
        description: "There is no ledger data matching the active filters for this branch.",
        type: "warning",
      });
      return;
    }

    if (isCommunication) {
      const headers = [
        "Date",
        "Bill Number",
        "Item Code",
        "Item Name",
        "Actual Cost (LKR)",
        "Selling Price (LKR)",
        "Discount (LKR)",
        "Net Amount (LKR)",
        "Branch Related",
        "Target Branch",
        "Status",
      ];
      const rows = recordsToExport.map((r) => [
        `"${new Date(r.createdAt || r.date).toLocaleString()}"`,
        `"${r.billNumber || ""}"`,
        `"${r.itemCode || ""}"`,
        `"${(r.itemName || r.reason || "").replace(/"/g, '""')}"`,
        r.actualPrice || 0,
        r.sellingPrice || 0,
        r.discount || 0,
        r.amount || 0,
        r.isRelatedToBranch ? "YES" : "NO",
        `"${r.beneficiaryShop?.name || r.relatedBranch?.name || ""}"`,
        `"${r.status}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `comm_ledger_${shop.name.replace(/\s+/g, "_")}_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ["Date", "Bill Number", "Category", "Payment Method", "Type", "Amount (LKR)", "Reason", "Status"];
      const rows = recordsToExport.map((r) => [
        `"${new Date(r.createdAt || r.date).toLocaleString()}"`,
        `"${r.billNumber || ""}"`,
        `"${r.category?.name || "Uncategorized"}"`,
        `"${r.paymentMethod || "CASH"}"`,
        `"${r.type || "INCOME"}"`,
        r.amount || 0,
        `"${(r.reason || "").replace(/"/g, '""')}"`,
        `"${r.status}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ledger_${shop.name.replace(/\s+/g, "_")}_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast.create({
      title: "Export complete",
      description: `Downloaded ledger records for ${shop.name}.`,
      type: "success",
    });
  };

  const handleExportUtilityBillsCSV = () => {
    if (!utilityAnalytics.records || utilityAnalytics.records.length === 0) {
      toast.create({
        title: "No records to export",
        description: "There are no bill payments recorded for this period.",
        type: "warning",
      });
      return;
    }

    const headers = [
      "Date & Time",
      "Bill Number",
      "Type",
      "Account / Ref Number",
      "Customer Name",
      "Customer Phone",
      "Bill Value (LKR)",
      "Service Fee (LKR)",
      "Provider Fee (LKR)",
      "Customer Paid (LKR)",
      "Shop Net Profit (LKR)",
      "Payment Method",
      "Processed By",
      "Status",
    ];

    const rows = utilityAnalytics.records.map((r) => {
      const sFee = Number(r.serviceCharge || 0);
      const pFee = Number(r.providerFee || 0);
      const profit = Number(r.commissionEarned !== undefined ? r.commissionEarned : sFee - pFee);
      return [
        `"${new Date(r.date).toLocaleString()}"`,
        `"${r.billNumber || ""}"`,
        `"${r.utilityBillType || "OTHER"}"`,
        `"${r.utilityAccountNumber || ""}"`,
        `"${(r.customerName || "").replace(/"/g, '""')}"`,
        `"${r.customerPhone || ""}"`,
        Number(r.billAmount || 0).toFixed(2),
        sFee.toFixed(2),
        pFee.toFixed(2),
        Number(r.amount || 0).toFixed(2),
        profit.toFixed(2),
        `"${r.paymentMethod || "CASH"}"`,
        `"${r.createdBy?.name || "Staff"}"`,
        `"${r.status || "APPROVED"}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `utility_bills_${shop.name.replace(/\s+/g, "_")}_${utilityPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "CSV Exported",
      description: `Downloaded ${utilityAnalytics.records.length} utility bill transactions.`,
      type: "success",
    });
  };

  const handleExportWastageCSV = () => {
    const headers = [
      "Date & Time",
      "Item Code",
      "Item Name",
      "Wasted Quantity",
      "Base Unit Cost (LKR)",
      "Total Financial Loss (LKR)",
      "Reason / Defect Description",
      "Reported By",
    ];

    const rows = wastageAnalytics.incidents.map((inc) => [
      `"${new Date(inc.date).toLocaleString()}"`,
      `"${inc.itemCode || ""}"`,
      `"${(inc.itemName || "").replace(/"/g, '""')}"`,
      inc.quantity || 0,
      inc.unitBasePrice || 0,
      inc.totalLoss || 0,
      `"${(inc.reason || "").replace(/"/g, '""')}"`,
      `"${inc.reportedBy?.name || "Staff"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wastage_report_${shop.name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.create({
      title: "Wastage Report Exported",
      description: `Downloaded ${wastageAnalytics.incidents.length} wastage records in CSV format.`,
      type: "success",
    });
  };

  // Table Columns for Standard Retail Shops
  const standardColumns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date & Time",
        cell: ({ row }) => {
          const rawDate = row.original.createdAt || row.original.date;
          const d = new Date(rawDate);
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs whitespace-nowrap">{d.toLocaleDateString()}</span>
              <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "billNumber",
        header: "Bill No",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">{row.original.billNumber}</span>
        ),
      },
      {
        accessorKey: "category.name",
        header: "Category",
        cell: ({ row }) => (
          <div className="max-w-[180px] min-w-0">
            <CategoryBadge
              name={row.original.category?.name || "Uncategorized"}
              colorToken={row.original.category?.colorToken}
            />
          </div>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => (
          <span className="text-xs uppercase font-mono text-muted-foreground">{row.original.paymentMethod}</span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason / Notes",
        cell: ({ row }) => (
          <span className="truncate max-w-[200px] text-xs block text-muted-foreground">{row.original.reason}</span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount (LKR)",
        cell: ({ row }) => {
          const isIncome = row.original.type === "INCOME";
          return (
            <span className="font-semibold text-xs font-mono text-foreground">
              {isIncome ? "+" : "-"} {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  // Table Columns for Communication Branch Overview
  const commColumns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date & Time",
        cell: ({ row }) => {
          const rawDate = row.original.createdAt || row.original.date;
          const d = new Date(rawDate);
          return (
            <div className="flex flex-col">
              <span className="font-mono text-xs whitespace-nowrap">{d.toLocaleDateString()}</span>
              <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "billNumber",
        header: "Bill No",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">{row.original.billNumber}</span>
        ),
      },
      {
        accessorKey: "itemCode",
        header: "Item Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg border border-muted/30 bg-background/50 text-foreground">
            {row.original.itemCode || "UNLISTED"}
          </span>
        ),
      },
      {
        accessorKey: "itemName",
        header: "Item Name / Notes",
        cell: ({ row }) => (
          <span className="text-xs text-foreground font-medium truncate max-w-xs block">
            {row.original.itemName || row.original.reason}
          </span>
        ),
      },
      {
        accessorKey: "actualPrice",
        header: "Cost (LKR)",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            LKR {Number(row.original.actualPrice || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: "Net Sales (LKR)",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-foreground">
            LKR {Number(row.original.approvedAmount ?? row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "isRelatedToBranch",
        header: "Branch / Cross-Payment",
        cell: ({ row }) => {
          const r = row.original;
          if (r.isCrossBranchPayment) {
            const isBranchExpense = r.type === "EXPENSE" || Boolean(r.isCommunicationItem);
            return (
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-muted/30 bg-surface/40 text-foreground whitespace-nowrap">
                  {isBranchExpense ? "Expense For: " : "For: "}
                  {r.beneficiaryShop?.name || r.relatedBranch?.name || "Other Branch"}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-muted/30 bg-background/50 text-muted-foreground w-fit">
                  {r.interBranchSettlementStatus === "SETTLED" ? "Settled" : "Unsettled"}
                </span>
              </div>
            );
          }
          if (r.isRelatedToBranch) {
            return (
              <Badge variant="outline" className="text-[10px] border-muted/30">
                {r.relatedBranch?.name || "Branch Linked"}
              </Badge>
            );
          }
          return <span className="text-[11px] text-muted-foreground">Direct Retail</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  // Table Columns for Utility Bill Payments
  const utilityBillColumns: ColumnDef<any>[] = React.useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date & Time",
        cell: ({ row }) => {
          const d = new Date(row.original.date);
          return (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              <div className="font-semibold text-foreground">{d.toLocaleDateString()}</div>
              <div className="text-[11px] font-mono text-muted-foreground">
                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "billNumber",
        header: "Bill / Receipt #",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-foreground">
            {row.original.billNumber}
          </span>
        ),
      },
      {
        accessorKey: "utilityBillType",
        header: "Type",
        cell: ({ row }) => {
          const type = row.original.utilityBillType;
          return (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-muted/30 bg-surface/40 text-foreground whitespace-nowrap">
              <span className="size-1.5 rounded-full bg-foreground" />
              {type === "ELECTRICITY" ? "Light Bill" : type === "WATER" ? "Water Bill" : "Other Utility"}
            </span>
          );
        },
      },
      {
        accessorKey: "utilityAccountNumber",
        header: "Account / Ref #",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg border border-muted/30 bg-background/50 text-foreground">
            {row.original.utilityAccountNumber || "-"}
          </span>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-xs text-foreground">{row.original.customerName || "Customer"}</span>
            {row.original.customerPhone && (
              <span className="text-[11px] font-mono text-muted-foreground">{row.original.customerPhone}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "billAmount",
        header: () => <div className="text-right">Bill Value</div>,
        cell: ({ row }) => {
          const amt = Number(row.original.billAmount || 0);
          return (
            <div className="text-right font-mono text-xs font-semibold text-foreground">
              LKR {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        accessorKey: "serviceCharge",
        header: () => <div className="text-right">Service Fee</div>,
        cell: ({ row }) => {
          const fee = Number(row.original.serviceCharge || 0);
          return (
            <div className="text-right font-mono text-xs text-foreground font-semibold">
              +LKR {fee.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "providerFee",
        header: () => <div className="text-right">Provider Fee</div>,
        cell: ({ row }) => {
          const fee = Number(row.original.providerFee || 0);
          return (
            <div className="text-right font-mono text-xs text-destructive font-medium">
              -LKR {fee.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Customer Paid</div>,
        cell: ({ row }) => {
          const paid = Number(row.original.amount || 0);
          return (
            <div className="text-right font-mono text-xs font-bold text-foreground">
              LKR {paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        id: "profit",
        header: () => <div className="text-right">Shop Profit</div>,
        cell: ({ row }) => {
          const sFee = Number(row.original.serviceCharge || 0);
          const pFee = Number(row.original.providerFee || 0);
          const profit = Number(row.original.commissionEarned !== undefined ? row.original.commissionEarned : sFee - pFee);
          return (
            <div className="text-right">
              <span className="inline-flex items-center text-xs font-mono font-bold text-foreground px-2 py-0.5 rounded-full border border-muted/30 bg-surface/50">
                +LKR {profit.toFixed(2)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[10px] uppercase border-muted/30">
            {row.original.paymentMethod || "CASH"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdBy.name",
        header: "Officer",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {row.original.createdBy?.name || "Staff"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status || "APPROVED"} />,
      },
    ],
    []
  );

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* 1. Header Banner */}
      <div data-tour="shop-overview">
        <ShopHeaderBanner
          shop={shop}
          stats={stats}
          commAnalytics={commAnalytics}
          staffCount={staff.length}
          isCommunication={isCommunication}
          isInventoryShop={isInventoryShop}
          onRefresh={fetchShopData}
          refreshLoading={loading}
        />
      </div>

      {/* 2. Main Tab View (Driven directly by the Dedicated Branch Sidebar) */}
      <Tabs value={activeTab} onValueChange={(val: any) => handleTabChange(val)} className="space-y-6">
        {/* OVERVIEW & ANALYTICS TAB */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          {isInventoryShop ? (
            <InventoryView
              shopId={shop._id}
              shopName={shop.name}
              shopCode={shop.code}
              controlledTab="dashboard"
              onTabChange={(t) => handleTabChange(t === "dashboard" ? "overview" : t === "items" ? "inventory" : "inventoryHistory")}
            />
          ) : (
            <ShopOverviewTab
              shop={shop}
              stats={stats}
              commAnalytics={commAnalytics}
              analytics={analytics}
              isCommunication={isCommunication}
              isInventoryShop={isInventoryShop}
              period={period}
              setPeriod={setPeriod}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              loading={loading}
              onRefresh={fetchShopData}
              onExportCSV={handleExportCSV}
              onOpenSettleModal={(due) => {
                setSelectedHoldingDue(due);
                setSettleOpen(true);
              }}
              commColumns={commColumns}
              standardColumns={standardColumns}
            />
          )}
        </TabsContent>

        {/* ITEM-WISE SALES & TELECOM BREAKDOWN TAB */}
        {isCommunication && (
          <TabsContent value="itemSales" className="space-y-6 mt-0">
            <ShopItemSalesTab
              commAnalytics={commAnalytics}
              period={period}
              setPeriod={setPeriod}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              loading={loading}
              onRefresh={fetchShopData}
              shopName={shop.name}
            />
          </TabsContent>
        )}

        {/* REGISTERED PRODUCTS & SERVICES TAB */}
        {isCommunication && (
          <TabsContent value="items" className="space-y-6 mt-0">
            <ShopProductsTab
              shopId={shop._id}
              items={commItems}
              loading={loading}
              onRefresh={fetchShopData}
            />
          </TabsContent>
        )}

        {/* INVENTORY ONLY / WAREHOUSE TAB */}
        <TabsContent value="inventory" className="space-y-6 mt-0">
          <InventoryView
            shopId={shop._id}
            shopName={shop.name}
            shopCode={shop.code}
            controlledTab="items"
            onTabChange={(t) => handleTabChange(t === "dashboard" ? "overview" : t === "items" ? "inventory" : "inventoryHistory")}
          />
        </TabsContent>

        {/* INVENTORY USAGE HISTORY TAB */}
        {isInventoryShop && (
          <TabsContent value="inventoryHistory" className="space-y-6 mt-0">
            <InventoryView
              shopId={shop._id}
              shopName={shop.name}
              shopCode={shop.code}
              controlledTab="history"
              onTabChange={(t) => handleTabChange(t === "dashboard" ? "overview" : t === "items" ? "inventory" : "inventoryHistory")}
            />
          </TabsContent>
        )}

        {/* UTILITY BILL PAYMENTS TAB */}
        {isCommunication && (
          <TabsContent value="utilityBills" className="space-y-6 mt-0">
            <ShopUtilityBillsTab
              utilityAnalytics={utilityAnalytics}
              utilityPeriod={utilityPeriod}
              setUtilityPeriod={setUtilityPeriod}
              utilityStartDate={utilityStartDate}
              setUtilityStartDate={setUtilityStartDate}
              utilityEndDate={utilityEndDate}
              setUtilityEndDate={setUtilityEndDate}
              utilityLoading={utilityLoading}
              fetchUtilityData={fetchUtilityData}
              handleExportCSV={handleExportUtilityBillsCSV}
              staff={staff}
              columns={utilityBillColumns}
            />
          </TabsContent>
        )}

        {/* WASTAGE & DEFECT LOSS TAB */}
        {isCommunication && (
          <TabsContent value="wastage" className="space-y-6 mt-0">
            <ShopWastageTab
              wastageAnalytics={wastageAnalytics}
              onExportCSV={handleExportWastageCSV}
            />
          </TabsContent>
        )}

        {/* CUSTOMER CREDIT & DEBT LEDGER TAB */}
        {isCommunication && (
          <TabsContent value="credits" className="space-y-6 mt-0">
            <ShopCreditsTab
              creditCustomers={creditCustomers}
              creditStats={creditStats}
              creditSearch={creditSearch}
              setCreditSearch={setCreditSearch}
              creditLoading={creditLoading}
              fetchCreditCustomers={fetchCreditCustomers}
            />
          </TabsContent>
        )}

        {/* DAILY CASH FLOAT & SURPLUS SETTLEMENT TAB */}
        {isCommunication && (
          <TabsContent value="dailySettlement" className="space-y-6 mt-0">
            <ShopSettlementTab
              shopId={shop._id}
              shopName={shop.name}
              currentBalance={stats.currentBalance}
              onRefreshShop={fetchShopData}
            />
          </TabsContent>
        )}

        {/* DISCREPANCY DIAGNOSTICS & CASH RECONCILIATION TAB */}
        {isCommunication && (
          <TabsContent value="discrepancies" className="space-y-6 mt-0">
            <ShopDiscrepancyTab
              shopId={shop._id}
              shopName={shop.name}
              shopCode={shop.code}
              onUpdated={fetchShopData}
            />
          </TabsContent>
        )}

        {/* ASSIGNED OFFICERS & STAFF TAB */}
        <TabsContent value="staff" className="space-y-6 mt-0">
          <ShopStaffTab staff={staff} />
        </TabsContent>
      </Tabs>

      {/* Inter-Branch Cash Settlement Modal */}
      <InterBranchSettleDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        selectedHoldingDue={selectedHoldingDue}
        shopId={shop._id}
        shopName={shop.name}
        bankAccounts={companyBankAccounts}
        onSuccess={() => {
          setSelectedHoldingDue(null);
          fetchShopData();
        }}
      />
    </div>
  );
}
