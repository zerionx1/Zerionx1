export interface ModelRegistry { id:string; createdAt:string; createdBy:string; status:"draft"|"review"|"approved"|"rejected"|"archived"; metadata:Record<string,string|number|boolean>; }
