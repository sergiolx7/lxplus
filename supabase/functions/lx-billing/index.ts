import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createBillingHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_ANON_KEY')!;
const client=(token:string)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
Deno.serve(createBillingHandler({
 origins:['https://xn--rifamilionria-deb.api.br','https://sergiolx7.github.io'],
 authenticate:async(token:string)=>{const {data,error}=await client(token).auth.getUser(token);return error?null:data.user},
 runAction:(token:string,action:string,data:unknown)=>client(token).rpc('lx_billing',{p_action:action,p_data:data})
}));
