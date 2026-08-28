import { paperOrderSchema } from "@/lib/validation/paper-order";
import { paperStore } from "@/lib/paper/paper-store";
import { quoteStore } from "@/lib/market/quote-store";
import { executePaperOrder } from "@/lib/paper/paper-engine";
import { createClientOrderId } from "@/lib/paper/order-id";
import { fail, ok } from "@/lib/security/api-response";
import type { PaperOrder } from "@/types/paper-trading";
import { enforceRiskControls, getRiskControls } from "@/lib/risk/trading-risk-controls";
import { emitUserNotification } from "@/lib/notifications/notification-events";

export async function GET(){return ok(await paperStore.listOrders())}

export async function POST(request:Request){
 const parsed=paperOrderSchema.safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return fail("VALIDATION_ERROR","Invalid paper order",400,parsed.error.flatten());
 const account=await paperStore.getAccount(),positions=await paperStore.listPositions(),orders=await paperStore.listOrders();
 const quote=await quoteStore.get(parsed.data.instrumentId??parsed.data.symbol);
 if(!quote)return fail("QUOTE_UNAVAILABLE",`No live quote configured for ${parsed.data.symbol}`,409);
 const controls=await getRiskControls("paper"),today=new Date().toISOString().slice(0,10);
 const exposure=positions.reduce((s,p)=>s+Math.abs(p.quantity*p.markPrice),0);
 const stopLoss=parsed.data.stopLoss??(controls.defaultStopLossPct?quote.price*(1-controls.defaultStopLossPct/100):undefined);
 const risk=enforceRiskControls(controls,{dailyPnl:account.dailyPnl,openPositions:positions.filter(p=>p.quantity!==0).length,totalExposure:exposure,tradesToday:orders.filter(o=>o.createdAt.startsWith(today)).length,proposedExposure:Number(parsed.data.quantity)*quote.price,proposedMaxLoss:stopLoss?Math.abs(quote.price-stopLoss)*Number(parsed.data.quantity):undefined});
 if(!risk.allowed){
   await emitUserNotification({kind:"paper-order-rejected",title:`${parsed.data.symbol} paper order blocked`,body:risk.reason??"Risk controls blocked the paper order",priority:"high",eventKey:`paper-risk-${crypto.randomUUID()}`,actionUrl:"/dashboard/risk"});
   return fail("RISK_LIMIT_BLOCKED",risk.reason??"Paper risk limit blocked order",422);
 }
 const now=new Date().toISOString();
 const order:PaperOrder={id:crypto.randomUUID(),accountId:account.id,...parsed.data,stopLoss,targetPrice:parsed.data.targetPrice??(controls.defaultTakeProfitPct?quote.price*(1+controls.defaultTakeProfitPct/100):undefined),filledQuantity:0,status:"pending",createdAt:now,updatedAt:now,clientOrderId:createClientOrderId()};
 const result=executePaperOrder({account,quote,order});await paperStore.addOrder(result.order);
 if(result.accepted&&result.order.averageFillPrice)await paperStore.applyFill(result.order,result.order.averageFillPrice);
 await emitUserNotification({
   kind:result.accepted?"paper-order-filled":"paper-order-rejected",
   title:`${parsed.data.symbol} paper order ${result.accepted?"filled":"rejected"}`,
   body:result.accepted?`${parsed.data.side.toUpperCase()} ${parsed.data.quantity} @ ${Number(result.order.averageFillPrice??quote.price).toLocaleString()}`:(result.reason??"Paper order rejected"),
   priority:result.accepted?"normal":"high",
   eventKey:`paper-order-${result.order.id}-${result.order.status}`,
   actionUrl:result.accepted?"/dashboard/paper/positions":"/dashboard/paper/history",
   data:{orderId:result.order.id,symbol:parsed.data.symbol,status:result.order.status}
 });
 return result.accepted?ok(result,201):fail("ORDER_REJECTED",result.reason??"Paper order rejected",422,result.order);
}
