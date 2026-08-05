import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface MarketEventRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface MarketEventRepository { get(id:string):Promise<MarketEventRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<MarketEventRecord>>; save(record:MarketEventRecord):Promise<MarketEventRecord>; }
