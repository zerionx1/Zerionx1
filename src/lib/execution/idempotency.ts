import {createHash} from "node:crypto"; export const createIdempotencyKey=(parts:Record<string,unknown>)=>createHash("sha256").update(JSON.stringify(parts)).digest("hex");
