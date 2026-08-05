export type BrokerKind = "india" | "crypto" | "forex";
export type BrokerConnectionStatus = "disconnected" | "pending" | "connected" | "degraded" | "revoked";
export interface BrokerCapability { marketData: boolean; orders: boolean; positions: boolean; funds: boolean; websocket: boolean; }
export interface BrokerConnection { id:string; userId:string; brokerKey:string; displayName:string; kind:BrokerKind; status:BrokerConnectionStatus; accountReference:string; capabilities:BrokerCapability; connectedAt?:string; lastSyncAt?:string; }
export interface BrokerAdapterDescriptor { key:string; name:string; kind:BrokerKind; authMode:"oauth"|"api-key"|"session"; supportsSandbox:boolean; capabilities:BrokerCapability; }
