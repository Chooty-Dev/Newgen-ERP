"use server";

import connectDB from "@/lib/mongodb";
import { CustomerCredit } from "@/models/CustomerCredit";
import { CreditTransaction } from "@/models/CreditTransaction";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Category } from "@/models/Category";
import { BankAccount } from "@/models/BankAccount";
import { Shop } from "@/models/Shop";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/rbac";
import { recalculateShopRunningBalance } from "@/lib/balance";
import { logAuditEvent } from "@/lib/audit";
import { repayCustomerDebtSchema, RepayCustomerDebtInput } from "@/schemas/finance";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";

/**
 * Quick search for a credit customer by phone number.
 */
export async function searchCreditCustomerAction(phone: string, shopId?: string | null) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  if (!phone || phone.trim().length < 3) {
    return { success: true, customer: null };
  }

  try {
    await connectDB();
    const cleanPhone = phone.trim();

    let customer = null;
    if (shopId) {
      customer = await CustomerCredit.findOne({
        phone: { $regex: cleanPhone, $options: "i" },
        shop: new mongoose.Types.ObjectId(shopId),
      })
        .populate("shop", "name code shopType")
        .lean();
    }

    // If not found in current shop, look across all branches
    if (!customer) {
      customer = await CustomerCredit.findOne({
        phone: { $regex: cleanPhone, $options: "i" },
      })
        .populate("shop", "name code shopType")
        .lean();
    }

    if (!customer) {
      return { success: true, customer: null };
    }

    const customerShopDoc = customer.shop as any;

    const result = {
      success: true,
      customer: {
        _id: customer._id.toString(),
        name: customer.name,
        phone: customer.phone,
        shop: customerShopDoc
          ? {
              _id: customerShopDoc._id.toString(),
              name: customerShopDoc.name,
              code: customerShopDoc.code,
              shopType: customerShopDoc.shopType,
            }
          : null,
        totalCredit: customer.totalCredit,
        totalPaid: customer.totalPaid,
        currentBalance: customer.currentBalance,
        lastActivityDate: customer.lastActivityDate?.toISOString(),
      },
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Search credit customer error:", error);
    return { success: false, error: "Failed to search customer." };
  }
}

/**
 * Records a debt repayment from a customer.
 * Supports cross-branch payments (Customer of Shop B paying at Shop A).
 * Deducts the amount from customer debt, records an income finance entry,
 * and updates shop cash balance or bank account.
 */
