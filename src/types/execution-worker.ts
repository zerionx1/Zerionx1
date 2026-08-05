export type WorkerJobType="submit-order"|"cancel-order"|"sync-orders"|"sync-positions"|"reconcile";
export interface ExecutionJob { id:string; type:WorkerJobType; connectionId:string; intentId?:string; attempts:number; maxAttempts:number; runAfter:string; lockedAt?:string; completedAt?:string; lastError?:string; }
