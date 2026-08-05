import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import { listActivity } from '@/lib/activity/store';
export default async function ActivityPage(){const page=await listActivity();return <main className="space-y-6 p-6"><div><h1 className="text-3xl font-semibold">Activity history</h1><p className="text-white/60">Auditable navigation and platform actions. Sensitive values are excluded.</p></div><ActivityTimeline items={page.items}/></main>;}
