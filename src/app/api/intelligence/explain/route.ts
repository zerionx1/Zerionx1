import { NextResponse } from "next/server";
export async function POST(){return NextResponse.json({ok:true,data:{summary:"Explain a signal",phase:9},meta:{requestId:crypto.randomUUID(),generatedAt:new Date().toISOString()}});}
