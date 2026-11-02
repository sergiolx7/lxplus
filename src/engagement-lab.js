import {esc} from './ui.js';

const safeCount=n=>Math.max(0,Number(n)||0);
const row=(kind,item)=>{
 const count=safeCount(kind==='post'?item.simulated_likes:item.simulated_followers);
 const real=safeCount(item.real_likes);
 const label=kind==='post'?(item.preview||'Publicação sem texto'):(item.name||'Membro LX');
 const summary=kind==='post'?real+' curtidas reais · '+count+' de teste · PRÉVIA: '+(real+count):count+' seguidores simulados · não existem seguidores reais cadastrados por este laboratório';
 return '<div class="source-row lx-lab-row"><div><strong>'+esc(label)+'</strong><small>ID: '+esc(item.id)+'</small><small>'+esc(summary)+'</small></div><div class="actions"><button type="button" class="btn small" data-lab-copy="'+esc(item.id)+'">Copiar ID</button>'+(count?'<button type="button" class="btn small" data-lab-reset="'+kind+':'+esc(item.id)+'">Zerar teste</button>':'')+'</div></div>';
};

export function renderEngagementLab(snapshot={},message=''){
 const posts=Array.isArray(snapshot.posts)?snapshot.posts:[];
 const profiles=Array.isArray(snapshot.profiles)?snapshot.profiles:[];
 return '<div class="lx-promo-admin lx-engagement-lab"><section class="panel"><span class="premium-overline">LX SOCIAL · LABORATÓRIO</span><h2>Teste de curtidas e seguidores</h2><p>Simule números para avaliar o visual da comunidade. Somente a equipe administrativa vê a prévia. Curtidas reais, amizades, pontos e ranking não são alterados.</p><form class="form" id="lxEngagementLabForm"><label class="field">Tipo de teste<select name="kind" required><option value="post">Curtidas em publicação</option><option value="profile">Seguidores em perfil</option></select></label><label class="field">ID da publicação ou do perfil<input name="target" required pattern="[0-9a-fA-F-]{36}" maxlength="36" placeholder="Cole o ID completo"></label><label class="field">Quantidade simulada (0 remove)<input type="number" name="count" min="0" max="100000" step="1" value="100" required></label><p class="muted">O valor substitui a simulação anterior; use zero para remover. No feed, o ADM enxerga a prévia de curtidas com indicação de teste. Para divulgar publicações de verdade, use a aba Divulgação.</p><button type="submit" class="btn primary">Salvar simulação</button></form>'+(message?'<p role="status">'+esc(message)+'</p>':'')+'</section><section class="panel"><div class="heading"><h3>IDs de publicações recentes</h3><button class="btn small" data-lab-refresh>Atualizar</button></div>'+(posts.length?posts.map(item=>row('post',item)).join(''):'<p class="muted">Nenhuma publicação encontrada.</p>')+'</section><section class="panel"><h3>IDs de perfis recentes</h3><p class="muted">A LX Plus usa amizades como conexão social. “Seguidores” aqui é somente uma simulação visual, sem criar perfis ou relações fictícias.</p>'+(profiles.length?profiles.map(item=>row('profile',item)).join(''):'<p class="muted">Nenhum perfil encontrado.</p>')+'</section></div>';
}
