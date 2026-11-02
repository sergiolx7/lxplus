import {fold} from './catalog-search.js';

// Genre matching for continuous listening. Never guess from an unrelated video title.
const brazilianTrapArtists = new Set([
 'matue','teto','wiu','veigh','kayblack','orochi','borges','brandao85','yunk vino',
 'mc cabelinho','recayd mob','sidoka','raffa moreira','derek','filipe ret','major rd',
 'caio luccas','chefin','bin','tchelo','nagalli','vulgo fk'
]);
const brazilianSertanejoArtists = new Set([
 'marilia mendonca','henrique e juliano','jorge e mateus','gusttavo lima',
 'maiara e maraisa','ze neto e cristiano','ana castela','lauana prado',
 'lobo e lele','simone mendes','luan santana','murilo huff',
 'bruno e marrone','chitaozinho e xororo','leonardo','zeze di camargo e luciano'
]);
const genreRules=[
 ['trap',/\b(trap|trapstar|trap nacional|trap brasileiro)\b/],
 ['sertanejo',/\b(sertanejo|sertaneja|modao|agronejo)\b/],
 ['drill',/\bdrill\b/],
 ['funk',/\b(funk|mandela|funk brasileiro)\b/],
 ['forro',/\b(forro|piseiro|pisadinha|arrocha)\b/],
 ['pagode',/\bpagode\b/],
 ['samba',/\bsamba\b/],
 ['gospel',/\b(gospel|louvor|adoracao)\b/],
 ['rock',/\b(rock|metal|punk|grunge)\b/],
 ['kpop',/\b(k pop|kpop)\b/],
 ['hiphop',/\b(hip hop|hiphop|rap)\b/],
 ['eletronica',/\b(edm|eletronica|electronic|house|techno|trance|dubstep)\b/],
 ['reggaeton',/\breggaeton\b/],
 ['rnb',/\b(rnb|r b|rhythm and blues)\b/],
 ['pop',/\bpop\b/],
 ['mpb',/\bmpb\b/],
 ['lofi',/\b(lofi|lo fi)\b/],
 ['phonk',/\bphonk\b/],
 ['country',/\bcountry\b/],
 ['jazz',/\bjazz\b/],
 ['classica',/\b(classica|classical|orquestral)\b/]
];
const plain=value=>fold(value).replace(/[^a-z0-9]+/g,' ').trim();
const artistName=item=>plain(item?.artist||'').split(/\s+(?:feat|ft|part|com)\s+/)[0].trim();
const hasArtist=(field,artist)=>artist===field||field.startsWith(artist+' ')||field.includes(' '+artist+' ');
function knownArtistLane(item){
 const a=artistName(item);
 if(!a)return null;
 for(const name of brazilianTrapArtists)if(hasArtist(a,name))return {genre:'trap',region:'br'};
 for(const name of brazilianSertanejoArtists)if(hasArtist(a,name))return {genre:'sertanejo',region:'br'};
 return null;
}
function regionFor(item,description,artistLane){
 const value=plain([item?.country,item?.region,item?.language,item?.idioma].filter(Boolean).join(' '));
 if(/\b(brasil|brazil|brasileir|brazilian|br|pt br|portugues)\b/.test(value))return 'br';
 if(/\b(usa|estados unidos|united states|us|english|ingles|canada|uk|united kingdom)\b/.test(value))return 'intl';
 if(/\b(brasileir|nacional|brasil|brazilian)\b/.test(description))return 'br';
 if(/\b(internacional|international|american)\b/.test(description))return 'intl';
 return artistLane?.region||'unknown';
}
export function musicLane(item){
 const descriptor=plain([item?.genre,item?.subgenre,item?.style].filter(Boolean).join(' '));
 const artist=knownArtistLane(item);
 let genre=genreRules.find(([,test])=>test.test(descriptor))?.[0]||'';
 // Prefer explicit genre, but fall back to well-established artists when catalog metadata is absent.
 if(!genre)genre=artist?.genre||'';
 if(!genre&&descriptor)genre=descriptor; // Unknown genre labels compare exactly, never randomly.
 return {genre,region:regionFor(item,descriptor,artist),artist:artistName(item)};
}
export function sameMusicLane(current,candidate){
 if(!current||!candidate||String(current.id)===String(candidate.id))return false;
 const first=musicLane(current),other=musicLane(candidate);
 // Unknown seed: only another track by exactly the same artist is safe to queue automatically.
 if(!first.genre)return !!first.artist&&first.artist===other.artist;
 if(first.genre!==other.genre)return false;
 // Do not switch Brazilian trap or sertanejo into international tracks, even when the genre matches.
 if(first.region==='br'&&(first.genre==='trap'||first.genre==='sertanejo')){
  return other.region==='br'||(first.artist&&first.artist===other.artist&&other.region!=='intl');
 }
 return first.region==='unknown'||other.region==='unknown'||first.region===other.region;
}
export function genreSearchTerms(item){
 const lane=musicLane(item),terms=[lane.genre,item?.genre,item?.artist].filter(Boolean).map(String);
 const seen=new Set();return terms.filter(term=>{const key=plain(term);if(seen.has(key))return false;seen.add(key);return true}).slice(0,3);
}
export function musicLaneLabel(item){
 const lane=musicLane(item);
 return ({trap:'trap',sertanejo:'sertanejo',funk:'funk',forro:'forró',hiphop:'rap',eletronica:'música eletrônica',pagode:'pagode'}[lane.genre])||lane.genre||'mesmo artista';
}
