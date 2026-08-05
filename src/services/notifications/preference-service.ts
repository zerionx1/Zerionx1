import type { NotificationChannel } from "@/types/notifications-v2";
export interface NotificationPreference { userId:string; channel:NotificationChannel; enabled:boolean; quietHours?:{start:string;end:string;timezone:string}; }
export function isDeliveryAllowed(preference:NotificationPreference){return preference.enabled;}
