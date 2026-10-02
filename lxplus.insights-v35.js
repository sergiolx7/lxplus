/* LX Music: measured listening, monthly recap and community ranking. */
(()=>{'use strict';
 const LX=window.LX, $=id=>document.getElementById(id), db=()=>LX.cloud?.db?.(), uid=()=>LX.state?.user?.id;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>Math.floor(Number(n)||0).toLocaleString('pt-BR');
 const monthNow=()=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit'}).formatToParts(new Date());return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value;};
 const minute=s=>number((s||0)/60), monthLabel=m=>new Date(m.slice(0,7)+'-02T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 let videoPrevious=null,videoSession=null;
 let session=null, previous=null, sending=false, lastFlush=0, requestId=0, lastUser='',activityVisible=false;
 const pending=new Map();
 function sampleDelta(before,after){
  if(!before||!after.playing||!before.playing||before.key!==after.key||before.user!==after.user||after.seeking)return 0;
  const wall=(after.at-before.at)/1000,media=after.position-before.position;
  return wall>0&&wall<=90&&media>0&&media<=wall*Math.max(.25,after.rate||1)+2 ? Math.min(wall,media/Math.max(.25,after.rate||1)) : 0;
 }
 function musicSample(){const a=$('musicAudio'),t=LX.currentMusic?.();if(!t||!a||!uid())return null;
  const external=$('musicDock')?.classList.contains('external-provider'),p=LX.musicPlaybackSnapshot?.();
  return {key:String(t.contentId)+':'+String(t.index||0),user:uid(),at:performance.now(),position:external?Number(p?.position||0):a.currentTime,playing:external?!!p?.playing:!a.paused&&!a.ended&&a.readyState>=2,seeking:a.seeking,rate:external?1:a.playbackRate,title:t.title||'Faixa',artist:t.artist||'LX Music',duration:external?Number(p?.duration||0):a.duration};
 }
 function tick(){
  sampleVideo();
  const next=musicSample();
  if(lastUser!==String(uid()||'')){lastUser=String(uid()||'');previous=null;session=null;pending.clear();activityVisible=false;loadPrivacy();}
  if(next){
   if(!session||session.key!==next.key){if(session?.total>0)pending.set(session.id,{...session});session={...next,id:crypto.randomUUID(),total:0,awarded:false};}
   const earned=sampleDelta(previous,next);session.total+=earned;session.duration=next.duration;
   if(earned>0)pending.set(session.id,{...session});
   if(!session.awarded&&session.total>=Math.min(75,Math.max(30,next.duration*.32))&&next.duration>=30){session.awarded=true;db()?.rpc('lx_rank_record_event',{p_event_type:'music_valid',p_ref_key:'music:'+session.id,p_metadata:{duration:Math.floor(next.duration),position:Math.min(Math.floor(next.duration),Math.floor(session.total)),content_id:next.key}}).then(({error})=>{if(error&&session?.id)console.warn('LX music award unavailable',error.code)});}
  }else if(session){if(session.total>0)pending.set(session.id,{...session});session=null;}
  previous=next;
  if(Date.now()-lastFlush>20000)flush();
 }
 function sampleVideo(){
  const h=$('lxGlobalCinema'),v=h?.shadowRoot?.querySelector('#video');
  if(!v||!uid()){videoPrevious=null;videoSession=null;return;}
  const key=String(h.dataset.lxContentId||'')+':'+String(h.__lxMedia?.number||0),next={key,user:uid(),at:performance.now(),position:v.currentTime,playing:!v.paused&&!v.ended&&v.readyState>=2,seeking:v.seeking,rate:v.playbackRate};
  if(!videoSession||videoSession.host!==h||videoSession.user!==uid())videoSession={host:h,user:uid(),id:crypto.randomUUID(),total:0,awarded:false};
  videoSession.total+=sampleDelta(videoPrevious,next);videoPrevious=next;
  if(!videoSession.awarded&&v.duration>=60&&videoSession.total>=Math.min(180,Math.max(45,v.duration*.2))){videoSession.awarded=true;db()?.rpc('lx_rank_record_event',{p_event_type:'watch_valid',p_ref_key:'watch:'+videoSession.id,p_metadata:{duration:Math.floor(v.duration),position:Math.min(Math.floor(v.duration),Math.floor(videoSession.total)),content_id:key}}).then(({error})=>{if(error)console.warn('LX watch award unavailable',error.code)});}
 }
 async function flush(){if(sending||!db()||!uid()||!pending.size)return;sending=true;lastFlush=Date.now();const user=uid();
  try{for(const [id,s] of pending){if(uid()!==user)break;if(s.user!==user){pending.delete(id);continue;}const sent=Math.floor(s.total);if(sent<1){pending.delete(id);continue;}
   const {error}=await db().rpc('lx_record_listening',{p_session:id,p_track:s.key,p_title:s.title,p_artist:s.artist,p_total:sent});
   if(error)break;if(pending.get(id)?.total===s.total)pending.delete(id);
  }}finally{sending=false;}
 }
 async function loadPrivacy(){const user=uid();if(!user||!db())return;const {data,error}=await db().from('lx_profiles').select('activity_visible').eq('user_id',user).maybeSingle();if(uid()===user&&!error)activityVisible=data?.activity_visible!==false;}
 function activity(){const s=musicSample();return activityVisible&&s?.playing&&LX.social?.presenceVisible?.()!==false?{title:s.title.slice(0,200),artist:s.artist.slice(0,160)}:null;}
 function skeleton(title){const modal=$('modal');modal.innerHTML=`<button class="close-btn" aria-label="Fechar" onclick="LX.ui.close()">×</button><section class="lx-insights"><span class="eyebrow">LX MUSIC</span><h2>${esc(title)}</h2><p role="status">Carregando seus resultados…</p></section>`;$('overlay').classList.remove('hidden');return modal;}
 function recapHTML(data,compact=false){if(data.private)return '<p class="lx-insight-empty">Este perfil mantém as estatísticas privadas.</p>';
  const total=Number(data.seconds)||0,months=data.months||[],max=Math.max(60,...months.map(x=>Number(x.seconds)));
  const list=(rows,artists)=>rows.length?rows.map((t,i)=>`<li><span class="lx-insight-position">${i+1}</span><div><b>${esc(artists?t.artist:t.title)}</b><small>${artists?'Artista':esc(t.artist)}</small></div><strong>${minute(t.seconds)} <small>min</small></strong></li>`).join(''):'<li class="lx-insight-empty">Suas próximas reproduções aparecem aqui.</li>';
  return `<div class="lx-recap-hero"><span>SEU MÊS NA LX</span><strong>${minute(total)}<small>minutos ouvidos</small></strong><p>${total?'A trilha sonora do seu mês.':'Dê o play. Seu mês começa com uma música.'}</p></div><div class="lx-recap-numbers"><div><b>${number(data.tracks)}</b><span>faixas</span></div><div><b>${number(data.artists)}</b><span>artistas</span></div><div><b>${number(data.days)}</b><span>dias com música</span></div></div><div class="lx-recap-columns"><section><h3>Suas mais ouvidas</h3><ol>${list((data.top_tracks||[]).slice(0,compact?5:10),false)}</ol></section><section><h3>Artistas do mês</h3><ol>${list(data.top_artists||[],true)}</ol></section></div>${!compact?`<section><h3>Mês a mês</h3><div class="lx-month-chart" role="img" aria-label="Minutos ouvidos por mês">${months.length?months.map(m=>`<div title="${esc(monthLabel(m.month))}: ${minute(m.seconds)} minutos"><b>${minute(m.seconds)}</b><i style="height:${Math.max(3,Number(m.seconds)/max*100)}px"></i><span>${esc(new Date(m.month+'T12:00:00Z').toLocaleDateString('pt-BR',{month:'short'}))}</span></div>`).join(''):'<p>O comparativo aparece conforme você ouve.</p>'}</div></section>`:''}<p class="lx-insight-footnote">Tempo efetivamente reproduzido. Pausas e saltos não contam. Histórico detalhado disponível a partir desta atualização.</p>`;
 }
 async function openRecap(month=monthNow()){if(!db()||!uid())return LX.toast('Entre na sua conta para ver os resultados.');const token=++requestId,user=uid(),modal=skeleton('Sua música. Seus números.');await flush();const {data,error}=await db().rpc('lx_music_recap',{p_user:user,p_month:month+'-01'});if(token!==requestId||!modal.querySelector('.lx-insights'))return;
  modal.querySelector('.lx-insights').innerHTML=`<header class="lx-insights-head"><div><span class="eyebrow">LX MUSIC · RETROSPECTIVA</span><h2>Sua música.<br>Seus números.</h2></div><label>Escolha o mês<input id="lxRecapMonth" type="month" value="${esc(month)}" max="${esc(monthNow())}"></label></header>${error?'<p role="alert">Não foi possível carregar. <button onclick="LX.insights.openRecap()">Tentar novamente</button></p>':recapHTML(data||{})}<label class="lx-recap-privacy"><input id="lxActivityPrivacy" type="checkbox" ${activityVisible?'checked':''}> Mostrar minhas estatísticas e o que estou ouvindo na comunidade</label>`;
  $('lxRecapMonth').onchange=e=>{if(/^\d{4}-\d{2}$/.test(e.target.value))openRecap(e.target.value)};
  $('lxActivityPrivacy').onchange=async e=>{const input=e.target,next=input.checked;input.disabled=true;const {error}=await db().from('lx_profiles').update({activity_visible:next}).eq('user_id',uid());input.disabled=false;if(error){input.checked=activityVisible;LX.toast('Não foi possível salvar a privacidade.');return;}activityVisible=next;await LX.social?.syncMusicPresence?.();LX.toast('Privacidade atualizada.');};
 }
 async function mountProfile(id,root){if(!root)return;root.innerHTML='<p role="status">Carregando resultados…</p>';const {data,error}=await db().rpc('lx_music_recap',{p_user:id,p_month:monthNow()+'-01'});if(!root.isConnected)return;root.innerHTML=`<h3>${esc(monthLabel(monthNow()))} na LX Music</h3>${error?'<p>Resultados indisponíveis no momento.</p>':recapHTML(data||{},true)}`;}
 let period='Mensal',kind='Geral';
 async function openRanking(p=period,k=kind){if(!db()||!uid())return LX.toast('Entre na sua conta para ver o ranking.');period=p;kind=k;const token=++requestId,modal=skeleton('Ranking LX');const {data,error}=await db().rpc('lx_ranking_insights',{p_period:p,p_kind:k});if(token!==requestId||!modal.querySelector('.lx-insights'))return;const rows=data?.rows||[],me=rows.find(r=>r.user_id===uid());
  const person=r=>`<button class="lx-rank-person" data-rank-profile="${esc(r.user_id)}"><span class="lx-rank-avatar">${esc(r.name?.slice(0,1)||'L')}</span><b>${esc(r.name)}${r.verified?' ✓':''}</b></button>`;
  modal.querySelector('.lx-insights').innerHTML=`<header class="lx-insights-head"><div><span class="eyebrow">COMUNIDADE LX</span><h2>Seu lugar<br>entre os melhores.</h2><p>Ranking LX · ${esc(p)}</p></div><div class="lx-your-position"><small>Sua posição</small><b>${me?'#'+me.position:'—'}</b><span>${me?number(me.score)+' pontos':'Participe ouvindo e assistindo'}</span></div></header><div class="lx-rank-tabs" aria-label="Período">${['Semanal','Mensal','Geral'].map(v=>`<button data-period="${v}" aria-pressed="${v===p}">${v}</button>`).join('')}</div><div class="lx-rank-tabs" aria-label="Categoria">${['Geral','Assistiu','Ouviu','Leu'].map(v=>`<button data-kind="${v}" aria-pressed="${v===k}">${v}</button>`).join('')}</div>${error?'<p role="alert">Não foi possível carregar o ranking. Tente novamente.</p>':rows.length?`<div class="lx-podium">${rows.slice(0,3).map((r,i)=>`<article class="lx-podium-${i+1}"><span class="lx-podium-medal">${i===0?'✦':'#'+r.position}</span>${person(r)}<strong>${number(r.score)} <small>pts</small></strong><span>${i===0?'Líder do período':i===1?'Segundo lugar':'Terceiro lugar'}</span></article>`).join('')}</div><ol class="lx-rank-list">${rows.map(r=>`<li class="${r.user_id===uid()?'is-me':''}"><span>#${r.position}</span>${person(r)}<strong>${number(r.score)} <small>pts</small></strong></li>`).join('')}</ol>`:'<div class="lx-insight-empty"><h3>O próximo destaque pode ser você.</h3><p>Ainda não há pontos confirmados neste período. Ouça uma faixa para começar.</p></div>'}<p class="lx-insight-footnote">Apenas participações confirmadas. As semanas começam na segunda-feira; o mês acompanha o horário de Brasília. Sua preferência de aparecer no ranking continua valendo.</p>`;
  modal.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>openRanking(b.dataset.period,kind));modal.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>openRanking(period,b.dataset.kind));modal.querySelectorAll('[data-rank-profile]').forEach(b=>b.onclick=()=>{LX.ui.close();b.dataset.rankProfile===uid()?LX.openProfile():LX.social.openProfile(b.dataset.rankProfile)});
 }
 LX.insights={openRecap,openRanking,mountProfile,activity,sampleDelta,flush,recapHTML};
 setInterval(tick,1000);document.addEventListener('lx:music-closed',()=>{tick();flush();LX.social?.syncMusicPresence?.()});
 document.addEventListener('visibilitychange',()=>{tick();flush()});window.addEventListener('pagehide',()=>{tick();flush()});
})();
