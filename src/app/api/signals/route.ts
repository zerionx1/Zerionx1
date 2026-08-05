import { signalStore } from "@/lib/signals/signal-store";import { ok } from "@/lib/security/api-response";
export async function GET(){return ok(await signalStore.list(), 200)}
