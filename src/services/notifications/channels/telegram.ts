import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverTelegram(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("telegram"))return {messageId:message.id,channel:"telegram",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"telegram",status:"queued",attempt:1};
}
