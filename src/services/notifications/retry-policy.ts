export function notificationRetryDelay(attempt:number){return Math.min(300_000,1000*2**Math.max(0,attempt-1));}export function canRetryNotification(attempt:number){return attempt<5;}
