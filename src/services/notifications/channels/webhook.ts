import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverWebhook(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("webhook"))return {messageId:message.id,channel:"webhook",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"webhook",status:"queued",attempt:1};
}