export async function repayCustomerDebtAction(payload: RepayCustomerDebtInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "STAFF" && !isAdmin(session.user as any)) {
    return { success: false, error: "Only assigned staff can record debt repayments." };
  }

  const parsed = repayCustomerDebtSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { shopId, customerCreditId, amount, paymentMethod, bankAccountId, note } = parsed.data;

  try {
    await connectDB();

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isActive) {
      return { success: false, error: "Invalid or inactive branch." };
    }

    const customer = await CustomerCredit.findById(customerCreditId).populate("shop", "name code");
    if (!customer) {
      return { success: false, error: "Customer credit account not found." };
    }

    if (customer.currentBalance <= 0) {
      return { success: false, error: "This customer has zero outstanding debt." };
    }

    if (amount > customer.currentBalance) {
      return {
        success: false,
        error: `Repayment amount (LKR ${amount.toLocaleString()}) cannot exceed outstanding debt (LKR ${customer.currentBalance.toLocaleString()}).`,
      };
    }

    // Determine if this is a cross-branch payment
    const customerShopId = customer.shop ? (customer.shop as any)._id?.toString() || customer.shop.toString() : null;
    const currentShopId = shop._id.toString();
    const isCrossBranch = (customerShopId && customerShopId !== currentShopId) || Boolean(parsed.data.isCrossBranchPayment);

    // Find or create "Customer Debt Repayment" category
    let category = await Category.findOne({
      name: { $regex: /^customer debt repayment$/i },
      type: "INCOME",
      isActive: true,
    });
    if (!category) {
      category = await Category.findOne({
        name: { $regex: /^debt repayment|^credit settlement/i },
        type: "INCOME",
        isActive: true,
      });
    }
    if (!category) {
      category = await Category.create({
        name: "Customer Debt Repayment",
        description: "Repayment of customer credit debt from communication sales",
        type: "INCOME",
        colorToken: "chart-2",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      });
    }

    // Generate Bill Number
    const count = await FinanceRecord.countDocuments({
      shop: shop._id,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const billNumber = `REC-${shop.code}-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    // Cross-branch transactions require Verifier approval before taking effect on physical cash drawers
    const recordStatus = isCrossBranch ? "PENDING" : "APPROVED";
    const approvedAmount = isCrossBranch ? null : amount;
    const isLocked = !isCrossBranch;

    // Create Finance Record for the repayment
    const record = await FinanceRecord.create({
      shop: shop._id,
      category: category._id,
      date: new Date(),
      billNumber,
      amount,
      type: "INCOME",
      paymentMethod,
      bankAccount: paymentMethod === "BANK_TRANSFER" && bankAccountId ? new mongoose.Types.ObjectId(bankAccountId) : null,
      reason: isCrossBranch
        ? `Cross-Branch Debt Repayment from ${customer.name} (${customer.phone}) [Customer of ${(customer.shop as any)?.name || "Another Branch"}]${note ? ` - ${note.trim()}` : ""}`
        : `Debt Repayment from ${customer.name} (${customer.phone})${note ? ` - ${note.trim()}` : ""}`,
      status: recordStatus,
      approvedAmount,
      isLocked,
      runningBalance: 0,
      customerCredit: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      isDebtRepayment: true,

      // Cross-Branch Payment & Inter-Branch Settlement Fields
      isCrossBranchPayment: isCrossBranch,
      collectingShop: isCrossBranch ? shop._id : null,
      beneficiaryShop: isCrossBranch ? (customer.shop as any)?._id || customer.shop : null,
      interBranchSettlementStatus: isCrossBranch ? "UNSETTLED" : undefined,

      createdBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedBy: isCrossBranch ? null : new mongoose.Types.ObjectId(session.user.id),
      reviewedAt: isCrossBranch ? null : new Date(),
      reviewRemarks: isCrossBranch ? null : "Auto-approved customer debt repayment",
    });

    // Update Customer Credit Account
    customer.totalPaid += amount;
    customer.currentBalance = Math.max(0, customer.currentBalance - amount);
    customer.lastActivityDate = new Date();
    await customer.save();

    // Create Credit Transaction
    await CreditTransaction.create({
      customerCredit: customer._id,
      shop: shop._id,
      type: "REPAYMENT",
      amount,
      paymentMethod,
      bankAccount: paymentMethod === "BANK_TRANSFER" && bankAccountId ? new mongoose.Types.ObjectId(bankAccountId) : null,
      financeRecord: record._id,
      billNumber,
      note: note ? note.trim() : (isCrossBranch ? `Cross-branch debt repayment at ${shop.name}` : "Debt repayment"),
      recordedBy: new mongoose.Types.ObjectId(session.user.id),
      date: new Date(),
    });

    // Update balances if auto-approved
    if (recordStatus === "APPROVED") {
      if (paymentMethod === "CASH") {
        await recalculateShopRunningBalance(shop._id, new Date());
      } else if (paymentMethod === "BANK_TRANSFER" && bankAccountId) {
        const bank = await BankAccount.findById(bankAccountId);
        if (bank) {
          bank.currentBalance += amount;
          await bank.save();
        }
      }
    }

    await logAuditEvent({
      actorId: session.user.id,
      action: "REPAY_CUSTOMER_DEBT",
      targetType: "CustomerCredit",
      targetId: customer._id,
      metadata: {
        shopId: shop._id.toString(),
        isCrossBranch,
        collectingShop: shop.name,
        beneficiaryShop: (customer.shop as any)?.name,
        customerName: customer.name,
        customerPhone: customer.phone,
        repaymentAmount: amount,
        remainingDebt: customer.currentBalance,
        billNumber,
        paymentMethod,
        status: recordStatus,
      },
    });

    revalidatePath("/dashboard/staff/finances");
    revalidatePath(`/dashboard/admin/shops/${shopId}`);
    if (customerShopId) {
      revalidatePath(`/dashboard/admin/shops/${customerShopId}`);
    }
    revalidatePath("/dashboard/admin/shops");

    return {
      success: true,
      message: isCrossBranch
        ? `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} collected from ${customer.name} for ${(customer.shop as any)?.name || "target branch"}. Submitted for verification.`
        : `LKR ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} received from ${customer.name}. Remaining balance: LKR ${customer.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      currentBalance: customer.currentBalance,
      isCrossBranch,
    };
  } catch (error) {
    console.error("Repay customer debt error:", error);
    return { success: false, error: "Failed to record debt repayment." };
  }
}

