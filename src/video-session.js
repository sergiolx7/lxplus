import {attachPlayer} from './universal-player.js';
import {esc} from './ui.js';
import {applyPlayback,normalizePlayback,resumePosition,nextEpisodeCountdown} from './playback-preferences.js';

export function videoControls(tracks=[]){return '<div class="lx-player-transport"><strong>LX <span>PLAYER</span></strong><button type="button" class="btn small" id="playerBack" aria-label="Voltar 10 segundos">↶ 10 s</button><button type="button" class="btn primary small" id="playerToggle" aria-label="Reproduzir">Reproduzir</button><button type="button" class="btn small" id="playerForward" aria-label="Avançar 10 segundos">10 s ↷</button></div><div class="player-toolbar"><label>Velocidade <select id="playerSpeed">'+[.75,1,1.25,1.5,2].map(x=>'<option value="'+x+'">'+String(x).replace('.',',')+'×</option>').join('')+'</select></label><label>Qualidade <select id="playerQuality" disabled><option value="-1">Automática / fonte original</option></select></label><label class="setting-toggle"><input id="playerAutoplay" type="checkbox"> Próximo automático</label>'+(tracks.length?'<label>Legendas <select id="playerSubtitles"><option value="off">Desligadas</option>'+tracks.map((t,i)=>'<option value="'+i+'">'+esc(t.label||t.lang||'Português')+'</option>').join('')+'</select></label><label>Tamanho <select id="subtitleSize"><option value="100">Normal</option><option value="125">Grande</option><option value="150">Muito grande</option></select></label><label>Sincronia (s) <input id="subtitleOffset" type="number" min="-30" max="30" step="0.5" aria-label="Ajuste de sincronia da legenda em segundos"></label>':'')+'<button class="btn small" id="pipMedia" hidden>Janela flutuante</button><button class="btn small" id="castMedia" hidden>Transmitir para TV</button><button class="btn small" id="fullscreenMedia">Tela cheia</button></div><div id="nextEpisode" class="next-episode" hidden></div>'}

