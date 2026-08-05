"use client";
import { useQuery } from "@tanstack/react-query"; import type { TradingSignal } from "@/types/signal";
async function fetchSignals():Promise<TradingSignal[]>{const r=await fetch("/api/signals");if(!r.ok)throw new Error("Unable to load signals");return (await r.json()).data;}
export function useSignals(){return useQuery({queryKey:["signals"],queryFn:fetchSignals,refetchInterval:30_000});}
