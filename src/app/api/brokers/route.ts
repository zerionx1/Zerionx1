import {NextResponse} from "next/server";import {brokerCatalog} from "@/config/brokers";export async function GET(){return NextResponse.json({data:brokerCatalog,liveCredentials:false})}
