import { z } from "zod";

export const paperOrderSchema = z
  .object({
    symbol: z.string().min(1).max(30),

    market: z.enum([
      "indian-equity",
      "indian-index",
      "indian-futures",
      "indian-options",
      "crypto",
      "forex",
    ]),

    side: z.enum(["buy", "sell"]),

    type: z.enum([
      "market",
      "limit",
      "stop",
      "stop-limit",
    ]),

    quantity: z.coerce
      .number()
      .positive()
      .max(1_000_000),

    limitPrice: z.coerce
      .number()
      .positive()
      .optional(),

    stopPrice: z.coerce
      .number()
      .positive()
      .optional(),

    stopLoss: z.coerce
      .number()
      .positive()
      .optional(),

    targetPrice: z.coerce
      .number()
      .positive()
      .optional(),

    maxLoss: z.coerce
      .number()
      .positive()
      .optional(),

    maxProfit: z.coerce
      .number()
      .positive()
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      (value.type === "limit" || value.type === "stop-limit") &&
      !value.limitPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Limit price is required",
        path: ["limitPrice"],
      });
    }

    if (
      (value.type === "stop" || value.type === "stop-limit") &&
      !value.stopPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Trigger price is required",
        path: ["stopPrice"],
      });
    }

    if (
      value.stopLoss !== undefined &&
      value.targetPrice !== undefined &&
      value.stopLoss === value.targetPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Stop loss and target cannot be the same price",
        path: ["targetPrice"],
      });
    }
  });

export type PaperOrderInput = z.infer<typeof paperOrderSchema>;
