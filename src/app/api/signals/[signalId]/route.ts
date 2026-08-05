import { signalStore } from "@/lib/signals/signal-store";import { fail,ok } from "@/lib/security/api-response";
export async function GET(_:Request,{params}:{params:Promise<{signalId:string}>}){const {signalId}=await params;const signal=await signalStore.get(signalId);return signal?ok(signal):fail("NOT_FOUND","Signal not found",404)}
