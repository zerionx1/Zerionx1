import { NextResponse } from 'next/server';
export async function GET(){return NextResponse.json({source:'account-store-required',preferences:null},{status:501});}
export async function PUT(){return NextResponse.json({error:'ACCOUNT_PERSISTENCE_ADAPTER_NOT_CONFIGURED'},{status:501});}
