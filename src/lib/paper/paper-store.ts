import type { PaperAccount, PaperOrder, PaperPosition } from "@/types/paper-trading";
import { currentUser, insert, select, update } from "@/lib/supabase/rest";

type Row=Record<string,unknown>;
const n=(v:unknown)=>Number(v??0);
function accountFrom(r:Row):PaperAccount{return {id:String(r.id),userId:String(r.owner_id),name:String(r.name),currency:String(r.currency),startingBalance:n(r.starting_balance),cashBalance:n(r.cash_balance),equity:n(r.equity),buyingPower:n(r.buying_power),dailyPnl:n(r.daily_pnl),totalPnl:n(r.total_pnl),createdAt:String(r.created_at),resetAt:r.reset_at?String(r.reset_at):undefined};}
function positionFrom(r:Row):PaperPosition{return {id:String(r.id),accountId:String(r.account_id),symbol:String(r.symbol),market:r.market as PaperPosition["market"],quantity:n(r.quantity),averagePrice:n(r.average_price),markPrice:n(r.mark_price),unrealizedPnl:n(r.unrealized_pnl),realizedPnl:n(r.realized_pnl),openedAt:String(r.opened_at)};}

export const paperStore={
 async getAccount(){const user=await currentUser();let rows=await select("paper_accounts",`owner_id=eq.${user.id}&limit=1`);if(!rows[0])rows=await insert<Row>("paper_accounts",{owner_id:user.id});return accountFrom(rows[0]!);},
 async listOrders(){const user=await currentUser();const rows=await select("paper_orders",`owner_id=eq.${user.id}&order=created_at.desc`);return rows.map(r=>r.order_data as PaperOrder);},
 async listPositions(){const user=await currentUser();const rows=await select("paper_positions",`owner_id=eq.${user.id}&order=opened_at.desc`);return rows.map(positionFrom);},
 async addOrder(order:PaperOrder){const user=await currentUser();await insert("paper_orders",{id:order.id,owner_id:user.id,account_id:order.accountId,client_order_id:order.clientOrderId,status:order.status,order_data:order,created_at:order.createdAt,updated_at:order.updatedAt});return order;},
 async applyFill(order:PaperOrder,fillPrice:number){
   const user=await currentUser();const account=await this.getAccount();const signed=order.side==="buy"?order.filledQuantity:-order.filledQuantity;
   const rows=await select("paper_positions",`owner_id=eq.${user.id}&account_id=eq.${account.id}&symbol=eq.${encodeURIComponent(order.symbol)}&market=eq.${order.market}&limit=1`);
   const existing=rows[0];const oldQty=existing?n(existing.quantity):0;const oldAvg=existing?n(existing.average_price):0;const newQty=oldQty+signed;
   const averagePrice=newQty===0?0:(Math.sign(oldQty)===Math.sign(signed)||oldQty===0)?((Math.abs(oldQty)*oldAvg+Math.abs(signed)*fillPrice)/Math.abs(newQty)):oldAvg;
   if(existing){await update("paper_positions",`id=eq.${existing.id}`,{quantity:newQty,average_price:averagePrice,mark_price:fillPrice,unrealized_pnl:0,updated_at:new Date().toISOString()});}
   else{await insert("paper_positions",{owner_id:user.id,account_id:account.id,symbol:order.symbol,market:order.market,quantity:newQty,average_price:averagePrice,mark_price:fillPrice,unrealized_pnl:0,realized_pnl:0});}
   const cashDelta=order.side==="buy"?-(fillPrice*order.filledQuantity):(fillPrice*order.filledQuantity);const cash=account.cashBalance+cashDelta;
   await update("paper_accounts",`id=eq.${account.id}`,{cash_balance:cash,buying_power:cash,equity:cash,updated_at:new Date().toISOString()});
  }
,
 async closePosition(positionId:string){
   const user=await currentUser();const account=await this.getAccount();
   const rows=await select("paper_positions",`owner_id=eq.${user.id}&id=eq.${encodeURIComponent(positionId)}&limit=1`);
   const row=rows[0];if(!row)throw new Error("Paper position not found");
   const position=positionFrom(row);if(!position.quantity)throw new Error("Paper position is already closed");
   const fillPrice=position.markPrice||position.averagePrice;
   const realizedDelta=(fillPrice-position.averagePrice)*position.quantity;
   const realizedPnl=position.realizedPnl+realizedDelta;
   const cash=account.cashBalance+(fillPrice*position.quantity);
   await update("paper_positions",`id=eq.${position.id}`,{quantity:0,mark_price:fillPrice,unrealized_pnl:0,realized_pnl:realizedPnl,updated_at:new Date().toISOString()});
   await update("paper_accounts",`id=eq.${account.id}`,{cash_balance:cash,buying_power:cash,equity:cash,daily_pnl:account.dailyPnl+realizedDelta,total_pnl:account.totalPnl+realizedDelta,updated_at:new Date().toISOString()});
   return {...position,quantity:0,markPrice:fillPrice,unrealizedPnl:0,realizedPnl,exitPrice:fillPrice,realizedDelta};
 }

};
