import Link from 'next/link';
export default function NotFound(){return <main className="grid min-h-screen place-items-center p-6 text-center"><div><p className="text-sm text-[#2F2A25]">404</p><h1 className="text-3xl font-semibold">Workspace not found</h1><Link href="/dashboard" className="mt-6 inline-block underline">Return to dashboard</Link></div></main>;}
