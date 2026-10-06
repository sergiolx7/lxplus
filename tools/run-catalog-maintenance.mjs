// Run on a trusted server scheduler; the web client never receives JOB_SECRET.
const required=['SUPABASE_URL','LX_CATALOG_GATEWAY_JWT','LX_CATALOG_JOB_SECRET'];
if(required.some(name=>!process.env[name]))throw new Error('Missing server scheduler configuration');
const base=new URL(process.env.SUPABASE_URL);
if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.username||base.password)throw new Error('Invalid Supabase endpoint');
const response=await fetch(new URL('/functions/v1/lx-universal-catalog',base),{
  method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+process.env.LX_CATALOG_GATEWAY_JWT,'x-lx-job-secret':process.env.LX_CATALOG_JOB_SECRET},
  body:JSON.stringify({action:'maintenance'}),signal:AbortSignal.timeout(115000)
});
const result=await response.json();
if(!response.ok||result.error)throw new Error(result.error||'CATALOG_MAINTENANCE_FAILED');
console.log(JSON.stringify({at:new Date().toISOString(),skipped:!!result.skipped,jobs:result.jobs?.length||0,checked_sources:result.health?.sources?.length||0}));
