import { z } from "zod";
export const positionSizingSchema=z.object({equity:z.number().positive(),riskPct:z.number().positive().max(5),entryPrice:z.number().positive(),stopPrice:z.number().positive(),contractMultiplier:z.number().positive().optional(),maxPositionPct:z.number().positive().max(100).optional()});
