export interface ChangeRequest{ id:string; actorId:string; area:string; summary:string; before:unknown; after:unknown; status:"pending"|"approved"|"rejected"|"applied"; createdAt:string }
const queue:ChangeRequest[]=[];
export function createChangeRequest(input:Omit<ChangeRequest,"id"|"status"|"createdAt">):ChangeRequest{const item={...input,id:crypto.randomUUID(),status:"pending" as const,createdAt:new Date().toISOString()};queue.unshift(item);return item}
export function listChangeRequests(){return queue}
