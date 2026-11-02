import {esc,avatar,verifiedBadge} from './ui.js';
import {profileCover,profileLedAttributes,profileName,premiumBadge,founderBadge} from './profile-premium.js';
import {renderExpressions} from './premium-expressions.js';
import {compactSocialCount,publicDemoLabel} from './social-demo-ui.js';

// Public, viewer-authorized profile fields only. Never invent interests, badges,
// activity, or expose the raw internal user UUID as a public "profile code".
export function memberProfileCard(profile,{viewerId='',presence='',nowPlaying='',assets=[],demoFollowers=0,publicDemoFollowers=0,labMode=false,followStats=null}={}){
 const p=profile&&typeof profile==='object'?profile:{},id=esc(p.user_id||''),self=p.user_id===viewerId;
 const username=String(p.username||'').trim(),label=username?'@'+username:'Identificador não definido';
 const bio=String(p.bio||'').trim(),status=String(p.status_text||'').trim();
 const owned=Array.isArray(assets)?assets.filter(asset=>asset?.user_id===p.user_id):[];
 const verified=p.verified===true,stats=followStats||{followers:0,following_count:0,is_following:false};
 let actions='';
 if(!self){
  actions='<button class="btn '+(stats.is_following?'':'primary')+'" data-social-follow="'+id+'">'+(stats.is_following?'✓ Seguindo':'+ Seguir')+'</button>';
  if(p.relation==='accepted')actions+='<button class="btn primary" data-chat-peer="'+id+'">Enviar mensagem</button>'+(p.calls_enabled===true?'<button class="btn" data-voice-peer="'+id+'">Chamada de voz</button>':'');
  else if(p.relation==='pending'&&p.direction==='incoming')actions+='<button class="btn primary" data-friend-accept="'+id+'">Aceitar amizade</button><button class="btn" data-friend-reject="'+id+'">Recusar</button>';
  else if(p.relation==='pending')actions+='<span class="lx-member-pending">Solicitação de amizade enviada</span>';
  else actions+='<button class="btn primary" data-friend-request="'+id+'">Adicionar amigo</button>';
 }
 return '<article class="profile-summary lx-member-profile-card" '+profileLedAttributes(p)+'>'
   +profileCover(p)
  +'<div class="lx-member-profile-body">'
  +'<div class="lx-member-avatar-row">'+avatar(p,'profile-avatar lx-member-avatar')+'</div>'
  +'<div class="lx-member-identity"><h2>'+profileName(p)+verifiedBadge(p)+'</h2>'
  +'<p class="lx-member-handle">'+esc(label)+'</p></div>'
  +'<div class="lx-member-tags">'+founderBadge(p)+premiumBadge(p)+(verified?'<span class="lx-member-verified">✓ Perfil verificado</span>':'')+(p.relation==='accepted'?'<span class="lx-member-friend-label">Amigo LX</span>':'')+'</div>'
  +'<div class="lx-follow-stats lx-member-follow-stats"><span><strong>'+compactSocialCount(Number(stats.followers||0)+Number(demoFollowers||0))+'</strong> seguidores</span><span><strong>'+compactSocialCount(stats.following_count||0)+'</strong> seguindo</span></div>'+(!labMode?publicDemoLabel(publicDemoFollowers,'profile'):'')+'<div class="lx-member-presence">'+presence+'</div>'+(nowPlaying?'<section class="lx-member-listening">'+nowPlaying+'</section>':'')
  +(status?'<div class="lx-member-about"><span>STATUS</span><p>'+esc(status)+'</p></div>':'')
  +'<div class="lx-member-about"><span>SOBRE MIM</span><p>'+ (bio?renderExpressions(bio,owned):'A pessoa ainda não escreveu uma biografia.') +'</p></div>'
  +(username?'<div class="lx-member-public-id"><span>IDENTIFICADOR PÚBLICO</span><div><code>'+esc('@'+username)+'</code><button class="link" data-copy-member="'+esc('@'+username)+'">Copiar @</button></div></div>':'')+(p.user_id?'<div class="lx-member-public-id lx-member-profile-id"><span>ID DO PERFIL</span><div><code>'+id+'</code><button type="button" class="link" data-copy-profile-id="'+id+'">Copiar ID</button></div></div>':'')
  +(actions?'<div class="lx-member-actions">'+actions+'</div>':'')
  +(self?'<p class="lx-member-self-note">Este é seu perfil público na comunidade.</p>':'<div class="lx-member-report"><button class="link" data-report-profile="'+id+'">Denunciar perfil</button></div>')
  +'</div></article>';
}
