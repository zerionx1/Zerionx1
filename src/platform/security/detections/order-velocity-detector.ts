export interface OrderVelocityInput { count:number; windowMs:number; trusted:boolean }
export function detectOrderVelocity(input:OrderVelocityInput):boolean{return !input.trusted&&input.count>5&&input.windowMs<300000}
