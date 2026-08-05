export type ReconciliationState="matched"|"missing-local"|"missing-broker"|"quantity-mismatch"|"status-mismatch";
export interface ReconciliationItem { id:string; connectionId:string; localOrderId?:string; brokerOrderId?:string; state:ReconciliationState; details:string; detectedAt:string; resolvedAt?:string; }
