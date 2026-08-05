import { verifyRequestSignature } from '../request-signature';
export function validateMarketWebhook(body:string,timestamp:string,signature:string,secret:string):boolean{return verifyRequestSignature(body,timestamp,signature,secret)}
