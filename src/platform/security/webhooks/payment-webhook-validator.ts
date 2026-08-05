import { verifyRequestSignature } from '../request-signature';
export function validatePaymentWebhook(body:string,timestamp:string,signature:string,secret:string):boolean{return verifyRequestSignature(body,timestamp,signature,secret)}
