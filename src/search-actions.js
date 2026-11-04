export const searchActions=[
 {title:'Premium e assinaturas',description:'Planos, preços, cupons e histórico de pagamentos',page:'Premium',words:'upgrade cupom mensal anual pagamento assinatura premium'},
 {title:'Biblioteca de personalizações',description:'Molduras, efeitos, temas, GIFs e favoritos',page:'Premium',words:'moldura avatar efeito personalizar nitro decoração premium'},
 {title:'Aparência e acessibilidade',description:'Tamanho de texto, movimento, LEDs e densidade',page:'Perfil',words:'aparência fonte tamanho animação acessibilidade led tema'},
 {title:'Perfil e privacidade',description:'Sua conta, foto, capa e controle de atividade',page:'Perfil',term:'profile',words:'perfil avatar conta foto capa email privacidade'},
 {title:'Chamadas e diagnóstico',description:'Histórico de chamadas e acesso aos amigos',page:'Comunidade',term:'calls',words:'chamada ligar voz microfone áudio tela transmissão diagnóstico'},
 {title:'Playlists e música',description:'Sua biblioteca e coleções musicais',page:'Músicas',words:'música playlist álbum artista letra ouvir'},
 {title:'Central de ajuda',description:'Relatar problemas e enviar sugestões à equipe',page:'Suporte',words:'ajuda suporte bug problema erro sugestão feedback'},
 {title:'Novidades da LX Plus',description:'Mudanças e recursos desta versão',page:'Novidades',words:'novidade atualização versão manutenção histórico'}
];
const fold=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export const matchingActions=query=>{const terms=fold(query).split(/\s+/).filter(Boolean);return terms.length?searchActions.filter(a=>terms.every(t=>fold(a.title+' '+a.words).includes(t))):searchActions};
