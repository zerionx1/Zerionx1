'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordActivity } from '@/lib/activity/client';
import { saveRouteSnapshot } from '@/lib/navigation/route-state';
export function RouteActivityTracker(){const pathname=usePathname();const params=useSearchParams();useEffect(()=>{const search=params.toString();void saveRouteSnapshot({pathname,search,scrollY:window.scrollY,capturedAt:new Date().toISOString()});void recordActivity('navigation','route_view',{search},pathname);},[pathname,params]);return null;}
