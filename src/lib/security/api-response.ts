import { NextResponse } from "next/server"; import type { ApiFailure,ApiSuccess } from "@/types/api"; import { createRequestId } from "./request-id"; export const ok=<T>(data:T,status=200)=>NextResponse.json<ApiSuccess<T>>({ok:true,data,requestId:createRequestId()},{status}); export const fail=(code:string,message:string,status=400,details?:unknown)=>NextResponse.json<ApiFailure>({ok:false,error:{code,message,details},requestId:createRequestId()},{status});
export const apiSuccess = ok;
export const apiError = fail;
