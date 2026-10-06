/* License credits for films deliberately published for redistribution. */
(()=>{
 const LX=window.LX;
 const safe=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function isItem(item){return item?.type==='Filme'&&item.openFilm===true&&!!item.mediaKey&&!!safe(item.license?.url)&&!!safe(item.license?.evidenceUrl)}
 function credits(item){
  if(!isItem(item))return '';
  const l=item.license,source=safe(l.sourceUrl),license=safe(l.url),evidence=safe(l.evidenceUrl);
  return `<aside class="lx-open-film-credit" aria-label="Créditos e licença do filme"><strong>${esc(l.credit||`${item.title} · ${l.creator||item.sourceProvider}`)}</strong><span>${esc(l.changes||'Reproduzido sem edição pela LX Plus.')}</span><div><a href="${license}" target="_blank" rel="noopener noreferrer">${esc(l.name||'Licença aberta')} ↗</a>${source?`<a href="${source}" target="_blank" rel="noopener noreferrer">Fonte e créditos ↗</a>`:''}${evidence&&evidence!==source?`<a href="${evidence}" target="_blank" rel="noopener noreferrer">Permissão de uso ↗</a>`:''}</div></aside>`;
 }
 LX.openFilms={isItem,credits};
})();
