import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface PaperOrderRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface PaperOrderRepository { get(id:string):Promise<PaperOrderRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<PaperOrderRecord>>; save(record:PaperOrderRecord):Promise<PaperOrderRecord>; }
