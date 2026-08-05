import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface StrategyRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface StrategyRepository { get(id:string):Promise<StrategyRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<StrategyRecord>>; save(record:StrategyRecord):Promise<StrategyRecord>; }
