import { NextResponse } from 'next/server';
export async function GET(){return NextResponse.json({authenticated:false,mode:'foundation',liveExecutionAllowed:false});}
