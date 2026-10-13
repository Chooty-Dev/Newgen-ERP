"use server";

import { auth } from "@/auth";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";
import { User } from "@/models/User";
import { FinanceRecord } from "@/models/FinanceRecord";
import { CustomerCredit } from "@/models/CustomerCredit";
import { sanitizeInput } from "@/lib/sanitize";
import { createShopSchema, updateShopSchema } from "@/schemas/shop";
import { isAdmin } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";
import { Category } from "@/models/Category";
import {
  getShopCashBalance,
  getShopInterBranchDues,
  getShopCashAuditData,
  getShopDiscrepancyAuditData,
  recalculateShopRunningBalance,
} from "@/lib/balance";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

export async function getShopsAction() {
  try {
    await connectDB();
    const shops = await Shop.find().sort({ createdAt: -1 }).lean();

    // Attach count of active staff assigned to each shop and exact balances
    const shopsWithCounts = await Promise.all(
      shops.map(async (shop) => {
        const staffCount = await User.countDocuments({
          shop: shop._id,
          isActive: true,
          role: "STAFF",
        });
        const recordsCount = await FinanceRecord.countDocuments({
          shop: shop._id,
          isDeleted: { $ne: true },
        });

        // Compute true physical cash balance
        const currentBalance = await getShopCashBalance(shop._id);
        const interBranchDues = await getShopInterBranchDues(shop._id);

        let totalCustomerCredit = 0;
        if (shop.shopType === "COMMUNICATION") {
          const creditAgg = await CustomerCredit.aggregate([
            { $match: { shop: shop._id } },
            { $group: { _id: null, total: { $sum: "$currentBalance" } } },
          ]);
          if (creditAgg.length > 0) {
            totalCustomerCredit = creditAgg[0].total || 0;
          }
        }

        return {
          ...shop,
          staffCount,
          recordsCount,
          currentBalance,
          totalCustomerCredit,
          interBranchDues: {
            totalHolding: interBranchDues.totalHolding,
            totalOwed: interBranchDues.totalOwed,
          },
        };
      })
    );

    return { success: true, shops: JSON.parse(JSON.stringify(shopsWithCounts)) };
  } catch (error) {
    console.error("Get shops error:", error);
    return { success: false, error: "Failed to fetch shops." };
  }
}

export async function getActiveShopsAction() {
  try {
    await connectDB();
    const shops = await Shop.find({ isActive: true }).select("_id name code shopType").sort({ name: 1 }).lean();
    return { success: true, shops: JSON.parse(JSON.stringify(shops)) };
  } catch (error) {
    console.error("Get active shops error:", error);
    return { success: false, error: "Failed to fetch active shops." };
  }
}

export async function getShopDetailsAction(shopId: string) {
  try {
    await connectDB();
    const shop = await Shop.findById(shopId).lean();
    if (!shop) return { success: false, error: "Shop not found." };

    const assignedStaff = await User.find({ shop: shop._id, isActive: true })
      .select("name email phone role lastLoginAt")
      .lean();

    const recordsCount = await FinanceRecord.countDocuments({ shop: shop._id, isDeleted: { $ne: true } });
    const pendingCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "PENDING", isDeleted: { $ne: true } });
    const approvedCount = await FinanceRecord.countDocuments({ shop: shop._id, status: "APPROVED", isDeleted: { $ne: true } });

    // Compute true physical cash balance and inter-branch dues
    const currentBalance = await getShopCashBalance(shop._id);
    const interBranchDues = await getShopInterBranchDues(shop._id);

    let totalCustomerCredit = 0;
    let creditCustomerCount = 0;
    if (shop.shopType === "COMMUNICATION") {
      const creditAgg = await CustomerCredit.aggregate([
        { $match: { shop: shop._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$currentBalance" },
            count: { $sum: 1 },
          },
        },
      ]);
      if (creditAgg.length > 0) {
        totalCustomerCredit = creditAgg[0].total || 0;
        creditCustomerCount = creditAgg[0].count || 0;
      }
    }

    return {
      success: true,
      shop: JSON.parse(JSON.stringify(shop)),
      assignedStaff: JSON.parse(JSON.stringify(assignedStaff)),
      stats: {
        recordsCount,
        pendingCount,
        approvedCount,
        currentBalance,
        totalCustomerCredit,
        creditCustomerCount,
        interBranchDues: JSON.parse(JSON.stringify(interBranchDues)),
      },
    };
  } catch (error) {
    console.error("Get shop details error:", error);
    return { success: false, error: "Failed to load shop details." };
  }
}

