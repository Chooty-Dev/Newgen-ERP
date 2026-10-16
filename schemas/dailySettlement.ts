import { z } from "zod";

export const recordDailySettlementSchema = z.object({
  shopId: z.string().min(1, "Shop ID is required"),
  date: z.string().min(1, "Settlement date is required"),
  totalCashBefore: z.number().min(0, "Total cash must be 0 or greater"),
  retainedFloat: z.number().min(0, "Retained float must be 0 or greater").default(4000),
  transferAmount: z.number().positive("Transfer amount must be greater than 0"),
  destinationType: z.enum(["PETTY_CASH", "BANK_ACCOUNT", "PHYSICAL_HANDOVER"], {
    error: "Destination must be PETTY_CASH, BANK_ACCOUNT, or PHYSICAL_HANDOVER",
  }),
  bankAccountId: z.string().optional().nullable(),
  reference: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export type RecordDailySettlementInput = z.infer<typeof recordDailySettlementSchema>;
