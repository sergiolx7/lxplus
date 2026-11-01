export function normalizeIceServers(data){
 return (Array.isArray(data?.iceServers)?data.iceServers:[]).map(server=>({urls:(Array.isArray(server.urls)?server.urls:[server.urls]).filter(url=>typeof url==='string'&&url.length<512&&/^(stun:|turn:|turns:)/.test(url)&&!/:53(?:\?|$)/.test(url)),...(typeof server.username==='string'&&server.username.length<512?{username:server.username}:{}),...(typeof server.credential==='string'&&server.credential.length<4096?{credential:server.credential}:{})})).filter(server=>server.urls.length);
}
export async function cloudflareCredentials({id,token},{fetcher=fetch}={}){
 if(!id||!token)throw Error('TURN_NOT_CONFIGURED');if(!/^[a-z0-9_-]{1,128}$/i.test(id))throw Error('TURN_INVALID_KEY');
 const response=await fetcher('https://rtc.live.cloudflare.com/v1/turn/keys/'+id+'/credentials/generate-ice-servers',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({ttl:3600}),signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw Error([401,403,404].includes(response.status)?'TURN_CREDENTIALS_REJECTED':'RTC_PROVIDER_UNAVAILABLE');
 const iceServers=normalizeIceServers(await response.json());if(!iceServers.some(server=>server.urls.some(url=>/^turns?:/.test(url))))throw Error('RTC_PROVIDER_UNAVAILABLE');
 return {iceServers,turnConfigured:true,expiresIn:3600,relaySource:'cloudflare'};
}
