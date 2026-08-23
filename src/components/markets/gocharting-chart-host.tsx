"use client";

import type { ComponentProps } from "react";
import { useEffect,useId,useMemo,useRef,useState } from "react";
import { ZerionProviderChart } from "@/components/markets/zerion-provider-chart";
import { goChartingZerionDatafeed } from "@/lib/gocharting/official-datafeed";

type LegacyProps=ComponentProps<typeof ZerionProviderChart>;
type GoChartInstance={remove?:()=>void;destroy?:()=>void};
type GoChartingRuntime={createChart?:(target:string|HTMLElement,config:Record<string,unknown>)=>GoChartInstance};
declare global{interface Window{GoChartingSDK?:GoChartingRuntime}}
const GOCHARTING_UMD="https://gocharting.com/sdk/library/index.umd.js";
let loader:Promise<GoChartingRuntime>|null=null;
function loadSdk(){if(typeof window==="undefined")return Promise.reject(new Error("GoCharting requires browser runtime"));if(window.GoChartingSDK?.createChart)return Promise.resolve(window.GoChartingSDK);if(loader)return loader;loader=new Promise((resolve,reject)=>{const existing=document.querySelector<HTMLScriptElement>(`script[src="${GOCHARTING_UMD}"]`);const ready=()=>window.GoChartingSDK?.createChart?resolve(window.GoChartingSDK):reject(new Error("GoCharting SDK loaded without createChart"));if(existing){existing.addEventListener("load",ready,{once:true});existing.addEventListener("error",()=>reject(new Error("GoCharting SDK failed to load")),{once:true});return;}const script=document.createElement("script");script.src=GOCHARTING_UMD;script.async=true;script.crossOrigin="anonymous";script.dataset.zerionGocharting="true";script.addEventListener("load",ready,{once:true});script.addEventListener("error",()=>{loader=null;reject(new Error("GoCharting SDK failed to load"))},{once:true});document.head.appendChild(script);});return loader;}
function interval(tf:string){return tf==="1h"?"1H":tf==="4h"?"4H":tf==="1d"?"1D":tf==="1w"?"1W":tf;}

export function GoChartingChartHost(props:LegacyProps){
  const id=useId(),domId=useMemo(()=>`zx-gocharting-${id.replaceAll(":","")}`,[id]),instance=useRef<GoChartInstance|null>(null);
  const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  const engine=(process.env.NEXT_PUBLIC_ZERION_CHART_ENGINE||"gocharting").toLowerCase();
  const legacy=engine==="legacy"||engine==="canvas"||engine==="zerion";
  useEffect(()=>{if(legacy||!props.instrument){setState("idle");return;}let cancelled=false;let timer:ReturnType<typeof setTimeout>|null=null;(async()=>{setState("loading");setError("");try{const sdk=await loadSdk();if(cancelled)return;const create=sdk.createChart;if(typeof create!=="function")throw new Error("GoCharting createChart unavailable");const config:Record<string,unknown>={symbol:props.instrument?.symbol??props.symbol,interval:interval(props.timeframe),datafeed:goChartingZerionDatafeed,autosize:true,theme:"light"};const key=process.env.NEXT_PUBLIC_GOCHARTING_LICENSE_KEY;if(key)config.licenseKey=key;instance.current=create(`#${domId}`,config);timer=setTimeout(()=>!cancelled&&setState("ready"),450);}catch(e){console.error("GoCharting initialization failed",e);if(!cancelled){setError(e instanceof Error?e.message:"GoCharting initialization failed");setState("error");}}})();return()=>{cancelled=true;if(timer)clearTimeout(timer);try{instance.current?.remove?.();instance.current?.destroy?.();}catch{}instance.current=null;};},[domId,legacy,props.instrument,props.symbol,props.timeframe,retry]);
  if(legacy)return <ZerionProviderChart {...props}/>;
  if(!props.instrument)return <div className="zx-gc-error"><div><strong>Select an instrument</strong><p>Choose a provider-backed symbol to open the GoCharting workspace.</p></div></div>;
  if(state==="error")return <div className="zx-gc-error" style={{minHeight:props.height}}><div><strong>GoCharting could not start</strong><p>{error}</p><p>Zerion will not silently replace GoCharting with the old canvas chart.</p><button onClick={()=>{loader=null;setRetry(v=>v+1)}}>Retry GoCharting</button></div></div>;
  return <div className="zx-gocharting-runtime" style={{minHeight:props.height}}><div className={state==="loading"?"zx-gc-loader is-loading":"zx-gc-loader"} aria-hidden={state!=="loading"}><div className="zx-gc-loader-grid"/><div className="zx-gc-loader-bar"/><div className="zx-gc-loader-bar short"/></div><div id={domId} className={state==="ready"?"zx-gc-canvas is-ready":"zx-gc-canvas"} style={{minHeight:props.height}}/>{state==="ready"?<div className="zx-gc-attribution">Powered by GoCharting</div>:null}</div>;
}
