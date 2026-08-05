import type{Entitlement}from"@/types/billing";
export function hasEntitlement(items:Entitlement[],key:string,market?:string){return items.some(x=>x.featureKey===key&&(!market||!x.market||x.market===market)&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now()))}
