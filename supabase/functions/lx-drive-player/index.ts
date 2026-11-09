import {handleDrivePlayer} from './handler.mjs';
Deno.serve((req:Request)=>handleDrivePlayer(req,{env:(name:string)=>Deno.env.get(name)}));
