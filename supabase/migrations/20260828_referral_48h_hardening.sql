begin;

-- User requirement: first qualifying paid subscription must occur inside the 48h referral window.
-- Also lock low-tier commissions to 12-15%, rising to 24-25% for higher referrer tiers.
insert into public.referral_rate_config(plan_id,commission_rate,enabled) values
('free',0.12,true),('starter',0.15,true),('pro',0.20,true),('elite',0.24,true),('ultra',0.25,true),('prime',0.25,true),('enterprise',0.25,true)
on conflict(plan_id) do update set commission_rate=excluded.commission_rate,enabled=excluded.enabled,updated_at=now();

create or replace function public.award_first_referral_subscription() returns trigger
language plpgsql security definer set search_path=public as $$
declare
  attr public.referral_attributions;
  ref_plan text;
  rate numeric(6,5);
  amount numeric(14,2);
  prior_count integer;
begin
  if new.status<>'active' or new.plan_id='free' then return new; end if;

  select * into attr
  from public.referral_attributions
  where referred_id=new.owner_id
    and new.created_at <= expires_at
  limit 1;
  if attr.id is null then return new; end if;

  select count(*) into prior_count
  from public.subscriptions
  where owner_id=new.owner_id
    and plan_id<>'free'
    and status='active'
    and id<>new.id
    and created_at<new.created_at;
  if prior_count>0 then return new; end if;
  if exists(select 1 from public.referral_rewards where attribution_id=attr.id) then return new; end if;

  select plan_id into ref_plan
  from public.subscriptions
  where owner_id=attr.referrer_id
    and status='active'
    and (expires_at is null or expires_at>new.created_at)
  order by created_at desc limit 1;
  ref_plan:=coalesce(ref_plan,'free');

  select commission_rate into rate from public.referral_rate_config where plan_id=ref_plan and enabled=true;
  rate:=coalesce(rate,0.12);

  if new.payment_request_id is not null then
    select amount_inr into amount from public.payment_requests where id=new.payment_request_id;
  end if;
  if amount is null then
    amount:=case new.plan_id when 'starter' then 1200 when 'pro' then 3499 when 'elite' then 5499 when 'ultra' then 7499 when 'prime' then 12499 else 0 end;
  end if;
  if coalesce(amount,0)<=0 then return new; end if;

  insert into public.referral_rewards(attribution_id,subscription_id,referrer_id,referred_id,referrer_plan_id,referred_plan_id,qualifying_amount,commission_rate,commission_amount,status)
  values(attr.id,new.id,attr.referrer_id,new.owner_id,ref_plan,new.plan_id,amount,rate,round(amount*rate,2),'pending')
  on conflict(attribution_id) do nothing;
  return new;
end$$;

commit;
