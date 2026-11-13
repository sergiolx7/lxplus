import {BACKEND} from './config.js';
import {authServiceMessage} from './auth-feedback.js';

export const authServiceBlocked=state=>state==='restricted'||state==='unavailable';

// A read-only probe: no credentials, account changes, token removal or automatic retries.
// Unknown/network failures leave the normal login available for the actual auth request.
export async function probeAuthAvailability({fetcher=globalThis.fetch,url=BACKEND.url,key=BACKEND.key,timeout=5000}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetcher(url+'/auth/v1/health',{headers:{apikey:key},cache:'no-store',signal:controller.signal});
  if(response.ok)return 'ready';
  if(response.status===402)return 'restricted';
  return response.status>=500&&response.status<=599?'unavailable':'unknown';
 }catch{return 'unknown'}finally{clearTimeout(timer)}
}

export function syncAuthAvailability(root,state){
 const blocked=authServiceBlocked(state),notice=root.querySelector('[data-auth-service]');
 if(notice){
  notice.hidden=!blocked;
  notice.replaceChildren();
  if(blocked){
   const title=document.createElement('strong'),text=document.createElement('p'),retry=document.createElement('button');
   title.textContent='Acesso temporariamente indisponível';text.textContent=authServiceMessage(state);
   retry.type='button';retry.className='btn small';retry.dataset.authServiceRetry='';retry.textContent='Verificar disponibilidade';
   notice.append(title,text,retry);
  }
 }
 root.querySelectorAll('#signin .btn.primary,#signup .btn.primary,#reset .btn.primary,#newPassword .btn.primary,#resend').forEach(button=>{
  button.disabled=blocked||button.closest('form')?.getAttribute('aria-busy')==='true';
 });
}
