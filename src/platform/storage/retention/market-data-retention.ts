export const MARKETDATARETENTION_DAYS=30;
export function market_data_retention_expires(createdAt:string):string{return new Date(new Date(createdAt).getTime()+MARKETDATARETENTION_DAYS*86_400_000).toISOString()}
