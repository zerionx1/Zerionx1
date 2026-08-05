export function requiresMfa(roles:readonly string[],operation?:string):boolean{return roles.some(r=>['founder','risk_admin','finance_admin'].includes(r))||operation==='live-order-approval'}
