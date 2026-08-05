import { paperStore } from "@/lib/paper/paper-store";import { ok } from "@/lib/security/api-response";
export async function GET(){return ok(await paperStore.getAccount())}
