"use client";
import { useQuery } from "@tanstack/react-query";
import type { MarketQuote } from "@/types/market";
async function fetchQuotes():Promise<MarketQuote[]>{const r=await fetch("/api/markets/quotes");if(!r.ok)throw new Error("Unable to load quotes");const j=await r.json();return j.data;}
export function useMarketQuotes(){return useQuery({queryKey:["market-quotes"],queryFn:fetchQuotes,refetchInterval:15_000});}