export async function createShopAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = createShopSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existingCode = await Shop.findOne({ code: result.data.code.toUpperCase() });
    if (existingCode) {
      return { success: false, error: "A shop with this code already exists." };
    }

    const existingName = await Shop.findOne({ name: result.data.name });
    if (existingName) {
      return { success: false, error: "A shop with this name already exists." };
    }

    const newShop = await Shop.create({
      name: result.data.name,
      code: result.data.code.toUpperCase(),
      description: result.data.description || "",
      address: result.data.address || "",
      shopType: result.data.shopType || "STANDARD",
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    await logAuditEvent({
      actorId: session.user.id,
      action: "CREATE_SHOP",
      targetType: "Shop",
      targetId: newShop._id,
      metadata: { name: newShop.name, code: newShop.code, shopType: newShop.shopType },
    });

    return { success: true, message: "Shop created successfully" };
  } catch (error) {
    console.error("Create shop error:", error);
    return { success: false, error: "Failed to create shop." };
  }
}

export async function updateShopAction(shopId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  const cleanData = sanitizeInput(formData);
  const result = updateShopSchema.safeParse(cleanData);

  if (!result.success) {
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
    };
  }

  try {
    await connectDB();

    const existingCode = await Shop.findOne({
      code: result.data.code.toUpperCase(),
      _id: { $ne: new mongoose.Types.ObjectId(shopId) },
    });
    if (existingCode) {
      return { success: false, error: "Another shop already uses this code." };
    }

    const updated = await Shop.findByIdAndUpdate(
      shopId,
      {
        name: result.data.name,
        code: result.data.code.toUpperCase(),
        description: result.data.description || "",
        address: result.data.address || "",
        shopType: result.data.shopType || "STANDARD",
        isActive: result.data.isActive,
      },
      { new: true }
    );

    await logAuditEvent({
      actorId: session.user.id,
      action: "UPDATE_SHOP",
      targetType: "Shop",
      targetId: shopId,
      metadata: { name: result.data.name, isActive: result.data.isActive },
    });

    return { success: true, shop: JSON.parse(JSON.stringify(updated)) };
  } catch (error) {
    console.error("Update shop error:", error);
    return { success: false, error: "Failed to update shop." };
  }
}

export async function toggleShopActiveAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(shopId);
    if (!shop) return { success: false, error: "Shop not found." };

    shop.isActive = !shop.isActive;
    await shop.save();

    await logAuditEvent({
      actorId: session.user.id,
      action: shop.isActive ? "ACTIVATE_SHOP" : "DEACTIVATE_SHOP",
      targetType: "Shop",
      targetId: shop._id,
    });

    return { success: true, isActive: shop.isActive };
  } catch (error) {
    console.error("Toggle shop error:", error);
    return { success: false, error: "Failed to toggle shop status." };
  }
}

export async function getShopCashAuditAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await connectDB();
    const audit = await getShopCashAuditData(shopId);
    return { success: true, audit: JSON.parse(JSON.stringify(audit)) };
  } catch (error) {
    console.error("Get shop cash audit error:", error);
    return { success: false, error: "Failed to retrieve cash diagnostic audit data." };
  }
}

export async function recalculateAndSyncShopCashAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdmin((session.user as { role?: string }).role)) {
    return { success: false, error: "Unauthorized. Admin privileges required." };
  }

  try {
    await connectDB();
    await recalculateShopRunningBalance(shopId);

    const audit = await getShopCashAuditData(shopId);

    await logAuditEvent({
      actorId: session.user.id,
      action: "RECALCULATE_AND_SYNC_SHOP_CASH",
      targetType: "Shop",
      targetId: new mongoose.Types.ObjectId(shopId),
      metadata: {
        shopName: audit.shopName,
        shopCode: audit.shopCode,
        currentDrawerBalance: audit.currentDrawerBalance,
      },
    });

    revalidatePath(`/dashboard/admin/shops/${shopId}`);
    revalidatePath("/dashboard/admin/shops");
    revalidatePath("/dashboard/staff/finances");

    return {
      success: true,
      message: `Drawer running balance successfully recalculated and synced for ${audit.shopName}.`,
      audit: JSON.parse(JSON.stringify(audit)),
    };
  } catch (error) {
    console.error("Recalculate and sync shop cash error:", error);
    return { success: false, error: "Failed to recalculate and sync shop cash." };
  }
}

export async function getShopDiscrepancyAuditAction(
  shopId: string,
  countedCash?: number | null,
  date?: string | null
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await connectDB();
    const audit = await getShopDiscrepancyAuditData(shopId, countedCash, date);
    return { success: true, audit: JSON.parse(JSON.stringify(audit)) };
  } catch (error: any) {
    console.error("Get shop discrepancy audit error:", error);
    return { success: false, error: error.message || "Failed to retrieve discrepancy audit." };
  }
}

export async function recordShopOpeningFloatAction(params: {
  shopId: string;
  amount: number;
  date?: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(params.shopId);
    if (!shop) return { success: false, error: "Shop not found." };

    if (params.amount < 0) {
      return { success: false, error: "Opening float amount cannot be negative." };
    }

    const targetDate = params.date ? new Date(params.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Find or create "Daily Opening Float" category
    let category = await Category.findOne({
      name: { $regex: /^daily opening float|^opening float/i },
      isActive: true,
    });
    if (!category) {
      category = await Category.create({
        name: "Daily Opening Float",
        description: "Initial cash float kept in the counter drawer at shop opening",
        type: "INCOME",
        colorToken: "chart-1",
        isActive: true,
      });
    }

    // Check if an opening float record already exists for today
    let floatRec = await FinanceRecord.findOne({
      shop: shop._id,
      isOpeningFloat: true,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: { $ne: true },
    });

    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, "");

    if (floatRec) {
      floatRec.amount = params.amount;
      floatRec.approvedAmount = params.amount;
      floatRec.reason = params.note
        ? `Daily Opening Float - ${shop.name}: ${params.note.trim()}`
        : `Daily Opening Cash Float - ${shop.name} (${shop.code})`;
      floatRec.reviewedBy = new mongoose.Types.ObjectId(session.user.id);
      floatRec.reviewedAt = new Date();
      await floatRec.save();
    } else {
      const billNumber = `FLOAT-${shop.code}-${dateStr}`;
      // Set time to beginning of the day (00:00:01) so it chronologically appears first
      const floatTime = new Date(targetDate);
      floatTime.setHours(0, 0, 1, 0);

      floatRec = await FinanceRecord.create({
        shop: shop._id,
        category: category._id,
        date: floatTime,
        billNumber,
        reason: params.note
          ? `Daily Opening Float - ${shop.name}: ${params.note.trim()}`
          : `Daily Opening Cash Float - ${shop.name} (${shop.code})`,
        amount: params.amount,
        type: "INCOME",
        paymentMethod: "CASH",
        isOpeningFloat: true,
        status: "APPROVED",
        approvedAmount: params.amount,
        isLocked: true,
        createdBy: new mongoose.Types.ObjectId(session.user.id),
        reviewedBy: new mongoose.Types.ObjectId(session.user.id),
        reviewedAt: new Date(),
        reviewRemarks: "Auto-approved shop opening float",
      });
    }

    // Recalculate drawer running balance
    await recalculateShopRunningBalance(shop._id, startOfDay);

    await logAuditEvent({
      actorId: session.user.id,
      action: "SET_SHOP_OPENING_FLOAT",
      targetType: "FinanceRecord",
      targetId: floatRec._id,
      metadata: {
        shopId: shop._id.toString(),
        shopName: shop.name,
        amount: params.amount,
        date: targetDate.toISOString().slice(0, 10),
      },
    });

    revalidatePath(`/dashboard/admin/shops/${params.shopId}`);
    revalidatePath("/dashboard/admin/shops");

    return {
      success: true,
      message: `Opening float of LKR ${params.amount.toLocaleString()} registered successfully.`,
      recordId: floatRec._id.toString(),
    };
  } catch (err: any) {
    console.error("Record opening float error:", err);
    return { success: false, error: err.message || "Failed to record opening float." };
  }
}

