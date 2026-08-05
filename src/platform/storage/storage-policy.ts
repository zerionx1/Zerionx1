export const ALLOWED_CONTENT_TYPES=new Set(['application/json','text/csv','application/pdf','image/png','image/jpeg']);
export function assertStorageUpload(contentType:string,size:number):void{if(!ALLOWED_CONTENT_TYPES.has(contentType))throw new Error('Content type blocked');if(size>25*1024*1024)throw new Error('Object exceeds upload limit')}
