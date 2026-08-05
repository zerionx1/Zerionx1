import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface LiveOrderRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface LiveOrderRepository { get(id:string):Promise<LiveOrderRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<LiveOrderRecord>>; save(record:LiveOrderRecord):Promise<LiveOrderRecord>; }
