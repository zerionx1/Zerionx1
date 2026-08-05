import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface PortfolioRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface PortfolioRepository { get(id:string):Promise<PortfolioRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<PortfolioRecord>>; save(record:PortfolioRecord):Promise<PortfolioRecord>; }
