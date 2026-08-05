import { z } from 'zod';
export const postgresConfigSchema=z.object({url:z.string().url(),poolMin:z.coerce.number().int().min(0).default(1),poolMax:z.coerce.number().int().min(1).default(10),ssl:z.coerce.boolean().default(true)});
export type PostgresConfig=z.infer<typeof postgresConfigSchema>;
