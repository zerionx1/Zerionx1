export interface AuthContext { userId:string; tenantId:string; sessionId:string; roles:readonly string[]; issuedAt:number; expiresAt:number }
export function isAuthenticated(context:AuthContext|undefined):context is AuthContext{return Boolean(context&&context.expiresAt>Date.now())}
