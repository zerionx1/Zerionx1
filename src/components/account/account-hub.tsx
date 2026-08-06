"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronRight, FileBarChart, KeyRound, LogOut, Palette, PlugZap, ReceiptText, Settings, Shield, Trash2, UserRound } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Profile={full_name?:string;timezone?:string;base_currency?:string;risk_profile?:string;created_at?:string;role?:string;plan_code?:string};
const groups=[
  {title:"Account",items:[
    ["Profile & workspace","Name, timezone, currency and risk profile","/dashboard/settings",UserRound],
    ["Reports center","Portfolio, strategy, journal and compliance reports","/dashboard/reports",FileBarChart],
    ["Broker & exchanges","Connect and manage supported trading providers","/dashboard/brokers",PlugZap],
    ["Notifications","In-app, email and trading alert preferences","/dashboard/notifications",Bell],
  ]},
  {title:"Preferences & security",items:[
    ["Appearance & region","Theme, locale, timezone and base currency","/dashboard/settings",Palette],
    ["Privacy & sessions","Authentication, active sessions and account controls","/dashboard/account#security",Shield],
    ["Password & access","Manage password through secure reset flow","/forgot-password",KeyRound],
    ["Subscription & invoices","Plan details and billing records","/dashboard/reports",ReceiptText],
  ]},
] as const;
export function AccountHub(){const [profile,setProfile]=useState<Profile>({});const [loading,setLoading]=useState(true);const router=useRouter();useEffect(()=>{fetch("/api/profile").then(r=>r.json()).then(j=>setProfile(j.data??{})).finally(()=>setLoading(false));},[]);async function logout(){const supabase=createBrowserSupabaseClient();await supabase.auth.signOut();await fetch("/api/auth/sync",{method:"DELETE"});router.replace("/login");router.refresh();}
return <div className="space-y-6"><section className="x1-profile-card"><div className="x1-profile-avatar">{(profile.full_name||"ZX").split(" ").map(v=>v[0]).join("").slice(0,2).toUpperCase()}</div><div><span className="x1-kicker">Verified Zerion workspace</span><h2>{loading?"Loading account…":profile.full_name||"Zerion X1 User"}</h2><p>{profile.plan_code||"FREE"} plan · {profile.base_currency||"INR"} · {profile.timezone||"Asia/Kolkata"}</p></div><Link href="/dashboard/settings" className="x1-secondary-link">Edit profile</Link></section>{groups.map(group=><section className="x1-menu-group" key={group.title}><h3>{group.title}</h3>{group.items.map(([title,description,href,Icon])=><Link href={href} className="x1-menu-row" key={title}><span className="x1-menu-icon"><Icon/></span><span><strong>{title}</strong><small>{description}</small></span><ChevronRight/></Link>)}</section>)}<section id="security" className="x1-menu-group"><h3>Account actions</h3><button onClick={logout} className="x1-menu-row w-full text-left"><span className="x1-menu-icon"><LogOut/></span><span><strong>Secure logout</strong><small>End this session on the current device.</small></span><ChevronRight/></button><button className="x1-menu-row w-full text-left text-rose-200" onClick={()=>alert("Account deletion requires a verified support review and is not performed instantly.")}><span className="x1-menu-icon"><Trash2/></span><span><strong>Request account deletion</strong><small>Start a verified deletion and data-export workflow.</small></span><ChevronRight/></button></section></div>}
