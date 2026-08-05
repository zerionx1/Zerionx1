import { paperTradingPolicy } from "@/config/paper-trading";
import type { MarketQuote } from "@/types/market";
import type { PaperAccount, PaperOrder } from "@/types/paper-trading";
export interface PlacePaperOrderInput { account:PaperAccount; quote:MarketQuote; order:PaperOrder; }
export interface PaperExecutionResult { accepted:boolean; order:PaperOrder; fees:number; reason?:string; }
export function executePaperOrder({account,quote,order}:PlacePaperOrderInput):PaperExecutionResult{
 const notional=order.quantity*quote.price; const max=account.equity*(paperTradingPolicy.maxOrderNotionalPercent/100);
 if(order.quantity<=0)return{accepted:false,order:{...order,status:"rejected",rejectionReason:"Quantity must be positive"},fees:0,reason:"invalid_quantity"};
 if(notional>max)return{accepted:false,order:{...order,status:"rejected",rejectionReason:"Order exceeds paper risk limit"},fees:0,reason:"risk_limit"};
 if(order.side==="buy"&&notional>account.buyingPower)return{accepted:false,order:{...order,status:"rejected",rejectionReason:"Insufficient paper buying power"},fees:0,reason:"buying_power"};
 const slip=quote.price*(paperTradingPolicy.slippageBasisPoints/10000)*(order.side==="buy"?1:-1); const fill=quote.price+slip; const fees=fill*order.quantity*(paperTradingPolicy.commissionBasisPoints/10000);
 return{accepted:true,fees,order:{...order,status:"filled",filledQuantity:order.quantity,averageFillPrice:fill,updatedAt:new Date().toISOString()}};
}
