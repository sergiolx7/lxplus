// LX Social preview: public profiles only, with a real client-side search.
// Messaging, following and calls are intentionally NOT simulated as working.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safePicture=s=>{try{const u=new URL(String(s||''));return u.protocol==='https:'?u.href:''}catch{return ''}};
const cleanHandle=s=>String(s||'').replace(/^@/,'').trim();
export function renderSocialMembers(members,term=''){
 const q=String(term||'').trim().toLocaleLowerCase('pt-BR');
 const list=(Array.isArray(members)?members:[]).filter(p=>{
  if(!p||!p.ranking_visible&&p.ranking_visible!==undefined)return false;
  return !q||[p.name,p.username,p.bio].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(q));
 });
 if(!list.length)return '<div class="social-empty"><h3>Nenhum perfil público encontrado</h3><p>Tente outro nome ou @. Perfis privados não aparecem na pesquisa.</p></div>';
 return list.map(p=>{
  const handle=cleanHandle(p.username);
  const image=safePicture(p.avatar_url);
  const letters=esc(String(p.name||'LX').trim().split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase());
  return '<article class="social-person"><div class="social-person-head">'+(image?'<img class="social-face" src="'+esc(image)+'" alt="" loading="lazy">':'<div class="social-face social-initials">'+letters+'</div>')+
  '<div class="social-person-name"><strong>'+esc(p.name||'Membro LX')+(p.verified?' <span title="Perfil verificado">✓</span>':'')+'</strong><small>'+(handle?'@'+esc(handle):'Membro da comunidade')+'</small></div></div><p>'+esc(p.bio||'Aqui para descobrir filmes, músicas e novas amizades.')+'</p>'+
  (handle?'<button class="btn small social-handle-copy" type="button" data-copy-handle="'+esc(handle)+'">Copiar @'+esc(handle)+'</button>':'<span class="social-profile-note">Identificador ainda não definido</span>')+
  '</article>';
 }).join('');
}
export function renderCommunity({members=[],profile=null,term=''}={}){
 const count=members.length;
 return '<div class="social-scene"><div class="social-hero"><div><span class="premium-overline">LX SOCIAL · CONECTE-SE</span><h1>O melhor do entretenimento também é compartilhar.</h1><p>Descubra pessoas da comunidade, encontre perfis públicos e acompanhe as novidades da LX Plus.</p></div><div class="social-hero-mark">LX<span>SOCIAL</span></div></div>'+
 '<div class="social-layout"><section class="social-main"><div class="social-head"><div><span class="premium-overline">COMUNIDADE</span><h2>Encontre pessoas</h2><p>'+count+' perfis disponíveis nesta lista</p></div></div>'+
 '<label class="social-search-label" for="memberSearch">Pesquisar membros da comunidade</label><input class="search social-search" type="search" id="memberSearch" placeholder="Nome ou @identificador" aria-label="Buscar perfis públicos" value="'+esc(term)+'">'+
 '<div id="socialMemberList" class="social-member-grid">'+renderSocialMembers(members,term)+'</div></section>'+
 '<aside class="social-aside"><div class="panel"><span class="premium-overline">SEU PERFIL</span><h3>'+esc(profile?.name||'Sua conta LX')+'</h3><p>'+(profile?.username?'@'+esc(cleanHandle(profile.username)):'Personalize seu perfil para ser encontrado por outros membros.')+'</p><button class="btn" type="button" data-page="Perfil">Editar perfil</button></div>'+
 '<div class="panel"><span class="premium-overline">PRÓXIMOS RECURSOS</span><h3>Conversas e chamadas</h3><p>Mensagens, feed, chamadas e solicitações de amizade serão reativados quando as regras de privacidade e os testes estiverem completos.</p><span class="social-profile-note">Ainda em preparação</span></div></aside></div></div>';
}
