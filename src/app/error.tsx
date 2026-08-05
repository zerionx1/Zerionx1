'use client';
import { ErrorState } from '@/components/system/ErrorState';
export default function Error({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="p-6"><ErrorState message={error.digest?`Reference: ${error.digest}`:'The page could not be loaded safely.'} retry={reset}/></main>;}
