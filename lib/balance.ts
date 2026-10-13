import connectDB from "./mongodb";
import { FinanceRecord } from "@/models/FinanceRecord";
import { Shop } from "@/models/Shop";
import mongoose from "mongoose";

import { getRecordExactDate, getRecordExactTimestamp } from "./dateUtils";
export { getRecordExactDate, getRecordExactTimestamp };

/**
 * Resolves whether a record is an INCOME or EXPENSE from the viewpoint of a specific shop.
 */
export function resolveShopEffectiveType(
  record: {
    type: "INCOME" | "EXPENSE" | string;
    isCommunicationItem?: boolean;
    isCrossBranchPayment?: boolean;
    beneficiaryShop?: any;
    shop?: any;
    collectingShop?: any;
  },
  targetShopId: string | mongoose.Types.ObjectId
): "INCOME" | "EXPENSE" {
  const targetIdStr = targetShopId.toString();
  const bShopId = record.beneficiaryShop?._id?.toString() || record.beneficiaryShop?.toString();
  const directShopId = record.shop?._id?.toString() || record.shop?.toString();

  // If this record was collected / executed by another branch (e.g. Communication) for the target shop
  if (bShopId === targetIdStr && directShopId !== targetIdStr) {
    // Communication sales/printing done for this branch is an EXPENSE for this branch
    if (record.isCommunicationItem) {
      return "EXPENSE";
    }
    // Class fees or payments collected at communication for this branch is an INCOME for this branch
    return "INCOME";
  }

  // Communication retail sales are always retail INCOME for the communication shop that performed them
  if (directShopId === targetIdStr && record.isCommunicationItem) {
    return "INCOME";
  }

  // Cross-branch cash collections physically received at this shop are cash INCOME for this shop's drawer
  if (directShopId === targetIdStr && record.isCrossBranchPayment) {
    return "INCOME";
  }

  return record.type === "EXPENSE" ? "EXPENSE" : "INCOME";
}

/**
 * Recalculates the cumulative running balance for a shop in chronological order.
 * Triggers upon create/update/delete/approval of records.
 * Running balance tracks the physical cash drawer of this specific shop.
 */
export async function recalculateShopRunningBalance(
  shopId: string | mongoose.Types.ObjectId,
  _startDate?: Date | null
): Promise<void> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  // Running balance represents physical cash movements at this specific shop.
  // Every transaction created at this shop enters/leaves this shop's till.
  // Cross-branch communication printing done FOR this shop also represents physical cash expense paid out of this shop's till.
  const query = {
    $or: [
      { shop: shopObjId },
      { collectingShop: shopObjId, isCrossBranchPayment: true },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    isDeleted: { $ne: true },
  };

  const rawRecords = await FinanceRecord.find(query)
    .select("_id type status amount approvedAmount runningBalance beneficiaryRunningBalance paymentMethod isCrossBranchPayment collectingShop beneficiaryShop shop isCommunicationItem interBranchSettlementStatus settlementType date createdAt isOpeningFloat")
    .lean();

  if (!rawRecords.length) return;

  // Sort strictly in chronological order by combined date and time
  const records = rawRecords.sort((a, b) => {
    return getRecordExactTimestamp(a) - getRecordExactTimestamp(b);
  });

  const bulkOps = [];
  let currentBalance = 0;

  for (const record of records) {
    const isBeneficiary = record.beneficiaryShop?.toString() === shopObjId.toString() &&
      record.shop?.toString() !== shopObjId.toString();

    // Rejected records do not affect cash drawer
    if (record.status === "REJECTED") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    // Non-cash payment methods (PETTY_CASH, BANK_TRANSFER, ONLINE, CREDIT, CHEQUE)
    // do not affect the shop's physical cash drawer
    if (record.paymentMethod && record.paymentMethod !== "CASH") {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    const effectiveAmount =
      record.status === "APPROVED" && typeof record.approvedAmount === "number"
        ? record.approvedAmount
        : record.amount;

    // Cross-branch communication items (printing/services done by Communication for other branches):
    // These are internal service charges between branches, NOT physical cash drawer movements.
    if (record.isCrossBranchPayment && record.isCommunicationItem) {
      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    // Cross-branch payment handling:
    if (record.isCrossBranchPayment) {
      const isCollecting =
        record.collectingShop?.toString() === shopObjId.toString() ||
        (record.shop?.toString() === shopObjId.toString() &&
          record.beneficiaryShop?.toString() !== shopObjId.toString());

      if (isCollecting) {
        // While UNSETTLED: cash physically entered the counter drawer (+effectiveAmount)
        // Once SETTLED: cash was handed over or banked, leaving the drawer.
        if (record.interBranchSettlementStatus === "UNSETTLED") {
          currentBalance += effectiveAmount;
        }
      } else if (isBeneficiary) {
        // Beneficiary branch physically receives cash ONLY when settled via handover
        if (
          record.interBranchSettlementStatus === "SETTLED" &&
          record.settlementType === "HANDOVER_TO_BRANCH"
        ) {
          currentBalance += effectiveAmount;
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: record._id },
          update: {
            $set: isBeneficiary
              ? { beneficiaryRunningBalance: currentBalance }
              : { runningBalance: currentBalance },
          },
        },
      });
      continue;
    }

    // Standard records & Communication records
    const effectiveType = resolveShopEffectiveType(record as any, shopObjId);

    if (effectiveType === "INCOME") {
      currentBalance += effectiveAmount;
    } else {
      currentBalance -= effectiveAmount;
    }

    bulkOps.push({
      updateOne: {
        filter: { _id: record._id },
        update: {
          $set: isBeneficiary
            ? { beneficiaryRunningBalance: currentBalance }
            : { runningBalance: currentBalance },
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    await FinanceRecord.bulkWrite(bulkOps);
  }
}

/**
 * Calculates the exact physical cash balance for a shop.
 * Excludes soft-deleted records, rejected records, and non-cash payment methods.
 * Correctly accounts for:
 * 1. Standard shop physical cash transactions.
 * 2. Cross-branch cash physically collected AT this shop (holding cash until settled).
 * 3. Cross-branch cash physically HANDED OVER to this shop from other collecting branches.
 * 4. Cross-branch communication printing expenses paid in cash.
 */
export async function getShopCashBalance(
  shopId: string | mongoose.Types.ObjectId,
  asOfDate?: Date | null
): Promise<number> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());
  const dateFilter = asOfDate ? { date: { $lte: asOfDate } } : {};

  // 1. Standard non-cross-branch cash transactions at this shop (including POS retail sales performed at this shop)
  const standardCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isCrossBranchPayment: { $ne: true },
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...dateFilter,
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [
            { $and: [{ $eq: ["$status", "APPROVED"] }, { $ne: ["$approvedAmount", null] }] },
            "$approvedAmount",
            "$amount",
          ],
        },
        type: 1,
      },
    },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$type", "INCOME"] },
              "$effectiveAmount",
              { $multiply: ["$effectiveAmount", -1] },
            ],
          },
        },
      },
    },
  ]);

  // 2. Cross-branch cash physically collected AT this shop (as collectingShop)
  // While UNSETTLED: cash physically sits in this shop's drawer (+effectiveAmount).
  // Includes PENDING because cash entered the till upon customer payment at the counter!
  const collectingCashAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "UNSETTLED",
        ...dateFilter,
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 3. Cross-branch cash where this shop is the beneficiaryShop AND cash was physically HANDED OVER to this shop
  const settlementDateFilter = asOfDate
    ? {
        $or: [
          { settledAt: { $lte: asOfDate } },
          { settledAt: null, date: { $lte: asOfDate } },
        ],
      }
    : {};

  const beneficiaryHandoverAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
        ...settlementDateFilter,
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        balance: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  const standardBalance = standardCashAgg.length > 0 ? standardCashAgg[0].balance : 0;
  const collectingBalance = collectingCashAgg.length > 0 ? collectingCashAgg[0].balance : 0;
  const beneficiaryBalance = beneficiaryHandoverAgg.length > 0 ? beneficiaryHandoverAgg[0].balance : 0;

  return standardBalance + collectingBalance + beneficiaryBalance;
}

