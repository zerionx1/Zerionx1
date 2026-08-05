import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface IncidentRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface IncidentRepository { get(id:string):Promise<IncidentRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<IncidentRecord>>; save(record:IncidentRecord):Promise<IncidentRecord>; }
