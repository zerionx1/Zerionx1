import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverPush(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("push"))return {messageId:message.id,channel:"push",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"push",status:"queued",attempt:1};
}
