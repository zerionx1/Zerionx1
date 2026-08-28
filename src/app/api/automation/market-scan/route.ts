import { runZerionScan } from "@/lib/agents/orchestrator";
import { persistDevelopingSetups } from "@/lib/agents/developing-store";
import { persistScanOpportunities } from "@/lib/agents/opportunity-store";
import { resolveScanUniverse } from "@/lib/agents/scan-universe";
import { dispatchOpportunityNotifications } from "@/lib/notifications/opportunity-dispatch";
import { fail, ok } from "@/lib/security/api-response";

function allowed(request:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&request.headers.get("authorization")===`Bearer ${secret}`)}
async function run(request:Request){
  if(!allowed(request))return fail("UNAUTHORIZED","Cron authorization required",401);
  try{
    const symbols=await resolveScanUniverse();
    const scan=await runZerionScan(symbols);
    const [persisted,developing]=await Promise.all([persistScanOpportunities(scan),persistDevelopingSetups(scan)]);
    const delivery=await dispatchOpportunityNotifications(persisted);
    return ok({...scan,scannedSymbols:symbols.length,quotesReceived:scan.candidates.length,qualifiedCount:scan.candidates.filter(c=>c.direction!=="neutral"&&c.confidence>=70&&Number(c.tradePlan?.qualityScore??0)>=74&&Number(c.tradePlan?.riskReward??0)>=3).length,developingCount:developing.length,persistedCount:persisted.length,delivery,executionPolicy:"user-approval-required",scanCadenceSeconds:30,signalPolicy:"qualified-plus-developing-multi-market-lifecycle"});
  }catch(error){return fail("MARKET_SCAN_FAILED",error instanceof Error?error.message:"Market scan failed",500)}
}
export const GET=run;
export const POST=run;
