export interface Job<T=unknown>{id:string;type:string;payload:T;attempt:number;maxAttempts:number;createdAt:string;runAfter:string;idempotencyKey:string}
export interface JobResult{jobId:string;status:'completed'|'retry'|'dead-letter';message?:string}
