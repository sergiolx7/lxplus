import test from 'node:test';
import assert from 'node:assert/strict';
import {profileMediaResult} from '../src/profile-media.js';

const failed=(status,body)=>({data:null,error:{name:'FunctionsHttpError',context:new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})}});
test('profile media: successful uploads preserve their URL and asset details',async()=>{
 const data={url:'https://assets.test/avatar.gif',animated:true,id:'asset'};
 assert.equal(await profileMediaResult({data,error:null}),data);
});
test('profile media: non-2xx response body preserves Premium errors and is not consumed',async()=>{
 const result=failed(403,{error:'PREMIUM_BANNER_REQUIRED'});
 await assert.rejects(profileMediaResult(result),/exclusivos Premium/);
 assert.equal((await result.error.context.json()).error,'PREMIUM_BANNER_REQUIRED');
 await assert.rejects(profileMediaResult({data:{error:'PREMIUM_REQUIRED'}}),/Premium ativo/);
});
test('profile media: expired sessions and oversized images have specific instructions',async()=>{
 await assert.rejects(profileMediaResult(failed(401,{message:'Invalid JWT'})),/sessão expirou/);
 await assert.rejects(profileMediaResult(failed(413,{error:'PROFILE_IMAGE_SIZE'}),{maxMB:10}),/até 10 MB/);
 await assert.rejects(profileMediaResult(failed(413,{})),/até 5 MB/);
});
test('profile media: saving failures do not incorrectly claim the server is unpublished',async()=>{
 await assert.rejects(profileMediaResult(failed(409,{error:'PROFILE_UPDATE_FAILED'})),error=>/salvar a imagem no perfil/.test(error.message)&&!/publicad|servidor/.test(error.message));
});
test('profile media: invalid and unsupported images have actionable messages',async()=>{
 await assert.rejects(profileMediaResult(failed(400,{error:'PROFILE_IMAGE_INVALID'})),/incompleta ou inválida/);
 await assert.rejects(profileMediaResult(failed(400,{error:'PROFILE_IMAGE_FORMAT'})),/JPG, PNG, WebP ou GIF/);
});
test('profile media: transport failures and unexpected server details are handled safely',async()=>{
 await assert.rejects(profileMediaResult({error:{name:'FunctionsFetchError'}}),/Confira sua conexão/);
 for(const result of [failed(500,{error:'permission denied for private_function',message:'private details'}),{error:{context:new Response('<html>bad gateway</html>',{status:502})}},{}]) {
  await assert.rejects(profileMediaResult(result),error=>/temporariamente indisponível/.test(error.message)&&!/private|gateway|publicada/.test(error.message));
 }
});
