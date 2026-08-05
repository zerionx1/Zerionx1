import type { PageRequest, PageResult, PersistedRecord } from '../types';
export interface SubscriptionRecord extends PersistedRecord { tenantId:string; status:string; payload:Readonly<Record<string,unknown>> }
export interface SubscriptionRepository { get(id:string):Promise<SubscriptionRecord|null>; list(tenantId:string,page:PageRequest):Promise<PageResult<SubscriptionRecord>>; save(record:SubscriptionRecord):Promise<SubscriptionRecord>; }
