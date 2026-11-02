// A share link is only a navigation hint. The server checks publication and RLS.
export function cinemaShareUrl(originUrl,id){
 const value=String(id??'');
 if(!/^\d{1,18}$/.test(value))throw new Error('ID de conteúdo inválido.');
 const url=new URL(originUrl);url.searchParams.delete('recovery');url.searchParams.delete('lx-reload');url.searchParams.set('lx-item',value);url.hash='Início';
 return url.href;
}
export function cinemaSharedId(input){
 try{const id=new URL(input).searchParams.get('lx-item');return /^\d{1,18}$/.test(id||'')?id:null}catch{return null}
}
export function cinemaHomeUrl(originUrl){
 const url=new URL(originUrl);url.searchParams.delete('lx-item');url.searchParams.delete('recovery');url.hash='Início';return url.href;
}
