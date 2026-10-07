/* Video browsing rules shared by the published bundle and QA. */
(()=>{
 'use strict';
 const LX=window.LX;
 function duration(item){
  if(Number(item?.durationSeconds)>0)return Number(item.durationSeconds);
  const value=String(item?.duration||'').trim().toLowerCase();
  let m=value.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
  if(m)return m[3]?(+m[1]*3600+ +m[2]*60+ +m[3]):(+m[1]*60+ +m[2]);
  const hours=value.match(/(\d+)\s*h/),minutes=value.match(/(\d+)\s*(?:min|m(?!s))/);
  return (hours?+hours[1]*3600:0)+(minutes?+minutes[1]*60:0);
 }
 const playable=item=>typeof LX.catalogReady==='function'?LX.catalogReady(item):!!(item?.mediaKey||item?.authorizedVideoUrl||item?.episodes?.some(e=>e.mediaKey));
 const historical=item=>item?.openFilm===true&&!item.openFilmEvidence?.producerPage;
 const long=item=>item?.type==='Filme'&&duration(item)>=3600;
 const newest=(a,b)=>(+b.year||0)-(+a.year||0)||(+b.priority||0)-(+a.priority||0)||String(a.title||'').localeCompare(String(b.title||''),'pt-BR');
 function groups(items){
  const films=items.filter(x=>x.type==='Filme').sort(newest);
  const recent=films.filter(x=>playable(x)&&long(x)&&+x.year>=2020&&!historical(x));
  const recentIds=new Set(recent.map(x=>x.id));
  return {
   recent,
   films:films.filter(x=>playable(x)&&!recentIds.has(x.id)&&!historical(x)&&(!duration(x)||long(x))),
   catalog:films.filter(x=>!playable(x)&&!historical(x)),
   shorts:films.filter(x=>playable(x)&&duration(x)>0&&!long(x)&&!historical(x)),
   historical:films.filter(historical),
   doramas:items.filter(x=>x.type==='Dorama').sort(newest),
   series:items.filter(x=>['Série','Serie'].includes(x.type)).sort(newest),
   anime:items.filter(x=>x.type==='Anime').sort(newest)
  };
 }
 function credits(item){
  if(!item?.officialEmbedded||!/^youtube:[\w-]{11}$/.test(item.mediaKey||''))return '';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<aside class="lx-cinema-provider-credit"><strong>${esc(item.sourceProvider||'Canal oficial')} + YouTube</strong><span>Filme completo · ${esc(item.duration||'')} · Reprodução oficial dentro da LX Plus. Áudio, legendas, anúncios e disponibilidade seguem o canal.</span></aside>`;
 }
 LX.cinemaCatalog={duration,playable,historical,long,newest,groups,credits};
})();
