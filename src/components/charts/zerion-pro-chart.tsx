"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candle } from "@/types/market";
import { TIMEFRAME_MS } from "@/lib/market-data/live-candle-builder";
import type { Timeframe } from "@/types/market";

export type ChartPriceLine = {
  id: string;
  price: number;
  label: string;
  kind: "entry" | "stop" | "target";
  pnl?: number;
  exit?: {
    mode: "paper" | "live";
    positionId: string;
    broker?: "upstox";
    instrumentToken?: string;
    symbol?: string;
    quantity?: number;
    product?: string;
  };
};

type Indicator =
  | "sma"
  | "ema"
  | "vwap"
  | "volume"
  | "rsi"
  | "macd"
  | "bb"
  | "atr"
  | "supertrend";

type Tool = "cursor" | "trend" | "hline" | "vline" | "ray" | "rect" | "fib" | "text" | "erase";
type Anchor = { index: number; price: number };
type Drawing = { id: string; tool: Exclude<Tool, "cursor" | "erase">; a: Anchor; b?: Anchor; text?: string };

type Props = {
  candles: Candle[];
  symbol?: string;
  timeframe?: Timeframe;
  height?: number;
  livePrice?: number | null;
  priceLines?: ChartPriceLine[];
  instrumentId?: string;
  onExitPriceLine?: (line: ChartPriceLine) => void;
  exitBusyId?: string;
};

const average = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);
const fmt = (v: number) =>
  Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—";

function sma(c: Candle[], p: number) {
  return c.map((_, i) => (i + 1 < p ? null : average(c.slice(i + 1 - p, i + 1).map((x) => x.close))));
}
function ema(c: Candle[], p: number) {
  if (!c.length) return [] as number[];
  const k = 2 / (p + 1);
  let last = c[0]!.close;
  return c.map((x, i) => (last = i ? x.close * k + last * (1 - k) : x.close));
}
function vwap(c: Candle[]) {
  let pv = 0, vol = 0;
  return c.map((x) => {
    const v = Math.max(0, Number(x.volume ?? 0));
    const t = (x.high + x.low + x.close) / 3;
    pv += t * v; vol += v;
    return vol ? pv / vol : t;
  });
}
function std(v: number[]) {
  const m = average(v);
  return Math.sqrt(average(v.map((x) => (x - m) ** 2)));
}
function bollinger(c: Candle[], p = 20) {
  return c.map((_, i) => {
    if (i + 1 < p) return null;
    const values = c.slice(i + 1 - p, i + 1).map((x) => x.close);
    const m = average(values), s = std(values) * 2;
    return { mid: m, upper: m + s, lower: m - s };
  });
}
function tr(c: Candle[], i: number) {
  const x = c[i]!, prev = c[i - 1];
  return prev
    ? Math.max(x.high - x.low, Math.abs(x.high - prev.close), Math.abs(x.low - prev.close))
    : x.high - x.low;
}
function atr(c: Candle[], p = 14) {
  return c.map((_, i) => (i + 1 < p ? null : average(c.slice(i + 1 - p, i + 1).map((__, j) => tr(c, i + 1 - p + j)))));
}
function rsi(c: Candle[], p = 14) {
  return c.map((_, i) => {
    if (i < p) return null;
    let gains = 0, losses = 0;
    for (let j = i - p + 1; j <= i; j++) {
      const d = c[j]!.close - c[j - 1]!.close;
      if (d >= 0) gains += d; else losses -= d;
    }
    if (!losses) return 100;
    const rs = gains / losses;
    return 100 - 100 / (1 + rs);
  });
}
function macd(c: Candle[]) {
  const fast = ema(c, 12), slow = ema(c, 26);
  const line = c.map((_, i) => fast[i]! - slow[i]!);
  const signal: number[] = [];
  const k = 2 / 10;
  let last = line[0] ?? 0;
  line.forEach((x, i) => { last = i ? x * k + last * (1 - k) : x; signal.push(last); });
  return { line, signal, hist: line.map((x, i) => x - signal[i]!) };
}
function supertrend(c: Candle[], p = 10, m = 3) {
  const a = atr(c, p);
  let trend = 1;
  return c.map((x, i) => {
    const av = a[i];
    if (av == null) return null;
    const mid = (x.high + x.low) / 2;
    const upper = mid + m * av, lower = mid - m * av;
    if (x.close > upper) trend = 1;
    if (x.close < lower) trend = -1;
    return trend === 1 ? lower : upper;
  });
}

