'use client';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { ConnectivityBanner } from './ConnectivityBanner';
import { RouteActivityTracker } from './RouteActivityTracker';
export function GlobalProviders({children}:{children:ReactNode}){return <><ConnectivityBanner/><Suspense fallback={null}><RouteActivityTracker/></Suspense>{children}</>;}