/**
 * Returns all credit customers and debt statistics for a communication shop.
 */
export async function getShopCreditCustomersAction(shopId: string, search?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const shopObjId = new mongoose.Types.ObjectId(shopId);

    const query: Record<string, unknown> = {
      shop: shopObjId,
    };

    if (search && search.trim()) {
      const clean = search.trim();
      query.$or = [
        { name: { $regex: clean, $options: "i" } },
        { phone: { $regex: clean, $options: "i" } },
      ];
    }

    const customers = await CustomerCredit.find(query)
      .sort({ currentBalance: -1, lastActivityDate: -1 })
      .lean();

    // Summary stats
    const allCustomers = await CustomerCredit.find({ shop: shopObjId }).select("totalCredit totalPaid currentBalance").lean();
    let totalCreditIssued = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let debtorCount = 0;

    for (const c of allCustomers) {
      totalCreditIssued += c.totalCredit || 0;
      totalPaid += c.totalPaid || 0;
      totalOutstanding += c.currentBalance || 0;
      if (c.currentBalance > 0) {
        debtorCount++;
      }
    }

    const result = {
      success: true,
      customers: customers.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        phone: c.phone,
        totalCredit: c.totalCredit,
        totalPaid: c.totalPaid,
        currentBalance: c.currentBalance,
        lastActivityDate: c.lastActivityDate?.toISOString(),
        notes: c.notes || "",
        createdAt: c.createdAt?.toISOString(),
      })),
      stats: {
        totalCreditIssued,
        totalPaid,
        totalOutstanding,
        debtorCount,
      },
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Get shop credit customers error:", error);
    return { success: false, error: "Failed to fetch credit customers." };
  }
}

/**
 * Returns statement details and transaction history for a single credit customer.
 * Includes complete itemized breakdown of items purchased, utility bill details, and debt repayments.
 */
