export const AUDITRETENTION_DAYS=365;
export function audit_retention_expires(createdAt:string):string{return new Date(new Date(createdAt).getTime()+AUDITRETENTION_DAYS*86_400_000).toISOString()}
