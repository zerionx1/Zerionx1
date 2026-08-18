#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "${HOME}/Projects/zerion-x1"
touch .env.local; chmod 600 .env.local
ZERION_UPI="tradewithsyed@ybl"
export ZERION_UPI
python - <<'P'
from pathlib import Path; import os
p=Path('.env.local'); vals={'NEXT_PUBLIC_ZERION_PAYMENT_PHONE':'9019254743','NEXT_PUBLIC_ZERION_PAYMENT_UPI':os.environ['ZERION_UPI'].strip()}; L=p.read_text().splitlines(); out=[]; seen=set()
for line in L:
 if '=' in line and not line.lstrip().startswith('#'):
  k=line.split('=',1)[0].strip()
  if k in vals: out.append(f'{k}={vals[k]}'); seen.add(k); continue
 out.append(line)
for k,v in vals.items():
 if k not in seen: out.append(f'{k}={v}')
p.write_text('\n'.join(out).rstrip()+'\n'); print('Payment phone: PRESENT'); print('Payment UPI ID: PRESENT' if vals['NEXT_PUBLIC_ZERION_PAYMENT_UPI'] else 'Payment UPI ID: MISSING')
P
