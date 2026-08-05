import fs from 'node:fs';fs.writeFileSync('release-manifest.json',JSON.stringify({generatedAt:new Date().toISOString(),commit:process.env.VERCEL_GIT_COMMIT_SHA??'local'},null,2));
