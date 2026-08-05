export interface AdminEscalationInput { count:number; windowMs:number; trusted:boolean }
export function detectAdminEscalation(input:AdminEscalationInput):boolean{return !input.trusted&&input.count>5&&input.windowMs<300000}
