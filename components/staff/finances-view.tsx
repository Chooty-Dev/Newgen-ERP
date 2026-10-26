"use client";

import * as React from "react";
import {
  getFinanceRecordsAction,
  createFinanceRecordAction,
  createCommunicationSaleBatchAction,
  updateFinanceRecordAction,
  deleteFinanceRecordAction,
  getSuggestedBillNumberAction,
  recordUtilityBillPaymentAction,
} from "@/actions/finances";
import {
  searchCreditCustomerAction,
  repayCustomerDebtAction,
} from "@/actions/credit";
import { DataTable } from "@/components/shared/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/shared/status-badge";
import { CategoryBadge } from "@/components/shared/category-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createFinanceRecordSchema,
  updateFinanceRecordSchema,
  CreateFinanceRecordInput,
  UpdateFinanceRecordInput,
  calculateUtilityBillCharges,
} from "@/schemas/finance";
import {
  PlusCircleIcon,
  EditIcon,
  Trash2Icon,
  LockIcon,
  AlertTriangleIcon,
  BuildingIcon,
  Loader2Icon,
  FilterIcon,
  WalletIcon,
  LandmarkIcon,
  CheckCircle2Icon,
  StoreIcon,
  SparklesIcon,
  ShoppingCartIcon,
  ReceiptTextIcon,
  SendIcon,
  HandCoinsIcon,
  UserCheckIcon,
  CreditCardIcon,
  DollarSignIcon,
  AlertOctagonIcon,
  SmartphoneIcon,
  ZapIcon,
  PackageIcon,
  DropletIcon,
  LightbulbIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { toast } from "@/components/ui/toast";
import { recordItemWastageAction } from "@/actions/communication";

interface CommCartItem {
  id: string;
  communicationItem?: string | null;
  itemCode: string;
  itemName: string;
  actualPrice: number;
  sellingPrice: number;
  quantity: number;
  totalPrice: number;
  discountPrice: number;
  additionalCost?: number;
  netAmount: number;
  isTelecomReload?: boolean;
  telecomType?: "CUSTOM" | "PACKAGE";
  packageBasePrice?: number;
  telecomOperator?: "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" | null;
  commissionRate?: number;
  commissionEarned?: number;
}

interface CategoryOption {
  _id: string;
  name: string;
  type: "EXPENSE" | "INCOME";
  colorToken: string;
}

interface BankAccountOption {
  _id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface ShopOption {
  _id: string;
  name: string;
  code: string;
}

interface CommunicationItemOption {
  _id: string;
  itemCode: string;
  name: string;
  actualPrice?: number;
  sellingPrice?: number;
  isTelecomReload?: boolean;
  telecomOperator?: "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" | null;
  commissionRate?: number;
}

export function isTelecomReloadItem(item?: {
  isTelecomReload?: boolean;
  telecomOperator?: string | null;
  itemCode?: string;
  name?: string;
} | null): boolean {
  if (!item) return false;
  if (item.isTelecomReload === true) return true;
  if (item.telecomOperator && item.telecomOperator !== "OTHER") return true;
  const str = `${item.itemCode || ""} ${item.name || ""}`.toUpperCase();
  return (
    str.includes("DIALOG") ||
    str.includes("MOBITEL") ||
    str.includes("AIRTEL") ||
    str.includes("HUTCH") ||
    str.includes("RELOAD") ||
    str.includes("TOPUP") ||
    str.includes("TOP-UP")
  );
}

export function getTelecomOperator(item?: {
  telecomOperator?: string | null;
  itemCode?: string;
  name?: string;
} | null): "DIALOG" | "MOBITEL" | "AIRTEL" | "HUTCH" | "OTHER" {
  if (item?.telecomOperator && item.telecomOperator !== "OTHER") {
    return item.telecomOperator as any;
  }
  const str = `${item?.itemCode || ""} ${item?.name || ""}`.toUpperCase();
  if (str.includes("DIALOG")) return "DIALOG";
  if (str.includes("MOBITEL")) return "MOBITEL";
  if (str.includes("AIRTEL")) return "AIRTEL";
  if (str.includes("HUTCH")) return "HUTCH";
  return "OTHER";
}

interface FinancesViewProps {
  initialRecords: any[];
  categories: CategoryOption[];
  userShopId: string | null;
  userShopName: string | null;
  userShopType?: string;
  userId: string;
  unassignedStaff?: boolean;
  bankAccounts?: BankAccountOption[];
  activeShops?: ShopOption[];
  communicationItems?: CommunicationItemOption[];
}

export function FinancesView({
  initialRecords,
  categories,
  userShopId,
  userShopName,
  userShopType = "STANDARD",
  userId,
  unassignedStaff = false,
  bankAccounts = [],
  activeShops = [],
  communicationItems = [],
}: FinancesViewProps) {
  const [records, setRecords] = React.useState<any[]>(initialRecords);
  const [loading, setLoading] = React.useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState("ALL");  // "ALL" | "COMM" | "GENERAL" | <categoryId>

  // Modals
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteConfirmRecord, setDeleteConfirmRecord] = React.useState<any | null>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<any | null>(null);

  // Communication Shop Specific State
  const isCommShop = userShopType === "COMMUNICATION";
  const [commEntryMode, setCommEntryMode] = React.useState<"POS" | "STANDARD">("POS");
  const [commItemLookup, setCommItemLookup] = React.useState("");
  const [matchedItem, setMatchedItem] = React.useState<CommunicationItemOption | null>(null);
  const [isUnlistedItem, setIsUnlistedItem] = React.useState(false);
  const [commQuantity, setCommQuantity] = React.useState<number>(1);
  const [commUnitPrice, setCommUnitPrice] = React.useState<number>(0);
  const [commDiscountPrice, setCommDiscountPrice] = React.useState<number>(0);
  const [commAdditionalCost, setCommAdditionalCost] = React.useState<number>(0);
  const [commCustomItemName, setCommCustomItemName] = React.useState("");
  const [commCustomCostPrice, setCommCustomCostPrice] = React.useState<number>(0);
  const [commTelecomType, setCommTelecomType] = React.useState<"CUSTOM" | "PACKAGE">("CUSTOM");
  const [commPackageBasePrice, setCommPackageBasePrice] = React.useState<number>(0);
  const [commIsRelatedToBranch, setCommIsRelatedToBranch] = React.useState(false);
  const [commRelatedBranch, setCommRelatedBranch] = React.useState<string | null>(null);
  const [commRelatedBranchNote, setCommRelatedBranchNote] = React.useState("");
  const [commCartItems, setCommCartItems] = React.useState<CommCartItem[]>([]);
  const [alwaysOnForm, setAlwaysOnForm] = React.useState(false);
  const [submittingCommSale, setSubmittingCommSale] = React.useState(false);

  // Communication Credit & Payment Method State
  const [commPaymentMethod, setCommPaymentMethod] = React.useState<"CASH" | "CREDIT" | "BANK_TRANSFER" | "ONLINE">("CASH");
  const [commCustomerPhone, setCommCustomerPhone] = React.useState("");
  const [commCustomerName, setCommCustomerName] = React.useState("");
  const [existingCreditCustomer, setExistingCreditCustomer] = React.useState<{
    _id: string;
    name: string;
    phone: string;
    currentBalance: number;
  } | null>(null);
  const [commBankAccountId, setCommBankAccountId] = React.useState<string | null>(null);

  // Debt Repayment Modal State
  const [debtRepayOpen, setDebtRepayOpen] = React.useState(false);
  const [repayPhone, setRepayPhone] = React.useState("");
  const [repayCustomer, setRepayCustomer] = React.useState<{
    _id: string;
    name: string;
    phone: string;
    currentBalance: number;
    shop?: {
      _id: string;
      name: string;
      code: string;
    } | null;
  } | null>(null);
  const [repayAmount, setRepayAmount] = React.useState<number>(0);
  const [repayMethod, setRepayMethod] = React.useState<"CASH" | "BANK_TRANSFER" | "ONLINE">("CASH");
  const [repayBankId, setRepayBankId] = React.useState<string | null>(null);
  const [repayNote, setRepayNote] = React.useState("");
  const [submittingRepay, setSubmittingRepay] = React.useState(false);
  const [searchingCustomer, setSearchingCustomer] = React.useState(false);

  // Utility Bill Payment Modal State (Communication Shop: Light/Water Bills)
  const [utilityBillOpen, setUtilityBillOpen] = React.useState(false);
  const [utilityBillType, setUtilityBillType] = React.useState<"ELECTRICITY" | "WATER" | "OTHER">("ELECTRICITY");
  const [utilityAccountNumber, setUtilityAccountNumber] = React.useState("");
  const [utilityCustomerName, setUtilityCustomerName] = React.useState("");
  const [utilityCustomerPhone, setUtilityCustomerPhone] = React.useState("");
  const [utilityBillAmount, setUtilityBillAmount] = React.useState<number | "">("");
  const [utilityCustomServiceCharge, setUtilityCustomServiceCharge] = React.useState<number | "">("");
  const [utilityCustomProviderFee, setUtilityCustomProviderFee] = React.useState<number | "">("");
  const [utilityIsCustomCharges, setUtilityIsCustomCharges] = React.useState(false);
  const [utilityPaymentMethod, setUtilityPaymentMethod] = React.useState<"CASH" | "BANK_TRANSFER" | "ONLINE">("CASH");
  const [utilityBankAccountId, setUtilityBankAccountId] = React.useState<string | null>(null);
  const [utilityNote, setUtilityNote] = React.useState("");
  const [submittingUtilityBill, setSubmittingUtilityBill] = React.useState(false);

  // Live charges calculation for utility bill
  const liveUtilityCharges = React.useMemo(() => {
    const billAmt = Number(utilityBillAmount) || 0;
    const standard = calculateUtilityBillCharges(billAmt);
    const serviceCharge =
      utilityIsCustomCharges && typeof utilityCustomServiceCharge === "number" && !isNaN(utilityCustomServiceCharge)
        ? utilityCustomServiceCharge
        : standard.serviceCharge;
    const providerFee =
      utilityIsCustomCharges && typeof utilityCustomProviderFee === "number" && !isNaN(utilityCustomProviderFee)
        ? utilityCustomProviderFee
        : standard.providerFee;
    const totalCustomerPaid = billAmt + serviceCharge;
    const costToShop = billAmt + providerFee;
    const profit = serviceCharge - providerFee;
    return {
      billAmt,
      isOver5000: standard.isOver5000,
      serviceCharge,
      providerFee,
      totalCustomerPaid,
      costToShop,
      profit,
    };
  }, [utilityBillAmount, utilityIsCustomCharges, utilityCustomServiceCharge, utilityCustomProviderFee]);

  const handleUtilityBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "Branch assignment is required to process bill payments.",
        type: "error",
      });
      return;
    }

    if (!utilityAccountNumber.trim()) {
      toast.create({
        title: "Account Number Required",
        description: "Please enter the customer account or reference number.",
        type: "error",
      });
      return;
    }

    const billAmt = Number(utilityBillAmount);
    if (!billAmt || billAmt <= 0) {
      toast.create({
        title: "Invalid Bill Amount",
        description: "Please enter a valid bill amount greater than 0.",
        type: "error",
      });
      return;
    }

    setSubmittingUtilityBill(true);
    try {
      const res = await recordUtilityBillPaymentAction({
        shopId: userShopId,
        billType: utilityBillType,
        accountNumber: utilityAccountNumber.trim(),
        customerName: utilityCustomerName.trim() || undefined,
        customerPhone: utilityCustomerPhone.trim() || undefined,
        billAmount: billAmt,
        serviceCharge:
          utilityIsCustomCharges && typeof utilityCustomServiceCharge === "number" && !isNaN(utilityCustomServiceCharge)
            ? utilityCustomServiceCharge
            : undefined,
        providerFee:
          utilityIsCustomCharges && typeof utilityCustomProviderFee === "number" && !isNaN(utilityCustomProviderFee)
            ? utilityCustomProviderFee
            : undefined,
        paymentMethod: utilityPaymentMethod,
        bankAccountId: utilityPaymentMethod === "BANK_TRANSFER" ? utilityBankAccountId : null,
        note: utilityNote.trim() || undefined,
      });

      if (res.success) {
        toast.create({
          title: "Bill Payment Recorded",
          description: res.message,
          type: "success",
        });

        // Reset inputs
        setUtilityAccountNumber("");
        setUtilityCustomerName("");
        setUtilityCustomerPhone("");
        setUtilityBillAmount("");
        setUtilityCustomServiceCharge("");
        setUtilityCustomProviderFee("");
        setUtilityIsCustomCharges(false);
        setUtilityNote("");
        setUtilityBillOpen(false);

        await refreshRecords();
      } else {
        toast.create({
          title: "Payment Failed",
          description: res.error || "Failed to record bill payment.",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setSubmittingUtilityBill(false);
    }
  };

  const handleLookupCustomer = async (phone: string, target: "SALE" | "REPAY") => {
    if (phone.trim().length >= 3) {
      if (target === "REPAY") setSearchingCustomer(true);
      const res = await searchCreditCustomerAction(phone, userShopId || undefined);
      if (target === "REPAY") setSearchingCustomer(false);

      if (res.success && res.customer) {
        if (target === "SALE") {
          setExistingCreditCustomer(res.customer);
          setCommCustomerName(res.customer.name);
        } else {
          setRepayCustomer(res.customer);
          setRepayAmount(res.customer.currentBalance);
        }
      } else {
        if (target === "SALE") {
          setExistingCreditCustomer(null);
        } else {
          setRepayCustomer(null);
        }
      }
    } else {
      if (target === "SALE") setExistingCreditCustomer(null);
      if (target === "REPAY") setRepayCustomer(null);
    }
  };

  const handleDebtRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userShopId || !repayCustomer) return;

    if (repayAmount <= 0) {
      toast.create({
        title: "Invalid Amount",
        description: "Repayment amount must be greater than zero.",
        type: "error",
      });
      return;
    }

    if (repayAmount > repayCustomer.currentBalance) {
      toast.create({
        title: "Amount Exceeds Debt",
        description: `Cannot repay more than outstanding debt (LKR ${repayCustomer.currentBalance.toLocaleString()}).`,
        type: "error",
      });
      return;
    }

    setSubmittingRepay(true);
    try {
      const isCross = Boolean(repayCustomer.shop && repayCustomer.shop._id !== userShopId);
      const res = await repayCustomerDebtAction({
        shopId: userShopId,
        customerCreditId: repayCustomer._id,
        amount: repayAmount,
        paymentMethod: repayMethod,
        bankAccountId: repayBankId,
        note: repayNote,
        isCrossBranchPayment: isCross,
        collectingShop: userShopId,
        beneficiaryShop: repayCustomer.shop?._id || null,
      });

      if (res.success) {
        toast.create({
          title: "Debt Repayment Recorded",
          description: res.message || "Payment collected and shop balance updated.",
          type: "success",
        });
        setDebtRepayOpen(false);
        setRepayPhone("");
        setRepayCustomer(null);
        setRepayAmount(0);
        setRepayNote("");
        refreshRecords();
      } else {
        toast.create({
          title: "Failed to record payment",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Failed to connect to server.",
        type: "error",
      });
    } finally {
      setSubmittingRepay(false);
    }
  };

  // Wastage & Defect Logging State
  const [wastageOpen, setWastageOpen] = React.useState(false);
  const [wastageItemLookup, setWastageItemLookup] = React.useState("");
  const [wastageMatchedItem, setWastageMatchedItem] = React.useState<CommunicationItemOption | null>(null);
  const [wastageQuantity, setWastageQuantity] = React.useState<number>(1);
  const [wastageReason, setWastageReason] = React.useState("");
  const [submittingWastage, setSubmittingWastage] = React.useState(false);

  const handleWastageItemCodeChange = (codeOrName: string) => {
    setWastageItemLookup(codeOrName);
    const clean = codeOrName.trim().toUpperCase();
    const found = communicationItems.find(
      (it) => it.itemCode.toUpperCase() === clean || it.name.toLowerCase() === codeOrName.trim().toLowerCase()
    );
    if (found) {
      setWastageMatchedItem(found);
    } else {
      setWastageMatchedItem(null);
    }
  };

  const handleWastageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userShopId) return;

    if (!wastageMatchedItem) {
      toast.create({
        title: "Item Required",
        description: "Please search and select a registered item from inventory.",
        type: "error",
      });
      return;
    }

    if (wastageQuantity <= 0) {
      toast.create({
        title: "Invalid Quantity",
        description: "Wasted/defective quantity must be at least 1.",
        type: "error",
      });
      return;
    }

    if (!wastageReason.trim()) {
      toast.create({
        title: "Reason Required",
        description: "Please specify the reason for damage/defect (e.g. misprinted 10 tutor sheets).",
        type: "error",
      });
      return;
    }

    setSubmittingWastage(true);
    try {
      const res = await recordItemWastageAction({
        shopId: userShopId,
        itemId: wastageMatchedItem._id,
        quantity: wastageQuantity,
        reason: wastageReason.trim(),
        date: new Date().toISOString(),
      });

      if (res.success) {
        toast.create({
          title: "Wastage Logged",
          description: res.message || `Recorded ${wastageQuantity} units as damage/defect loss.`,
          type: "success",
        });
        setWastageOpen(false);
        setWastageItemLookup("");
        setWastageMatchedItem(null);
        setWastageQuantity(1);
        setWastageReason("");
        refreshRecords();
      } else {
        toast.create({
          title: "Failed to Record Wastage",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "Unexpected error occurred while recording wastage.",
        type: "error",
      });
    } finally {
      setSubmittingWastage(false);
    }
  };

  // Load "always on this form" setting
  React.useEffect(() => {
    if (typeof window !== "undefined" && isCommShop) {
      const saved = localStorage.getItem("comm_always_on_form") === "true";
      if (saved) {
        setAlwaysOnForm(true);
        setCreateOpen(true);
      }
    }
  }, [isCommShop]);

  // Prevent closing when "always on this form" is active
  const handleCreateOpenChange = (open: boolean) => {
    if (!open && isCommShop && commEntryMode === "POS" && alwaysOnForm) {
      toast.create({
        title: "Form Locked Open",
        description: "This form is set to stay open. Uncheck 'Always on this form' at the bottom to close.",
        type: "info",
      });
      setCreateOpen(true);
      return;
    }
    setCreateOpen(open);
  };

  // Forms
  const createForm = useForm<CreateFinanceRecordInput>({
    resolver: zodResolver(createFinanceRecordSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      shop: userShopId || "",
      category: categories[0]?._id || "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
      isCommunicationItem: isCommShop,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      additionalCost: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
    },
  });

  const editForm = useForm<UpdateFinanceRecordInput>({
    resolver: zodResolver(updateFinanceRecordSchema),
    defaultValues: {
      recordId: "",
      date: "",
      category: "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "",
      reason: "",
      amount: 0,
      type: "EXPENSE",
      isCommunicationItem: false,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      additionalCost: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
    },
  });

  const watchEditQty = editForm.watch("quantity") || 1;
  const watchEditSelling = editForm.watch("sellingPrice") || 0;
  const watchEditDiscount = editForm.watch("discountPrice") || 0;
  const watchEditAdditional = editForm.watch("additionalCost") || 0;
  const watchEditIsComm = editForm.watch("isCommunicationItem");
  const watchEditIsBranch = editForm.watch("isRelatedToBranch");

  React.useEffect(() => {
    if (watchEditIsComm) {
      const net = Math.max(0, (watchEditQty * watchEditSelling) - watchEditDiscount + watchEditAdditional);
      editForm.setValue("amount", net);
    }
  }, [watchEditQty, watchEditSelling, watchEditDiscount, watchEditAdditional, watchEditIsComm, editForm]);

  const refreshRecords = async () => {
    setLoading(true);
    const params: Parameters<typeof getFinanceRecordsAction>[0] = {
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    };
    if (categoryFilter === "COMM") {
      params.isCommunicationItem = true;
    } else if (categoryFilter === "UTILITY_BILL") {
      params.isUtilityBill = true;
    } else if (categoryFilter === "GENERAL") {
      params.isCommunicationItem = false;
    } else if (categoryFilter !== "ALL") {
      params.categoryId = categoryFilter;
    }
    const res = await getFinanceRecordsAction(params);
    if (res.success && res.records) {
      setRecords(res.records);
    }
    setLoading(false);
  };

  React.useEffect(() => {
    refreshRecords();
  }, [statusFilter, categoryFilter]);

  // Communication item lookup handler
  const handleItemCodeChange = (code: string) => {
    setCommItemLookup(code);

    const clean = code.trim().toUpperCase();
    if (!clean) {
      setMatchedItem(null);
      return;
    }

    const found =
      communicationItems.find(
        (it) => it.itemCode.toUpperCase() === clean || it.name.toUpperCase() === clean
      ) ||
      communicationItems.find(
        (it) => it.itemCode.toUpperCase().includes(clean) || it.name.toUpperCase().includes(clean)
      );

    if (found) {
      const isReload = isTelecomReloadItem(found);
      const operator = getTelecomOperator(found);
      const commissionRate = Number(
        found.commissionRate && found.commissionRate > 0 ? found.commissionRate : 4.0
      );

      const enriched: CommunicationItemOption = {
        ...found,
        isTelecomReload: isReload,
        telecomOperator: operator,
        commissionRate: isReload ? commissionRate : (found.commissionRate || 0),
      };

      setMatchedItem(enriched);
      setIsUnlistedItem(false);
      if (isReload) {
        setCommQuantity(1);
        setCommDiscountPrice(0);
        setCommAdditionalCost(0);
        if (found.actualPrice && found.actualPrice > 0 && found.sellingPrice && found.sellingPrice > 0) {
          setCommTelecomType("PACKAGE");
          setCommPackageBasePrice(found.actualPrice);
          setCommUnitPrice(found.sellingPrice);
        } else {
          setCommTelecomType("CUSTOM");
          setCommPackageBasePrice(0);
          setCommUnitPrice(0);
        }
      } else {
        setCommUnitPrice(found.sellingPrice || 0);
      }
    } else {
      setMatchedItem(null);
    }
  };

  // Add Item to Multi-Item Cart
  const handleAddItemToCart = () => {
    const isReload = isTelecomReloadItem(matchedItem);
    const itemName = isUnlistedItem
      ? commCustomItemName.trim()
      : (matchedItem?.name || commItemLookup.trim());
    const itemCode = isUnlistedItem
      ? (commItemLookup.trim().toUpperCase() || "CUSTOM")
      : (matchedItem?.itemCode || commItemLookup.trim().toUpperCase());

    if (isUnlistedItem && !commCustomItemName.trim()) {
      toast.create({
        title: "Item Name Required",
        description: "Please specify the item name for this unlisted item.",
        type: "error",
      });
      return;
    }

    if (!itemName) {
      toast.create({
        title: "Item Name Required",
        description: "Please specify an item code or name.",
        type: "error",
      });
      return;
    }

    // RELOAD VALIDATION
    if (isReload) {
      if (commTelecomType === "PACKAGE") {
        if (!commPackageBasePrice || commPackageBasePrice <= 0) {
          toast.create({
            title: "Package Base Price Required",
            description: "Please enter the wholesale/base unit price of the package (e.g. LKR 998).",
            type: "error",
          });
          return;
        }
        if (!commUnitPrice || commUnitPrice <= 0) {
          toast.create({
            title: "Selling Price Required",
            description: "Please enter the customer selling price (e.g. LKR 1000).",
            type: "error",
          });
          return;
        }
      } else {
        if (!commUnitPrice || commUnitPrice <= 0) {
          toast.create({
            title: "Reload Amount Required",
            description: "Please enter a valid reload amount (e.g. LKR 100, 200, 500).",
            type: "error",
          });
          return;
        }
      }
    } else {
      // STANDARD ITEM VALIDATION
      if (commQuantity <= 0) {
        toast.create({
          title: "Invalid Quantity",
          description: "Quantity must be at least 1.",
          type: "error",
        });
        return;
      }

      const effectiveUnitPrice = isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0);
      if (effectiveUnitPrice <= 0) {
        toast.create({
          title: "No Selling Price Configured",
          description: isUnlistedItem
            ? "Please specify a unit selling price for this custom item."
            : `Item "${matchedItem?.name || itemCode}" does not have a selling price configured in inventory.`,
          type: "error",
        });
        return;
      }
    }

    const commissionRate = isReload ? Number(matchedItem?.commissionRate || 4.0) : 0;
    let commissionEarned = 0;
    let actualPrice = 0;
    let calculatedTotal = 0;
    let net = 0;
    const discount = isReload ? 0 : Math.max(0, commDiscountPrice || 0);
    const additionalCost = isReload ? 0 : Math.max(0, commAdditionalCost || 0);

    if (isReload) {
      if (commTelecomType === "PACKAGE") {
        const basePrice = commPackageBasePrice;
        const sellPrice = commUnitPrice;
        calculatedTotal = sellPrice;
        net = sellPrice;
        // Commission earned from base wholesale price (e.g. 998 * 4% = 39.92)
        const commFromBase = Number(((basePrice * (commissionRate / 100))).toFixed(2));
        // Extra markup from selling price above base price (e.g. 1000 - 998 = 2.00)
        const markup = Math.max(0, Number((sellPrice - basePrice).toFixed(2)));
        // Total profit = commission from base + markup (e.g. 39.92 + 2 = 41.92)
        commissionEarned = Number((commFromBase + markup).toFixed(2));
        // Base wholesale cost charged to reload balance = base price - commission (e.g. 998 - 39.92 = 958.08)
        actualPrice = Math.max(0, Number((basePrice - commFromBase).toFixed(2)));
      } else {
        const reloadAmount = commUnitPrice;
        calculatedTotal = reloadAmount;
        net = reloadAmount;
        commissionEarned = Number(((net * (commissionRate / 100))).toFixed(2));
        actualPrice = Math.max(0, Number((net - commissionEarned).toFixed(2)));
      }
    } else {
      calculatedTotal = commQuantity * (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0));
      net = Math.max(0, calculatedTotal - discount + additionalCost);
      actualPrice = isUnlistedItem ? commCustomCostPrice : (matchedItem?.actualPrice || 0);
    }

    const operator = isReload ? getTelecomOperator(matchedItem) : null;

    const newItem: CommCartItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      communicationItem: matchedItem?._id || null,
      itemCode,
      itemName,
      actualPrice,
      sellingPrice: isReload ? commUnitPrice : (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0)),
      quantity: isReload ? 1 : commQuantity,
      totalPrice: calculatedTotal,
      discountPrice: discount,
      additionalCost,
      netAmount: net,
      isTelecomReload: isReload,
      telecomType: isReload ? commTelecomType : undefined,
      packageBasePrice: isReload && commTelecomType === "PACKAGE" ? commPackageBasePrice : undefined,
      telecomOperator: operator,
      commissionRate,
      commissionEarned: isReload ? commissionEarned : undefined,
    };

    setCommCartItems((prev) => [...prev, newItem]);

    // Reset item inputs ready for next item
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommCustomItemName("");
    setCommCustomCostPrice(0);
    setCommQuantity(1);
    setCommUnitPrice(0);
    setCommDiscountPrice(0);
    setCommAdditionalCost(0);
    setCommTelecomType("CUSTOM");
    setCommPackageBasePrice(0);
  };

  const handleRemoveCartItem = (id: string) => {
    setCommCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Complete and record batch sale
  const handleBatchCommSale = async () => {
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "Branch assignment is required to record sales.",
        type: "error",
      });
      return;
    }

    if (commIsRelatedToBranch && !commRelatedBranch) {
      toast.create({
        title: "Related Branch Required",
        description: "Please select the related branch for this cross-branch transaction.",
        type: "error",
      });
      return;
    }

    let finalItems = [...commCartItems];

    // If cart is empty, check if user filled out the current input fields without clicking "Add Item"
    if (finalItems.length === 0) {
      const isReload = isTelecomReloadItem(matchedItem);
      const itemName = isUnlistedItem
        ? commCustomItemName.trim()
        : (matchedItem?.name || commItemLookup.trim());
      const itemCode = isUnlistedItem
        ? (commItemLookup.trim().toUpperCase() || "CUSTOM")
        : (matchedItem?.itemCode || commItemLookup.trim().toUpperCase());

      const effectiveUnitPrice = isReload
        ? commUnitPrice
        : isUnlistedItem
          ? commUnitPrice
          : (matchedItem?.sellingPrice || 0);

      if (itemName && (effectiveUnitPrice > 0 || (isReload && commTelecomType === "PACKAGE" && commPackageBasePrice > 0))) {
        let calculatedTotal = 0;
        let net = 0;
        let commissionEarned = 0;
        let actualPrice = 0;
        const discount = isReload ? 0 : Math.max(0, commDiscountPrice || 0);
        const additionalCost = isReload ? 0 : Math.max(0, commAdditionalCost || 0);
        const commissionRate = isReload ? Number(matchedItem?.commissionRate || 4.0) : 0;

        if (isReload) {
          if (commTelecomType === "PACKAGE") {
            const basePrice = commPackageBasePrice;
            const sellPrice = commUnitPrice;
            calculatedTotal = sellPrice;
            net = sellPrice;
            const commFromBase = Number(((basePrice * (commissionRate / 100))).toFixed(2));
            const markup = Math.max(0, Number((sellPrice - basePrice).toFixed(2)));
            commissionEarned = Number((commFromBase + markup).toFixed(2));
            actualPrice = Math.max(0, Number((basePrice - commFromBase).toFixed(2)));
          } else {
            calculatedTotal = effectiveUnitPrice;
            net = effectiveUnitPrice;
            commissionEarned = Number(((net * (commissionRate / 100))).toFixed(2));
            actualPrice = Math.max(0, Number((net - commissionEarned).toFixed(2)));
          }
        } else {
          calculatedTotal = (commQuantity || 1) * effectiveUnitPrice;
          net = Math.max(0, calculatedTotal - discount + additionalCost);
          actualPrice = isUnlistedItem ? commCustomCostPrice : (matchedItem?.actualPrice || 0);
        }

        finalItems.push({
          id: `${Date.now()}`,
          communicationItem: matchedItem?._id || null,
          itemCode,
          itemName,
          actualPrice,
          sellingPrice: isReload ? commUnitPrice : effectiveUnitPrice,
          quantity: isReload ? 1 : (commQuantity || 1),
          totalPrice: calculatedTotal,
          discountPrice: discount,
          additionalCost,
          netAmount: net,
          isTelecomReload: isReload,
          telecomType: isReload ? commTelecomType : undefined,
          packageBasePrice: isReload && commTelecomType === "PACKAGE" ? commPackageBasePrice : undefined,
          telecomOperator: isReload ? getTelecomOperator(matchedItem) : null,
          commissionRate,
          commissionEarned: isReload ? commissionEarned : undefined,
        });
      }
    }

    if (finalItems.length === 0) {
      toast.create({
        title: "No items to record",
        description: "Please enter item details, quantity, and unit price to record the sale.",
        type: "warning",
      });
      return;
    }

    if (commPaymentMethod === "CREDIT") {
      if (!commCustomerPhone.trim()) {
        toast.create({
          title: "Customer Mobile Required",
          description: "Please enter the customer's mobile number for this credit sale.",
          type: "error",
        });
        return;
      }
      if (!commCustomerName.trim()) {
        toast.create({
          title: "Customer Name Required",
          description: "Please enter the customer's name for this credit sale.",
          type: "error",
        });
        return;
      }
    }

    setSubmittingCommSale(true);
    try {
      const res = await createCommunicationSaleBatchAction({
        shopId: userShopId,
        items: finalItems.map((it) => ({
          communicationItem: it.communicationItem,
          itemCode: it.itemCode,
          itemName: it.itemName,
          quantity: it.quantity,
          actualPrice: it.actualPrice,
          sellingPrice: it.sellingPrice,
          totalPrice: it.totalPrice,
          discountPrice: it.discountPrice,
          additionalCost: it.additionalCost || 0,
          amount: it.netAmount,
          isTelecomReload: it.isTelecomReload,
          telecomType: it.telecomType,
          packageBasePrice: it.packageBasePrice,
          telecomOperator: it.telecomOperator,
          commissionRate: it.commissionRate,
        })),
        paymentMethod: commPaymentMethod,
        customerName: commPaymentMethod === "CREDIT" ? commCustomerName.trim() : undefined,
        customerPhone: commPaymentMethod === "CREDIT" ? commCustomerPhone.trim() : undefined,
        bankAccountId: commPaymentMethod === "BANK_TRANSFER" ? commBankAccountId : null,
        isRelatedToBranch: commIsRelatedToBranch,
        relatedBranch: commRelatedBranch,
        relatedBranchNote: commRelatedBranchNote,
      });

      if (res.success) {
        toast.create({
          title: res.isAutoApproved ? "Sale Recorded & Approved" : "Submitted for Approval",
          description: res.isAutoApproved
            ? `Bill: ${res.billNumber} • ${res.itemsCount} item(s) • Total: LKR ${Number(res.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            : `Bill: ${res.billNumber} • ${res.itemsCount} item(s) submitted for verifier approval.`,
          type: "success",
        });

        // Reset all inputs and cart items - DO NOT CLOSE FORM
        setCommCartItems([]);
        setCommItemLookup("");
        setMatchedItem(null);
        setIsUnlistedItem(false);
        setCommCustomItemName("");
        setCommCustomCostPrice(0);
        setCommQuantity(1);
        setCommUnitPrice(0);
        setCommDiscountPrice(0);
        setCommAdditionalCost(0);
        setCommTelecomType("CUSTOM");
        setCommPackageBasePrice(0);
        setCommIsRelatedToBranch(false);
        setCommRelatedBranch(null);
        setCommRelatedBranchNote("");
        setCommPaymentMethod("CASH");
        setCommCustomerPhone("");
        setCommCustomerName("");
        setExistingCreditCustomer(null);
        setCommBankAccountId(null);

        refreshRecords();
      } else {
        toast.create({
          title: "Failed to record sale",
          description: res.error || "An error occurred",
          type: "error",
        });
      }
    } catch {
      toast.create({
        title: "Error",
        description: "An unexpected error occurred while saving the sale.",
        type: "error",
      });
    } finally {
      setSubmittingCommSale(false);
    }
  };

  const initializeStandardForm = async () => {
    const defaultCategory = categories[0];
    createForm.reset({
      date: new Date().toISOString().split("T")[0],
      shop: userShopId || "",
      category: defaultCategory?._id || "",
      paymentMethod: "CASH",
      bankAccount: null,
      billNumber: "Generating...",
      reason: "",
      amount: 0,
      type: defaultCategory?.type || "EXPENSE",
      isCommunicationItem: false,
      itemCode: "",
      itemName: "",
      quantity: 1,
      actualPrice: 0,
      sellingPrice: 0,
      discountPrice: 0,
      isRelatedToBranch: false,
      relatedBranch: null,
      relatedBranchNote: "",
      isCrossBranchPayment: false,
      beneficiaryShop: null,
    });

    const billRes = await getSuggestedBillNumberAction();
    if (billRes.success && billRes.billNumber) {
      createForm.setValue("billNumber", billRes.billNumber);
    }
  };

  // Open Create Dialog
  const handleOpenCreate = async (mode: "POS" | "STANDARD" = "POS") => {
    if (!userShopId) {
      toast.create({
        title: "No branch assigned",
        description: "You cannot create transactions until an admin assigns you to a branch.",
        type: "error",
      });
      return;
    }

    // Reset comm state
    setCommItemLookup("");
    setMatchedItem(null);
    setIsUnlistedItem(false);
    setCommCustomItemName("");
    setCommCustomCostPrice(0);
    setCommQuantity(1);
    setCommUnitPrice(0);
    setCommDiscountPrice(0);
    setCommAdditionalCost(0);
    setCommIsRelatedToBranch(false);
    setCommRelatedBranch(null);
    setCommRelatedBranchNote("");
    setCommCartItems([]);

    if (isCommShop) {
      setCommEntryMode(mode);
      if (mode === "STANDARD") {
        await initializeStandardForm();
      }
    } else {
      await initializeStandardForm();
    }

    setCreateOpen(true);
  };

  const onCreateSubmit = async (data: CreateFinanceRecordInput) => {
    const res = await createFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record Submitted",
        description: "Transaction registered and queued for verification.",
        type: "success",
      });
      setCreateOpen(false);
      createForm.reset();
      refreshRecords();
    } else {
      toast.create({
        title: "Failed to submit",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const openEditModal = (rec: any) => {
    const isOwner = rec.createdBy?._id === userId || rec.createdBy === userId;
    const isCommEditable = isCommShop && isOwner && !rec.reviewedBy;
    const isPending = rec.status === "PENDING" && !rec.isLocked;

    if (!isPending && !isCommEditable) {
      toast.create({
        title: "Record locked",
        description: "This record has been finalized and cannot be modified.",
        type: "warning",
      });
      return;
    }

    setSelectedRecord(rec);
    const qty = rec.quantity || 1;
    const sellPrice = rec.sellingPrice !== undefined && rec.sellingPrice > 0
      ? rec.sellingPrice
      : (qty > 0 ? Number((rec.amount / qty).toFixed(2)) : rec.amount);

    editForm.reset({
      recordId: rec._id,
      date: new Date(rec.date).toISOString().split("T")[0],
      category: rec.category?._id || rec.category,
      paymentMethod: rec.paymentMethod,
      bankAccount: rec.bankAccount?._id || rec.bankAccount || null,
      billNumber: rec.billNumber,
      reason: rec.reason,
      amount: rec.amount,
      type: rec.type,

      // Communication fields
      isCommunicationItem: Boolean(rec.isCommunicationItem || rec.itemCode || rec.itemName),
      communicationItem: rec.communicationItem?._id || rec.communicationItem || null,
      itemCode: rec.itemCode || "",
      itemName: rec.itemName || "",
      quantity: qty,
      sellingPrice: sellPrice,
      actualPrice: rec.actualPrice || 0,
      discountPrice: rec.discountPrice || 0,
      additionalCost: rec.additionalCost || 0,
      isRelatedToBranch: Boolean(rec.isRelatedToBranch),
      relatedBranch: rec.relatedBranch?._id || rec.relatedBranch || null,
      relatedBranchNote: rec.relatedBranchNote || "",
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (data: UpdateFinanceRecordInput) => {
    const res = await updateFinanceRecordAction(data);
    if (res.success) {
      toast.create({
        title: "Record updated",
        description: "Your modifications have been saved.",
        type: "success",
      });
      setEditOpen(false);
      refreshRecords();
    } else {
      toast.create({
        title: "Update failed",
        description: res.error || "An error occurred",
        type: "error",
      });
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmRecord) return;
    const res = await deleteFinanceRecordAction(deleteConfirmRecord._id);
    if (res.success) {
      toast.create({
        title: "Record deleted",
        description: "Pending transaction successfully removed.",
        type: "success",
      });
      setDeleteConfirmRecord(null);
      refreshRecords();
    } else {
      toast.create({
        title: "Delete failed",
        description: res.error || "Failed to remove transaction",
        type: "error",
      });
    }
  };

  const handleCategoryChange = (catId: string) => {
    createForm.setValue("category", catId);
    const cat = categories.find((c) => c._id === catId);
    if (cat) {
      createForm.setValue("type", cat.type);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const rawDate = row.original.createdAt || row.original.date;
        const d = new Date(rawDate);
        return (
          <div className="flex flex-col whitespace-nowrap">
            <span className="font-mono text-xs font-semibold text-foreground">
              {d.toLocaleDateString()}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "billNumber",
      header: () => <span className="whitespace-nowrap">Bill No</span>,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-foreground whitespace-nowrap block">
          {row.original.billNumber}
        </span>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => {
        const rec = row.original;
        const catName = rec.category?.name || (rec.isCommunicationItem ? "Communication Sale" : rec.isUtilityBill ? "Utility Bill" : "General");
        const colorToken = rec.category?.colorToken || (rec.isCommunicationItem ? "chart-1" : undefined);
        return (
          <div className="max-w-[150px] min-w-0">
            <CategoryBadge name={catName} colorToken={colorToken} />
          </div>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Description / Reason",
      cell: ({ row }) => {
        const r = row.original;
        const itemText = r.itemName ? `${r.itemName}${r.quantity && r.quantity > 1 ? ` (×${r.quantity})` : ""}` : null;
        const displayText = itemText || r.reason || "—";
        const isCross = Boolean(r.isCrossBranchPayment || (r.isRelatedToBranch && r.relatedBranch));
        return (
          <div className="flex flex-col max-w-[240px]">
            <span className="text-xs text-muted-foreground truncate block font-medium" title={r.reason || itemText || ""}>
              {displayText}
            </span>
            {isCross && (
              <span className="text-[10px] text-muted-foreground truncate block font-mono">
                → {r.beneficiaryShop?.name || r.relatedBranch?.name || "Target Branch"}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        const bank = row.original.bankAccount;
        return (
          <div className="flex flex-col whitespace-nowrap">
            <span className="font-mono text-xs font-semibold text-foreground uppercase">
              {method === "PETTY_CASH" ? "Petty Cash" : method}
            </span>
            {bank && (
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[110px]">
                {bank.bankName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <span className="text-right block whitespace-nowrap">Amount (LKR)</span>,
      cell: ({ row }) => {
        const isIncome = row.original.type === "INCOME";
        return (
          <span className={`font-mono text-xs font-bold text-right block whitespace-nowrap ${isIncome ? "text-emerald-500" : "text-foreground"}`}>
            {isIncome ? "+" : "-"} {Number(row.original.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      accessorKey: "runningBalance",
      header: () => <span className="text-right block whitespace-nowrap">Balance</span>,
      cell: ({ row }) => {
        const bal = row.original.runningBalance || 0;
        return (
          <span className="font-mono text-xs font-bold text-foreground text-right block whitespace-nowrap">
            LKR {Number(bal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="text-right block whitespace-nowrap">Action</span>,
      cell: ({ row }) => {
        const rec = row.original;
        const isOwner = rec.createdBy?._id === userId || rec.createdBy === userId;
        const isCommEditable = isCommShop && isOwner && !rec.reviewedBy;
        const isPending = rec.status === "PENDING" && !rec.isLocked;
        const canEdit = isPending || isCommEditable;

        return (
          <div className="flex justify-end whitespace-nowrap">
            {canEdit ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal(rec)}
                className="h-8 px-3.5 rounded-xl border border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <EditIcon className="size-3" />
                Edit
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/70 bg-surface/30 px-2.5 py-1 rounded-xl border border-muted/20 select-none">
                <LockIcon className="size-3 text-muted-foreground/60" />
                Locked
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const watchPaymentMethod = createForm.watch("paymentMethod");

  return (
    <div className="space-y-8 max-w-full pb-16">
      {/* Unassigned Warning Banner */}
      {unassignedStaff && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
          <AlertTriangleIcon className="size-5 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block text-sm">No Branch Assigned</span>
            You are not currently assigned to an operational branch. You can review past records, but
            record creation is disabled until an Administrator reassigns you to a shop.
          </div>
        </div>
      )}

      {/* Header and Add Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              Branch Financial Ledger
            </h1>
            {userShopName && (
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-muted/30 bg-surface/50 text-foreground flex items-center gap-1.5">
                <BuildingIcon className="size-3.5" />
                {userShopName}
              </span>
            )}
            {isCommShop && (
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500 flex items-center gap-1.5 uppercase">
                <StoreIcon className="size-3.5" />
                COMMUNICATION
              </span>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            {isCommShop
              ? "Record retail item sales, utility bill payments, customer debt settlements, and branch ledger entries."
              : "Log daily petty cash, tuition fees, and operational expenses for your assigned branch."}
          </p>
        </div>

        {!isCommShop && (
          <Button
            onClick={() => handleOpenCreate("STANDARD")}
            disabled={unassignedStaff || !userShopId}
            className="h-12 px-6 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-sm gap-2 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <PlusCircleIcon className="size-4" />
            Add New Record
          </Button>
        )}
      </div>

      {/* Dedicated Quick Action Toolbar for Communication Shops */}
      {isCommShop && (
        <div className="glass-panel rounded-3xl p-5 border border-muted/30 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Counter Sales Group */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1.5">
                <ShoppingCartIcon className="size-4 text-foreground" />
                POS Sales:
              </span>

              <Button
                onClick={() => handleOpenCreate("POS")}
                disabled={unassignedStaff || !userShopId}
                className="gap-2 text-xs font-semibold bg-foreground hover:opacity-90 text-background shadow-xs h-10 px-5 rounded-2xl cursor-pointer"
              >
                <PlusCircleIcon className="size-4" />
                New POS Sale
              </Button>

              <Button
                onClick={() => {
                  setUtilityAccountNumber("");
                  setUtilityCustomerName("");
                  setUtilityCustomerPhone("");
                  setUtilityBillAmount("");
                  setUtilityCustomServiceCharge("");
                  setUtilityCustomProviderFee("");
                  setUtilityIsCustomCharges(false);
                  setUtilityPaymentMethod("CASH");
                  setUtilityNote("");
                  setUtilityBillOpen(true);
                }}
                disabled={unassignedStaff || !userShopId}
                variant="outline"
                className="gap-2 text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 h-10 px-4 rounded-2xl cursor-pointer"
              >
                <ZapIcon className="size-4 text-amber-500" />
                Bill Payment
              </Button>
            </div>

            {/* Operations Group */}
            <div className="flex items-center gap-3 flex-wrap pt-3 md:pt-0 border-t md:border-t-0 md:border-l md:border-muted/30 md:pl-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1.5">
                <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
                Operations:
              </span>

              <Button
                onClick={() => handleOpenCreate("STANDARD")}
                disabled={unassignedStaff || !userShopId}
                variant="outline"
                className="gap-2 text-xs font-semibold border border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground h-10 px-4 rounded-2xl cursor-pointer"
              >
                <ReceiptTextIcon className="size-4 text-foreground" />
                Branch Transaction
              </Button>

              <Button
                onClick={() => {
                  setRepayPhone("");
                  setRepayCustomer(null);
                  setRepayAmount(0);
                  setRepayNote("");
                  setDebtRepayOpen(true);
                }}
                disabled={unassignedStaff || !userShopId}
                variant="outline"
                className="gap-2 text-xs font-semibold border border-muted/30 bg-surface/30 hover:bg-surface/60 text-amber-600 dark:text-amber-400 h-10 px-4 rounded-2xl cursor-pointer"
              >
                <HandCoinsIcon className="size-4 text-amber-500" />
                Settle Debt
              </Button>

              <Button
                onClick={() => {
                  setWastageItemLookup("");
                  setWastageMatchedItem(null);
                  setWastageQuantity(1);
                  setWastageReason("");
                  setWastageOpen(true);
                }}
                disabled={unassignedStaff || !userShopId}
                variant="outline"
                className="gap-2 text-xs font-semibold border border-muted/30 bg-surface/30 hover:bg-surface/60 text-rose-500 h-10 px-4 rounded-2xl cursor-pointer"
              >
                <AlertOctagonIcon className="size-4 text-rose-500" />
                Wastage / Defect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="glass-panel rounded-3xl p-6 border border-muted/30 flex flex-wrap items-center gap-4 shadow-xl">
        <div className="space-y-1.5 min-w-[200px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Verification Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="REJECTED">Rejected Only</option>
          </select>
        </div>

        <div className="space-y-1.5 min-w-[220px]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Category
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
          >
            <option value="ALL">All Records</option>
            {isCommShop && (
              <>
                <option value="COMM">📱 Communication Sales</option>
                <option value="UTILITY_BILL">⚡ Utility Bill Payments</option>
              </>
            )}
            <option value="GENERAL">📋 General Transactions</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={records}
        searchKey="billNumber"
        searchPlaceholder="Search bill number or reason..."
        loading={loading}
      />

      {/* CREATE RECORD MODAL */}
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent
          className={
            isCommShop
              ? "glass-panel sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl"
              : "glass-panel sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl"
          }
        >
          {/* Mode Switcher for Communication Shops */}
          {isCommShop && (
            <div className="pb-4 border-b border-muted/20 pr-8 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex rounded-2xl bg-surface/40 p-1.5 border border-muted/20 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setCommEntryMode("POS")}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${commEntryMode === "POS"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <ShoppingCartIcon className="size-4 shrink-0" />
                    <span>POS Sales Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setCommEntryMode("STANDARD");
                      await initializeStandardForm();
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${commEntryMode === "STANDARD"
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <ReceiptTextIcon className="size-4 shrink-0" />
                    <span>Branch Transaction</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {commEntryMode === "STANDARD" ? (
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground bg-muted/40">
                      Standard Branch Form
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                      POS Cart Mode
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCommShop && commEntryMode === "POS" ? (
            /* ========================================================
               COMMUNICATION SHOP POS MULTI-ITEM SALES FORM
               ======================================================== */
            <div className="space-y-5 py-1">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                    <StoreIcon className="size-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                      Record Communication Sale
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                      Direct retail sales with multi-item entry. Instant auto-approval upon recording.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* ITEM ENTRY CARD */}
              <div className="space-y-4 p-5 rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-2">
                    <SparklesIcon className="size-4" />
                    Item Details
                  </span>
                  {!isTelecomReloadItem(matchedItem) && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isUnlistedItem}
                        onChange={(e) => {
                          setIsUnlistedItem(e.target.checked);
                          if (e.target.checked) {
                            setMatchedItem(null);
                          }
                        }}
                        className="size-4 rounded-md border-muted/40 accent-primary cursor-pointer"
                      />
                      <span>Unlisted / Custom Item</span>
                    </label>
                  )}
                </div>

                {!isUnlistedItem ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Select / Search Item
                      </label>
                      <Input
                        placeholder="Type item code or search name (e.g. DIALOG, MOBITEL, 0010)..."
                        value={commItemLookup}
                        onChange={(e) => handleItemCodeChange(e.target.value)}
                        className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-mono font-semibold"
                        list="comm-items-datalist"
                      />
                      <datalist id="comm-items-datalist">
                        {communicationItems.map((item) => (
                          <option key={item._id} value={item.itemCode}>
                            {item.name} {isTelecomReloadItem(item) ? `[${getTelecomOperator(item)} - ${item.commissionRate ?? 4}% Commission]` : item.sellingPrice ? `- (Price: LKR ${item.sellingPrice})` : ""}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    {/* Matched Item Preview Card */}
                    {matchedItem && (
                      <div className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs ${isTelecomReloadItem(matchedItem)
                        ? "border-primary/30 bg-primary/10 shadow-xs"
                        : "border-emerald-500/30 bg-emerald-500/10 shadow-xs"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isTelecomReloadItem(matchedItem) ? "bg-primary/20 text-primary" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            }`}>
                            {isTelecomReloadItem(matchedItem) ? (
                              <SmartphoneIcon className="size-4" />
                            ) : (
                              <CheckCircle2Icon className="size-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-sm">{matchedItem.name}</span>
                              {isTelecomReloadItem(matchedItem) && (
                                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold">
                                  {getTelecomOperator(matchedItem)}
                                </Badge>
                              )}
                            </div>
                            {isTelecomReloadItem(matchedItem) ? (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Mobile Top-up • Commission: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{matchedItem.commissionRate ?? 4}%</span>
                              </p>
                            ) : matchedItem.sellingPrice !== undefined && matchedItem.sellingPrice > 0 ? (
                              <span className="text-muted-foreground font-mono text-xs">
                                Selling Price: <strong className="text-foreground">LKR {Number(matchedItem.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[11px] font-mono px-2.5 py-1 rounded-xl border-muted/30 bg-surface/50">
                            {matchedItem.itemCode}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setMatchedItem(null);
                              setCommItemLookup("");
                              setCommUnitPrice(0);
                            }}
                            className="size-7 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Clear selected item"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Item Code (Optional)
                        </label>
                        <Input
                          placeholder="e.g. CUSTOM"
                          value={commItemLookup}
                          onChange={(e) => setCommItemLookup(e.target.value)}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Item Name *
                        </label>
                        <Input
                          placeholder="e.g. Phone cover repair / Binding..."
                          value={commCustomItemName}
                          onChange={(e) => setCommCustomItemName(e.target.value)}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Unit Selling Price (LKR) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commUnitPrice || ""}
                          onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* IF TELECOM RELOAD: DUAL MODE (CUSTOM RELOAD VS FIXED PACKAGE) */}
                {isTelecomReloadItem(matchedItem) ? (
                  <div className="space-y-3.5 pt-2">
                    {/* Segmented Mode Selector */}
                    <div className="flex items-center gap-1.5 p-1.5 bg-surface/40 rounded-2xl border border-muted/20">
                      <button
                        type="button"
                        onClick={() => {
                          setCommTelecomType("CUSTOM");
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${commTelecomType === "CUSTOM"
                          ? "bg-foreground text-background shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <ZapIcon className="size-3.5" />
                        <span>Custom Reload Top-up</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCommTelecomType("PACKAGE");
                          if (!commPackageBasePrice && matchedItem?.actualPrice && matchedItem.actualPrice > 0) {
                            setCommPackageBasePrice(matchedItem.actualPrice);
                          }
                          if (!commUnitPrice && matchedItem?.sellingPrice && matchedItem.sellingPrice > 0) {
                            setCommUnitPrice(matchedItem.sellingPrice);
                          }
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${commTelecomType === "PACKAGE"
                          ? "bg-foreground text-background shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <PackageIcon className="size-3.5" />
                        <span>Fixed Package / Card</span>
                      </button>
                    </div>

                    {commTelecomType === "CUSTOM" ? (
                      /* CUSTOM RELOAD AMOUNT MODE */
                      <div className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <SmartphoneIcon className="size-4 text-primary" />
                            <span>Reload Total Price (LKR) *</span>
                          </label>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {getTelecomOperator(matchedItem)} Commission: {matchedItem?.commissionRate ?? 4}%
                          </span>
                        </div>

                        <Input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="Enter reload amount (e.g. 50, 100, 200, 500, 1000)..."
                          value={commUnitPrice || ""}
                          onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-12 text-base font-mono font-bold text-foreground bg-surface/50 rounded-2xl border-muted/30"
                          autoFocus
                        />

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">Quick Presets:</span>
                          {[50, 100, 150, 200, 350, 500, 1000, 2000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCommUnitPrice(amt)}
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${commUnitPrice === amt
                                ? "bg-foreground text-background border-foreground shadow-xs"
                                : "bg-surface/50 border-muted/30 text-foreground hover:bg-surface/80"
                                }`}
                            >
                              LKR {amt}
                            </button>
                          ))}
                        </div>

                        {commUnitPrice > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-primary/20 text-xs">
                            <span className="text-muted-foreground font-medium">Estimated Profit:</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              +LKR {((commUnitPrice * ((matchedItem?.commissionRate ?? 4) / 100))).toFixed(2)} ({matchedItem?.commissionRate ?? 4}%)
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* FIXED PACKAGE / CARD MODE */
                      <div className="space-y-3.5 p-4 rounded-2xl border border-primary/30 bg-primary/5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <PackageIcon className="size-4 text-primary" />
                            <span>Package Pricing Details</span>
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {getTelecomOperator(matchedItem)} Base Commission: {matchedItem?.commissionRate ?? 4}%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Base Unit Price (LKR) *
                              </label>
                              <span className="text-[10px] text-muted-foreground font-medium">Package Face Value</span>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="e.g. 998"
                              value={commPackageBasePrice || ""}
                              onChange={(e) => setCommPackageBasePrice(Math.max(0, Number(e.target.value) || 0))}
                              className="h-11 rounded-2xl text-xs font-mono font-bold bg-surface/50 border-muted/30"
                              autoFocus
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Selling Price (LKR) *
                              </label>
                              <span className="text-[10px] text-muted-foreground font-medium">Customer Due</span>
                            </div>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="e.g. 1000"
                              value={commUnitPrice || ""}
                              onChange={(e) => setCommUnitPrice(Math.max(0, Number(e.target.value) || 0))}
                              className="h-11 rounded-2xl text-xs font-mono font-bold bg-surface/50 border-muted/30"
                            />
                          </div>
                        </div>

                        {/* Common Package Presets */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold mr-1">Common Packages:</span>
                          {[
                            { name: "998 → 1000", base: 998, sell: 1000 },
                            { name: "498 → 500", base: 498, sell: 500 },
                            { name: "1198 → 1200", base: 1198, sell: 1200 },
                            { name: "1498 → 1500", base: 1498, sell: 1500 },
                            { name: "1998 → 2000", base: 1998, sell: 2000 },
                          ].map((pkg) => (
                            <button
                              key={pkg.name}
                              type="button"
                              onClick={() => {
                                setCommPackageBasePrice(pkg.base);
                                setCommUnitPrice(pkg.sell);
                              }}
                              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${commPackageBasePrice === pkg.base && commUnitPrice === pkg.sell
                                ? "bg-foreground text-background border-foreground shadow-xs"
                                : "bg-surface/50 border-muted/30 text-foreground hover:bg-surface/80"
                                }`}
                            >
                              {pkg.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleAddItemToCart}
                        disabled={
                          commTelecomType === "PACKAGE"
                            ? !commPackageBasePrice || commPackageBasePrice <= 0 || !commUnitPrice || commUnitPrice <= 0
                            : !commUnitPrice || commUnitPrice <= 0
                        }
                        className="h-11 px-6 rounded-2xl gap-2 text-xs font-bold shadow-sm"
                      >
                        <PlusCircleIcon className="size-4" />
                        {commTelecomType === "PACKAGE" ? "Add Package to Sale" : "Add Reload to Sale"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* STANDARD ITEM FIELDS: QUANTITY, DISCOUNT, ADDITIONAL COST */
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Quantity *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          value={commQuantity}
                          onChange={(e) => setCommQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Discount (LKR)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commDiscountPrice || ""}
                          onChange={(e) => setCommDiscountPrice(Math.max(0, Number(e.target.value) || 0))}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>Additional Charge</span>
                          <span className="text-[9px] text-muted-foreground font-normal">(Optional)</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={commAdditionalCost || ""}
                          onChange={(e) => setCommAdditionalCost(Math.max(0, Number(e.target.value) || 0))}
                          className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-medium"
                          title="Extra service charge or additional fee"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>Customer Due</span>
                          {!isUnlistedItem && matchedItem && matchedItem.sellingPrice !== undefined && (
                            <span className="text-[10px] text-muted-foreground font-mono font-normal">
                              (@ LKR {Number(matchedItem.sellingPrice).toLocaleString()})
                            </span>
                          )}
                        </label>
                        <div className="h-11 px-3.5 rounded-2xl border border-muted/30 bg-surface/40 flex items-center font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          LKR {Math.max(0, (commQuantity * (isUnlistedItem ? commUnitPrice : (matchedItem?.sellingPrice || 0))) - commDiscountPrice + (commAdditionalCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        onClick={handleAddItemToCart}
                        className="h-11 px-6 rounded-2xl gap-2 text-xs font-bold shadow-sm"
                      >
                        <PlusCircleIcon className="size-4" />
                        Add Item to Sale
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* MULTI-ITEM SALE LIST TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 uppercase text-muted-foreground font-bold tracking-wider text-xs">
                    <ShoppingCartIcon className="size-4 text-primary" />
                    Items in this Sale ({commCartItems.length})
                  </span>
                  {commCartItems.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCommCartItems([])}
                      className="text-xs text-muted-foreground hover:text-destructive h-7 px-2.5 rounded-xl"
                    >
                      Clear List
                    </Button>
                  )}
                </div>

                {commCartItems.length > 0 ? (
                  <div className="rounded-3xl border border-muted/30 overflow-hidden bg-surface/30 backdrop-blur-md shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-surface/50 border-b border-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3.5 text-left w-10">#</th>
                          <th className="py-3 px-3.5 text-left">Item</th>
                          <th className="py-3 px-3.5 text-right">Unit Price</th>
                          <th className="py-3 px-3.5 text-center w-16">Qty</th>
                          <th className="py-3 px-3.5 text-right">Subtotal</th>
                          <th className="py-3 px-3.5 text-right">Discount</th>
                          <th className="py-3 px-3.5 text-right">Net Amount</th>
                          <th className="py-3 px-3.5 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/20 font-mono">
                        {commCartItems.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-surface/40 transition-colors">
                            <td className="py-2.5 px-3.5 text-muted-foreground text-center">{idx + 1}</td>
                            <td className="py-2.5 px-3.5 font-sans font-medium text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold">{item.itemName}</span>
                                {item.isTelecomReload && (
                                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-primary/10 text-primary border-primary/30">
                                    {item.telecomType === "PACKAGE" ? "PACKAGE" : "RELOAD"} {item.telecomOperator || ""} {item.commissionRate ? `(${item.commissionRate}%)` : ""}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                                <span>{item.itemCode || "ITEM"}</span>
                                {item.isTelecomReload && item.commissionEarned !== undefined && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    • Profit: +LKR {Number(item.commissionEarned).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    {item.telecomType === "PACKAGE" && item.packageBasePrice ? ` (Base: LKR ${item.packageBasePrice})` : ""}
                                  </span>
                                )}
                                {item.additionalCost !== undefined && item.additionalCost > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    • Additional Charge: +LKR {Number(item.additionalCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-muted-foreground">
                              LKR {item.sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-bold text-foreground">{item.quantity}</td>
                            <td className="py-2.5 px-3.5 text-right text-muted-foreground">
                              LKR {item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3.5 text-right text-muted-foreground">
                              {item.discountPrice > 0 ? `LKR ${item.discountPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              LKR {item.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleRemoveCartItem(item.id)}
                                className="size-7 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Remove Item"
                              >
                                <Trash2Icon className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface/50 border-t border-muted/30 font-mono font-bold">
                        <tr>
                          <td colSpan={6} className="py-3 px-3.5 text-right text-xs uppercase tracking-wider text-foreground">
                            Grand Total ({commCartItems.length} {commCartItems.length === 1 ? "item" : "items"}):
                          </td>
                          <td className="py-3 px-3.5 text-right text-base text-emerald-600 dark:text-emerald-400 font-extrabold">
                            LKR {commCartItems.reduce((acc, i) => acc + i.netAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl border border-dashed border-muted/30 bg-surface/20 text-center text-xs text-muted-foreground space-y-1.5">
                    <p className="font-semibold text-foreground text-sm">No items added to this sale yet.</p>
                    <p className="text-xs text-muted-foreground">Enter item code, quantity, and total price above, then click &quot;+ Add Item to Sale&quot;.</p>
                  </div>
                )}
              </div>

              {/* PAYMENT METHOD & CUSTOMER CREDIT SETTINGS */}
              <div className="p-5 rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <DollarSignIcon className="size-4 text-primary" />
                    <span>Payment Method</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-surface/40 p-1.5 rounded-2xl border border-muted/20">
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("CASH")}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${commPaymentMethod === "CASH" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("CREDIT")}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${commPaymentMethod === "CREDIT" ? "bg-amber-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommPaymentMethod("BANK_TRANSFER")}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${commPaymentMethod === "BANK_TRANSFER" ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Bank / Online
                    </button>
                  </div>
                </div>

                {/* If CREDIT is selected, show Customer Phone & Name with auto-lookup */}
                {commPaymentMethod === "CREDIT" && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <UserCheckIcon className="size-4" />
                        Credit Customer Information
                      </span>
                      {existingCreditCustomer && (
                        <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 bg-card text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                          Existing Debt: LKR {Number(existingCreditCustomer.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                          <span>Mobile Number *</span>
                          <span className="text-[9px] text-muted-foreground font-normal">(auto-lookup)</span>
                        </label>
                        <Input
                          placeholder="e.g. 0771234567"
                          value={commCustomerPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCommCustomerPhone(val);
                            handleLookupCustomer(val, "SALE");
                          }}
                          className="h-11 text-xs font-mono font-bold bg-surface/50 border-muted/30 rounded-2xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Customer Name *
                        </label>
                        <Input
                          placeholder="e.g. Kamal Perera"
                          value={commCustomerName}
                          onChange={(e) => setCommCustomerName(e.target.value)}
                          className="h-11 text-xs font-semibold bg-surface/50 border-muted/30 rounded-2xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If BANK_TRANSFER is selected */}
                {commPaymentMethod === "BANK_TRANSFER" && (
                  <div className="p-4 rounded-2xl border border-muted/30 bg-surface/40 space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Target Bank Account (Optional)
                    </label>
                    <select
                      value={commBankAccountId || ""}
                      onChange={(e) => setCommBankAccountId(e.target.value || null)}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select Bank Account (or Leave Empty)...</option>
                      {bankAccounts.map((b) => (
                        <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                          {b.bankName} - {b.accountNumber} ({b.accountName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* CROSS-BRANCH TRANSFER RELATIONSHIP */}
              <div className="p-5 rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md shadow-sm space-y-3.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={commIsRelatedToBranch}
                    onChange={(e) => {
                      setCommIsRelatedToBranch(e.target.checked);
                      if (!e.target.checked) {
                        setCommRelatedBranch(null);
                        setCommRelatedBranchNote("");
                      }
                    }}
                    className="size-4 rounded-md border-muted/40 accent-primary cursor-pointer"
                  />
                  <span>Is this transaction related to another branch / shop?</span>
                </label>

                {commIsRelatedToBranch && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                      <AlertTriangleIcon className="size-4 shrink-0" />
                      <span>Inter-Branch Expense: Billed to target branch as an operational expense. Requires Verifier Approval.</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Related Branch / Shop *
                        </label>
                        <select
                          value={commRelatedBranch || ""}
                          onChange={(e) => setCommRelatedBranch(e.target.value || null)}
                          className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                        >
                          <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            Select Branch / Shop...
                          </option>
                          {activeShops
                            .filter((s) => s._id !== userShopId)
                            .map((s) => (
                              <option
                                key={s._id}
                                value={s._id}
                                className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                              >
                                {s.name} ({s.code})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                          Transfer / Cross-Branch Note
                        </label>
                        <Input
                          placeholder="Reason for cross-branch transfer / note..."
                          value={commRelatedBranchNote}
                          onChange={(e) => setCommRelatedBranchNote(e.target.value)}
                          className="h-11 rounded-2xl text-xs bg-surface/50 border-muted/30"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="pt-4 border-t border-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                  <input
                    type="checkbox"
                    checked={alwaysOnForm}
                    onChange={(e) => {
                      setAlwaysOnForm(e.target.checked);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("comm_always_on_form", e.target.checked ? "true" : "false");
                      }
                    }}
                    className="size-4 rounded-md border-muted/40 accent-primary cursor-pointer"
                  />
                  <span>Always on this form (Keep form open for continuous sales)</span>
                </label>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      if (alwaysOnForm) {
                        toast.create({
                          title: "Form Locked Open",
                          description: "Uncheck 'Always on this form' at the bottom to close.",
                          type: "info",
                        });
                      } else {
                        setCreateOpen(false);
                      }
                    }}
                    className="h-11 px-6 rounded-2xl border-muted/30 text-xs font-semibold"
                  >
                    Close Form
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleBatchCommSale}
                    disabled={submittingCommSale}
                    className="h-11 px-7 rounded-2xl gap-2 font-bold text-xs bg-foreground text-background shadow-md"
                  >
                    {submittingCommSale ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : commIsRelatedToBranch ? (
                      <SendIcon className="size-4" />
                    ) : (
                      <ReceiptTextIcon className="size-4" />
                    )}
                    {commIsRelatedToBranch ? "Submit for Approval" : "Complete & Record Sale"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               STANDARD SHOP FINANCE FORM (TUITION, VOCATIONAL, ETC.)
               ======================================================== */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-foreground">
                  <PlusCircleIcon className="size-5 text-primary" />
                  Add Finance Record
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Submit an expense or deposit for {userShopName}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                    <Input type="date" {...createForm.register("date")} className="h-12 rounded-2xl bg-surface/30 border-muted/30 text-sm font-mono" />
                    {createForm.formState.errors.date && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.date.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Branch</label>
                    <Input value={userShopName || "Unassigned"} disabled className="h-12 rounded-2xl bg-surface/20 border-muted/20 text-sm opacity-75 font-semibold" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                    <select
                      value={createForm.watch("category")}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                          {cat.name} ({cat.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                    <select
                      {...createForm.register("paymentMethod")}
                      className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
                    >
                      <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                      <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                      <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                      <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                      <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                    </select>
                  </div>
                </div>

                {/* If Bank Transfer / Online / Cheque: Show Bank Selector */}
                {(watchPaymentMethod === "BANK_TRANSFER" ||
                  watchPaymentMethod === "ONLINE" ||
                  watchPaymentMethod === "CHEQUE") && (
                    <div className="space-y-1.5 p-4 rounded-2xl border border-muted/30 bg-surface/30">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <LandmarkIcon className="size-3.5 text-primary" />
                        Select Bank Account
                      </label>
                      <select
                        {...createForm.register("bankAccount")}
                        className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select Bank Account...</option>
                        {bankAccounts.map((b) => (
                          <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            {b.bankName} - {b.accountName} ({b.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bill Number</label>
                    <Input {...createForm.register("billNumber")} className="h-12 rounded-2xl bg-surface/30 border-muted/30 text-sm font-mono font-semibold" />
                    {createForm.formState.errors.billNumber && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.billNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Amount (LKR)</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      {...createForm.register("amount", { valueAsNumber: true })}
                      className="h-12 rounded-2xl bg-surface/30 border-muted/30 text-sm font-mono font-bold"
                    />
                    {createForm.formState.errors.amount && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.amount.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Reason / Description</label>
                  <Textarea
                    placeholder="Details of expense, purpose, or receipt explanation..."
                    {...createForm.register("reason")}
                    className="text-sm rounded-2xl border-muted/30 bg-surface/30 p-4 text-foreground focus:border-foreground/50 transition-colors resize-none"
                    rows={3}
                  />
                  {createForm.formState.errors.reason && (
                    <p className="text-xs text-destructive">{createForm.formState.errors.reason.message}</p>
                  )}
                </div>

                {/* Cross-Branch Payment Option */}
                <div className="p-4 rounded-2xl border border-muted/30 bg-surface/30 space-y-3">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...createForm.register("isCrossBranchPayment")}
                      className="rounded border-muted/40 text-primary focus:ring-primary size-4"
                    />
                    <span>Cross-Branch Payment (Received for Another Branch)</span>
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Check this if a customer is paying here for a bill / service / debt of another branch.
                  </p>

                  {createForm.watch("isCrossBranchPayment") && (
                    <div className="pt-3 border-t border-muted/20 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <BuildingIcon className="size-3.5 text-primary" />
                          Beneficiary Branch (Whose income is this?)
                        </label>
                        <select
                          {...createForm.register("beneficiaryShop")}
                          className="w-full h-12 rounded-2xl border border-muted/30 bg-surface/30 text-foreground px-4 text-sm font-semibold outline-none focus:border-foreground/50 transition-colors cursor-pointer"
                        >
                          <option value="">Select Target Branch...</option>
                          {activeShops
                            .filter((s) => s._id !== userShopId)
                            .map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                        </select>
                      </div>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 leading-relaxed">
                        💡 <strong>Drawer Accounting:</strong> Physical cash will be added to your drawer ({userShopName || "this shop"}), and sales revenue will be attributed to the selected branch after verification.
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createForm.formState.isSubmitting} className="h-11 px-7 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-xs shadow-md gap-2 cursor-pointer">
                    {createForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1" /> : null}
                    Submit for Approval
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT RECORD MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={watchEditIsComm ? "glass-panel sm:max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl" : "glass-panel sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl"}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                {watchEditIsComm ? <StoreIcon className="size-5" /> : <EditIcon className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                  {watchEditIsComm ? "Edit Communication Sale" : "Edit Pending Transaction"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {watchEditIsComm
                    ? "Modify item, pricing, or cross-branch transfer details before verification"
                    : "Modify record before verification review"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-2">
            {watchEditIsComm ? (
              <>
                {/* COMMUNICATION ITEM FIELDS */}
                <div className="p-5 rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md shadow-sm space-y-4">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider flex items-center gap-2">
                    <SparklesIcon className="size-4" />
                    Item &amp; Pricing Details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Item Code
                      </label>
                      <Input
                        placeholder="e.g. 0010"
                        {...editForm.register("itemCode")}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Item Name *
                      </label>
                      <Input
                        placeholder="Item name..."
                        {...editForm.register("itemName")}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Quantity *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        {...editForm.register("quantity", { valueAsNumber: true })}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Unit Price (LKR) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        {...editForm.register("sellingPrice", { valueAsNumber: true })}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Discount (LKR)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        {...editForm.register("discountPrice", { valueAsNumber: true })}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Additional Charge (LKR)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        {...editForm.register("additionalCost", { valueAsNumber: true })}
                        className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono shadow-xs">
                    <span className="font-sans font-semibold text-foreground">Calculated Net Total:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      LKR {Math.max(0, (watchEditQty * watchEditSelling) - watchEditDiscount + (watchEditAdditional || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* CROSS-BRANCH TRANSFER EDIT */}
                <div className="p-5 rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md shadow-sm space-y-3.5">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-foreground select-none">
                    <input
                      type="checkbox"
                      {...editForm.register("isRelatedToBranch")}
                      className="size-4 rounded-md border-muted/40 accent-primary cursor-pointer"
                    />
                    <span>Is this transaction related to another branch / shop?</span>
                  </label>

                  {watchEditIsBranch && (
                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangleIcon className="size-4 shrink-0" />
                        Cross-Branch Transfer: Requires Verifier Review &amp; Approval
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            Related Branch / Shop *
                          </label>
                          <select
                            {...editForm.register("relatedBranch")}
                            className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                          >
                            <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                              Select Branch / Shop...
                            </option>
                            {activeShops
                              .filter((s) => s._id !== userShopId)
                              .map((s) => (
                                <option
                                  key={s._id}
                                  value={s._id}
                                  className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                                >
                                  {s.name} ({s.code})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            Transfer / Cross-Branch Note
                          </label>
                          <Input
                            placeholder="Reason for cross-branch transfer / note..."
                            {...editForm.register("relatedBranchNote")}
                            className="h-11 rounded-2xl text-xs bg-surface/50 border-muted/30"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* TRANSACTION METADATA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                    <Input type="date" {...editForm.register("date")} className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bill Number</label>
                    <Input {...editForm.register("billNumber")} className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                    <select
                      {...editForm.register("category")}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                          {cat.name} ({cat.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                    <select
                      {...editForm.register("paymentMethod")}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                      <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                      <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                      <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                      <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason / Description</label>
                  <Textarea {...editForm.register("reason")} className="rounded-2xl p-4 bg-surface/40 border border-muted/30 text-xs sm:text-sm font-medium" rows={2} />
                </div>
              </>
            ) : (
              /* STANDARD FORM (NON-COMMUNICATION) */
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                    <Input type="date" {...editForm.register("date")} className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bill Number</label>
                    <Input {...editForm.register("billNumber")} className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                    <select
                      {...editForm.register("category")}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                          {cat.name} ({cat.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                    <select
                      {...editForm.register("paymentMethod")}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash</option>
                      <option value="PETTY_CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Petty Cash</option>
                      <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer</option>
                      <option value="CHEQUE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cheque</option>
                      <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (LKR)</label>
                  <Input
                    type="number"
                    step="any"
                    {...editForm.register("amount", { valueAsNumber: true })}
                    className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason</label>
                  <Textarea {...editForm.register("reason")} className="rounded-2xl p-4 bg-surface/40 border border-muted/30 text-xs sm:text-sm font-medium" rows={3} />
                </div>
              </>
            )}

            <DialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting} className="h-11 px-7 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-xs shadow-md cursor-pointer">
                {editForm.formState.isSubmitting ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : null}
                Save Modifications
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DEBT REPAYMENT MODAL */}
      <Dialog open={debtRepayOpen} onOpenChange={setDebtRepayOpen}>
        <DialogContent className="glass-panel sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <HandCoinsIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                  Settle Customer Debt
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Collect outstanding debt payments from credit customers for {userShopName}. Instant auto-approval and running cash balance update.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleDebtRepaymentSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Customer Mobile Number *</span>
                {searchingCustomer && (
                  <span className="text-[11px] text-primary flex items-center gap-1 font-semibold">
                    <Loader2Icon className="size-3.5 animate-spin" /> Searching...
                  </span>
                )}
              </label>
              <Input
                placeholder="e.g. 0771234567"
                value={repayPhone}
                onChange={(e) => {
                  const val = e.target.value;
                  setRepayPhone(val);
                  handleLookupCustomer(val, "REPAY");
                }}
                className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-mono font-bold"
              />
            </div>

            {/* Found Customer Details */}
            {repayCustomer && (
              <div className="p-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-foreground block">{repayCustomer.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{repayCustomer.phone}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider block">Outstanding Debt</span>
                    <span className="text-base font-extrabold font-mono text-amber-700 dark:text-amber-400">
                      LKR {Number(repayCustomer.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {repayCustomer.shop && repayCustomer.shop._id !== userShopId && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-800 dark:text-blue-300 text-xs font-medium">
                    <BuildingIcon className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cross-Branch Customer:</span> Belongs to{" "}
                      <strong>{repayCustomer.shop.name} ({repayCustomer.shop.code})</strong>. Cash will be collected into your drawer ({userShopName || "this shop"}), and debt will be settled for {repayCustomer.shop.name} (submitted for approval).
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRepayAmount(repayCustomer.currentBalance)}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                  >
                    Pay Full Amount (LKR {Number(repayCustomer.currentBalance).toLocaleString()})
                  </Button>
                </div>
              </div>
            )}

            {!repayCustomer && repayPhone.trim().length >= 3 && !searchingCustomer && (
              <div className="p-4 rounded-2xl border border-dashed border-muted/30 bg-surface/20 text-center text-xs text-muted-foreground">
                No credit customer found with number &quot;{repayPhone}&quot; in this shop.
              </div>
            )}

            {repayCustomer && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Payment Amount (LKR) *</span>
                    <span className="text-[10px] text-muted-foreground font-normal lowercase">(max: LKR {Number(repayCustomer.currentBalance).toLocaleString()})</span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={repayCustomer.currentBalance}
                    step="any"
                    value={repayAmount || ""}
                    onChange={(e) => setRepayAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Payment Method
                  </label>
                  <div className="flex items-center gap-1.5 bg-surface/40 p-1.5 rounded-2xl border border-muted/20">
                    <button
                      type="button"
                      onClick={() => setRepayMethod("CASH")}
                      className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${repayMethod === "CASH"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepayMethod("BANK_TRANSFER")}
                      className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${repayMethod === "BANK_TRANSFER"
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      Bank / Online
                    </button>
                  </div>
                </div>

                {repayMethod === "BANK_TRANSFER" && (
                  <div className="space-y-2 p-4 rounded-2xl border border-muted/30 bg-surface/40">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Target Bank Account
                    </label>
                    <select
                      value={repayBankId || ""}
                      onChange={(e) => setRepayBankId(e.target.value || null)}
                      className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 text-foreground px-3 text-xs font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                    >
                      <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select Bank Account (or Leave Empty)...</option>
                      {bankAccounts.map((b) => (
                        <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                          {b.bankName} - {b.accountNumber} ({b.accountName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Note / Receipt Reference (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Settle bill balance / receipt number..."
                    value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                    className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-medium"
                  />
                </div>
              </>
            )}

            <DialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDebtRepayOpen(false)} className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingRepay || !repayCustomer || repayAmount <= 0}
                className="h-11 px-7 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-xs shadow-md gap-2 cursor-pointer"
              >
                {submittingRepay ? (
                  <Loader2Icon className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-4" />
                )}
                Collect &amp; Record Repayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ITEM WASTAGE & DEFECT LOGGING MODAL */}
      <Dialog open={wastageOpen} onOpenChange={setWastageOpen}>
        <DialogContent className="glass-panel sm:max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertOctagonIcon className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
                  Record Item Wastage / Damage
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Log misprinted sheets, damaged stock, or defective inventory. Operational loss is computed strictly using base unit cost price without reducing the cash drawer.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleWastageSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Item Code or Name *
              </label>
              <Input
                placeholder="Search or enter item code (e.g. A4-COPY, SIM-01)..."
                value={wastageItemLookup}
                onChange={(e) => handleWastageItemCodeChange(e.target.value)}
                className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-mono font-semibold"
                list="wastage-items-datalist"
              />
              <datalist id="wastage-items-datalist">
                {communicationItems.map((item) => (
                  <option key={item._id} value={item.itemCode}>
                    {item.name} ({item.itemCode})
                  </option>
                ))}
              </datalist>
            </div>

            {/* Matched Item Card */}
            {wastageMatchedItem && (
              <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{wastageMatchedItem.name}</span>
                  <Badge variant="outline" className="font-mono text-[11px] px-2.5 py-0.5 rounded-full border-rose-500/40 bg-surface/40">
                    {wastageMatchedItem.itemCode}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Financial loss calculated from registered wholesale base cost (actual cost). Does not deduct from cash till.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Wasted / Defective Quantity *
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={wastageQuantity}
                onChange={(e) => setWastageQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-mono font-bold"
              />
              <p className="text-[11px] text-muted-foreground">
                e.g. 10 misprinted tutor sheets, 2 damaged covers
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reason / Defect Description *
              </label>
              <Textarea
                placeholder="Explain what happened (e.g. Printer jammed during tutor job, misaligned double-side print, ink smudge)..."
                value={wastageReason}
                onChange={(e) => setWastageReason(e.target.value)}
                rows={3}
                className="rounded-2xl p-4 bg-surface/40 border border-muted/30 text-xs sm:text-sm font-medium"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setWastageOpen(false)} className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingWastage || !wastageMatchedItem || wastageQuantity <= 0 || !wastageReason.trim()}
                className="h-11 px-7 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold text-xs shadow-md gap-2 cursor-pointer"
              >
                {submittingWastage ? <Loader2Icon className="size-3.5 animate-spin mr-1.5" /> : <AlertOctagonIcon className="size-4" />}
                Record Loss
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* UTILITY BILL PAYMENT MODAL */}
      <Dialog open={utilityBillOpen} onOpenChange={setUtilityBillOpen}>
        <DialogContent className="glass-panel sm:max-w-xl md:max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl">
          <form onSubmit={handleUtilityBillSubmit} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <ZapIcon className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-foreground">
                    Utility Bill Payment
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Process Light (Electricity) &amp; Water bills with automatic fee and profit calculation.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Bill Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Bill Type *</label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setUtilityBillType("ELECTRICITY")}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${utilityBillType === "ELECTRICITY"
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shadow-xs ring-1 ring-amber-500/30"
                      : "border-muted/30 bg-surface/30 text-muted-foreground hover:bg-surface/50"
                    }`}
                >
                  <ZapIcon className="size-5 mb-1.5 text-amber-500" />
                  <span className="text-xs font-bold">Light Bill</span>
                  <span className="text-[10px] opacity-75 font-mono">Electricity (CEB/LECO)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityBillType("WATER")}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${utilityBillType === "WATER"
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-1 ring-blue-500/30"
                      : "border-muted/30 bg-surface/30 text-muted-foreground hover:bg-surface/50"
                    }`}
                >
                  <DropletIcon className="size-5 mb-1.5 text-blue-500" />
                  <span className="text-xs font-bold">Water Bill</span>
                  <span className="text-[10px] opacity-75 font-mono">Water Board (NWSDB)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUtilityBillType("OTHER")}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${utilityBillType === "OTHER"
                      ? "border-primary/50 bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/30"
                      : "border-muted/30 bg-surface/30 text-muted-foreground hover:bg-surface/50"
                    }`}
                >
                  <ReceiptTextIcon className="size-5 mb-1.5 text-primary" />
                  <span className="text-xs font-bold">Other Bill</span>
                  <span className="text-[10px] opacity-75 font-mono">Custom Utility</span>
                </button>
              </div>
            </div>

            {/* Account Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account / Bill Reference Number *
              </label>
              <Input
                placeholder={
                  utilityBillType === "ELECTRICITY"
                    ? "e.g. 0429182390 (10-digit CEB / LECO account)"
                    : utilityBillType === "WATER"
                      ? "e.g. 12/34/567/890 (Water Board Account No)"
                      : "e.g. Account or Reference Number"
                }
                value={utilityAccountNumber}
                onChange={(e) => setUtilityAccountNumber(e.target.value)}
                className="h-11 sm:h-12 rounded-2xl bg-surface/40 border-muted/30 font-mono text-xs sm:text-sm font-bold"
                required
              />
            </div>

            {/* Customer Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Name (Optional)</label>
                <Input
                  placeholder="e.g. Nimal Perera"
                  value={utilityCustomerName}
                  onChange={(e) => setUtilityCustomerName(e.target.value)}
                  className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Mobile (Optional)</label>
                <Input
                  placeholder="e.g. 0771234567"
                  value={utilityCustomerPhone}
                  onChange={(e) => setUtilityCustomerPhone(e.target.value)}
                  className="h-11 rounded-2xl bg-surface/40 border-muted/30 font-mono text-xs sm:text-sm font-semibold"
                />
              </div>
            </div>

            {/* Bill Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Original Bill Amount (LKR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  LKR
                </span>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 4000 or 7000"
                  value={utilityBillAmount}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : Number(e.target.value);
                    setUtilityBillAmount(val);
                  }}
                  className="h-12 rounded-2xl bg-surface/40 border-muted/30 pl-14 text-base font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* DYNAMIC LIVE CALCULATION & BREAKDOWN CARD */}
            {Number(utilityBillAmount) > 0 && (
              <div className="rounded-3xl border border-muted/30 bg-surface/30 backdrop-blur-md p-4 space-y-3 shadow-xs">
                {/* Totals Summary */}
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium">Total to collect from customer: </span>
                    <span className="font-mono font-extrabold text-foreground text-base ml-1">
                      LKR {liveUtilityCharges.totalCustomerPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom charges toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setUtilityIsCustomCharges(!utilityIsCustomCharges)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>{utilityIsCustomCharges ? "Hide Custom Charges" : "Customize service charge or fee"}</span>
              </button>

              {utilityIsCustomCharges && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-surface/40 rounded-2xl border border-muted/30">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Customer Charge (LKR)</label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 30 or 40"
                      value={utilityCustomServiceCharge}
                      onChange={(e) =>
                        setUtilityCustomServiceCharge(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="h-11 rounded-2xl bg-surface/50 border-muted/30 font-mono text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Provider Cost Fee (LKR)</label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 18 or 23"
                      value={utilityCustomProviderFee}
                      onChange={(e) =>
                        setUtilityCustomProviderFee(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      className="h-11 rounded-2xl bg-surface/50 border-muted/30 font-mono text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Customer Payment Method</label>
              <select
                value={utilityPaymentMethod}
                onChange={(e: any) => setUtilityPaymentMethod(e.target.value)}
                className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 px-3 text-xs text-foreground font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="CASH" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Cash (Adds to Shop Cash Drawer)</option>
                <option value="BANK_TRANSFER" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Bank Transfer (Deposits to Bank)</option>
                <option value="ONLINE" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Online / Card</option>
              </select>
            </div>

            {utilityPaymentMethod === "BANK_TRANSFER" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deposit Bank Account *</label>
                <select
                  value={utilityBankAccountId || ""}
                  onChange={(e) => setUtilityBankAccountId(e.target.value || null)}
                  className="w-full h-11 rounded-2xl border border-muted/30 bg-surface/50 px-3 text-xs text-foreground font-semibold outline-none focus:border-ring [color-scheme:light] dark:[color-scheme:dark]"
                  required
                >
                  <option value="" className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">Select bank account...</option>
                  {bankAccounts.map((b) => (
                    <option key={b._id} value={b._id} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                      {b.bankName} - {b.accountNumber} ({b.accountName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Optional Notes / Remarks</label>
              <Input
                placeholder="e.g. Customer receipt reference or note"
                value={utilityNote}
                onChange={(e) => setUtilityNote(e.target.value)}
                className="h-11 rounded-2xl bg-surface/40 border-muted/30 text-xs sm:text-sm font-medium"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUtilityBillOpen(false)}
                disabled={submittingUtilityBill}
                className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingUtilityBill || !utilityAccountNumber.trim() || Number(utilityBillAmount) <= 0}
                className="h-11 px-7 rounded-2xl bg-foreground text-background hover:opacity-90 font-semibold text-xs shadow-md gap-2 cursor-pointer"
              >
                {submittingUtilityBill ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin mr-1" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <CheckCircle2Icon className="size-4" />
                    Record Bill Payment (LKR {liveUtilityCharges.totalCustomerPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM ALERT */}
      <AlertDialog open={!!deleteConfirmRecord} onOpenChange={(open) => !open && setDeleteConfirmRecord(null)}>
        <AlertDialogContent className="glass-panel sm:max-w-md p-6 sm:p-8 rounded-3xl border border-muted/30 shadow-2xl space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-extrabold text-foreground">Delete Pending Transaction?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove bill &quot;{deleteConfirmRecord?.billNumber}&quot; for LKR{" "}
              {Number(deleteConfirmRecord?.amount || 0).toLocaleString()}? This action will permanently remove it from the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-muted/20 flex items-center justify-end gap-3">
            <AlertDialogCancel className="h-11 px-6 rounded-2xl border-muted/30 bg-surface/30 hover:bg-surface/60 text-foreground font-semibold text-xs cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubmit}
              className="h-11 px-6 rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold text-xs shadow-md cursor-pointer"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
