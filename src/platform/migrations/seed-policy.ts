export function assertSeedAllowed(environment:string):void{if(environment==='production'&&process.env.ALLOW_PRODUCTION_SEED!=='true')throw new Error('Production seeding blocked')}
