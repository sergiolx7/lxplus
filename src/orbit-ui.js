import {esc,icon} from './ui.js';

// Shared presentation only. Counts always come from the records supplied by the caller.
export const orbitDestinations=[
 {page:'Filmes',label:'Cinema',copy:'Histórias para sair da órbita.',symbol:'film',code:'01',tone:'violet'},
 {page:'Músicas',label:'LX Music',copy:'A frequência do seu momento.',symbol:'music',code:'02',tone:'cyan'},
 {page:'Comunidade',label:'LX Social',copy:'Seu círculo, mais conectado.',symbol:'social',code:'03',tone:'rose'},
 {page:'Livros',label:'LX Books',copy:'Um universo em cada página.',symbol:'book',code:'04',tone:'amber'}
];
export function orbitPortals(){
 return '<section class="orbit-portals" aria-label="Explore os universos da LX Plus">'+orbitDestinations.map(d=>'<button type="button" class="orbit-portal" data-page="'+d.page+'" data-tone="'+d.tone+'"><span class="orbit-portal-top"><i>'+icon(d.symbol)+'</i><small>UNIVERSO / '+d.code+'</small><span aria-hidden="true">'+icon('arrow')+'</span></span><strong>'+d.label+'</strong><span>'+d.copy+'</span></button>').join('')+'</section>';
}
export function orbitDiscovery(){
 return '<section class="orbit-discovery"><div><span class="premium-overline">SINTONIZE SEU MOMENTO</span><h2>Qual é a sua vibe hoje?</h2></div><div class="orbit-moods" aria-label="Explorar por gênero">'+[['Ação','ϟ'],['Comédia','☺'],['Romance','♡'],['Suspense','◐'],['Ficção científica','✧'],['Fantasia','✦']].map(([name,symbol])=>'<button type="button" data-home-search="'+esc(name)+'"><span aria-hidden="true">'+symbol+'</span>'+esc(name)+'</button>').join('')+'</div></section>';
}
export function orbitWelcome(){
 return '<section class="orbit-welcome"><div class="orbit-welcome-copy"><span class="orbit-pill"><i></i> SEU UNIVERSO LX PLUS</span><h1>Seu próximo<br>universo começa <em>aqui.</em></h1><p>Histórias que te levam além. Música que te acompanha. Pessoas que combinam com você.</p><div class="actions"><button class="btn primary" data-page="Filmes">'+icon('play')+' Explorar cinema</button><button class="btn" data-page="Músicas">'+icon('music')+' Encontrar meu som</button></div><div class="orbit-welcome-bottom"><span>ENTRETENIMENTO</span><i></i><span>CONEXÕES</span><i></i><span>DO SEU JEITO</span></div></div><img class="orbit-welcome-planet" src="./assets/lx-orbit.svg" alt="" width="700" height="620" fetchpriority="high"><span class="orbit-coordinate" aria-hidden="true">LX / INFINITAS POSSIBILIDADES</span></section>';
}
export function orbitPremiumCard(premium=false){
 return '<button class="orbit-sidebar-premium" type="button" data-page="Premium"><span class="orbit-sidebar-spark" aria-hidden="true">✦</span><strong>'+ (premium?'Seu universo Premium':'Eleve seu universo')+'</strong><small>'+(premium?'Explore suas personalizações':'Conheça o LX Premium')+'</small><span class="orbit-sidebar-premium-arrow" aria-hidden="true">'+icon('arrow')+'</span></button>';
}
