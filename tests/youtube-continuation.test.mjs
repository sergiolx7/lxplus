import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseArtist,youtubeCandidates,youtubeIdFromURL} from '../supabase/functions/lx-youtube-next/logic.mjs';
import {identifiedArtist,musicLane,sameMusicLane,isYouTubeTrack} from '../src/music-genre.js';
import {MusicQueue} from '../src/music-queue.js';

const titleOnly={id:'youtube:one',title:'Matuê - Quer Voar (Video Oficial)',artist:'',sourceUrl:'https://www.youtube.com/watch?v=abcdefghijk'};
const foreign={id:'foreign',title:'US Trap',genre:'Trap',country:'USA',artist:'Travis Scott',sourceUrl:'https://www.youtube.com/watch?v=lmnopqrstuv'};
const matue={...titleOnly,genre:''};
test('detects Matuê and Teto from titles without extracting voices or audio',()=>{
 assert.equal(identifiedArtist(matue),'matue');
 assert.equal(musicLane(matue).genre,'trap');
 assert.equal(musicLane(matue).region,'br');
 const teto={id:'two',artist:'',title:'Teto - Fim de Semana (Official Music Video)',sourceUrl:'https://youtu.be/ZyxwvutsrQ0'};
 assert.equal(identifiedArtist(teto),'teto');
 assert.equal(sameMusicLane(matue,teto),true);
 assert.equal(sameMusicLane(matue,foreign),false);
});
test('YouTube next artist rotates within Brazilian trap and sertanejo',()=>{
 assert.equal(chooseArtist('trap','Matuê'),'Teto');
 assert.equal(chooseArtist('trap','Teto'),'WIU');
 assert.equal(chooseArtist('trap','Matuê',1),'WIU');
 assert.equal(chooseArtist('sertanejo','Ana Castela'),'Gusttavo Lima');
 assert.equal(chooseArtist('unknown','Matuê'),'');
});
test('official YouTube results are playable embeds, never direct audio links',()=>{
 const rows=[
  {id:{videoId:'ABCDEFGHIJK'},snippet:{title:'Teto - Fim de Semana (Vídeo Oficial)',channelTitle:'Teto',thumbnails:{default:{url:'https://i.ytimg.com/vi/ABCDEFGHIJK/default.jpg'}}}},
  {id:{videoId:'LMNOPQRSTUV'},snippet:{title:'Reagindo ao Teto - Reaction',channelTitle:'Reactions'}},
  {id:{videoId:'12345678901'},snippet:{title:'Travis Scott - International Trap',channelTitle:'Channel'}},
  {id:{videoId:'ABCDEFGHIJK'},snippet:{title:'Teto - duplicado',channelTitle:'Teto'}}
 ];
 const candidates=youtubeCandidates(rows,'trap','Teto');
 assert.equal(candidates.length,1);
 assert.equal(candidates[0].artist,'Teto');
 assert.equal(candidates[0].provider,'YouTube');
 assert.equal(candidates[0].sourceUrl,'https://www.youtube.com/watch?v=ABCDEFGHIJK');
 assert.equal(candidates[0].officialEmbedded,true);
 assert.equal(candidates[0].genre,'Trap brasileiro');
 assert.equal(youtubeIdFromURL(candidates[0].sourceUrl),'ABCDEFGHIJK');
 assert.equal(isYouTubeTrack(candidates[0]),true);
});
test('genre-safe automatic queue never jumps from YouTube to other providers',()=>{
 const q=new MusicQueue();
 const teto={id:'teto',artist:'Teto',genre:'Trap',country:'Brasil',sourceUrl:'https://www.youtube.com/watch?v=ABCDEFGHIJK'};
 const spotify={id:'spotify',artist:'Veigh',genre:'Trap',country:'Brasil',sourceUrl:'https://open.spotify.com/track/1234567890123456789012'};
 q.set([matue,spotify,teto,foreign],matue);
 const next=q.next({match:(item,seed)=>sameMusicLane(seed,item)&&isYouTubeTrack(item)});
 assert.equal(next?.id,'teto');
 assert.equal(q.next({match:(item,seed)=>sameMusicLane(seed,item)&&isYouTubeTrack(item)}),null);
});