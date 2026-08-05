import { existsSync,readFileSync } from 'node:fs';
const required=['src/app/loading.tsx','src/app/error.tsx','src/app/global-error.tsx','src/lib/persistence/local-store.ts','src/lib/activity/client.ts','src/components/system/GlobalProviders.tsx','docs/phase-7/production-integration.md'];
const missing=required.filter((file)=>!existsSync(file));if(missing.length)throw new Error(`Missing Phase 7 files: ${missing.join(', ')}`);
const pkg=JSON.parse(readFileSync('package.json','utf8'));if(!pkg.scripts['verify:phase7'])throw new Error('verify:phase7 script missing');console.log('Phase 7 structural verification passed.');
