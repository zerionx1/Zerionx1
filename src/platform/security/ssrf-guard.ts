const blocked=['localhost','127.0.0.1','0.0.0.0','::1','169.254.169.254'];
export function assertSafeOutboundUrl(value:string,allowHosts:readonly string[]):URL{const url=new URL(value);if(url.protocol!=='https:')throw new Error('HTTPS required');if(blocked.includes(url.hostname)||!allowHosts.includes(url.hostname))throw new Error('Outbound host blocked');return url}
