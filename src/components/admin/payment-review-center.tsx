"use client";

import { useCallback,useEffect,useState } from "react";
import { CheckCircle2,RefreshCw,XCircle } from "lucide-react";

export function PaymentReviewCenter(){
  const[rows,setRows]=useState<Record<string,unknown>[]>([]);
  const[busy,setBusy]=useState<string|null>(null);
  const load=useCallback(async()=>{const r=await fetch("/api/admin/billing/requests",{cache:"no-store"}),j=await r.json();setRows(j.data?.requests??[])},[]);
  useEffect(()=>{void load()},[load]);

  async function review(id:string,action:"approve"|"reject"){
    setBusy(id);
    try{
      const note=action==="reject"?window.prompt("Reason for rejection (optional)")??"":undefined;
      const r=await fetch("/api/admin/billing/requests",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestId:id,action,note})});
      if(!r.ok){const j=await r.json();throw new Error(j.error?.message??"Review failed")}
      await load();
    }finally{setBusy(null)}
  }

  return <div className="space-y-5">
    <div className="flex items-center justify-between"><div><p className="eyebrow">Billing CMS</p><h1 className="text-4xl font-semibold">Payment verification</h1><p>Approve only after matching UTR, amount and payment proof.</p></div><button className="zx-secondary-action" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Refresh</button></div>
    <div className="grid gap-3">
      {rows.map(row=><article className="zx-admin-payment-row" key={String(row.id)}>
        <div><small>Upgrade</small><strong>{String(row.submitted_from_plan??"free")} → {String(row.requested_plan_name??row.plan_id)}</strong><span>₹{Number(row.amount_inr).toLocaleString("en-IN")}</span></div>
        <div><small>UTR</small><strong>{String(row.utr)}</strong><small>{String(row.payer_name??"")}</small><small>{String(row.payer_upi??"")}</small></div>
        <div><small>Status</small><strong>{String(row.status)}</strong></div>
        <div className="zx-admin-proof"><small>Payment proof</small>{typeof row.payment_proof_data==="string"&&row.payment_proof_data.startsWith("data:image/")?<a href={row.payment_proof_data} target="_blank" rel="noreferrer"><img src={row.payment_proof_data} alt="Payment proof"/></a>:<span>No proof</span>}</div>
        <div className="zx-admin-review-actions"><button disabled={busy===row.id||row.status!=="pending"} onClick={()=>void review(String(row.id),"approve")}><CheckCircle2/>Approve & Unlock</button><button disabled={busy===row.id||row.status!=="pending"} onClick={()=>void review(String(row.id),"reject")}><XCircle/>Reject</button></div>
      </article>)}
      {!rows.length?<div className="panel">No payment requests yet.</div>:null}
    </div>
  </div>
}
