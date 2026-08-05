import {NextResponse} from "next/server";export async function POST(){return NextResponse.json({error:"No pending verified order intent"},{status:409})}