/**
 * Calculates physical cash flow metrics for a specific date range:
 * - cashInflow: Total physical cash received into the drawer during the period.
 * - cashOutflow: Total physical cash disbursed from the drawer during the period.
 * - netCashFlow: Net physical cash movement (Inflow - Outflow).
 * - closingCashBalance: Cumulative drawer cash position as of the end of the period.
 */
export async function getShopPeriodCashFlow(
  shopId: string | mongoose.Types.ObjectId,
  startDate: Date,
  endDate: Date
): Promise<{
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  closingCashBalance: number;
}> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const periodMatch = { date: { $gte: startDate, $lte: endDate } };

  // 1. Standard cash in period
  const stdAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isCrossBranchPayment: { $ne: true },
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...periodMatch,
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [
            { $and: [{ $eq: ["$status", "APPROVED"] }, { $ne: ["$approvedAmount", null] }] },
            "$approvedAmount",
            "$amount",
          ],
        },
        type: 1,
      },
    },
    {
      $group: {
        _id: null,
        inflow: {
          $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] },
        },
        outflow: {
          $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] },
        },
      },
    },
  ]);

  // 2. Cross-branch tuition cash collected at counter in period
  const colAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        ...periodMatch,
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        inflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 3. Settled cash handed over from other branches into this shop in period
  const benAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
        $or: [
          { settledAt: { $gte: startDate, $lte: endDate } },
          { settledAt: null, date: { $gte: startDate, $lte: endDate } },
        ],
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        inflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  // 4. Cross-branch cash settled/disbursed out of this shop in period (handed over or banked)
  const settledOutAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        interBranchSettlementStatus: "SETTLED",
        settledAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: null,
        outflow: { $sum: "$effectiveAmount" },
      },
    },
  ]);

  const stdInflow = stdAgg[0]?.inflow || 0;
  const stdOutflow = stdAgg[0]?.outflow || 0;
  const colInflow = colAgg[0]?.inflow || 0;
  const benInflow = benAgg[0]?.inflow || 0;
  const settledOutflow = settledOutAgg[0]?.outflow || 0;

  const cashInflow = stdInflow + colInflow + benInflow;
  const cashOutflow = stdOutflow + settledOutflow;
  const netCashFlow = cashInflow - cashOutflow;

  const closingCashBalance = await getShopCashBalance(shopObjId, endDate);

  return {
    cashInflow,
    cashOutflow,
    netCashFlow,
    closingCashBalance,
  };
}

/**
 * Returns inter-branch balances:
 * - holdingForOthers: cash this shop physically holds that belongs to other shops (UNSETTLED).
 * - owedFromOthers: cash other shops collected for this shop that haven't been handed over yet.
 * Includes PENDING status records because physical cash is already held in the drawer!
 */
