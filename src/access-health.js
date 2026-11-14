// Probe the gateway independently of the SDK's session refresh retries.
// A project-wide outage must never look like an incorrect personal password.
export function accessRestriction(error){
 const message=String(error?.message||'');
 return Number(error?.status)===402||/exceed_storage_size_quota|service for this project is restricted/i.test(message);
}
export const deferSessionRefresh=health=>health?.status===402||health?.status===503;
export function sessionClient({health,create}){
 let client=deferSessionRefresh(health)?null:create();
 return {get current(){return client},resume(){if(client)return null;client=create();return client}};
}

export async function probeAccessHealth({url,key,fetcher=globalThis.fetch,timeoutMs=5000}){
 try{
  const response=await fetcher(url+'/auth/v1/health',{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(timeoutMs)});
  if(response.status===402)return {status:402,code:'service_restricted'};
  if(response.status===503)return {status:503,code:'service_unavailable'};
  // Older/custom gateways may not expose health; let normal authentication decide.
  return {status:response.ok?200:0};
 }catch{return {status:0}}
}
