export type NetworkStatus='online'|'offline'|'degraded';
export async function detectNetworkStatus():Promise<NetworkStatus>{if(typeof navigator!=='undefined'&&!navigator.onLine)return'offline';try{const response=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(3000)});return response.ok?'online':'degraded';}catch{return'degraded';}}
