"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cable, CheckCircle2, ExternalLink, KeyRound, RefreshCw, ShieldAlert } from "lucide-react";

type Broker = { key:string; name:string; kind:"india"|"crypto"|"forex"; availability?:"available"|"coming-soon"; description?:string; createAccountUrl?:string; configured?:boolean; capabilities:{ marketData:boolean; orders:boolean; positions:boolean; funds:boolean; websocket:boolean } };
type Connection = { id:string; broker_key?:string; brokerKey?:string; status?:string };
type Status = Record<string,{configured:boolean}>;

export function BrokerConnectionCenter(){
  const[catalog,setCatalog]=useState<Broker[]>([]),[connections,setConnections]=useState<Connection[]>([]),[status,setStatus]=useState<Status>({});
  const[market,setMarket]=useState<"india"|"crypto"|"forex">("india"),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState(""),[mt5Warm,setMt5Warm]=useState<number|null>(null);
  const[coinDcxApiKey,setCoinDcxApiKey]=useState(""),[coinDcxApiSecret,setCoinDcxApiSecret]=useState("");
  const[mt5Login,setMt5Login]=useState(""),[mt5Password,setMt5Password]=useState(""),[mt5Server,setMt5Server]=useState(""),[mt5Environment,setMt5Environment]=useState<"demo"|"real">("demo");

  const load=useCallback(async()=>{const[a,b]=await Promise.all([fetch("/api/brokers",{cache:"no-store"}),fetch("/api/brokers/config-status",{cache:"no-store"})]);const[aj,bj]=await Promise.all([a.json(),b.json()]);setCatalog(aj.data?.catalog??[]);setConnections(aj.data?.connections??[]);setStatus(bj.data??{})},[]);
  useEffect(()=>{void load()},[load]);
  const visible=useMemo(()=>catalog.filter(x=>x.kind===market),[catalog,market]);
  const connectionFor=(key:string)=>connections.find(x=>(x.broker_key??x.brokerKey)===key);

  async function warmMt5(){const end=Date.now()+120000;setMt5Warm(120);const clock=window.setInterval(()=>setMt5Warm(Math.max(0,Math.ceil((end-Date.now())/1000))),1000);try{while(Date.now()<end){try{const r=await fetch("/api/brokers/mt5-health",{cache:"no-store"});const j=await r.json().catch(()=>({}));if(r.ok&&j.data?.workerReachable===true)return true}catch{}await new Promise(resolve=>setTimeout(resolve,3000))}return false}finally{window.clearInterval(clock);setMt5Warm(null)}}

  async function connect(broker:Broker){
    setBusy(broker.key);setMessage("");
    try{
      let payload:Record<string,unknown>={brokerKey:broker.key};
      if(broker.key==="coindcx"){
        if(!coinDcxApiKey.trim()||!coinDcxApiSecret.trim()){setMessage("Enter your CoinDCX API Key and API Secret first.");return}
        payload={...payload,apiKey:coinDcxApiKey.trim(),apiSecret:coinDcxApiSecret.trim()};
      }
      if(broker.key==="exness-mt5"){
        if(!mt5Login.trim()||!mt5Password||!mt5Server.trim()){setMessage("Enter MT5 login, trading password and exact Exness MT5 server.");return}
        setMessage("Waking MT5 gateway and worker. The countdown updates live while health is checked.");
        if(!(await warmMt5())){setMessage("MT5 server did not become ready within 120 seconds. Retry once; credentials were not stored.");return}
        payload={...payload,mt5Login:mt5Login.trim(),mt5Password,mt5Server:mt5Server.trim(),mt5Environment};
      }
      const r=await fetch("/api/brokers",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const j=await r.json();
      if(!r.ok){setMessage(j.error?.message??`${broker.name} could not connect.`);return}
      if(j.data?.authorizationUrl){window.location.assign(j.data.authorizationUrl);return}
      if(broker.key==="coindcx"){setCoinDcxApiKey("");setCoinDcxApiSecret("")}
      if(broker.key==="exness-mt5")setMt5Password("");
      setMessage(`${broker.name} connected successfully.`);await load();
    }finally{setBusy(null)}
  }

  async function disconnect(broker:Broker,connection:Connection){if(!window.confirm(`Disconnect ${broker.name} from Zerion X1?`))return;setBusy(broker.key);try{const r=await fetch(`/api/brokers?id=${encodeURIComponent(connection.id)}`,{method:"DELETE"});const j=await r.json();if(!r.ok){setMessage(j.error?.message??"Disconnect failed");return}setMessage(`${broker.name} disconnected successfully.`);await load()}finally{setBusy(null)}}

  return <div className="space-y-6">
    <section className="zx-provider-intro"><div><p className="eyebrow">CHOOSE WHERE YOU TRADE</p><h2>{market==="india"?"Indian Markets":market==="crypto"?"Crypto":"Forex"}</h2><p>{market==="india"?"Upstox uses official OAuth.":market==="crypto"?"CoinDCX uses your encrypted API credentials.":"Exness Forex execution uses your own MT5 login, trading password and server through the Zerion MT5 Bridge."}</p></div><button onClick={()=>void load()} className="zx-secondary-action"><RefreshCw className="mr-2 h-4 w-4"/>Refresh status</button></section>
    <div className="zx-market-tabs">{(["india","forex","crypto"] as const).map(v=><button key={v} onClick={()=>setMarket(v)} className={market===v?"is-active":""}><span>{v==="india"?"Indian Markets":v==="forex"?"Forex":"Crypto"}</span></button>)}</div>
    {message?<div className="zx-final-message"><ShieldAlert className="h-4 w-4"/><p>{message}</p></div>:null}
    <div className="grid gap-5 lg:grid-cols-2">{visible.map(b=>{const c=connectionFor(b.key),connected=c?.status==="connected",configured=status[b.key]?.configured??b.configured??false;return <article className="zx-broker-card" key={b.key}>
      <div className="zx-broker-card__top"><span className="x1-menu-icon">{b.key==="coindcx"?<KeyRound className="h-4 w-4"/>:<Cable className="h-4 w-4"/>}</span><span className="data-badge">{connected?"Connected":configured?"Ready to connect":"Deployment config missing"}</span></div>
      <h3>{b.name}</h3><p>{b.description}</p>
      {b.key==="coindcx"&&!connected?<div className="zx-coindcx-connect"><label><span>CoinDCX API Key</span><input value={coinDcxApiKey} onChange={e=>setCoinDcxApiKey(e.target.value)}/></label><label><span>CoinDCX API Secret</span><input type="password" value={coinDcxApiSecret} onChange={e=>setCoinDcxApiSecret(e.target.value)}/></label></div>:null}
      {b.key==="exness-mt5"&&!connected?<div className="zx-coindcx-connect"><label><span>MT5 Login</span><input inputMode="numeric" value={mt5Login} onChange={e=>setMt5Login(e.target.value)} placeholder="MT5 account number"/></label><label><span>Trading Password</span><input type="password" value={mt5Password} onChange={e=>setMt5Password(e.target.value)} placeholder="MT5 trading password"/></label><label><span>MT5 Server</span><input value={mt5Server} onChange={e=>setMt5Server(e.target.value)} placeholder="Exness-MT5Trial..."/></label><label><span>Environment</span><select value={mt5Environment} onChange={e=>setMt5Environment(e.target.value==="real"?"real":"demo")}><option value="demo">Demo</option><option value="real">Real</option></select></label></div>:null}
      <div className="zx-broker-actions">{connected&&c?<><button disabled className="zx-primary-action"><CheckCircle2 className="mr-2 h-4 w-4"/>Account linked</button><button disabled={busy===b.key} onClick={()=>void disconnect(b,c)} className="zx-secondary-action">{busy===b.key?"Disconnecting…":"Disconnect account"}</button></>:<><button disabled={busy===b.key||!configured} onClick={()=>void connect(b)} className="zx-primary-action">{busy===b.key?(mt5Warm!=null?`Waking MT5 · ${mt5Warm}s`:"Connecting securely…"):"Connect account"}</button>{b.createAccountUrl?<a href={b.createAccountUrl} target="_blank" rel="noreferrer" className="zx-secondary-action">Create account <ExternalLink className="ml-2 h-4 w-4"/></a>:null}</>}</div>
    </article>})}</div>
  </div>;
}
