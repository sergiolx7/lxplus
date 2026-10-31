import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {handleAi} from './handler.mjs';
Deno.serve((request:Request)=>handleAi(request,{createClient,env:(name:string)=>Deno.env.get(name)||''}));
