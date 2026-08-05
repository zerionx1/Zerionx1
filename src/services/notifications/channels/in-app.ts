import type { DeliveryReceipt, NotificationMessage } from "@/types/notifications-v2";
export async function deliverInApp(message:NotificationMessage):Promise<DeliveryReceipt>{
 if(!message.channels.includes("in-app"))return {messageId:message.id,channel:"in-app",status:"suppressed",attempt:0};
 return {messageId:message.id,channel:"in-app",status:"queued",attempt:1};
}
