"use client";
import { useQuery } from "@tanstack/react-query"; import type { PaperAccount } from "@/types/paper-trading";
async function load():Promise<PaperAccount>{const r=await fetch("/api/paper/account");if(!r.ok)throw new Error("Unable to load paper account");return (await r.json()).data;}
export function usePaperAccount(){return useQuery({queryKey:["paper-account"],queryFn:load});}
