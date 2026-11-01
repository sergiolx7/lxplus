import {handleMetadata} from './handler.mjs';
Deno.serve(request=>handleMetadata(request,{env:name=>Deno.env.get(name)}));
