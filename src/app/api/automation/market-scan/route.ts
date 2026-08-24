import { runZerionScan } from "@/lib/agents/orchestrator";
import { persistScanOpportunities } from "@/lib/agents/opportunity-store";
import { resolveScanUniverse } from "@/lib/agents/scan-universe";
import { dispatchOpportunityNotifications } from "@/lib/notifications/opportunity-dispatch";
import { fail, ok } from "@/lib/security/api-response";
function allowed(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`)}
export async function GET(request:Request){
  if(!allowed(request))return fail("UNAUTHORIZED","Cron authorization required",401);
  try{
    const symbols=await resolveScanUniverse();
    const scan=await runZerionScan(symbols);
    const persisted=await persistScanOpportunities(scan);
    const delivery=await dispatchOpportunityNotifications(persisted);
    return ok({...scan,scannedSymbols:symbols.length,qualifiedCount:scan.candidates.filter(c=>c.direction!=="neutral"&&c.confidence>=70&&Number(c.tradePlan?.qualityScore??0)>=74&&Number(c.tradePlan?.riskReward??0)>=3).length,persistedCount:persisted.length,delivery,executionPolicy:"user-approval-required",scanCadenceSeconds:30,signalPolicy:"continuous-bidirectional-multi-opportunity-lifecycle"});
  }catch(error){return fail("MARKET_SCAN_FAILED",error instanceof Error?error.message:"Market scan failed",500)}
}
