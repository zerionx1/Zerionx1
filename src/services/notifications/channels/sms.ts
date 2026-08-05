import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverSms(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("sms"))return {messageId:message.id,channel:"sms",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"sms",status:"queued",attempt:1};
}
