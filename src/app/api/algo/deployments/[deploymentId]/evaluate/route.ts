import { fail,ok } from "@/lib/security/api-response";
import { currentUser,select,update } from "@/lib/supabase/rest";
import { getUserStrategy } from "@/lib/strategy/strategy-repository";
import { getProviderHistoricalCandles } from "@/lib/market/provider-historical-candles";
import { evaluateStrategyDefinition } from "@/lib/strategy/runtime-evaluator";
import { enforceRiskControls,getRiskControls } from "@/lib/risk/trading-risk-controls";
import { emitUserNotification } from "@/lib/notifications/notification-events";
export async function POST(_:Request,{params}:{params:Promise<{deploymentId:string}>}){
 const user=await currentUser(),{deploymentId}=await params;const d=(await select("algo_deployments",`owner_id=eq.${user.id}&id=eq.${encodeURIComponent(deploymentId)}&limit=1`))[0];
 if(!d)return fail("NOT_FOUND","Deployment not found",404);if(d.status!=="active")return ok({skipped:true,reason:`Deployment is ${String(d.status)}`});
 try{
  const strategy=await getUserStrategy(String(d.strategy_id));if(!strategy)throw new Error("Installed strategy record is missing");
  const candles=await getProviderHistoricalCandles({symbol:String(d.symbol),timeframe:strategy.timeframe,limit:250});const evaluation=evaluateStrategyDefinition(strategy,candles),controls=await getRiskControls(d.mode==="live"?"live":"paper"),decision=enforceRiskControls(controls,{dailyPnl:0,openPositions:0,totalExposure:0,tradesToday:0});
  const action=!decision.allowed?`blocked: ${decision.reason}`:evaluation.signal==="flat"?"no-action":d.mode==="live"?"live-proposal-ready":controls.autoPaperExecution?"paper-execution-permitted":"paper-signal-ready",now=new Date().toISOString();
  const rows=await update<Record<string,unknown>>("algo_deployments",`owner_id=eq.${user.id}&id=eq.${encodeURIComponent(deploymentId)}`,{last_evaluation_at:now,last_signal:evaluation.signal,last_action:action,runtime_health:"running",runtime_error:null,last_price:evaluation.price,evaluation_count:Number(d.evaluation_count??0)+1,updated_at:now});
  if(evaluation.signal!=="flat"){
    await emitUserNotification({kind:"strategy-signal",title:`${String(d.name)} · ${evaluation.signal.toUpperCase()} signal`,body:`${String(d.symbol)} @ ${evaluation.price.toLocaleString()} · ${evaluation.reason} · ${action}`,priority:"high",eventKey:`strategy-${deploymentId}-${evaluation.signal}-${Math.floor(Date.now()/60000)}`,actionUrl:`/dashboard/charts?symbol=${encodeURIComponent(String(d.symbol))}&strategy=${encodeURIComponent(String(d.strategy_id))}`,data:{deploymentId,signal:evaluation.signal,action,price:evaluation.price}});
  }
  return ok({deployment:rows[0],evaluation,action,risk:decision});
 }catch(error){
  const message=error instanceof Error?error.message:"Strategy evaluation failed";await update("algo_deployments",`owner_id=eq.${user.id}&id=eq.${encodeURIComponent(deploymentId)}`,{runtime_health:"error",runtime_error:message,last_evaluation_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  await emitUserNotification({kind:"system-warning",title:`Strategy runtime error`,body:message,priority:"high",eventKey:`strategy-error-${deploymentId}-${Math.floor(Date.now()/300000)}`,actionUrl:"/dashboard/strategies"});
  return fail("STRATEGY_RUNTIME_ERROR",message,502);
 }
}
