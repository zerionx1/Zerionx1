import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({ok:true,data:{summary:"List screeners",phase:9},meta:{requestId:crypto.randomUUID(),generatedAt:new Date().toISOString()}});}
