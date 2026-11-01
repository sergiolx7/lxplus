import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {handleProfileMedia} from './handler.mjs';
Deno.serve((request:Request)=>handleProfileMedia(request,{createClient,env:(name:string)=>Deno.env.get(name)||''}));
