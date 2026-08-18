"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, ShieldCheck, Upload, WalletCards } from "lucide-react";
import { planDefinitions } from "@/config/plans";
import type { Plan } from "@/types/entitlements";

function compressProof(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    if(!file.type.startsWith("image/")){reject(new Error("Upload an image screenshot only."));return}
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Could not read payment proof."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("Invalid image."));
      img.onload=()=>{
        const max=1200;
        const scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d");
        if(!ctx){reject(new Error("Could not process proof image."));return}
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const data=canvas.toDataURL("image/jpeg",0.72);
        if(data.length>1_100_000){reject(new Error("Payment proof is still too large. Upload a smaller screenshot."));return}
        resolve(data);
      };
      img.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function BillingWorkspace({initialPlan}:{initialPlan?:string}){
  const[selected,setSelected]=useState<Plan>((initialPlan as Plan)||"starter");
  const[utr,setUtr]=useState("");
  const[payerName,setPayerName]=useState("");
  const[payerUpi,setPayerUpi]=useState("");
  const[proof,setProof]=useState("");
  const[currentPlan,setCurrentPlan]=useState<Plan>("free");
  const[message,setMessage]=useState("");
  const[busy,setBusy]=useState(false);

  const plan=useMemo(()=>planDefinitions.find(p=>p.id===selected)??planDefinitions.find(p=>p.id==="starter")??planDefinitions[0]!,[selected]);
  const phone=process.env.NEXT_PUBLIC_ZERION_PAYMENT_PHONE||"9019254743";
  const upi=process.env.NEXT_PUBLIC_ZERION_PAYMENT_UPI||"";

  useEffect(()=>{
    const q=new URLSearchParams(window.location.search);
    const requested=q.get("plan") as Plan|null;
    if(requested&&planDefinitions.some(p=>p.id===requested))setSelected(requested);
    void fetch("/api/billing/subscription",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(j.data?.plan?.id)setCurrentPlan(j.data.plan.id)});
  },[]);

  const amount=plan.launchPriceInr&&plan.launchPriceInr>0?plan.launchPriceInr:plan.monthlyPriceInr;
  const uri=upi&&amount?`upi://pay?pa=${encodeURIComponent(upi)}&pn=Zerion%20X1&am=${amount}&cu=INR&tn=${encodeURIComponent(`Zerion X1 ${plan.name}`)}`:"";

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!utr.trim()){setMessage("Enter the UTR/reference number after payment.");return}
    if(!proof){setMessage("Upload payment proof before submitting.");return}
    setBusy(true);setMessage("");
    try{
      const r=await fetch("/api/billing/payment-request",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({planId:selected,utr,payerName,payerUpi,paymentProof:proof})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error?.message||"Payment request failed");
      setMessage("Payment submitted for admin verification. Your upgraded plan unlocks only after approval.");
      setUtr("");setProof("");
    }catch(e){setMessage(e instanceof Error?e.message:"Payment request failed")}finally{setBusy(false)}
  }

  return <div className="space-y-6">
    <section className="zx-billing-summary"><div><p className="eyebrow">Your Zerion plan</p><h1>{planDefinitions.find(p=>p.id===currentPlan)?.name??"Free"}</h1><p>Every new account starts on Free. Upgrade whenever you need the next level.</p></div><ShieldCheck/></section>
    <div className="zx-billing-layout">
      <section className="zx-plan-picker"><p className="eyebrow">Choose plan</p>{planDefinitions.filter(p=>!p.enterprise&&p.id!=="free").map(p=><button type="button" key={p.id} className={selected===p.id?"is-active":""} onClick={()=>setSelected(p.id)}><span><strong>{p.name}</strong><small>{p.tagline}</small></span><b>₹{(p.launchPriceInr||p.monthlyPriceInr)?.toLocaleString("en-IN")}</b></button>)}</section>
      <section className="zx-payment-card">
        <WalletCards/><p className="eyebrow">Manual UPI payment</p><h2>Upgrade to {plan.name}</h2><p className="zx-payment-amount">₹{amount?.toLocaleString("en-IN")}</p>
        <div className="zx-payment-destination"><span>Payment phone</span><strong>{phone}</strong></div>
        <div className="zx-payment-destination"><span>UPI ID</span><strong>{upi||"Add UPI ID in Zerion billing config"}</strong>{upi?<button type="button" onClick={()=>navigator.clipboard.writeText(upi)}><Copy/></button>:null}</div>
        {uri?<a className="zx-primary-action" href={uri}>Pay with UPI app</a>:null}
        <form onSubmit={submit} className="zx-payment-form">
          <label>UTR / payment reference<input value={utr} onChange={e=>setUtr(e.target.value)} placeholder="Enter UTR after payment"/></label>
          <label>Payer name<input value={payerName} onChange={e=>setPayerName(e.target.value)} placeholder="Name used for payment"/></label>
          <label>Payer UPI ID (optional)<input value={payerUpi} onChange={e=>setPayerUpi(e.target.value)} placeholder="yourname@upi"/></label>
          <label className="zx-payment-proof-input">Payment proof screenshot
            <input type="file" accept="image/*" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{setProof(await compressProof(f));setMessage("")}catch(err){setMessage(err instanceof Error?err.message:"Could not process proof")}}}/>
            <small>Screenshot is compressed before submission and shown to admin for verification.</small>
          </label>
          {proof?<img src={proof} alt="Payment proof preview" className="zx-proof-preview"/>:null}
          <button className="zx-primary-action" disabled={busy}><Upload className="mr-2 h-4 w-4"/>{busy?"Submitting…":"Submit payment for verification"}</button>
        </form>
        {message?<div className="zx-billing-message"><CheckCircle2/>{message}</div>:null}
      </section>
    </div>
  </div>
}
