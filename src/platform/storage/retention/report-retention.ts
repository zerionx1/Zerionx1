export const REPORTRETENTION_DAYS=90;
export function report_retention_expires(createdAt:string):string{return new Date(new Date(createdAt).getTime()+REPORTRETENTION_DAYS*86_400_000).toISOString()}
