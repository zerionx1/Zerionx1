export interface AuthSecurityEvent { type:'login'|'logout'|'mfa'|'blocked'|'session-rotated'; userId?:string; ipHash?:string; occurredAt:string; metadata:Readonly<Record<string,unknown>> }