export function ZerionProChart({
  candles,
  symbol = "Instrument",
  timeframe = "15m",
  height = 640,
  livePrice = null,
  priceLines = [],
  instrumentId = symbol,
  onExitPriceLine,
  exitBusyId = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; pan: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(72);
  const [pan, setPan] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>("cursor");
  const [pending, setPending] = useState<Anchor | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [history, setHistory] = useState<Drawing[][]>([]);
  const [redo, setRedo] = useState<Drawing[][]>([]);
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set(["volume"]));

  const visible = useMemo(() => {
    const count = Math.max(20, Math.min(300, visibleCount));
    const end = Math.max(count, Math.min(candles.length, candles.length - Math.round(pan)));
    return candles.slice(Math.max(0, end - count), end);
  }, [candles, pan, visibleCount]);

  const series = useMemo(() => ({
    sma: sma(visible, 20),
    ema: ema(visible, 20),
    vwap: vwap(visible),
    bb: bollinger(visible),
    atr: atr(visible),
    rsi: rsi(visible),
    macd: macd(visible),
    supertrend: supertrend(visible),
  }), [visible]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/chart/drawings?instrument=${encodeURIComponent(instrumentId)}&timeframe=${encodeURIComponent(timeframe)}`, {
      cache: "no-store", signal: controller.signal,
    }).then((r) => r.ok ? r.json() : null).then((body) => {
      if (body?.data && Array.isArray(body.data)) setDrawings(body.data as Drawing[]);
    }).catch(() => {});
    return () => controller.abort();
  }, [instrumentId, timeframe]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetch(`/api/chart/drawings?instrument=${encodeURIComponent(instrumentId)}&timeframe=${encodeURIComponent(timeframe)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drawings }),
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [drawings, instrumentId, timeframe]);

  function commit(next: Drawing[]) {
    setHistory((h) => [...h.slice(-30), drawings]);
    setRedo([]);
    setDrawings(next);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setRedo((r) => [drawings, ...r].slice(0, 30));
    setDrawings(previous);
    setHistory((h) => h.slice(0, -1));
  }
  function redoOnce() {
    const next = redo[0];
    if (!next) return;
    setHistory((h) => [...h, drawings]);
    setDrawings(next);
    setRedo((r) => r.slice(1));
  }

  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current;
    if (!canvas || !stage || !visible.length) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    canvas.width = width*dpr; canvas.height=height*dpr; canvas.style.width=`${width}px`; canvas.style.height=`${height}px`;
    const raw=canvas.getContext("2d"); if(!raw)return; const ctx=raw; ctx.scale(dpr,dpr);

    const right=Math.max(118,Math.min(170,width*.16)),left=12,top=28;
    const rsiH=indicators.has("rsi")?85:0, macdH=indicators.has("macd")?85:0, volumeH=indicators.has("volume")?82:0;
    const bottom=38+rsiH+macdH+volumeH, chartW=width-left-right, plotW=chartW*.91, chartH=Math.max(180,height-top-bottom);
    const lows=visible.map(c=>c.low), highs=visible.map(c=>c.high);
    if(livePrice!=null){lows.push(livePrice);highs.push(livePrice)}
    priceLines.forEach(l=>{lows.push(l.price);highs.push(l.price)});
    const min=Math.min(...lows),max=Math.max(...highs),pad=Math.max((max-min)*.1,Math.abs(max)*.0005,.01),lo=min-pad,hi=max+pad,range=hi-lo||1;
    const x=(i:number)=>left+((i+.5)/visible.length)*plotW;
    const y=(p:number)=>top+((hi-p)/range)*chartH;

    ctx.fillStyle="#11181c";ctx.fillRect(0,0,width,height);ctx.font="13px system-ui";ctx.lineWidth=1;
    for(let i=0;i<=6;i++){const yy=top+chartH*i/6;ctx.strokeStyle="rgba(255,255,255,.07)";ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();ctx.fillStyle="rgba(245,239,228,.64)";ctx.fillText(fmt(hi-range*i/6),width-right+6,yy+4)}
    const timeLines=Math.min(7,visible.length);
    for(let i=0;i<timeLines;i++){const idx=Math.round(i*(visible.length-1)/Math.max(1,timeLines-1)),xx=x(idx);ctx.strokeStyle="rgba(255,255,255,.05)";ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,top+chartH);ctx.stroke();ctx.fillStyle="rgba(245,239,228,.54)";ctx.fillText(new Date(visible[idx]!.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),Math.max(left,xx-25),height-10)}
    const slot=plotW/visible.length,bodyW=Math.max(3,Math.min(15,slot*.72));
    visible.forEach((c,i)=>{const xx=x(i),color=c.close>=c.open?"#5fd4aa":"#e98484";ctx.strokeStyle=color;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(xx,y(c.high));ctx.lineTo(xx,y(c.low));ctx.stroke();const y1=y(c.open),y2=y(c.close);ctx.fillRect(xx-bodyW/2,Math.min(y1,y2),bodyW,Math.max(1.5,Math.abs(y2-y1)))});

    const line=(values:Array<number|null>,color:string,width=1.25)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let started=false;values.forEach((v,i)=>{if(v==null||!Number.isFinite(v))return;started?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v));started=true});if(started)ctx.stroke();ctx.lineWidth=1};
    if(indicators.has("sma"))line(series.sma,"#d5b56f");
    if(indicators.has("ema"))line(series.ema,"#8fc7ff");
    if(indicators.has("vwap"))line(series.vwap,"#c59cff");
    if(indicators.has("supertrend"))line(series.supertrend,"#f3c779",1.5);
    if(indicators.has("bb")){line(series.bb.map(v=>v?.upper??null),"rgba(143,199,255,.65)");line(series.bb.map(v=>v?.mid??null),"rgba(143,199,255,.35)");line(series.bb.map(v=>v?.lower??null),"rgba(143,199,255,.65)")}

    if(indicators.has("volume")){
      const vTop=top+chartH+12,vBottom=vTop+60,maxV=Math.max(...visible.map(c=>Number(c.volume??0)),1);
      visible.forEach((c,i)=>{const h=Number(c.volume??0)/maxV*55;ctx.fillStyle=c.close>=c.open?"rgba(95,212,170,.3)":"rgba(233,132,132,.28)";ctx.fillRect(x(i)-bodyW/2,vBottom-h,bodyW,h)});
      ctx.fillStyle="rgba(245,239,228,.5)";ctx.fillText("VOL",left+4,vTop+10);
    }

    let panelTop=top+chartH+12+volumeH;
    if(indicators.has("rsi")){
      const topR=panelTop,bottomR=topR+70,ry=(v:number)=>bottomR-(v/100)*(bottomR-topR);
      [30,50,70].forEach(v=>{ctx.strokeStyle="rgba(255,255,255,.06)";ctx.beginPath();ctx.moveTo(left,ry(v));ctx.lineTo(width-right,ry(v));ctx.stroke()});
      ctx.strokeStyle="#d5b56f";ctx.beginPath();let s=false;series.rsi.forEach((v,i)=>{if(v==null)return;s?ctx.lineTo(x(i),ry(v)):ctx.moveTo(x(i),ry(v));s=true});if(s)ctx.stroke();ctx.fillStyle="rgba(245,239,228,.5)";ctx.fillText("RSI",left+4,topR+10);panelTop+=rsiH;
    }
    if(indicators.has("macd")){
      const topM=panelTop,bottomM=topM+70,maxAbs=Math.max(...series.macd.hist.map(Math.abs),...series.macd.line.map(Math.abs),1e-9),my=(v:number)=>(topM+bottomM)/2-v/maxAbs*(bottomM-topM)/2*.85;
      ctx.strokeStyle="rgba(255,255,255,.08)";ctx.beginPath();ctx.moveTo(left,my(0));ctx.lineTo(width-right,my(0));ctx.stroke();
      series.macd.hist.forEach((v,i)=>{ctx.fillStyle=v>=0?"rgba(95,212,170,.32)":"rgba(233,132,132,.3)";ctx.fillRect(x(i)-bodyW/2,Math.min(my(v),my(0)),bodyW,Math.max(1,Math.abs(my(v)-my(0))))});
      const ml=(vals:number[],color:string)=>{ctx.strokeStyle=color;ctx.beginPath();vals.forEach((v,i)=>i?ctx.lineTo(x(i),my(v)):ctx.moveTo(x(i),my(v)));ctx.stroke()};ml(series.macd.line,"#8fc7ff");ml(series.macd.signal,"#d5b56f");ctx.fillStyle="rgba(245,239,228,.5)";ctx.fillText("MACD",left+4,topM+10);
    }

    if(livePrice!=null&&livePrice>=lo&&livePrice<=hi){const yy=y(livePrice);ctx.setLineDash([5,4]);ctx.strokeStyle="#efe1c9";ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#efe1c9";ctx.fillRect(width-right,yy-10,right,20);ctx.fillStyle="#191c1f";ctx.fillText(fmt(livePrice),width-right+5,yy+4)}

    const lineColor:Record<ChartPriceLine["kind"],string>={entry:"#8fc7ff",stop:"#e98484",target:"#5fd4aa"};
    priceLines.forEach(pl=>{
      if(pl.price<lo||pl.price>hi)return;
      const yy=y(pl.price);
      ctx.setLineDash(pl.kind==="entry"?[]:[4,4]);
      ctx.strokeStyle=lineColor[pl.kind];
      ctx.lineWidth=pl.kind==="entry"?1.6:1.2;
      ctx.beginPath();
      ctx.moveTo(left,yy);
      ctx.lineTo(width-right,yy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth=1;
      const pnlText=typeof pl.pnl==="number"?` ${pl.pnl>=0?"+":""}${fmt(pl.pnl)}`:"";
      const label=`${pl.label}${pnlText}`;
      ctx.fillStyle=lineColor[pl.kind];
      ctx.fillText(label,left+8,yy-6);
      if(pl.kind==="entry"&&pl.exit){
        const bx=width-right-28,by=yy-12;
        ctx.fillStyle=exitBusyId===pl.id?"rgba(255,255,255,.22)":"rgba(20,24,27,.92)";
        ctx.fillRect(bx,by,24,24);
        ctx.strokeStyle=lineColor.entry;
        ctx.strokeRect(bx,by,24,24);
        ctx.fillStyle="#f7f4ed";
        ctx.font="bold 15px system-ui";
        ctx.fillText("×",bx+7,by+17);
        ctx.font="13px system-ui";
      }
    });

    function ax(a:Anchor){return x(Math.max(0,Math.min(visible.length-1,a.index)))} function ay(a:Anchor){return y(a.price)}
    drawings.forEach(d=>{ctx.strokeStyle="rgba(230,216,195,.9)";ctx.fillStyle="rgba(230,216,195,.9)";ctx.lineWidth=1.2;const aX=ax(d.a),aY=ay(d.a),b=d.b,bX=b?ax(b):aX,bY=b?ay(b):aY;
      if(d.tool==="hline"){ctx.beginPath();ctx.moveTo(left,aY);ctx.lineTo(width-right,aY);ctx.stroke()}
      else if(d.tool==="vline"){ctx.beginPath();ctx.moveTo(aX,top);ctx.lineTo(aX,top+chartH);ctx.stroke()}
      else if(d.tool==="trend"||d.tool==="ray"){ctx.beginPath();ctx.moveTo(aX,aY);const endX=d.tool==="ray"?width-right:bX;const slope=(bX-aX)?(bY-aY)/(bX-aX):0;ctx.lineTo(endX,d.tool==="ray"?aY+slope*(endX-aX):bY);ctx.stroke()}
      else if(d.tool==="rect"){ctx.strokeRect(Math.min(aX,bX),Math.min(aY,bY),Math.abs(bX-aX),Math.abs(bY-aY))}
      else if(d.tool==="fib"){[0,.236,.382,.5,.618,.786,1].forEach(level=>{const yy=aY+(bY-aY)*level;ctx.beginPath();ctx.moveTo(Math.min(aX,bX),yy);ctx.lineTo(Math.max(aX,bX),yy);ctx.stroke();ctx.fillText(String(level),Math.max(aX,bX)+4,yy+3)})}
      else if(d.tool==="text"){ctx.fillText(d.text??"Note",aX,aY)}
    });

    if(hoverIndex!=null&&visible[hoverIndex]){const xx=x(hoverIndex),yy=y(visible[hoverIndex]!.close);ctx.setLineDash([3,3]);ctx.strokeStyle="rgba(255,255,255,.28)";ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,top+chartH);ctx.moveTo(left,yy);ctx.lineTo(width-right,yy);ctx.stroke();ctx.setLineDash([])}
  }, [drawings,exitBusyId,height,hoverIndex,indicators,livePrice,priceLines,series,visible]);

  const hovered = hoverIndex != null ? visible[hoverIndex] : visible.at(-1);
  const remaining = useMemo(() => {
    const last = candles.at(-1); if (!last) return 0;
    const size = TIMEFRAME_MS[timeframe];
    const end = Math.floor(Date.parse(last.time)/size)*size + size;
    return Math.max(0, end-Date.now());
  }, [candles,timeframe]);
  const [clock,setClock]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setClock(v=>v+1),1000);return()=>clearInterval(t)},[]);
  void clock;

  function exitLineFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    if (!onExitPriceLine || !visible.length) return null;
    const rect=event.currentTarget.getBoundingClientRect();
    const width=rect.width;
    const right=Math.max(118,Math.min(170,width*.16)),left=12,top=28;
    const rsiH=indicators.has("rsi")?85:0,macdH=indicators.has("macd")?85:0,volumeH=indicators.has("volume")?82:0;
    const bottom=38+rsiH+macdH+volumeH,chartH=Math.max(180,height-top-bottom);
    const lows=visible.map(c=>c.low),highs=visible.map(c=>c.high);
    if(livePrice!=null){lows.push(livePrice);highs.push(livePrice)}
    priceLines.forEach(line=>{lows.push(line.price);highs.push(line.price)});
    const min=Math.min(...lows),max=Math.max(...highs),pad=Math.max((max-min)*.1,Math.abs(max)*.0005,.01),lo=min-pad,hi=max+pad,range=hi-lo||1;
    const y=(price:number)=>top+((hi-price)/range)*chartH;
    const px=event.clientX-rect.left,py=event.clientY-rect.top;
    if(px<width-right-38||px>width-right+4)return null;
    return priceLines.find(line=>line.kind==="entry"&&line.exit&&Math.abs(py-y(line.price))<=16)??null;
  }

  function anchorFromEvent(event: React.PointerEvent<HTMLDivElement>): Anchor | null {
    if (!visible.length) return null;
    const rect=event.currentTarget.getBoundingClientRect(),right=Math.max(118,Math.min(170,rect.width*.16)),left=12,top=28,chartW=(rect.width-left-right)*.91;
    const idx=Math.max(0,Math.min(visible.length-1,Math.floor((event.clientX-rect.left-left)/Math.max(1,chartW)*visible.length)));
    const lows=visible.map(c=>c.low),highs=visible.map(c=>c.high);if(livePrice!=null){lows.push(livePrice);highs.push(livePrice)}
    priceLines.forEach(line=>{lows.push(line.price);highs.push(line.price)});
    const min=Math.min(...lows),max=Math.max(...highs),pad=Math.max((max-min)*.1,Math.abs(max)*.0005,.01),lo=min-pad,hi=max+pad,chartH=Math.max(180,height-top-38-(indicators.has("volume")?82:0)-(indicators.has("rsi")?85:0)-(indicators.has("macd")?85:0));
    const yy=event.clientY-rect.top; const price=hi-((yy-top)/chartH)*(hi-lo);
    return {index:idx,price};
  }

  function applyTool(event: React.PointerEvent<HTMLDivElement>) {
    const a=anchorFromEvent(event); if(!a||tool==="cursor")return;
    if(tool==="erase"){
      if(!drawings.length)return;
      let best=0,dist=Infinity;
      drawings.forEach((d,i)=>{const dd=Math.abs(d.a.index-a.index)+Math.abs(d.a.price-a.price)/Math.max(1,Math.abs(a.price));if(dd<dist){dist=dd;best=i}});
      commit(drawings.filter((_,i)=>i!==best));return;
    }
    if(tool==="hline"||tool==="vline"||tool==="text"){
      const text=tool==="text"?window.prompt("Chart annotation")??"":undefined;
      commit([...drawings,{id:crypto.randomUUID(),tool,a,text}]);return;
    }
    if(!pending){setPending(a);return}
    commit([...drawings,{id:crypto.randomUUID(),tool,a:pending,b:a}]);setPending(null);
  }

  const toggle=(key:Indicator)=>setIndicators(cur=>{const n=new Set(cur);n.has(key)?n.delete(key):n.add(key);return n});

  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151a1d]">
    <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 p-2 text-xs">
      <strong className="mr-1">{symbol}</strong><span className="rounded border border-white/10 px-2 py-1">{timeframe}</span>
      {(["sma","ema","vwap","volume","rsi","macd","bb","atr","supertrend"] as Indicator[]).map(k=><button key={k} onClick={()=>toggle(k)} className={`rounded border px-2 py-1 ${indicators.has(k)?"border-amber-100/30 bg-amber-100/10":"border-white/10"}`}>{k.toUpperCase()}</button>)}
      <button onClick={()=>setVisibleCount(v=>Math.max(20,v-12))} className="rounded border border-white/10 px-2 py-1">Zoom +</button>
      <button onClick={()=>setVisibleCount(v=>Math.min(300,v+12))} className="rounded border border-white/10 px-2 py-1">Zoom -</button>
      <button onClick={()=>{setVisibleCount(72);setPan(0)}} className="rounded border border-white/10 px-2 py-1">Fit</button>
      <button onClick={()=>void stageRef.current?.requestFullscreen()} className="rounded border border-white/10 px-2 py-1">Fullscreen</button>
    </div>
    <div className="flex flex-wrap gap-1 border-b border-white/10 p-2 text-xs">
      {(["cursor","trend","hline","vline","ray","rect","fib","text","erase"] as Tool[]).map(k=><button key={k} onClick={()=>{setTool(k);setPending(null)}} className={`rounded border px-2 py-1 ${tool===k?"border-amber-100/30 bg-amber-100/10":"border-white/10"}`}>{k}</button>)}
      <button onClick={undo} className="rounded border border-white/10 px-2 py-1">Undo</button>
      <button onClick={redoOnce} className="rounded border border-white/10 px-2 py-1">Redo</button>
      <button onClick={()=>commit([])} className="rounded border border-white/10 px-2 py-1">Clear</button>
      {pending?<span className="px-2 py-1 text-white/50">Select second point…</span>:null}
    </div>
    <div className="flex flex-wrap gap-3 border-b border-white/5 px-3 py-1.5 text-[11px] text-white/55">
      {hovered?<><span>{new Date(hovered.time).toLocaleString()}</span><span>O {fmt(hovered.open)}</span><span>H {fmt(hovered.high)}</span><span>L {fmt(hovered.low)}</span><span>C {fmt(hovered.close)}</span><span>V {fmt(Number(hovered.volume??0))}</span></>:<span>No candles</span>}
      <span className="ml-auto">Candle {Math.floor(remaining/60000).toString().padStart(2,"0")}:{Math.floor((remaining%60000)/1000).toString().padStart(2,"0")}</span>
    </div>
    <div ref={stageRef} className="zx-pro-chart-stage relative w-full touch-none select-none" style={{height}}
      onWheel={e=>{e.preventDefault();setVisibleCount(v=>Math.max(20,Math.min(300,v+(e.deltaY>0?8:-8))))}}
      onPointerDown={e=>{
        const exitLine=tool==="cursor"?exitLineFromEvent(e):null;
        if(exitLine){
          e.preventDefault();
          onExitPriceLine?.(exitLine);
          return;
        }
        pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(tool!=="cursor"){applyTool(e);return}
        drag.current={x:e.clientX,pan};
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={e=>{const rect=e.currentTarget.getBoundingClientRect();const idx=Math.max(0,Math.min(visible.length-1,Math.floor((e.clientX-rect.left)/rect.width*visible.length)));setHoverIndex(idx);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const pts=[...pointers.current.values()];const d=Math.abs(pts[0]!.x-pts[1]!.x);const last=(e.currentTarget.dataset.pinch?Number(e.currentTarget.dataset.pinch):d);if(Math.abs(d-last)>8){setVisibleCount(v=>Math.max(20,Math.min(300,v+(d>last?-6:6))));e.currentTarget.dataset.pinch=String(d)}return}if(drag.current){const slot=Math.max(1,rect.width/Math.max(20,visible.length));setPan(drag.current.pan+Math.round((drag.current.x-e.clientX)/slot))}}}
      onPointerUp={e=>{pointers.current.delete(e.pointerId);drag.current=null;delete e.currentTarget.dataset.pinch;try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}}}
      onPointerCancel={e=>{pointers.current.delete(e.pointerId);drag.current=null}}
      onPointerLeave={()=>{setHoverIndex(null);if(!pointers.current.size)drag.current=null}}>
      <canvas ref={canvasRef} className="absolute inset-0"/>
    </div>
  </div>;
}
