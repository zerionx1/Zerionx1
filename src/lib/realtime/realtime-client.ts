"use client";
import type { RealtimeConnectionState, RealtimeEnvelope, RealtimeTopic } from "@/types/realtime";
export type RealtimeListener<T>=(message:RealtimeEnvelope<T>)=>void;
export class LocalRealtimeBus {
 private listeners=new Map<RealtimeTopic,Set<RealtimeListener<unknown>>>();
 state:RealtimeConnectionState={status:"connected",retryCount:0,lastMessageAt:new Date().toISOString()};
 subscribe<T>(topic:RealtimeTopic,listener:RealtimeListener<T>){ const set=this.listeners.get(topic)??new Set(); set.add(listener as RealtimeListener<unknown>); this.listeners.set(topic,set); return()=>set.delete(listener as RealtimeListener<unknown>); }
 publish<T>(message:RealtimeEnvelope<T>){this.state.lastMessageAt=message.emittedAt;this.listeners.get(message.topic)?.forEach(fn=>fn(message));}
}
export const localRealtimeBus=new LocalRealtimeBus();