export async function getCustomerCreditStatementAction(customerId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await connectDB();
    const custObjId = new mongoose.Types.ObjectId(customerId);

    const customer = await CustomerCredit.findById(custObjId)
      .populate("shop", "name code")
      .lean();

    if (!customer) {
      return { success: false, error: "Customer not found." };
    }

    const transactions = await CreditTransaction.find({ customerCredit: custObjId })
      .sort({ date: 1, createdAt: 1 })
      .populate("recordedBy", "name")
      .populate("shop", "name code")
      .populate("bankAccount", "bankName accountNumber accountName")
      .lean();

    // Collect all bill numbers and financeRecord IDs
    const billNumbers = transactions.map((t: any) => t.billNumber).filter(Boolean);
    const frIds = transactions.map((t: any) => t.financeRecord).filter(Boolean);

    // Fetch all related finance records
    const financeRecords = await FinanceRecord.find({
      $or: [
        { customerCredit: custObjId },
        { _id: { $in: frIds } },
        { billNumber: { $in: billNumbers } },
      ],
      isDeleted: { $ne: true },
    })
      .populate("category", "name")
      .populate("bankAccount", "bankName accountNumber")
      .populate("shop", "name code")
      .lean();

    // Compute running debt balance chronologically
    let runningDebt = 0;
    const runningDebtMap = new Map<string, number>();

    for (const tx of transactions) {
      const isRepay = tx.type === "REPAYMENT" || (tx as any).type === "DEBT_REPAYMENT";
      if (isRepay) {
        runningDebt = Math.max(0, runningDebt - tx.amount);
      } else {
        runningDebt += tx.amount;
      }
      runningDebtMap.set(tx._id.toString(), runningDebt);
    }

    // Now map transactions with itemized breakdowns
    const mappedTransactions = transactions.map((t: any) => {
      const isRepay = t.type === "REPAYMENT" || (t as any).type === "DEBT_REPAYMENT";

      // Match finance records for credit purchases (repayments do not have product items)
      let matchingFRs: any[] = [];
      if (!isRepay) {
        if (t.financeRecord) {
          const direct = financeRecords.find((fr: any) => fr._id.toString() === t.financeRecord.toString());
          if (direct) matchingFRs.push(direct);
        }
        if (matchingFRs.length === 0 && t.billNumber) {
          // Priority 1: Match records with this specific customer's credit ID and billNumber
          const custMatches = financeRecords.filter((fr: any) =>
            fr.billNumber === t.billNumber &&
            fr.customerCredit &&
            fr.customerCredit.toString() === custObjId.toString()
          );
          if (custMatches.length > 0) {
            matchingFRs = custMatches;
          } else {
            // Priority 2: Credit records on this bill that don't belong to another customer
            const creditMatches = financeRecords.filter((fr: any) =>
              fr.billNumber === t.billNumber &&
              fr.paymentMethod === "CREDIT" &&
              (!fr.customerCredit || fr.customerCredit.toString() === custObjId.toString())
            );
            if (creditMatches.length > 0) {
              matchingFRs = creditMatches;
            } else {
              // Priority 3: Direct amount match on this bill without another customer's ID
              matchingFRs = financeRecords.filter((fr: any) =>
                fr.billNumber === t.billNumber &&
                (!fr.customerCredit || fr.customerCredit.toString() === custObjId.toString()) &&
                Math.abs((fr.amount || 0) - (t.amount || 0)) < 0.01
              );
            }
          }
        }
      }

      const isUtilityBill = matchingFRs.some((fr: any) => fr.isUtilityBill);
      const isTelecomReload = matchingFRs.some((fr: any) => fr.isTelecomReload);

      let categoryType: "REPAYMENT" | "UTILITY_BILL" | "TELECOM_RELOAD" | "ITEMS_PURCHASE" | "GENERAL" = "GENERAL";
      let categoryLabel = "Credit Transaction";

      if (isRepay) {
        categoryType = "REPAYMENT";
        categoryLabel = "Debt Repayment";
      } else if (isUtilityBill) {
        categoryType = "UTILITY_BILL";
        const utilTypes = [...new Set(matchingFRs.filter((fr: any) => fr.isUtilityBill).map((fr: any) => fr.utilityBillType).filter(Boolean))];
        const utilTypeLabel = utilTypes.length > 0
          ? utilTypes.map((u) => (u === "ELECTRICITY" ? "Electricity" : u === "WATER" ? "Water" : u)).join(", ")
          : "Utility";
        categoryLabel = `${utilTypeLabel} Bill Payment`;
      } else if (isTelecomReload) {
        categoryType = "TELECOM_RELOAD";
        const op = matchingFRs.find((fr: any) => fr.isTelecomReload)?.telecomOperator;
        categoryLabel = op ? `${op} Reload` : "Telecom Reload";
      } else {
        categoryType = "ITEMS_PURCHASE";
        categoryLabel = matchingFRs.length > 1 ? `Items Purchase (${matchingFRs.length} items)` : (matchingFRs[0]?.itemName || "Credit Purchase");
      }

      // Map item lines (only for purchases; repayments have items = [])
      let items: any[] = [];
      if (!isRepay) {
        items = matchingFRs.map((fr: any) => {
          let displayName = fr.itemName || fr.reason || "Item";
          if (fr.isUtilityBill) {
            const typeStr = fr.utilityBillType === "ELECTRICITY" ? "Electricity Bill" : fr.utilityBillType === "WATER" ? "Water Bill" : "Utility Bill";
            displayName = `${typeStr}${fr.utilityAccountNumber ? ` (Acc #${fr.utilityAccountNumber})` : ""}`;
          } else if (fr.isTelecomReload) {
            displayName = `${fr.telecomOperator ? `${fr.telecomOperator} ` : ""}${fr.itemName || "Reload"}${fr.telecomType === "PACKAGE" ? " [Package]" : ""}`;
          }

          return {
            _id: fr._id.toString(),
            itemName: displayName,
            rawItemName: fr.itemName || fr.reason || "",
            itemCode: fr.itemCode || null,
            quantity: fr.quantity || 1,
            unitPrice: typeof fr.sellingPrice === "number" ? fr.sellingPrice : (fr.amount / (fr.quantity || 1)),
            amount: fr.amount,
            discountPrice: fr.discountPrice || 0,
            additionalCost: fr.additionalCost || 0,
            isUtilityBill: Boolean(fr.isUtilityBill),
            utilityBillType: fr.utilityBillType || null,
            utilityAccountNumber: fr.utilityAccountNumber || null,
            billAmount: fr.billAmount || null,
            serviceCharge: fr.serviceCharge || null,
            isTelecomReload: Boolean(fr.isTelecomReload),
            telecomOperator: fr.telecomOperator || null,
            telecomType: fr.telecomType || null,
            categoryName: fr.category?.name || null,
            reason: fr.reason || null,
          };
        });

        // Fallback if no finance record items found for credit purchase
        if (items.length === 0) {
          const cleanNote = (t.note || "").replace(/^Credit Sale:\s*/i, "").trim();
          const fallbackDesc = cleanNote || "Credit Sale";
          items.push({
            _id: t._id.toString(),
            itemName: fallbackDesc,
            rawItemName: fallbackDesc,
            itemCode: null,
            quantity: 1,
            unitPrice: t.amount,
            amount: t.amount,
            discountPrice: 0,
            additionalCost: 0,
            isUtilityBill: false,
            utilityBillType: null,
            utilityAccountNumber: null,
            billAmount: null,
            serviceCharge: null,
            isTelecomReload: false,
            telecomOperator: null,
            telecomType: null,
            categoryName: "Credit Sale",
            reason: t.note || null,
          });
        }
      }

      // Generate a human-readable detailsSummary
      let detailsSummary = "";
      if (isRepay) {
        const methodStr = (t.paymentMethod || "CASH").replace(/_/g, " ");
        const bankStr = t.bankAccount ? ` (${t.bankAccount.bankName}${t.bankAccount.accountNumber ? ` #${t.bankAccount.accountNumber}` : ""})` : "";
        const noteStr = t.note && !t.note.toLowerCase().includes("debt repayment") ? ` - ${t.note}` : "";
        detailsSummary = `Debt Repayment via ${methodStr}${bankStr}${noteStr}`;
      } else {
        if (items.length === 1) {
          detailsSummary = `${items[0].itemName}${items[0].quantity > 1 ? ` (×${items[0].quantity})` : ""}`;
        } else {
          detailsSummary = items.map((i: any) => `${i.itemName} (×${i.quantity})`).join(", ");
        }
      }

      const bankAccountDisplay = t.bankAccount
        ? `${t.bankAccount.bankName}${t.bankAccount.accountNumber ? ` (${t.bankAccount.accountNumber})` : ""}`
        : null;

      return {
        _id: t._id.toString(),
        type: isRepay ? "REPAYMENT" : "CREDIT_SALE",
        categoryType,
        categoryLabel,
        amount: t.amount,
        paymentMethod: t.paymentMethod || "CREDIT",
        billNumber: t.billNumber || "",
        note: t.note || "",
        date: t.date ? new Date(t.date).toISOString() : null,
        recordedBy: t.recordedBy?.name || "Staff",
        shopName: t.shop?.name || "",
        bankAccount: bankAccountDisplay,
        items,
        itemCount: items.length,
        detailsSummary,
        runningDebtBalance: runningDebtMap.get(t._id.toString()) ?? 0,
      };
    });

    // Return transactions sorted newest first for the statement view
    const sortedNewestFirst = [...mappedTransactions].reverse();

    const shopData = customer.shop
      ? {
          _id: (customer.shop as any)._id?.toString() || "",
          name: (customer.shop as any).name || "",
          code: (customer.shop as any).code || "",
        }
      : null;

    const result = {
      success: true,
      customer: {
        _id: customer._id.toString(),
        name: customer.name,
        phone: customer.phone,
        totalCredit: customer.totalCredit,
        totalPaid: customer.totalPaid,
        currentBalance: customer.currentBalance,
        lastActivityDate: customer.lastActivityDate ? new Date(customer.lastActivityDate).toISOString() : null,
        notes: customer.notes || "",
        shop: shopData,
      },
      transactions: sortedNewestFirst,
    };

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    console.error("Get customer credit statement error:", error);
    return { success: false, error: "Failed to load customer statement." };
  }
}

