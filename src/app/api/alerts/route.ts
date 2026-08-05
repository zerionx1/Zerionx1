import { alertStore } from "@/lib/alerts/alert-store";import { ok } from "@/lib/security/api-response";
export async function GET(){return ok(await alertStore.list())}