export function bindVideoSession(media,source,{host,progress,index=null,hasNext=false,autoplay=true,onNext=()=>{},preferences={},savePreferences=()=>{},saveProgress=()=>{},onError=()=>{},onActiveSeconds=()=>{}}){
 const abort=new AbortController(),signal=abort.signal;
 let closed=false,cleanup=null,countdown=null,waitTimer=null,saveTimer=null,saveStamp=0,prefs=applyPlayback(media,preferences),activeSeconds=0,lastActiveTick=0,lastReported=0,lastMediaTime=null;
 const find=id=>host.querySelector('#'+id);
 if(source.warning&&find('playerStatus'))find('playerStatus').textContent=source.warning;
 const fail=message=>{if(!closed){clearTimeout(waitTimer);onError(message)}};
 const listen=(target,name,fn)=>target?.addEventListener(name,fn,{signal});
 const transport=()=>{const button=find('playerToggle');if(button){button.textContent=media.paused?'Reproduzir':'Pausar';button.setAttribute('aria-label',button.textContent)}};
 listen(find('playerToggle'),'click',()=>{if(media.paused){Promise.resolve(media.play()).catch(()=>fail('Toque em reproduzir novamente para iniciar o vídeo.'))}else media.pause()});
 listen(find('playerBack'),'click',()=>{if(Number.isFinite(media.duration))media.currentTime=Math.max(0,media.currentTime-10)});
 listen(find('playerForward'),'click',()=>{if(Number.isFinite(media.duration))media.currentTime=Math.min(media.duration,media.currentTime+10)});
 listen(media,'play',transport);listen(media,'pause',transport);transport();
 const checkpoint=()=>{if(!closed&&Number.isFinite(media.currentTime)&&Number.isFinite(media.duration)&&media.duration>0){Promise.resolve(saveProgress({position:media.currentTime,duration:media.duration,episodeIndex:index,updatedAt:new Date().toISOString()})).catch(()=>fail('Seu progresso está salvo nesta sessão; não foi possível sincronizar agora.'))}};
 const persist=()=>{prefs=normalizePlayback({...prefs,volume:media.volume,muted:media.muted,speed:media.playbackRate});clearTimeout(saveTimer);saveTimer=setTimeout(()=>savePreferences(prefs),350)};
 const subtitleTimes=new WeakMap();
 function subtitles(){
  const tracks=Array.from(media.textTracks||[]);const value=find('playerSubtitles')?.value??'off';
  tracks.forEach((track,i)=>{track.mode=String(i)===value?'showing':'disabled';for(const cue of Array.from(track.cues||[])){if(!subtitleTimes.has(cue))subtitleTimes.set(cue,[cue.startTime,cue.endTime]);const [start,end]=subtitleTimes.get(cue);cue.startTime=Math.max(0,start+prefs.subtitleOffset);cue.endTime=Math.max(cue.startTime+.01,end+prefs.subtitleOffset)}});
  media.style.setProperty('--subtitle-size',prefs.subtitleSize+'%');
 }
 find('playerSpeed').value=String(prefs.speed);find('playerAutoplay').checked=prefs.autoplayNext;
 if(find('subtitleSize')){find('subtitleSize').value=String(prefs.subtitleSize);find('subtitleOffset').value=String(prefs.subtitleOffset);const preferred=Array.from(media.textTracks||[]).findIndex(t=>t.language===prefs.subtitleLanguage);find('playerSubtitles').value=preferred>=0?String(preferred):'off'}
 listen(media,'loadedmetadata',()=>{media.currentTime=resumePosition(progress,media.duration,index);subtitles()});
 listen(media,'timeupdate',()=>{
  const now=performance.now(),position=Number(media.currentTime)||0;
  if(lastActiveTick&&lastMediaTime!==null&&!media.paused&&!media.seeking&&!media.ended&&!document.hidden&&media.readyState>=2){
   const elapsed=Math.max(0,(now-lastActiveTick)/1000),advanced=position-lastMediaTime;
   // Neither seeking nor fast forwarding counts as watched time. Require
   // approximately real-time progression and cap individual timer gaps.
   if(elapsed>0&&elapsed<=3&&advanced>0&&advanced<=Math.max(3,elapsed*1.8))activeSeconds+=Math.min(elapsed,advanced);
  }
  lastActiveTick=now;lastMediaTime=position;
  if(activeSeconds-lastReported>=12&&Number.isFinite(media.duration)){lastReported=activeSeconds;Promise.resolve(onActiveSeconds({total:Math.floor(activeSeconds),duration:Math.floor(media.duration)})).catch(()=>{})}
  if(now-saveStamp>=10000){saveStamp=now;checkpoint()}
 });
 for(const event of ['pause','seeked'])listen(media,event,checkpoint);
 listen(document,'visibilitychange',()=>{lastActiveTick=0;lastMediaTime=null;if(document.hidden)checkpoint()});
 for(const event of ['volumechange','ratechange'])listen(media,event,persist);
 const armTimeout=()=>{clearTimeout(waitTimer);waitTimer=setTimeout(()=>{media.pause();fail('A fonte demorou para responder. Verifique a conexão ou abra o arquivo na origem.')},20000)};
 listen(media,'waiting',armTimeout);listen(media,'playing',()=>{clearTimeout(waitTimer);if(!closed)find('playerStatus').textContent=source.warning||''});
 listen(media,'loadedmetadata',()=>clearTimeout(waitTimer));
 listen(media,'ended',()=>{
  checkpoint();countdown?.cancel();if(!hasNext||!prefs.autoplayNext)return;
  const box=find('nextEpisode');box.hidden=false;
  countdown=nextEpisodeCountdown({onTick:seconds=>{box.innerHTML='<span>Próximo episódio em '+seconds+' s.</span><button type="button" class="btn primary small" data-next-now>Reproduzir agora</button><button type="button" class="btn small" data-next-cancel>Cancelar</button>'},onNext:()=>{if(!closed)onNext()}});
 });
 listen(find('nextEpisode'),'click',e=>{if(e.target.closest('[data-next-now]'))countdown?.now();if(e.target.closest('[data-next-cancel]')){countdown?.cancel();find('nextEpisode').hidden=true}});
 listen(find('playerSpeed'),'change',e=>{media.playbackRate=Number(e.target.value)});
 listen(find('playerAutoplay'),'change',e=>{prefs.autoplayNext=e.target.checked;if(!prefs.autoplayNext){countdown?.cancel();find('nextEpisode').hidden=true}persist()});
 for(const id of ['subtitleSize','subtitleOffset','playerSubtitles'])listen(find(id),'change',()=>{prefs.subtitleSize=Number(find('subtitleSize').value);prefs.subtitleOffset=Number(find('subtitleOffset').value);const t=media.textTracks[Number(find('playerSubtitles').value)];prefs.subtitleLanguage=find('playerSubtitles').value==='off'?'off':t?.language||'off';subtitles();persist()});
 media.querySelectorAll('track').forEach(track=>listen(track,'load',subtitles));
 listen(find('fullscreenMedia'),'click',()=>{try{Promise.resolve(media.requestFullscreen?.()??media.webkitEnterFullscreen?.()).catch(()=>fail('Não foi possível abrir a tela cheia.'))}catch{fail('Tela cheia indisponível neste dispositivo.')}});
 const pip=find('pipMedia');if(document.pictureInPictureEnabled&&media.requestPictureInPicture){pip.hidden=false;listen(pip,'click',()=>{const action=document.pictureInPictureElement?document.exitPictureInPicture():media.requestPictureInPicture();action.catch(()=>fail('Janela flutuante indisponível para esta fonte.'))})}
 const cast=find('castMedia');if(media.remote?.prompt){cast.hidden=false;listen(cast,'click',()=>media.remote.prompt().catch(()=>fail('Nenhuma TV compatível encontrada.')))}else if(media.webkitShowPlaybackTargetPicker){cast.hidden=false;listen(cast,'click',()=>media.webkitShowPlaybackTargetPicker())}
 armTimeout();
 attachPlayer(media,source,{signal,autoplay,onError:fail,onQualities:(qualities,setQuality)=>{if(closed)return;const select=find('playerQuality');select.innerHTML='<option value="-1">Automática</option>'+qualities.map(q=>'<option value="'+q.id+'">'+esc(q.label)+'</option>').join('');select.disabled=!qualities.length;listen(select,'change',()=>setQuality(Number(select.value)))}}).then(stop=>{cleanup=stop;if(closed)stop()}).catch(e=>{if(e.name!=='AbortError')fail(e.message)});
 return ()=>{if(closed)return;checkpoint();clearTimeout(saveTimer);savePreferences(prefs);closed=true;countdown?.cancel();clearTimeout(waitTimer);abort.abort();cleanup?.();media.pause();media.removeAttribute('src');media.load()};
}
