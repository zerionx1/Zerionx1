import "server-only";
import { adminInsert, adminRest, adminSelect } from "@/lib/supabase/admin-rest";
import type { ZerionScanResult } from "./types";
import { getSignalValidationSummary, registerSignalOutcome, resolveOpenSignalOutcomes, validationAllowsPublishing } from "./signal-validation";

const norm=(v:unknown)=>String(v??"").trim().toUpperCase().replaceAll("/","").replaceAll("-","").replaceAll(" ","");
function inferMarket(symbol:string){const s=symbol.toUpperCase();if(s.includes("USDT")||s.includes("USDC"))return"crypto";if(s.includes("XAU")||s.includes("XAG")||/^(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)[/-]?(EUR|GBP|USD|JPY|AUD|NZD|CAD|CHF)$/.test(s.replaceAll(" ","")))return"forex";return"india"}
function qualifies(c:ZerionScanResult["candidates"][number]){return c.direction!=="neutral"&&c.confidence>=70&&c.tradePlan.qualityScore>=74&&Boolean(c.tradePlan.entry)&&Boolean(c.tradePlan.stopLoss)&&c.tradePlan.targets.length>=1&&Number(c.tradePlan.riskReward)>=3}

export async function persistScanOpportunities(result:ZerionScanResult){
  await resolveOpenSignalOutcomes().catch(()=>{});
  const validation=await getSignalValidationSummary().catch(()=>({sampleSize:0,wins:0,losses:0,expired:0,winRate:null,calibrated:false,minimumSample:20,minimumObservedWinRate:70}));
  if(!validationAllowsPublishing(validation))return[];
  const candidates=result.candidates.filter(qualifies);
  const active=await adminSelect("agent_opportunities","status=eq.active&select=*&limit=500").catch(()=>[]);
  const currentBySymbol=new Map(result.candidates.map(c=>[norm(c.symbol),c]));

  // Existing opportunity stays alive while the current scan still validates the same direction.
  for(const row of active){
    const current=currentBySymbol.get(norm(row.symbol));
    if(!current||!qualifies(current)||String(row.direction)!==current.direction){
      await adminRest(`agent_opportunities?id=eq.${encodeURIComponent(String(row.id))}`,{method:"PATCH",body:JSON.stringify({status:"expired",updated_at:new Date().toISOString()})}).catch(()=>{});
    }
  }

  const saved:Record<string,unknown>[]=[];
  for(const c of candidates){
    const existing=active.find(row=>norm(row.symbol)===norm(c.symbol)&&String(row.direction)===c.direction&&String(row.status)==="active");
    const generatedAt=new Date(result.scannedAt);
    const expiresAt=new Date(generatedAt.getTime()+Math.max(180,c.tradePlan.validityMinutes)*60000).toISOString();
    const analysis={stages:result.stages,tradePlan:c.tradePlan,validation,antiOvertrading:{sameOpportunityRevalidated:true,multipleQualifiedSymbols:true,scanCadenceSeconds:30,minimumConfidence:70,minimumQualityScore:74,minimumRiskReward:3}};
    if(existing?.id){
      const rows = await adminRest<Record<string, unknown>[]>(
        `agent_opportunities?id=eq.${encodeURIComponent(String(existing.id))}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            price: c.price,
            confidence: c.confidence,
            reason: c.reason,
            source: c.source,
            mode: result.mode,
            analysis,
            generated_at: result.scannedAt,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          }),
        },
      ).catch(() => []);
      saved.push(rows?.[0]??existing);
      continue;
    }
    const row={fingerprint:`${norm(c.symbol)}:${c.direction}:${Date.parse(result.scannedAt)}`,symbol:c.symbol,market:inferMarket(c.symbol),price:c.price,direction:c.direction,confidence:c.confidence,reason:c.reason,source:c.source,mode:result.mode,analysis,status:"active",requires_user_approval:true,generated_at:result.scannedAt,expires_at:expiresAt};
    const inserted=await adminInsert<Record<string,unknown>>("agent_opportunities",[row]);const item=inserted[0];if(!item)continue;saved.push(item);
    if(item.id&&c.tradePlan.side!=="none")await registerSignalOutcome({opportunityId:String(item.id),symbol:c.symbol,side:c.tradePlan.side,entry:Number(c.tradePlan.entry),stopLoss:Number(c.tradePlan.stopLoss),target:Number(c.tradePlan.targets[0]),confidence:c.confidence,qualityScore:c.tradePlan.qualityScore,generatedAt:result.scannedAt,expiresAt}).catch(()=>{});
  }
  return saved;
}
