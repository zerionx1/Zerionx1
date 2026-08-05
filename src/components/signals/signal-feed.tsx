import { signalStore } from "@/lib/signals/signal-store";import { SignalCard } from "@/components/signals/signal-card";
export async function SignalFeed(){const signals=await signalStore.list();return <div className="signal-grid">{signals.map(s=><SignalCard key={s.id} signal={s}/>)}</div>}
