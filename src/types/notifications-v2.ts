export type NotificationChannel="in-app"|"email"|"push"|"telegram"|"webhook"|"sms";
export interface NotificationMessage { id:string; userId:string; templateId:string; channels:NotificationChannel[]; variables:Record<string,string|number>; priority:"low"|"normal"|"high"|"critical"; createdAt:string; }
export interface DeliveryReceipt { messageId:string; channel:NotificationChannel; status:"queued"|"sent"|"delivered"|"failed"|"suppressed"; attempt:number; providerMessageId?:string; errorCode?:string; }