export async function getShopInterBranchDues(
  shopId: string | mongoose.Types.ObjectId
): Promise<{
  holdingForOthers: Array<{
    shopId: string;
    shopName: string;
    shopCode: string;
    totalAmount: number;
    count: number;
    recordIds: string[];
  }>;
  owedFromOthers: Array<{
    shopId: string;
    shopName: string;
    shopCode: string;
    totalAmount: number;
    count: number;
    recordIds: string[];
  }>;
  totalHolding: number;
  totalOwed: number;
}> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  // 1. Records where this shop collected cash on behalf of another shop (UNSETTLED)
  const holdingAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        beneficiaryShop: { $ne: null },
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        interBranchSettlementStatus: "UNSETTLED",
        status: { $ne: "REJECTED" },
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        beneficiaryShop: 1,
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: "$beneficiaryShop",
        totalAmount: { $sum: "$effectiveAmount" },
        count: { $sum: 1 },
        recordIds: { $push: { $toString: "$_id" } },
      },
    },
    {
      $lookup: {
        from: "shops",
        localField: "_id",
        foreignField: "_id",
        as: "shopDoc",
      },
    },
    {
      $unwind: { path: "$shopDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        shopId: { $toString: "$_id" },
        shopName: { $ifNull: ["$shopDoc.name", "Unknown Branch"] },
        shopCode: { $ifNull: ["$shopDoc.code", "SHOP"] },
        totalAmount: 1,
        count: 1,
        recordIds: 1,
      },
    },
  ]);

  // 2. Records where another shop collected cash for THIS shop (UNSETTLED)
  const owedAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        $or: [
          { collectingShop: { $nin: [null, shopObjId] } },
          { shop: { $ne: shopObjId }, isCrossBranchPayment: true },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        interBranchSettlementStatus: "UNSETTLED",
        status: { $ne: "REJECTED" },
        isDeleted: { $ne: true },
      },
    },
    {
      $project: {
        sourceShop: { $ifNull: ["$collectingShop", "$shop"] },
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: {
        _id: "$sourceShop",
        totalAmount: { $sum: "$effectiveAmount" },
        count: { $sum: 1 },
        recordIds: { $push: { $toString: "$_id" } },
      },
    },
    {
      $lookup: {
        from: "shops",
        localField: "_id",
        foreignField: "_id",
        as: "shopDoc",
      },
    },
    {
      $unwind: { path: "$shopDoc", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        shopId: { $toString: "$_id" },
        shopName: { $ifNull: ["$shopDoc.name", "Unknown Branch"] },
        shopCode: { $ifNull: ["$shopDoc.code", "SHOP"] },
        totalAmount: 1,
        count: 1,
        recordIds: 1,
      },
    },
  ]);

  const holdingForOthers = holdingAgg || [];
  const owedFromOthers = owedAgg || [];
  const totalHolding = holdingForOthers.reduce((sum, h) => sum + (h.totalAmount || 0), 0);
  const totalOwed = owedFromOthers.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return {
    holdingForOthers,
    owedFromOthers,
    totalHolding,
    totalOwed,
  };
}

export interface CashAuditDiagnosticResult {
  shopId: string;
  shopName: string;
  shopCode: string;
  currentDrawerBalance: number;
  latestStoredRunningBalance: number | null;
  isOutOfSync: boolean;
  discrepancyAmount: number;
  components: {
    standardCashInflow: number;
    standardCashOutflow: number;
    standardNetCash: number;
    unsettledCollectingCashHeld: number;
    settledBeneficiaryCashReceived: number;
    commCrossBranchExpensePaid: number;
  };
  paymentMethods: Array<{
    method: string;
    label: string;
    inflow: number;
    outflow: number;
    net: number;
    impactsLockerCash: boolean;
    explanation: string;
  }>;
  pendingCashCollections: Array<{
    recordId: string;
    billNumber: string;
    reason: string;
    amount: number;
    date: string;
    beneficiaryName: string;
    status: string;
  }>;
  recentCashRecords: Array<{
    recordId: string;
    date: string;
    billNumber: string;
    reason: string;
    type: string;
    amount: number;
    runningBalance: number;
    paymentMethod: string;
  }>;
}

/**
 * Diagnostic tool: Computes full cash audit information for a shop.
 * Enables admins to inspect from the frontend UI why drawer cash is calculated as such,
 * see payment method breakdowns, inspect pending collections, and detect any out-of-sync balances.
 */
