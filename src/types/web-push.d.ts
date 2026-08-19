declare module "web-push" {
  export type PushSubscription = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  export function setVapidDetails(subject:string,publicKey:string,privateKey:string):void;
  export function sendNotification(
    subscription:PushSubscription,
    payload?:string|Buffer,
    options?:{TTL?:number;urgency?:"very-low"|"low"|"normal"|"high";topic?:string}
  ):Promise<{statusCode:number}>;
  const api:{setVapidDetails:typeof setVapidDetails;sendNotification:typeof sendNotification};
  export default api;
}
