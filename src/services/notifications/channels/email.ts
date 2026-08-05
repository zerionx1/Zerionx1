import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverEmail(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("email"))return {messageId:message.id,channel:"email",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"email",status:"queued",attempt:1};
}
