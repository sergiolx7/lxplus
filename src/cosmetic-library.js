import {premiumChoices,premiumPresets,normalizePremiumProfile} from './premium-style.js';
import {normalizeProfileStyle} from './profile-premium.js';
const names={decoration:'Molduras',effect:'Efeitos de perfil',nameStyle:'Estilos de nome',chatTheme:'Temas de conversa',entrance:'Sons de chamada'};
const labels={orbit:'Órbita',halo:'Halo',crown:'Coroa',wings:'Asas',electric:'Elétrico',bloom:'Sakura',aurora:'Aurora',stars:'Constelação',meteors:'Meteoros',embers:'Brasas',prism:'Prisma',solid:'Clássico',gradient:'Gradiente',glow:'Neon',shimmer:'Brilho',midnight:'Meia-noite',rose:'Sakura',ocean:'Oceano',sparkle:'Estrelas',chime:'Cristal',pulse:'Pulso'};
const led=(color,secondColor,mode='gradient')=>({enabled:true,color,secondColor,intensity:65,mode});
const collections=[
 ['cosmos','Cosmos violeta','#bb9bff','#71e6ff','#161327','nova','orbit','stars','gradient','midnight','sparkle'],
 ['polar','Aurora polar','#77f5d4','#c9a1ff','#0d222b','aurora','halo','aurora','shimmer','aurora','chime'],
 ['ruby','Rubi elétrico','#ff718e','#ffa86b','#28151f','ember','electric','embers','glow','rose','pulse'],
 ['depth','Mar profundo','#5fcfff','#8c9aff','#0d1b30','ocean','wings','prism','gradient','ocean','chime'],
 ['petals','Jardim lunar','#ffaedc','#d9c1ff','#28182a','rose','bloom','stars','shimmer','rose','sparkle'],
 ['royal','Eclipse real','#edce8b','#ac9cff','#211d29','eclipse','crown','meteors','gradient','midnight','pulse'],
 ['comet','Cometa azul','#8ab8ff','#e2f4ff','#111e32','nova','orbit','meteors','glow','ocean','sparkle'],
 ['lagoon','Lagoa de cristal','#72ead6','#79b6ff','#0b2528','ocean','halo','prism','shimmer','ocean','chime'],
 ['sunset','Pôr do sol','#ffb179','#f193cb','#2b1c27','ember','wings','embers','gradient','rose','pulse'],
 ['orchid','Orquídea neon','#d49bff','#ff9ec9','#211729','rose','bloom','aurora','glow','rose','sparkle'],
 ['copper','Cobre celeste','#e9aa78','#a7bfdf','#241d21','eclipse','crown','stars','solid','midnight','chime'],
 ['arctic','Gelo estelar','#b1edff','#b4baff','#141f2e','ocean','electric','prism','shimmer','ocean','pulse'],
 ['garden','Bosque de luz','#a7e59d','#e3dda0','#17251f','aurora','bloom','aurora','gradient','aurora','chime'],
 ['berry','Noite de amora','#e999d7','#b3a0f1','#241629','rose','halo','stars','glow','rose','sparkle'],
 ['solar','Chama solar','#ffc276','#ff8589','#2b1e1b','ember','electric','embers','gradient','midnight','pulse'],
 ['lunar','Prata lunar','#d4e0f2','#b6b9e3','#1b202c','eclipse','orbit','meteors','solid','midnight','chime'],
 ['turquoise','Turquesa cósmica','#7be1e1','#aca0ff','#122328','aurora','wings','prism','shimmer','aurora','sparkle'],
 ['violet-night','Violeta noturna','#9f8fff','#c5a2e8','#191526','nova','crown','aurora','glow','midnight','pulse'],
 ['cyber','Circuito cyber','#91efff','#b2a0ff','#0e1b2b','ocean','electric','prism','glow','ocean','pulse'],
 ['orbital','Estação orbital','#bec4ff','#86e4e8','#141a2d','nova','orbit','stars','gradient','midnight','chime'],
 ['hologram','Holograma','#94f2df','#e7b2ff','#0d2428','aurora','halo','prism','shimmer','aurora','sparkle'],
 ['darkmatter','Matéria escura','#a69bff','#fa9fdf','#161428','eclipse','wings','meteors','gradient','midnight','pulse'],
 ['neoncity','Cidade neon','#ff88c9','#86dcff','#271a2e','rose','electric','aurora','glow','rose','pulse'],
 ['silverdust','Poeira estelar','#dbe6ff','#aabfff','#182332','eclipse','orbit','stars','shimmer','ocean','sparkle'],
 ['ion','Pulso de íons','#a9f6c0','#98b2ff','#11251e','aurora','halo','meteors','glow','aurora','pulse'],
 ['quasar','Quasar','#ffc6a0','#b5acff','#271d2b','ember','crown','prism','gradient','midnight','chime'],
 ['saturn','Anéis de Saturno','#e8cf9c','#adc0ef','#24212b','eclipse','orbit','aurora','shimmer','midnight','chime'],
 ['void','Além do vazio','#94aaff','#d3b8ff','#10192b','nova','wings','stars','gradient','ocean','sparkle'],
 ['superlight','Velocidade da luz','#c3f7ff','#d5b5ff','#10242a','ocean','electric','meteors','shimmer','ocean','pulse'],
 ['stargarden','Jardim das estrelas','#bce7b6','#efbfff','#19251f','aurora','bloom','stars','gradient','aurora','sparkle']
].map(([id,name,color,second,background,preset,decoration,effect,nameStyle,chatTheme,entrance])=>({
 id:'collection:'+id,name,category:'Coleções completas',color,second,isNew:true,
 description:'Perfil, moldura, nome, conversa e luzes em uma combinação.',
 patch:{preset,background,accent:color,decoration,effect,nameStyle,chatTheme,entrance},stylePatch:led(color,second)
}));
const palettes=[
 ['lavender','Lavanda e gelo','#bca7ff','#a6eaff'],['mint','Menta e violeta','#94ebc5','#b2a2ff'],
 ['rose','Rosa e pérola','#ffb1d2','#eae3ff'],['amber','Âmbar e cobre','#ffd08a','#df9b7f'],
 ['electric','Azul elétrico','#7aabff','#b09dff'],['jade','Jade e névoa','#7fd8bd','#b6d8d8'],
 ['peach','Pêssego e flor','#ffbf99','#efa3cc'],['lilac','Lilás e cristal','#c5b0ef','#bad8ff'],
 ['sky','Céu e espuma','#9fd4ff','#a6e6dd'],['berry','Framboesa e ametista','#f4a0ca','#bc9fef'],
 ['sun','Ouro e violeta','#ead299','#b9a7f1'],['coral','Coral e aurora','#ffa3a3','#aeceee'],
 ['ice','Prata e gelo','#d5dfef','#a3dce9'],['orchid','Orquídea e néon','#d8a1ee','#8edfd6'],
 ['marine','Maré e lavanda','#83b5db','#bba6de'],['citrus','Lima e aurora','#cedd9a','#9edac4'],
 ['plasma','Plasma','#ff99d9','#9fafff'],['photon','Fóton','#aff4ff','#e6e4ff'],
 ['matrix','Matrix LX','#9ae8ba','#9bbdff'],['dusk','Crepúsculo astral','#b3a2ee','#f0b598'],
 ['titanium','Titânio','#c2d4e7','#a9a8d9'],['ultraviolet','Ultravioleta','#bf9eff','#f2a2d0'],
 ['glacier','Geleira neon','#9cdbeb','#b9f5d7'],['cosmic','Rosa cósmica','#e8acdb','#bec9f5']
].map(([id,name,color,second])=>({id:'palette:'+id,name,category:'Paletas de LEDs',color,second,isNew:true,description:'Duas cores para as bordas do seu perfil.',patch:{accent:color},stylePatch:led(color,second)}));
export const cosmeticCategories=['Todos','Coleções completas','Universos',...Object.values(names),'Paletas de LEDs','Avatares'];
export const cosmeticItems=[
 ...premiumPresets.map(p=>({id:'preset:'+p.id,name:p.name,category:'Universos',color:p.color,second:p.secondColor,patch:{...p,accent:p.color,preset:p.id},stylePatch:led(p.color,p.secondColor)})),
 ...Object.entries(names).flatMap(([key,category])=>premiumChoices[key].filter(v=>v!=='none').map((v,i)=>({id:key+':'+v,name:labels[v]||v,category,color:premiumPresets[i%premiumPresets.length].color,second:premiumPresets[i%premiumPresets.length].secondColor,patch:{[key]:v},...(key==='entrance'?{sound:v}:{})}))),
 ...collections,...palettes,
 ...[['circle','Avatar circular'],['rounded','Avatar com cantos suaves']].map(([shape,name])=>({id:'avatar:'+shape,name,category:'Avatares',color:'#b69cff',second:'#6ce5f5',isNew:true,patch:{avatarShape:shape}}))
];
export const cosmeticInventory={total:cosmeticItems.length,collections:collections.length,palettes:palettes.length};
export function cosmeticPreview(value,item){return normalizePremiumProfile({...value,...item?.patch})}
export function cosmeticStylePreview(value,item){return normalizeProfileStyle({...value,...item?.stylePatch})}
const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function filterCosmetics({category='Todos',term='',favorites=null,onlyNew=false,sort='collection'}={}){
 const q=fold(term.trim()),rows=cosmeticItems.filter(item=>(category==='Todos'||item.category===category)&&(!q||fold(item.name+' '+item.category+' '+(item.description||'')).includes(q))&&(!favorites||favorites.includes(item.id))&&(!onlyNew||item.isNew));
 if(sort==='name')rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));else if(sort==='category')rows.sort((a,b)=>a.category.localeCompare(b.category,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));else rows.sort((a,b)=>Number(!!b.isNew)-Number(!!a.isNew));
 return rows;
}
export const savedLookLimit=8;
export function normalizeSavedLooks(value){
 const seen=new Set(),looks=[];
 for(const item of Array.isArray(value)?value:[]){
  if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)||seen.has(item.id)||typeof item.name!=='string')continue;
  const name=item.name.replace(/[\u0000-\u001f]/g,'').trim().slice(0,32);if(!name)continue;
  seen.add(item.id);looks.push({id:item.id,name,skin:normalizePremiumProfile(item.skin),style:normalizeProfileStyle(item.style)});
  if(looks.length===savedLookLimit)break;
 }
 return looks;
}
