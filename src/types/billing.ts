export interface BillingCustomer{ id:string; userId:string; providerCustomerId?:string; status:"active"|"past_due"|"cancelled"|"trial" }
export interface InvoiceRecord{ id:string; userId:string; planId:string; amountInr:number; status:"draft"|"open"|"paid"|"failed"|"refunded"; issuedAt:string }
export interface Entitlement{ userId:string; featureKey:string; market?:string; limit?:number; expiresAt?:string }