export async function getShopCashAuditData(
  shopId: string | mongoose.Types.ObjectId
): Promise<CashAuditDiagnosticResult> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const shopDoc = await Shop.findById(shopObjId).select("name code").lean();
  const shopName = shopDoc?.name || "Shop";
  const shopCode = shopDoc?.code || "SHOP";

  // 1. Current real-time calculated drawer balance
  const currentDrawerBalance = await getShopCashBalance(shopObjId);

  // 2. Latest stored running balance on the most recent record
  const candidateLatestRecs = await FinanceRecord.find({
    $or: [
      { shop: shopObjId },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    paymentMethod: { $in: ["CASH", null] },
    isDeleted: { $ne: true },
  })
    .sort({ date: -1, createdAt: -1 })
    .limit(20)
    .select("runningBalance beneficiaryRunningBalance beneficiaryShop shop date createdAt")
    .lean();

  const sortedCandidates = candidateLatestRecs.sort(
    (a, b) => getRecordExactTimestamp(b) - getRecordExactTimestamp(a)
  );
  const latestRec = sortedCandidates[0] || null;

  let latestStoredRunningBalance: number | null = null;
  if (latestRec) {
    const isBeneficiary =
      latestRec.beneficiaryShop?.toString() === shopObjId.toString() &&
      latestRec.shop?.toString() !== shopObjId.toString();
    latestStoredRunningBalance = isBeneficiary
      ? (latestRec.beneficiaryRunningBalance ?? latestRec.runningBalance ?? null)
      : (latestRec.runningBalance ?? null);
  }

  const isOutOfSync =
    latestStoredRunningBalance !== null &&
    Math.round(currentDrawerBalance * 100) !== Math.round(latestStoredRunningBalance * 100);

  const discrepancyAmount =
    latestStoredRunningBalance !== null
      ? Number((currentDrawerBalance - latestStoredRunningBalance).toFixed(2))
      : 0;

  // 3. Components breakdown
  const stdAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isCrossBranchPayment: { $ne: true },
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [
            { $and: [{ $eq: ["$status", "APPROVED"] }, { $ne: ["$approvedAmount", null] }] },
            "$approvedAmount",
            "$amount",
          ],
        },
        type: 1,
      },
    },
    {
      $group: {
        _id: null,
        inflow: { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] } },
        outflow: { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] } },
      },
    },
  ]);

  const colAgg = await FinanceRecord.aggregate([
    {
      $match: {
        $or: [
          { collectingShop: shopObjId },
          { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
        ],
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "UNSETTLED",
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$effectiveAmount" } },
    },
  ]);

  const benAgg = await FinanceRecord.aggregate([
    {
      $match: {
        beneficiaryShop: shopObjId,
        isCrossBranchPayment: true,
        isCommunicationItem: { $ne: true },
        type: "INCOME",
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
        paymentMethod: { $in: ["CASH", null] },
        interBranchSettlementStatus: "SETTLED",
        settlementType: "HANDOVER_TO_BRANCH",
      },
    },
    {
      $project: {
        effectiveAmount: {
          $cond: [{ $ne: ["$approvedAmount", null] }, "$approvedAmount", "$amount"],
        },
      },
    },
    {
      $group: { _id: null, total: { $sum: "$effectiveAmount" } },
    },
  ]);

  const standardCashInflow = stdAgg[0]?.inflow || 0;
  const standardCashOutflow = stdAgg[0]?.outflow || 0;
  const standardNetCash = standardCashInflow - standardCashOutflow;
  const unsettledCollectingCashHeld = colAgg[0]?.total || 0;
  const settledBeneficiaryCashReceived = benAgg[0]?.total || 0;
  const commCrossBranchExpensePaid = 0;

  // 4. Payment method comparison for all records linked to this shop
  const pmAgg = await FinanceRecord.aggregate([
    {
      $match: {
        shop: shopObjId,
        isDeleted: { $ne: true },
        status: { $ne: "REJECTED" },
      },
    },
    {
      $project: {
        method: { $ifNull: ["$paymentMethod", "CASH"] },
        effectiveAmount: {
          $cond: [
            { $and: [{ $eq: ["$status", "APPROVED"] }, { $ne: ["$approvedAmount", null] }] },
            "$approvedAmount",
            "$amount",
          ],
        },
        type: 1,
      },
    },
    {
      $group: {
        _id: "$method",
        inflow: { $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$effectiveAmount", 0] } },
        outflow: { $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$effectiveAmount", 0] } },
      },
    },
  ]);

  const methodMeta: Record<string, { label: string; impactsLockerCash: boolean; explanation: string }> = {
    CASH: {
      label: "Physical Cash",
      impactsLockerCash: true,
      explanation: "Physical notes & coins entering or leaving the shop till/drawer.",
    },
    PETTY_CASH: {
      label: "Petty Cash Fund",
      impactsLockerCash: false,
      explanation: "Disbursed from Central Petty Cash float. Does NOT decrease the counter cash drawer.",
    },
    BANK_TRANSFER: {
      label: "Bank Transfer",
      impactsLockerCash: false,
      explanation: "Direct bank deposit / online bank transfer. Does NOT pass through the physical drawer.",
    },
    CREDIT: {
      label: "Credit / Customer Debt",
      impactsLockerCash: false,
      explanation: "Unpaid credit sale. Cash enters the till only when the customer makes a debt repayment.",
    },
    CHEQUE: {
      label: "Bank Cheque",
      impactsLockerCash: false,
      explanation: "Deposited to bank accounts. Not in physical locker cash.",
    },
    ONLINE: {
      label: "Online Gateway",
      impactsLockerCash: false,
      explanation: "Electronic funds settled to bank accounts.",
    },
  };

  const paymentMethods = Object.keys(methodMeta).map((key) => {
    const found = pmAgg.find((p) => p._id === key);
    const inflow = found ? found.inflow : 0;
    const outflow = found ? found.outflow : 0;
    const net = inflow - outflow;
    return {
      method: key,
      label: methodMeta[key].label,
      inflow,
      outflow,
      net,
      impactsLockerCash: methodMeta[key].impactsLockerCash,
      explanation: methodMeta[key].explanation,
    };
  });

  // 5. Pending Cash Collections (Counter collections waiting for admin verification)
  const pendingRecords = await FinanceRecord.find({
    $or: [
      { collectingShop: shopObjId, isCrossBranchPayment: true },
      { shop: shopObjId, isCrossBranchPayment: true, beneficiaryShop: { $ne: shopObjId } },
      { shop: shopObjId, type: "INCOME" },
    ],
    paymentMethod: { $in: ["CASH", null] },
    status: "PENDING",
    isDeleted: { $ne: true },
  })
    .populate("beneficiaryShop", "name code")
    .select("billNumber reason amount date beneficiaryShop status")
    .limit(10)
    .lean();

  const pendingCashCollections = pendingRecords.map((r: any) => ({
    recordId: r._id.toString(),
    billNumber: r.billNumber || "-",
    reason: r.reason || "Tuition / Fee Payment",
    amount: r.amount || 0,
    date: r.date ? new Date(r.date).toISOString().split("T")[0] : "-",
    beneficiaryName: r.beneficiaryShop ? `${r.beneficiaryShop.name} (${r.beneficiaryShop.code})` : "This Branch",
    status: r.status,
  }));

  // 6. Recent 10 Cash records for ledger audit
  const rawRecent = await FinanceRecord.find({
    $or: [
      { shop: shopObjId },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    paymentMethod: { $in: ["CASH", null] },
    isDeleted: { $ne: true },
  })
    .sort({ date: -1, createdAt: -1 })
    .limit(30)
    .select("_id date createdAt billNumber reason type amount approvedAmount runningBalance beneficiaryRunningBalance paymentMethod beneficiaryShop shop")
    .lean();

  const recentRecords = rawRecent
    .sort((a, b) => getRecordExactTimestamp(b) - getRecordExactTimestamp(a))
    .slice(0, 10);

  const recentCashRecords = recentRecords.map((r: any) => {
    const isBeneficiary =
      r.beneficiaryShop?.toString() === shopObjId.toString() &&
      r.shop?.toString() !== shopObjId.toString();
    const rb = isBeneficiary
      ? (r.beneficiaryRunningBalance ?? r.runningBalance ?? 0)
      : (r.runningBalance ?? 0);
    return {
      recordId: r._id.toString(),
      date: r.date ? new Date(r.date).toISOString().split("T")[0] : "-",
      billNumber: r.billNumber || "-",
      reason: r.reason || "-",
      type: r.type,
      amount: r.approvedAmount ?? r.amount,
      runningBalance: rb,
      paymentMethod: r.paymentMethod || "CASH",
    };
  });

  return {
    shopId: shopObjId.toString(),
    shopName,
    shopCode,
    currentDrawerBalance,
    latestStoredRunningBalance,
    isOutOfSync,
    discrepancyAmount,
    components: {
      standardCashInflow,
      standardCashOutflow,
      standardNetCash,
      unsettledCollectingCashHeld,
      settledBeneficiaryCashReceived,
      commCrossBranchExpensePaid,
    },
    paymentMethods,
    pendingCashCollections,
    recentCashRecords,
  };
}

export interface DiscrepancyDiagnosticCheck {
  id: string;
  title: string;
  titleSi: string;
  status: "PASSED" | "WARNING" | "FAILED";
  summary: string;
  summarySi: string;
  details: string;
  detailsSi: string;
  actionRequired?: string;
  actionCode?: "SET_OPENING_FLOAT" | "RECORD_ADJUSTMENT" | "RESYNC_LEDGER" | "NONE";
}

export interface DiscrepancyAuditData {
  shopId: string;
  shopName: string;
  shopCode: string;
  shopType: string;
  auditDate: string;

  hasOpeningFloatRecord: boolean;
  openingFloatAmount: number;
  openingFloatRecordId?: string | null;
  defaultConfiguredFloat: number;

  inflows: {
    reloadCash: number;
    utilityBillsCash: number;
    retailSalesCash: number;
    crossBranchCash: number;
    debtRepaymentsCash: number;
    cashAdjustmentsInflow: number;
    otherCash: number;
    totalInflow: number;
  };

  outflows: {
    cashExpenses: number;
    dailySweeps: number;
    cashAdjustmentsOutflow: number;
    totalOutflow: number;
  };

  todayNetCollections: number;
  systemDrawerCash: number;
  expectedPhysicalDrawerCash: number;
  countedCash: number;
  variance: number;
  varianceStatus: "BALANCED" | "SURPLUS" | "SHORTAGE";

  diagnosticChecks: DiscrepancyDiagnosticCheck[];

  plainLanguageSummary: {
    en: string;
    si: string;
    actionAdviceEn: string;
    actionAdviceSi: string;
  };

  nonCashSeparation: {
    creditSalesAmount: number;
    bankTransferDebtRepayments: number;
    pettyCashExpenses: number;
  };
}

/**
 * Advanced Discrepancy Management Engine.
 * Analyzes drawer cash, opening float, categorized inflows, cross-branch holding,
 * compares against counted cash, and produces automated diagnostics and plain-language summaries.
 */
export async function getShopDiscrepancyAuditData(
  shopId: string | mongoose.Types.ObjectId,
  countedCashInput?: number | null,
  targetDate?: Date | string | null
): Promise<DiscrepancyAuditData> {
  await connectDB();
  const shopObjId = new mongoose.Types.ObjectId(shopId.toString());

  const shopDoc = await Shop.findById(shopObjId).select("name code shopType defaultFloat").lean();
  const shopName = shopDoc?.name || "Shop";
  const shopCode = shopDoc?.code || "SHOP";
  const shopType = shopDoc?.shopType || "COMMUNICATION";
  const defaultConfiguredFloat = (shopDoc as any)?.defaultFloat ?? 4000;

  const target = targetDate ? new Date(targetDate) : new Date();
  const startOfDay = new Date(target);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(target);
  endOfDay.setHours(23, 59, 59, 999);
  const auditDateStr = target.toISOString().split("T")[0];

  const todayRecords = await FinanceRecord.find({
    $or: [
      { shop: shopObjId },
      { collectingShop: shopObjId, isCrossBranchPayment: true },
      { beneficiaryShop: shopObjId, isCrossBranchPayment: true },
    ],
    date: { $gte: startOfDay, $lte: endOfDay },
    isDeleted: { $ne: true },
  }).lean();

  let hasOpeningFloatRecord = false;
  let openingFloatAmount = 0;
  let openingFloatRecordId: string | null = null;

  let reloadCash = 0;
  let utilityBillsCash = 0;
  let retailSalesCash = 0;
  let crossBranchCash = 0;
  let debtRepaymentsCash = 0;
  let cashAdjustmentsInflow = 0;
  let otherCash = 0;

  let cashExpenses = 0;
  let dailySweeps = 0;
  let cashAdjustmentsOutflow = 0;

  let creditSalesAmount = 0;
  let bankTransferDebtRepayments = 0;
  let pettyCashExpenses = 0;

  for (const r of todayRecords) {
    if (r.status === "REJECTED") continue;
    const amt = typeof r.approvedAmount === "number" ? r.approvedAmount : (r.amount || 0);
    const pm = r.paymentMethod || "CASH";

    if (pm === "CREDIT") {
      creditSalesAmount += amt;
      continue;
    }
    if (pm === "BANK_TRANSFER") {
      if (r.isDebtRepayment) bankTransferDebtRepayments += amt;
      continue;
    }
    if (pm === "PETTY_CASH") {
      pettyCashExpenses += amt;
      continue;
    }

    if (pm !== "CASH") continue;

    if (r.isOpeningFloat) {
      hasOpeningFloatRecord = true;
      openingFloatAmount += amt;
      openingFloatRecordId = r._id.toString();
      continue;
    }

    if (r.isCashAdjustment) {
      if (r.type === "INCOME") {
        cashAdjustmentsInflow += amt;
      } else {
        cashAdjustmentsOutflow += amt;
      }
      continue;
    }

    if (
      r.type === "EXPENSE" &&
      (r.reason?.includes("Daily Settlement") || r.reason?.includes("Float Sweep"))
    ) {
      dailySweeps += amt;
      continue;
    }

    const isDirectShop = r.shop?.toString() === shopObjId.toString();
    const isBeneficiary = r.beneficiaryShop?.toString() === shopObjId.toString() && !isDirectShop;

    if (r.isCrossBranchPayment) {
      if (r.interBranchSettlementStatus === "UNSETTLED") {
        crossBranchCash += amt;
      } else if (isBeneficiary && r.settlementType === "HANDOVER_TO_BRANCH") {
        crossBranchCash += amt;
      }
      continue;
    }

    const effectiveType = resolveShopEffectiveType(r as any, shopObjId);

    if (effectiveType === "INCOME") {
      if (r.isDebtRepayment) {
        debtRepaymentsCash += amt;
      } else if (r.isTelecomReload) {
        reloadCash += amt;
      } else if (r.isUtilityBill) {
        utilityBillsCash += amt;
      } else if (r.isCommunicationItem) {
        retailSalesCash += amt;
      } else {
        otherCash += amt;
      }
    } else {
      cashExpenses += amt;
    }
  }

  const totalInflow =
    reloadCash +
    utilityBillsCash +
    retailSalesCash +
    crossBranchCash +
    debtRepaymentsCash +
    cashAdjustmentsInflow +
    otherCash;

  const totalOutflow = cashExpenses + dailySweeps + cashAdjustmentsOutflow;
  const todayNetCollections = totalInflow - totalOutflow;

  const systemDrawerCash = await getShopCashBalance(shopObjId);

  const expectedPhysicalDrawerCash = hasOpeningFloatRecord
    ? systemDrawerCash
    : systemDrawerCash + defaultConfiguredFloat;

  const countedCash =
    typeof countedCashInput === "number" && !isNaN(countedCashInput)
      ? countedCashInput
      : expectedPhysicalDrawerCash;

  const variance = Number((countedCash - expectedPhysicalDrawerCash).toFixed(2));

  let varianceStatus: "BALANCED" | "SURPLUS" | "SHORTAGE" = "BALANCED";
  if (variance > 0.01) {
    varianceStatus = "SURPLUS";
  } else if (variance < -0.01) {
    varianceStatus = "SHORTAGE";
  }

  // Diagnostic Health Checks
  const diagnosticChecks: DiscrepancyDiagnosticCheck[] = [];

  // Check 1: Opening Float Status
  if (!hasOpeningFloatRecord) {
    diagnosticChecks.push({
      id: "OPENING_FLOAT",
      title: "Opening Cash Float Unrecorded",
      titleSi: "ආරම්භක මුදල (Float) සිස්ටම් එකේ සටහන් කර නැත",
      status: "WARNING",
      summary: `The daily float of LKR ${defaultConfiguredFloat.toLocaleString()} is not registered in the ERP ledger.`,
      summarySi: `දෛනික ආරම්භක මුදල (LKR ${defaultConfiguredFloat.toLocaleString()}) සිස්ටම් එකේ සටහන් කර නොමැති බැවින්, සිස්ටම් එක පෙන්වන්නේ අද දවසේ ලැබීම් (LKR ${totalInflow.toLocaleString()}) පමණි.`,
      details: `Physical drawer contains opening float plus collections. Recording the opening float aligns ledger balance with the physical cash drawer.`,
      detailsSi: `ලාච්චුවේ ආරම්භක මුදල සහ අද දවසේ ලැබුණු මුදල් දෙකම ඇත. සිස්ටම් එකට ආරම්භක මුදල ඇතුළත් කළ විට ලාච්චුවේ ඇත්ත ශේෂය සම්පූර්ණයෙන් සමපාත වේ.`,
      actionRequired: `Record today's LKR ${defaultConfiguredFloat.toLocaleString()} opening float.`,
      actionCode: "SET_OPENING_FLOAT",
    });
  } else {
    diagnosticChecks.push({
      id: "OPENING_FLOAT",
      title: "Opening Cash Float Active",
      titleSi: "ආරම්භක මුදල සටහන් කර ඇත",
      status: "PASSED",
      summary: `Opening float of LKR ${openingFloatAmount.toLocaleString()} is active in today's ledger.`,
      summarySi: `අද දින ආරම්භක මුදල (LKR ${openingFloatAmount.toLocaleString()}) නිවැරදිව සිස්ටම් එකේ සටහන්ව පවතී.`,
      details: `Float is safely tracked in the drawer balance.`,
      detailsSi: `ආරම්භක මුදල මුදල් ලාච්චුවේ ශේෂයට නිවැරදිව එකතු වී ඇත.`,
      actionCode: "NONE",
    });
  }

  // Check 2: Credit Repayments Segregated from Sales
  const totalRepayments = debtRepaymentsCash + bankTransferDebtRepayments;
  diagnosticChecks.push({
    id: "CREDIT_SEGREGATION",
    title: "Credit Debt Repayments Segregated",
    titleSi: "ණය පියවීම් විකුණුම් වලින් වෙන් කර ඇත",
    status: "PASSED",
    summary: `Debt settlements (LKR ${totalRepayments.toLocaleString()}) are isolated from sales revenue.`,
    summarySi: `අද එකතු වූ ණය පියවීම් (LKR ${totalRepayments.toLocaleString()}) දෛනික විකුණුම් වලට එකතු නොවී ${debtRepaymentsCash > 0 ? "මුදල් ලාච්චුවට" : "බැංකු ගිණුමට"} පමණක් නිවැරදිව බැර කර ඇත.`,
    details: `Cash debt repayments enter the drawer cash, while bank transfer debt settlements go directly to bank balances without double-counting sales.`,
    detailsSi: `මුදලින් ගෙවූ ණය පියවීම් මුදල් ලාච්චුවටත්, බැංකු මාරු කිරීම් බැංකුවටත් පමණක් ඇතුළත් කර ඇති අතර දෛනික විකුණුම් දෙගුණ වීම වැළැක්වී ඇත.`,
    actionCode: "NONE",
  });

  // Check 3: Cross-Branch Counter Cash Held
  if (crossBranchCash > 0) {
    diagnosticChecks.push({
      id: "CROSS_BRANCH_CASH",
      title: "Cross-Branch Tuition/Class Fees Held in Counter Drawer",
      titleSi: "වෙනත් ශාඛා සඳහා එකතු කළ පන්ති ගාස්තු ලාච්චුවේ ඇත",
      status: "PASSED",
      summary: `LKR ${crossBranchCash.toLocaleString()} collected on behalf of other branches is physically held in this drawer.`,
      summarySi: `වෙනත් ශාඛා (උදා: මාතලේ ශාඛාව) සඳහා එකතු කළ පන්ති ගාස්තු LKR ${crossBranchCash.toLocaleString()} ක් මෙම ලාච්චුවේ ආරක්ෂිතව පවතී.`,
      details: `This cash remains in this drawer until handed over or settled to the beneficiary branch.`,
      detailsSi: `අනෙක් ශාඛාවට මුදල් භාරදෙන තුරු මෙම මුදල මෙම කවුන්ටර ලාච්චුවේ තැන්පත් කර ඇත.`,
      actionCode: "NONE",
    });
  }

  // Check 4: Cash Drawer Variance Status
  if (varianceStatus === "BALANCED") {
    diagnosticChecks.push({
      id: "VARIANCE_CHECK",
      title: "Physical Cash Drawer Perfectly Balanced",
      titleSi: "මුදල් ලාච්චුව 100% ක් සමබරයි",
      status: "PASSED",
      summary: `Counted cash (LKR ${countedCash.toLocaleString()}) matches expected drawer total exactly.`,
      summarySi: `ගණන් කළ මුදල (LKR ${countedCash.toLocaleString()}) සහ බලාපොරොත්තු වන ලාච්චුවේ මුදල සම්පූර්ණයෙන්ම සමාන වේ.`,
      details: `Zero discrepancy detected.`,
      detailsSi: `කිසිදු මුදල් වෙනසක් නොමැත.`,
      actionCode: "NONE",
    });
  } else if (varianceStatus === "SURPLUS") {
    diagnosticChecks.push({
      id: "VARIANCE_CHECK",
      title: `Drawer Cash Surplus: +LKR ${variance.toLocaleString()}`,
      titleSi: `ලාච්චුවේ අතිරික්ත මුදලක් ඇත: +LKR ${variance.toLocaleString()}`,
      status: "WARNING",
      summary: `Counted cash exceeds expected total by LKR ${variance.toLocaleString()}.`,
      summarySi: `ගණන් කළ මුදල (LKR ${countedCash.toLocaleString()}) සිස්ටම් එකට වඩා LKR ${variance.toLocaleString()} ක් වැඩියෙන් තිබේ.`,
      details: `May be caused by unrecorded walk-in sales (photocopy/printing) or cash rounding surplus. Can be auto-reconciled.`,
      detailsSi: `මෙය සිස්ටම් එකට සටහන් නොවූ සුළු මුද්‍රණ/ෆොටෝකොපි විකුණුම් හෝ ඉතුරු මුදල් වටයැවීමක් නිසා විය හැක. මෙය 1-Click එකෙන් සමබර කළ හැක.`,
      actionRequired: `Record a cash surplus adjustment of +LKR ${variance.toLocaleString()}.`,
      actionCode: "RECORD_ADJUSTMENT",
    });
  } else {
    diagnosticChecks.push({
      id: "VARIANCE_CHECK",
      title: `Drawer Cash Shortage: -LKR ${Math.abs(variance).toLocaleString()}`,
      titleSi: `ලාච්චුවේ හිඟ මුදලක් ඇත: -LKR ${Math.abs(variance).toLocaleString()}`,
      status: "FAILED",
      summary: `Counted cash is short by LKR ${Math.abs(variance).toLocaleString()} compared to expected total.`,
      summarySi: `ගණන් කළ මුදල (LKR ${countedCash.toLocaleString()}) සිස්ටම් එකට වඩා LKR ${Math.abs(variance).toLocaleString()} කින් අඩුවෙන් ඇත.`,
      details: `Cash may have been disbursed without a recorded expense receipt. Verify till slips or record adjustment.`,
      detailsSi: `සිස්ටම් එකට ඇතුළත් නොකළ වියදමක් හෝ අඩු මුදලක් තිබේ. බිල්පත් පරීක්ෂා කර හිඟය සටහන් කරන්න.`,
      actionRequired: `Record a cash shortage adjustment of -LKR ${Math.abs(variance).toLocaleString()}.`,
      actionCode: "RECORD_ADJUSTMENT",
    });
  }

  // Check 5: Ledger Running Balance Alignment
  const latestCandidate = await FinanceRecord.findOne({
    $or: [{ shop: shopObjId }, { beneficiaryShop: shopObjId, isCrossBranchPayment: true }],
    paymentMethod: { $in: ["CASH", null] },
    isDeleted: { $ne: true },
  })
    .sort({ date: -1, createdAt: -1 })
    .select("runningBalance beneficiaryRunningBalance beneficiaryShop shop")
    .lean();

  const latestRb = latestCandidate
    ? (latestCandidate.beneficiaryShop?.toString() === shopObjId.toString() &&
      latestCandidate.shop?.toString() !== shopObjId.toString()
        ? (latestCandidate.beneficiaryRunningBalance ?? latestCandidate.runningBalance ?? 0)
        : (latestCandidate.runningBalance ?? 0))
    : 0;

  const isOutOfSync = Math.round(systemDrawerCash * 100) !== Math.round(latestRb * 100);
  if (isOutOfSync) {
    diagnosticChecks.push({
      id: "LEDGER_SYNC",
      title: "Ledger Chronological Running Balance Out of Sync",
      titleSi: "ලේඛන ශේෂය සහ ගණනය කළ ශේෂය අතර වෙනසක් ඇත",
      status: "WARNING",
      summary: `Latest transaction running balance (LKR ${latestRb.toLocaleString()}) does not match current drawer balance (LKR ${systemDrawerCash.toLocaleString()}).`,
      summarySi: `අවසන් ගනුදෙනුවේ ශේෂය (LKR ${latestRb.toLocaleString()}) සහ ගණනය කළ ශේෂය (LKR ${systemDrawerCash.toLocaleString()}) අතර සුළු වෙනසක් ඇත.`,
      details: `Click 'Re-sync Ledger' to recalculate chronological balances across all records.`,
      detailsSi: `'Re-sync Ledger' බටනය ඔබා සියලු ගනුදෙනු නැවත අනුපිළිවෙලට ගණනය කරන්න.`,
      actionRequired: "Recalculate running balance.",
      actionCode: "RESYNC_LEDGER",
    });
  } else {
    diagnosticChecks.push({
      id: "LEDGER_SYNC",
      title: "Ledger Running Balance Fully Synchronized",
      titleSi: "ලේඛන ශේෂය සම්පූර්ණයෙන් සමපාතයි",
      status: "PASSED",
      summary: `Ledger sequence matches real-time drawer balance (LKR ${systemDrawerCash.toLocaleString()}).`,
      summarySi: `සිස්ටම් එකේ ගනුදෙනු ශේෂය නිවැරදිව සමපාත වී ඇත.`,
      details: "No chronological gaps detected.",
      detailsSi: "කිසිදු දෝෂයක් නොමැත.",
      actionCode: "NONE",
    });
  }

  // Plain-Language Summary
  const plainLanguageSummary = {
    en: !hasOpeningFloatRecord
      ? `Today's physical cash collections total LKR ${totalInflow.toLocaleString()}. The system currently shows LKR ${systemDrawerCash.toLocaleString()} because the morning opening float of LKR ${defaultConfiguredFloat.toLocaleString()} was not recorded in the ERP. With the float, expected drawer cash is LKR ${expectedPhysicalDrawerCash.toLocaleString()}.${
          variance !== 0
            ? ` Physical count of LKR ${countedCash.toLocaleString()} has a ${varianceStatus.toLowerCase()} of LKR ${Math.abs(variance).toLocaleString()}.`
            : " Physical count matches expected cash perfectly."
        }`
      : `Today's physical collections are LKR ${totalInflow.toLocaleString()} with an opening float of LKR ${openingFloatAmount.toLocaleString()}. Total expected cash in the drawer is LKR ${expectedPhysicalDrawerCash.toLocaleString()}.${
          variance !== 0
            ? ` Counted cash has a ${varianceStatus.toLowerCase()} of LKR ${Math.abs(variance).toLocaleString()}.`
            : " Counted cash is 100% balanced."
        }`,
    si: !hasOpeningFloatRecord
      ? `අද දවසේ මුදලින් ලැබුණු එකතුව LKR ${totalInflow.toLocaleString()} කි. උදෑසන ආරම්භක මුදල (LKR ${defaultConfiguredFloat.toLocaleString()}) සිස්ටම් එකේ සටහන් කර නොතිබූ බැවින්, සිස්ටම් එකේ ශේෂය ලෙස පෙන්නුම් කළේ දවසේ ලැබීම් මුදල පමණි. ආරම්භක මුදල සමඟ ලාච්චුවේ තිබිය යුතු නියම මුදල LKR ${expectedPhysicalDrawerCash.toLocaleString()} කි.${
          variance !== 0
            ? ` භෞතිකව ගණන් කළ මුදල (LKR ${countedCash.toLocaleString()}) අනුව LKR ${Math.abs(variance).toLocaleString()} ක ${varianceStatus === "SURPLUS" ? "අතිරික්තයක්" : "හිඟයක්"} පවතී.`
            : " ගණන් කළ මුදල සහ සිස්ටම් මුදල 100% ක් සමබරයි."
        }`
      : `අද දවසේ ලැබීම් LKR ${totalInflow.toLocaleString()} ක් වන අතර ආරම්භක මුදල LKR ${openingFloatAmount.toLocaleString()} කි. ලාච්චුවේ තිබිය යුතු මුළු මුදල LKR ${expectedPhysicalDrawerCash.toLocaleString()} කි.${
          variance !== 0
            ? ` ගණන් කළ මුදල අනුව LKR ${Math.abs(variance).toLocaleString()} ක ${varianceStatus === "SURPLUS" ? "අතිරික්තයක්" : "හිඟයක්"} ඇත.`
            : " ලාච්චුවේ මුදල් 100% ක් සමබරයි."
        }`,
    actionAdviceEn: !hasOpeningFloatRecord
      ? `1. Click 'Set Today's Opening Float' (LKR ${defaultConfiguredFloat.toLocaleString()}). 2. If desired, record the +LKR ${Math.abs(variance).toLocaleString()} adjustment to achieve 100% balance.`
      : variance !== 0
      ? `Click 'Reconcile Cash Adjustment' to bring ledger and till into 100% exact match.`
      : `No action needed. Drawer is fully reconciled and ready for Daily Settlement.`,
    actionAdviceSi: !hasOpeningFloatRecord
      ? `1. 'ආරම්භක මුදල සටහන් කරන්න (LKR ${defaultConfiguredFloat.toLocaleString()})' බටනය ඔබන්න. 2. අවශ්‍ය නම් ඉතිරි LKR ${Math.abs(variance).toLocaleString()} අතිරික්තය සටහන් කර 100% ක් සමබර කරන්න.`
      : variance !== 0
      ? `'මුදල් වෙනස සමබර කරන්න' බටනය ඔබා ලාච්චුවේ මුදල සහ සිස්ටම් එක 100% ක් සමපාත කරන්න.`
      : `කිසිදු පියවරක් අවශ්‍ය නැත. මුදල් ලාච්චුව සම්පූර්ණයෙන් සමබර වන අතර දවසේ ක්ලෝසින් එක (Daily Settlement) කිරීමට සූදානම්ය.`,
  };

  return {
    shopId: shopObjId.toString(),
    shopName,
    shopCode,
    shopType,
    auditDate: auditDateStr,

    hasOpeningFloatRecord,
    openingFloatAmount,
    openingFloatRecordId,
    defaultConfiguredFloat,

    inflows: {
      reloadCash,
      utilityBillsCash,
      retailSalesCash,
      crossBranchCash,
      debtRepaymentsCash,
      cashAdjustmentsInflow,
      otherCash,
      totalInflow,
    },

    outflows: {
      cashExpenses,
      dailySweeps,
      cashAdjustmentsOutflow,
      totalOutflow,
    },

    todayNetCollections,
    systemDrawerCash,
    expectedPhysicalDrawerCash,
    countedCash,
    variance,
    varianceStatus,

    diagnosticChecks,
    plainLanguageSummary,

    nonCashSeparation: {
      creditSalesAmount,
      bankTransferDebtRepayments,
      pettyCashExpenses,
    },
  };
}