export async function recordShopCashAdjustmentAction(params: {
  shopId: string;
  amount: number;
  type: "SURPLUS" | "SHORTAGE";
  reason?: string;
  date?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await connectDB();
    const shop = await Shop.findById(params.shopId);
    if (!shop) return { success: false, error: "Shop not found." };

    if (params.amount <= 0) {
      return { success: false, error: "Adjustment amount must be greater than zero." };
    }

    const targetDate = params.date ? new Date(params.date) : new Date();
    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, "");
    const isSurplus = params.type === "SURPLUS";

    let category = await Category.findOne({
      name: { $regex: /^cash drawer adjustment|^cash reconciliation adjustment/i },
      type: isSurplus ? "INCOME" : "EXPENSE",
      isActive: true,
    });
    if (!category) {
      category = await Category.create({
        name: isSurplus ? "Cash Drawer Surplus Adjustment" : "Cash Drawer Shortage Adjustment",
        description: "Reconciliation adjustments for physical till discrepancies",
        type: isSurplus ? "INCOME" : "EXPENSE",
        colorToken: isSurplus ? "chart-2" : "chart-5",
        isActive: true,
      });
    }

    const count = await FinanceRecord.countDocuments({
      shop: shop._id,
      isCashAdjustment: true,
    });

    const billNumber = `ADJ-${shop.code}-${dateStr}-${String(count + 1).padStart(2, "0")}`;

    const adjRec = await FinanceRecord.create({
      shop: shop._id,
      category: category._id,
      date: targetDate,
      billNumber,
      reason: params.reason
        ? `Cash ${isSurplus ? "Surplus" : "Shortage"} Adjustment: ${params.reason.trim()}`
        : `Physical Cash Drawer ${isSurplus ? "Surplus" : "Shortage"} Reconciliation - ${shop.name}`,
      amount: params.amount,
      type: isSurplus ? "INCOME" : "EXPENSE",
      paymentMethod: "CASH",
      isCashAdjustment: true,
      adjustmentType: params.type,
      status: "APPROVED",
      approvedAmount: params.amount,
      isLocked: true,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedBy: new mongoose.Types.ObjectId(session.user.id),
      reviewedAt: new Date(),
      reviewRemarks: `Cash reconciliation adjustment recorded by ${(session.user as any).name || "Admin"}`,
    });

    await recalculateShopRunningBalance(shop._id, targetDate);

    await logAuditEvent({
      actorId: session.user.id,
      action: "RECORD_CASH_ADJUSTMENT",
      targetType: "FinanceRecord",
      targetId: adjRec._id,
      metadata: {
        shopId: shop._id.toString(),
        amount: params.amount,
        type: params.type,
        billNumber,
      },
    });

    revalidatePath(`/dashboard/admin/shops/${params.shopId}`);
    revalidatePath("/dashboard/admin/shops");

    return {
      success: true,
      message: `Cash ${params.type.toLowerCase()} adjustment of LKR ${params.amount.toLocaleString()} recorded successfully.`,
      recordId: adjRec._id.toString(),
    };
  } catch (err: any) {
    console.error("Record cash adjustment error:", err);
    return { success: false, error: err.message || "Failed to record cash adjustment." };
  }
}
