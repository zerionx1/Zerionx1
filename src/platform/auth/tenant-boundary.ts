import { AuthorizationError } from './auth-errors';
export function assertTenantBoundary(contextTenantId:string,resourceTenantId:string):void{if(contextTenantId!==resourceTenantId)throw new AuthorizationError('Cross-tenant access blocked')}
