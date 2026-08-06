import "server-only";
import { cookies } from "next/headers";
import { authCookieName, getServerSession } from "@/lib/supabase/server-auth";

export class AuthenticationRequiredError extends Error { constructor(){super("Authentication required");this.name="AuthenticationRequiredError";} }
export class PersistenceError extends Error { constructor(message:string, public readonly status:number){super(message);this.name="PersistenceError";} }

function config(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key) throw new Error("Supabase configuration is missing");
  return {url,key};
}

export async function currentUser(){const session=await getServerSession();if(!session)throw new AuthenticationRequiredError();return session.user;}

export async function supabaseRest<T>(path:string, init:RequestInit={}):Promise<T>{
  const {url,key}=config();
  const token=(await cookies()).get(authCookieName)?.value;
  if(!token) throw new AuthenticationRequiredError();
  const response=await fetch(`${url}/rest/v1/${path}`,{
    ...init, cache:"no-store",
    headers:{apikey:key,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation",...(init.headers??{})},
  });
  if(!response.ok){const body=await response.text();throw new PersistenceError(body||`Supabase request failed (${response.status})`,response.status);}
  if(response.status===204)return undefined as T;
  const text=await response.text();return (text?JSON.parse(text):undefined) as T;
}

export const select=(table:string, query="")=>supabaseRest<Record<string,unknown>[]>(`${table}?${query}`,{method:"GET"});
export const insert=<T>(table:string,payload:unknown)=>supabaseRest<T[]>(table,{method:"POST",body:JSON.stringify(payload)});
export const update=<T>(table:string,query:string,payload:unknown)=>supabaseRest<T[]>(`${table}?${query}`,{method:"PATCH",body:JSON.stringify(payload)});
export const remove=(table:string,query:string)=>supabaseRest<void>(`${table}?${query}`,{method:"DELETE",headers:{Prefer:"return=minimal"}});
