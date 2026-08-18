#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"

echo "===== FINAL PRE-PUSH FIXES ====="
STAMP="$(date +%Y%m%d-%H%M%S)"
BACK=".phase-backups/final-prepush-${STAMP}"
mkdir -p "$BACK"

for f in src/config/plans.ts src/config/dashboard-nav.ts src/app/globals.css src/lib/paper/paper-store.ts src/lib/validation/paper-order.ts src/lib/brokers/upstox-client.ts src/lib/brokers/ctrader-json-client.ts src/components/paper/paper-trading-workspace.tsx; do
  if [ -f "$f" ]; then mkdir -p "$BACK/$(dirname "$f")"; cp "$f" "$BACK/$f"; fi
done

cp -R payload/src/* src/

python3 - <<'PY'
from pathlib import Path
import re

# 1. Global CSS import
p=Path("src/app/globals.css"); t=p.read_text(); imp='@import "./final-prepush.css";'
if imp not in t:
    lines=t.splitlines(); i=0
    while i<len(lines) and lines[i].lstrip().startswith("@import"): i+=1
    lines.insert(i,imp); p.write_text("\n".join(lines)+"\n")

# 2. Remove maroon/oxblood palette
for fp in [Path("src/app/globals.css"),Path("src/app/phase-13-premium.css"),Path("src/app/phase-14-live.css"),Path("src/app/phase-15-ai.css"),Path("src/app/phase-16-billing.css"),Path("src/app/phase-17-cms.css"),Path("src/app/phase-18-pro-max.css"),Path("src/app/phase-19-fno.css")]:
    if not fp.exists(): continue
    s=fp.read_text()
    for a,b in {"#1E0B10":"#070B11","#1e0b10":"#070b11","#50212B":"#151E2A","#50212b":"#151e2a","#755058":"#8996A8","#3A2028":"#151E2A","#3a2028":"#151e2a","#2A141A":"#0D131C","#2a141a":"#0d131c","rgba(58,32,40":"rgba(118,151,184","rgba(58, 32, 40":"rgba(118, 151, 184","rgba(80,33,43":"rgba(21,30,42","rgba(80, 33, 43":"rgba(21, 30, 42"}.items(): s=s.replace(a,b)
    fp.write_text(s)

# 3. Starter ₹1200 everywhere
p=Path("src/config/plans.ts"); s=p.read_text()
m=re.search(r'\{[^{}]*id\s*:\s*["\']starter["\'][\s\S]*?\n\s*\}',s)
if m:
    block=m.group(0)
    block=re.sub(r'monthlyPriceInr\s*:\s*\d+','monthlyPriceInr: 1200',block)
    block=re.sub(r'launchPriceInr\s*:\s*\d+','launchPriceInr: 1200',block)
    s=s[:m.start()]+block+s[m.end():]
p.write_text(s)
for fp in [Path("src/components/marketing/pricing-preview.tsx"),Path("src/app/(marketing)/pricing/page.tsx"),Path("src/components/billing/pricing-grid.tsx"),Path("src/components/marketing/zerion-pro-max-home.tsx")]:
    if fp.exists(): fp.write_text(fp.read_text().replace("₹399","₹1,200"))

# 4. Dashboard nav
p=Path("src/config/dashboard-nav.ts"); s=p.read_text()
if 'href: "/dashboard/charts"' not in s:
    s=s.replace('{ label: "Markets", href: "/dashboard/markets", icon: ChartCandlestick },','{ label: "Markets", href: "/dashboard/markets", icon: ChartCandlestick },\n  { label: "Charts", href: "/dashboard/charts", icon: ChartCandlestick },')
if 'href: "/dashboard/paper/positions"' not in s:
    s=s.replace('{ label: "Paper Trading", href: "/dashboard/paper", icon: WalletCards },','{ label: "Paper Trading", href: "/dashboard/paper", icon: WalletCards },\n  { label: "Paper Positions", href: "/dashboard/paper/positions", icon: WalletCards },')
if 'href: "/dashboard/live-trading/positions"' not in s:
    marker='{ label: "Execution", href: "/dashboard/execution", icon: Activity },'
    s=s.replace(marker,marker+'\n  { label: "Live Trading", href: "/dashboard/live-trading", icon: Activity },\n  { label: "Live Positions", href: "/dashboard/live-trading/positions", icon: Activity },')
p.write_text(s)

# 5. Paper store close method if missing
p=Path("src/lib/paper/paper-store.ts"); s=p.read_text()
if "async closePosition(" not in s:
    insert_at=s.rfind("\n};")
    method=r'''
,
 async closePosition(positionId:string){
   const user=await currentUser();const account=await this.getAccount();
   const rows=await select("paper_positions",`owner_id=eq.${user.id}&id=eq.${encodeURIComponent(positionId)}&limit=1`);
   const row=rows[0];if(!row)throw new Error("Paper position not found");
   const position=positionFrom(row);if(!position.quantity)throw new Error("Paper position is already closed");
   const fillPrice=position.markPrice||position.averagePrice;
   const realizedDelta=(fillPrice-position.averagePrice)*position.quantity;
   const realizedPnl=position.realizedPnl+realizedDelta;
   const cash=account.cashBalance+(fillPrice*position.quantity);
   await update("paper_positions",`id=eq.${position.id}`,{quantity:0,mark_price:fillPrice,unrealized_pnl:0,realized_pnl:realizedPnl,updated_at:new Date().toISOString()});
   await update("paper_accounts",`id=eq.${account.id}`,{cash_balance:cash,buying_power:cash,equity:cash,daily_pnl:account.dailyPnl+realizedDelta,total_pnl:account.totalPnl+realizedDelta,updated_at:new Date().toISOString()});
   return {...position,quantity:0,markPrice:fillPrice,unrealizedPnl:0,realizedPnl,exitPrice:fillPrice,realizedDelta};
 }
'''
    s=s[:insert_at]+method+s[insert_at:]
    p.write_text(s)

# 6. Paper validation: optional SL/target/max controls
p=Path("src/lib/validation/paper-order.ts")
if p.exists():
    s=p.read_text()
    if "stopLoss" not in s:
        s=s.replace("});","  stopLoss: z.number().positive().optional(),\n  targetPrice: z.number().positive().optional(),\n  maxLoss: z.number().positive().optional(),\n  maxProfit: z.number().positive().optional(),\n});",1)
        p.write_text(s)

# 7. Add paper risk fields + separate positions link
p=Path("src/components/paper/paper-trading-workspace.tsx")
if p.exists():
    s=p.read_text()

    # State
    if 'const [stopLoss,setStopLoss]' not in s:
        s=s.replace(
            'const [stopPrice, setStopPrice] = useState("");',
            'const [stopPrice, setStopPrice] = useState("");\n  const [stopLoss,setStopLoss]=useState("");\n  const [targetPrice,setTargetPrice]=useState("");\n  const [maxLoss,setMaxLoss]=useState("");\n  const [maxProfit,setMaxProfit]=useState("");'
        )
        s=s.replace(
            'const [stopPrice,setStopPrice]=useState(""),',
            'const [stopPrice,setStopPrice]=useState(""),[stopLoss,setStopLoss]=useState(""),[targetPrice,setTargetPrice]=useState(""),[maxLoss,setMaxLoss]=useState(""),[maxProfit,setMaxProfit]=useState(""),'
        )

    # Payload
    if 'maxProfit: maxProfit ? Number(maxProfit)' not in s:
        s=s.replace(
            'stopPrice: stopPrice ? Number(stopPrice) : undefined,',
            'stopPrice: stopPrice ? Number(stopPrice) : undefined,\n        stopLoss: stopLoss ? Number(stopLoss) : undefined,\n        targetPrice: targetPrice ? Number(targetPrice) : undefined,\n        maxLoss: maxLoss ? Number(maxLoss) : undefined,\n        maxProfit: maxProfit ? Number(maxProfit) : undefined,'
        )

    # Dedicated positions link
    if '/dashboard/paper/positions' not in s:
        s=s.replace(
            'return (\n    <div className="space-y-6">',
            'return (\n    <div className="space-y-6">\n      <div className="flex justify-end"><a className="zx-secondary-action" href="/dashboard/paper/positions">Positions &amp; Square Off</a></div>'
        )
        s=s.replace(
            'return <div className="space-y-6">',
            'return <div className="space-y-6"><div className="flex justify-end"><a className="zx-secondary-action" href="/dashboard/paper/positions">Positions &amp; Square Off</a></div>',
            1
        )

    # Risk UI, inject before the primary Place button where possible
    risk_ui = """<div className="zx-risk-grid">
            <label>Stop loss<input type="number" min="0" step="any" value={stopLoss} onChange={(e)=>setStopLoss(e.target.value)} placeholder="Optional"/></label>
            <label>Target<input type="number" min="0" step="any" value={targetPrice} onChange={(e)=>setTargetPrice(e.target.value)} placeholder="Optional"/></label>
            <label>Max loss<input type="number" min="0" step="any" value={maxLoss} onChange={(e)=>setMaxLoss(e.target.value)} placeholder="Risk cap"/></label>
            <label>Max profit<input type="number" min="0" step="any" value={maxProfit} onChange={(e)=>setMaxProfit(e.target.value)} placeholder="Profit cap"/></label>
          </div>"""

    if 'className="zx-risk-grid"' not in s:
        candidates = [
            '<button disabled={busy || !Number(quantity)} onClick={() => void place()} className="zx-primary-action w-full">',
            '<button disabled={busy || !Number(quantity)} onClick={() => void place()} className="zx-primary-action mt-4">',
        ]
        for marker in candidates:
            if marker in s:
                s=s.replace(marker, risk_ui+'\n\n          '+marker,1)
                break

    p.write_text(s)

# 8. Upstox exit-all support
p=Path("src/lib/brokers/upstox-client.ts")
if p.exists():
    s=p.read_text()
    if "exitAllPositions" not in s:
        # patch object before closing
        s=s.replace('trades: () => upstoxGet("/order/trades/get-trades-for-day"),','trades: () => upstoxGet("/order/trades/get-trades-for-day"),\n  exitAllPositions: (segment?: string) => upstoxRequest(`/order/positions/exit${segment ? `?segment=${encodeURIComponent(segment)}` : ""}`, { method: "POST" }),')
        if "async function upstoxRequest" not in s:
            s=s.replace('async function upstoxGet(path: string) {', 'async function upstoxRequest(path: string, init?: RequestInit) {\n  const { token } = await getConnectedBrokerConnection("upstox");\n  const response = await fetch(`${API}${path}`, { ...init, headers: { Accept: "application/json", Authorization: `Bearer ${accessTokenFrom(token)}`, ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) }, cache: "no-store" });\n  const json = await response.json().catch(() => null);\n  if (!response.ok) throw new Error(`Upstox request failed (${response.status})`);\n  return json;\n}\n\nasync function upstoxGet(path: string) {')
        p.write_text(s)

# 9. cTrader close support
p=Path("src/lib/brokers/ctrader-json-client.ts")
if p.exists():
    s=p.read_text()
    if "CLOSE_POSITION_REQ" not in s: s=s.replace("NEW_ORDER_REQ: 2106,","NEW_ORDER_REQ: 2106,\n  CLOSE_POSITION_REQ: 2111,")
    if "export async function closeCTraderPosition" not in s:
        s += r'''

export async function closeCTraderPosition(input:{accountId:string;isLive:boolean;positionId:string;volume:number}){
  if(!input.positionId||!Number.isFinite(input.volume)||input.volume<=0)throw new Error("A valid cTrader position and close volume are required");
  return withAuthorizedAccount(input.accountId,input.isLive,async(ws,id)=>{
    const requestId=send(ws,PAYLOAD.CLOSE_POSITION_REQ,{ctidTraderAccountId:id,positionId:input.positionId,volume:Math.round(input.volume*100)});
    const response=await waitForMessage(ws,m=>m.clientMsgId===requestId||m.payloadType===PAYLOAD.EXECUTION_EVENT,15000);
    return response.payload??{};
  });
}
'''
    p.write_text(s)

print("Final source patches applied")
PY

rm -rf .next
rm -f tsconfig.tsbuildinfo

echo "===== TYPECHECK ====="
npm run typecheck

echo "===== PATCH INSTALLED ====="
echo "Do not commit yet."
