export interface StoredObject{key:string;size:number;contentType:string;etag:string;createdAt:string}
export interface StorageAdapter{put(key:string,body:Uint8Array,contentType:string):Promise<StoredObject>;get(key:string):Promise<Uint8Array|null>;delete(key:string):Promise<void>;signedUrl(key:string,expiresSeconds:number):Promise<string>}
