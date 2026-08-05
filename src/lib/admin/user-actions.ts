import type{UserStatus}from"@/types/admin-os";
export interface UserActionInput{userId:string;status:UserStatus;reason:string;actorId:string}
export function validateUserAction(i:UserActionInput){if(!i.reason.trim())throw new Error("Reason is required for auditable user changes");return{...i,changedAt:new Date().toISOString()}}
