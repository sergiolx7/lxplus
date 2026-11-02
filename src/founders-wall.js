import {esc,avatar} from './ui.js';

// The mural is a tribute to people, not a list of website privileges.
// Only real, publicly visible directory profiles are used for portraits.
// No email addresses, account IDs or administrative roles are exposed.
const tributes=[
 {key:'natalha',handle:'nikelx',name:'Natalha',symbol:'N',role:'Agradecimento especial',stamp:'UMA HISTÓRIA QUE FICA',verse:'Pessoas especiais ajudam a dar sentido a cada começo.',message:'Natalha, obrigado por fazer parte dos primeiros passos da LX Plus. Sua presença e sua contribuição merecem um lugar especial na nossa história.',variant:'rose',sequence:'01'},
 {key:'sergio',handle:'sergiolx',name:'Sérgio LX',symbol:'LX',role:'Fundador e idealizador',stamp:'O CORAÇÃO DA LX PLUS',verse:'Tudo começa com alguém que acredita em uma ideia.',message:'Da primeira ideia à construção de um universo de entretenimento e conexões. Uma visão que continua crescendo, criando e aproximando pessoas.',variant:'gold',sequence:'02'},
 {key:'xaruto',handle:'xaruto',name:'@xaruto',symbol:'X',role:'Parceiro da jornada',stamp:'JUNTOS DESDE O COMEÇO',verse:'Nenhuma grande história é construída sozinha.',message:'Obrigado, @xaruto, por fazer parte dessa caminhada e das conexões que ajudaram a construir a identidade da nossa comunidade.',variant:'blue',sequence:'03'}
];
export function renderFoundersWall({people=[],compact=false}={}){
 const all=Array.isArray(people)?people:[];
 const profileFor=handle=>all.find(p=>String(p?.username||'').toLowerCase()===handle&&p?.social_visible!==false&&p?.approved!==false);
 const cards=tributes.map(({key,handle,name,symbol,role,stamp,verse,message,variant,sequence})=>{
  const profile=profileFor(handle);
  const portrait=profile?avatar({...profile,name},'lx-wall-avatar'):'<span class="lx-wall-avatar lx-wall-monogram" aria-hidden="true">'+esc(symbol)+'</span>';
  return '<article class="lx-wall-card lx-wall-'+variant+'" data-founder-card="'+key+'">'+
   '<span class="lx-wall-card-light" aria-hidden="true"></span>'+
   '<div class="lx-wall-card-top"><span class="lx-wall-index">'+sequence+' / LX</span><span class="lx-wall-card-symbol" aria-hidden="true">✦</span></div>'+
   '<div class="lx-wall-portrait"><span class="lx-wall-portrait-glow" aria-hidden="true"></span>'+portrait+'</div>'+
   '<div class="lx-wall-card-identity"><span class="lx-wall-stamp">'+esc(stamp)+'</span><h3>'+esc(name)+'</h3>'+
   '<span class="lx-wall-role">'+esc(role)+'</span>'+(key!=='natalha'?'<small>'+esc('@'+handle)+'</small>':'')+'</div>'+
   '<div class="lx-wall-letter"><span class="lx-wall-quote" aria-hidden="true">“</span><p class="lx-wall-verse">'+esc(verse)+'</p><p class="lx-wall-message">'+esc(message)+'</p><span class="lx-wall-signature">Com gratidão, LX Plus <span aria-hidden="true">✧</span></span></div>'+
   (key==='sergio'?'<span class="lx-wall-founder-ribbon">✦ FUNDADOR OFICIAL</span>':'')+
   '</article>';
 }).join('');
 return '<section class="lx-founders-wall'+(compact?' lx-wall-compact':'')+'" aria-labelledby="lx-founders-heading">'+
  '<div class="lx-wall-backdrop" aria-hidden="true"><i></i><i></i><i></i></div>'+
  '<div class="lx-wall-heading"><div class="lx-wall-heading-eyebrow"><span class="lx-wall-heading-star">✦</span> LX PLUS · NOSSA HISTÓRIA <span class="lx-wall-heading-star">✦</span></div>'+
  '<h2 id="lx-founders-heading">Mural dos <em>Fundadores</em></h2>'+
  '<p>Por trás de cada conquista, existem pessoas que fazem a história valer a pena.</p>'+
  '<span class="lx-wall-heading-rule" aria-hidden="true"><i></i>✦<i></i></span></div>'+
  '<div class="lx-wall-grid">'+cards+'</div>'+
  '<footer class="lx-wall-footer"><span>✦ LX GROUP</span><p>Não é apenas sobre onde chegamos. É sobre lembrar quem fez parte do caminho.</p><span>FEITO COM GRATIDÃO</span></footer>'+
  (compact?'<button class="lx-wall-more" type="button" data-page="Mural dos Fundadores">Conheça nosso mural completo <span aria-hidden="true">↗</span></button>':'')+
  '</section>';
}
