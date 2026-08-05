export type ContentStatus="draft"|"scheduled"|"published"|"archived";
export interface CmsPage{ id:string; slug:string; title:string; status:ContentStatus; blocks:CmsBlock[]; updatedAt:string; updatedBy:string }
export interface CmsBlock{ id:string; type:"hero"|"text"|"metrics"|"pricing"|"video"|"faq"|"cta"; order:number; visible:boolean; props:Record<string,unknown> }
export interface NavigationItem{ id:string; label:string; href:string; order:number; visible:boolean; roles?:string[] }
