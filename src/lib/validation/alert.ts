import { z } from "zod";
export const priceAlertSchema=z.object({symbol:z.string().min(1).max(30),operator:z.enum(["above","below","crosses-above","crosses-below"]),threshold:z.coerce.number().positive(),channels:z.array(z.enum(["in-app","email","push"])).min(1)});
