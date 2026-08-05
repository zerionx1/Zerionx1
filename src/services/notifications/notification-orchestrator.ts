import type { NotificationMessage } from "@/types/notifications-v2";
import { shouldDeliverNotification } from "./deduplication-service";
export async function queueNotification(message:NotificationMessage){if(!shouldDeliverNotification(`${message.userId}:${message.templateId}`))return {accepted:false,reason:"duplicate-suppressed"};return {accepted:true,messageId:message.id,channels:message.channels};}
