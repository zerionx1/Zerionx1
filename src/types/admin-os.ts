export type AdminRole="founder"|"super_admin"|"risk_admin"|"support_admin"|"finance_admin"|"content_admin"|"analyst";
export type UserStatus="active"|"suspended"|"restricted"|"pending_review";
export interface AdminUserRecord{ id:string; name:string; email:string; role:AdminRole; status:UserStatus; planId:string; markets:string[]; lastSeenAt:string; riskFlags:string[] }
export interface SubscriptionPlanRecord{ id:string; name:string; monthlyPriceInr:number; markets:string[]; featureKeys:string[]; limits:Record<string,number>; active:boolean }
export interface PlatformMetric{ key:string; label:string; value:number|string; change?:number; health:"healthy"|"warning"|"critical" }
export interface SupportTicket{ id:string; userId:string; subject:string; status:"open"|"pending"|"resolved"; priority:"low"|"medium"|"high"|"urgent"; createdAt:string }
export interface AdminActivity{ id:string; actorId:string; action:string; resource:string; resourceId?:string; createdAt:string; metadata:Record<string,unknown> }