/**
 * Recalculate customer's total credit, total paid, and current debt balance
 * based strictly on active (non-deleted) financial records.
 */
export async function recalculateCustomerCreditBalance(customerCreditId: string | mongoose.Types.ObjectId) {
  await connectDB();
  const custObjId = typeof customerCreditId === "string" ? new mongoose.Types.ObjectId(customerCreditId) : customerCreditId;
  const customer = await CustomerCredit.findById(custObjId);
  if (!customer) return null;

  // Active credit sales (non-deleted, CREDIT payment method, not a debt repayment)
  const activeSales = await FinanceRecord.aggregate([
    {
      $match: {
        customerCredit: custObjId,
        isDeleted: { $ne: true },
        isDebtRepayment: { $ne: true },
        paymentMethod: "CREDIT",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  // Active repayments (non-deleted, isDebtRepayment: true)
  const activeRepayments = await FinanceRecord.aggregate([
    {
      $match: {
        customerCredit: custObjId,
        isDeleted: { $ne: true },
        isDebtRepayment: true,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
      },
    },
  ]);

  const totalCredit = activeSales[0]?.total || 0;
  const totalPaid = activeRepayments[0]?.total || 0;
  const currentBalance = Math.max(0, totalCredit - totalPaid);

  customer.totalCredit = totalCredit;
  customer.totalPaid = totalPaid;
  customer.currentBalance = currentBalance;
  customer.lastActivityDate = new Date();
  await customer.save();

  return { totalCredit, totalPaid, currentBalance };
}

/**
 * Handle reversal of credit when a FinanceRecord is deleted.
 * Reconciles the associated CreditTransaction and re-computes customer debt balance.
 */
export async function handleDeletedCreditFinanceRecord(record: any) {
  if (!record || !record.customerCredit) return;
  await connectDB();

  const custObjId = typeof record.customerCredit === "string" ? new mongoose.Types.ObjectId(record.customerCredit) : record.customerCredit;

  // 1. If it was a debt repayment
  if (record.isDebtRepayment) {
    await CreditTransaction.deleteMany({
      $or: [
        { financeRecord: record._id },
        { customerCredit: custObjId, billNumber: record.billNumber, type: "REPAYMENT" },
      ],
    });
  } else if (record.paymentMethod === "CREDIT") {
    // 2. If it was a credit sale
    const remainingFRs = await FinanceRecord.find({
      customerCredit: custObjId,
      billNumber: record.billNumber,
      isDeleted: { $ne: true },
      paymentMethod: "CREDIT",
    }).lean();

    const remainingTotal = remainingFRs.reduce((sum: number, fr: any) => sum + (fr.amount || 0), 0);

    const creditTx = await CreditTransaction.findOne({
      customerCredit: custObjId,
      billNumber: record.billNumber,
      type: "CREDIT_SALE",
    });

    if (creditTx) {
      if (remainingTotal <= 0) {
        // No active items remain on this bill -> delete the transaction
        await CreditTransaction.deleteOne({ _id: creditTx._id });
      } else {
        // Adjust transaction amount & note to reflect remaining active items
        creditTx.amount = remainingTotal;
        const itemNames = remainingFRs.map((fr: any) => fr.itemName || fr.reason || "Item").join(", ");
        creditTx.note = `Credit Sale: ${itemNames}`;
        await creditTx.save();
      }
    }
  }

  // 3. Rebalance CustomerCredit record
  await recalculateCustomerCreditBalance(custObjId);
}
