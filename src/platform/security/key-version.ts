export interface KeyVersion{version:string;createdAt:string;status:'active'|'decrypt-only'|'retired'}
export function selectActiveKey(keys:readonly KeyVersion[]):KeyVersion{const key=keys.find(k=>k.status==='active');if(!key)throw new Error('No active encryption key');return key}
