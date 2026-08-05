import { NextResponse } from 'next/server';
import { z } from 'zod';
import { appendActivity,listActivity } from '@/lib/activity/store';
const schema=z.object({id:z.string().uuid(),userId:z.string().optional(),sessionId:z.string().min(1),kind:z.enum(['navigation','preference','strategy','paper-order','live-order-intent','admin-change','security','system']),action:z.string().min(1).max(120),route:z.string().max(500).optional(),entityId:z.string().optional(),occurredAt:z.string(),requestId:z.string().optional(),metadata:z.record(z.string(),z.union([z.string(),z.number(),z.boolean(),z.null()]))});
export async function POST(request:Request){const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:'INVALID_ACTIVITY'},{status:400});await appendActivity(parsed.data);return NextResponse.json({accepted:true},{status:202});}
export async function GET(){return NextResponse.json(await listActivity());}
