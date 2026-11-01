import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {handleRtc} from './handler.mjs';
Deno.serve((request:Request)=>handleRtc(request,{createClient,env:(name:string)=>Deno.env.get(name)||''}));
