import{platformFeatureCatalog}from"@/config/platform-features";
type Flag={key:string;enabled:boolean;rolloutPercent:number;allowedPlans:string[];updatedAt:string};
const flags=new Map<string,Flag>(platformFeatureCatalog.map(x=>[x.key,{key:x.key,enabled:x.defaultEnabled,rolloutPercent:x.defaultEnabled?100:0,allowedPlans:[],updatedAt:new Date().toISOString()}]));
export const featureFlagStore={list:()=>[...flags.values()],set:(flag:Flag)=>{flags.set(flag.key,{...flag,updatedAt:new Date().toISOString()});return flags.get(flag.key)!},isEnabled:(key:string)=>flags.get(key)?.enabled??false};
