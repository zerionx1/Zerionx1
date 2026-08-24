from pathlib import Path
import re,sys
ROOT=Path.cwd();ALLOWED={'#F7F4ED','#2F2A25','#3E4A3F','#E6D8C3'};bad=[]
u=re.compile(r'\b(?:bg|text|border|ring|outline|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:/\d+)?')
for p in (ROOT/'src').rglob('*'):
 if not p.is_file() or p.suffix not in {'.css','.tsx','.ts','.jsx','.js'}:continue
 t=p.read_text()
 for m in re.finditer(r'#[0-9A-Fa-f]{3,8}\b',t):
  if m.group(0).upper() not in ALLOWED:bad.append((p,m.group(0)))
 if re.search(r'(?i)\b(?:rgb|rgba|hsl|hsla)\(',t):bad.append((p,'rgb/hsl'))
 m=u.search(t)
 if m:bad.append((p,m.group(0)))
if bad:
 print('FOUR-COLOR AUDIT FAILED');[print(f'{p.relative_to(ROOT)}: {v}') for p,v in bad[:120]];sys.exit(1)
print('FOUR-COLOR AUDIT PASSED')
