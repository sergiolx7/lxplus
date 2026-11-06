import {esc} from './ui.js';

export function previewImageUrl(value,origin=globalThis.location?.origin){
 try{
  if(!value)return '';
  const url=new URL(value,origin);
  if(url.username||url.password)return '';
  return url.protocol==='https:'||url.protocol==='http:'&&url.origin===origin?url.href:'';
 }catch{return ''}
}

// A separate native dialog preserves the profile underneath and restores focus.
export function openImagePreview(url,label='Foto do perfil'){
 const source=previewImageUrl(url);if(!source)throw Error('Esta foto não está disponível para ampliar.');
 const previous=document.activeElement,dialog=document.createElement('dialog');
 dialog.className='lx-image-preview';dialog.setAttribute('aria-label',label);
 dialog.innerHTML='<div class="lx-image-preview-toolbar"><strong>'+esc(label)+'</strong><button type="button" class="icon-button" aria-label="Fechar foto ampliada">×</button></div><img alt="'+esc(label)+'"><p>A imagem inteira, sem recorte.</p>';
 const image=dialog.querySelector('img');image.src=source;
 image.addEventListener('error',()=>{image.hidden=true;dialog.querySelector('p').textContent='Não foi possível carregar esta foto. Feche e tente novamente.'},{once:true});
 let closed=false;
 const finish=()=>{if(closed)return;closed=true;dialog.remove();if(previous?.isConnected)previous.focus()};
 const close=()=>{if(dialog.open&&dialog.close)dialog.close();finish()};
 dialog.querySelector('button').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 dialog.addEventListener('close',finish,{once:true});
 document.body.appendChild(dialog);
 if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
 return close;
}
