import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {musicGroups,featuredMusicShelves,groupedMusicRows} from '../src/music-organize.js';
import {listeningSummary,listeningMarkup} from '../src/music-friend-activity.js';
import {musicSidebar,musicHomeShelves,musicGroupHeading,friendListeningShelf} from '../src/music-experience.js';

const tracks=[
 {id:1,type:'Música',artist:'Artista A',album:'Ao Vivo',title:'Faixa A',cover:'https://example.com/a.jpg'},
 {id:2,type:'Música',artist:'Artista B',album:'Ao Vivo',title:'Faixa B',cover:'https://example.com/b.jpg'},
 {id:3,type:'Música',artist:'artista a',album:'AO VIVO',title:'Faixa C',cover:''},
 {id:4,type:'Música',artist:'Artista A',album:'Estúdio',title:'Faixa D'},
 {id:5,type:'Filme',artist:'Artista A',album:'Ao Vivo',title:'Filme'}
];
test('albums are organized by normalized album and artist, never by album title alone',()=>{
 const albums=musicGroups(tracks,'album');
 assert.equal(albums.length,3);
 assert.equal(albums.filter(x=>x.name.toLowerCase()==='ao vivo').length,2);
 const first=albums.find(x=>x.artist==='Artista A'&&x.name==='Ao Vivo');
 assert.equal(first.count,2);
 assert.deepEqual(groupedMusicRows(tracks,{kind:'album',name:'Ao Vivo',artist:'Artista A'}).map(x=>x.id),[1,3]);
 assert.deepEqual(groupedMusicRows(tracks,{kind:'artist',name:'Artista B'}).map(x=>x.id),[2]);
});
test('music home shelves are based on actual favorites, albums and listening history only',()=>{
 const shelf=featuredMusicShelves(tracks,{'1':'2026-11-01T19:00:00Z','4':'2026-11-01T20:00:00Z'},['2']);
 assert.deepEqual(shelf.recent.map(x=>x.id),[4,1]);
 assert.deepEqual(shelf.favorites.map(x=>x.id),[2]);
 assert.equal(shelf.albums.length,3);
 assert.match(musicHomeShelves(tracks,{},[]),/Álbuns na sua biblioteca/);
 assert.match(musicSidebar({active:'Álbuns',playlists:[{id:'playlist-1',name:'Meu som'}]}),/data-playlist="playlist-1"/);
 assert.match(musicGroupHeading({kind:'album',name:'Ao Vivo',artist:'Artista A'},[tracks[0]]),/Reproduzir álbum/);
});
test('now playing never shows non-music, expired presence, or hidden entries',()=>{
 const now=Date.parse('2026-11-01T21:00:00Z');
 const active={status:'online',updated_at:'2026-11-01T20:59:40Z',activity_type:'music',activity_title:'Boa música',activity_subtitle:'Artista',activity_cover:'https://example.org/cover.jpg'};
 assert.equal(listeningSummary(active,now).title,'Boa música');
 assert.equal(listeningSummary({...active,updated_at:'2026-11-01T20:57:40Z'},now),null);
 assert.equal(listeningSummary({...active,activity_type:'movie'},now),null);
 assert.equal(listeningSummary(null,now),null);
 assert.match(listeningMarkup(active,now),/OUVINDO AGORA/);
 assert.match(friendListeningShelf([{person:{name:'Pessoa'},activity:active}]),/Pessoa/);
 assert.equal(friendListeningShelf([]),'');
});
test('user-generated now playing text is escaped, unsafe cover URLs are never rendered',()=>{
 const active={status:'online',updated_at:'2026-11-01T20:59:40Z',activity_type:'music',activity_title:'<script>alert(1)</script>',activity_subtitle:'<img onerror=alert(1)>',activity_cover:'javascript:alert(1)'};
 const html=listeningMarkup(active,Date.parse('2026-11-01T21:00:00Z'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));
 assert.ok(!html.includes('src="javascript:'));
});
test('active music is emitted only by real media playback, not by opening a third party iframe',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const dock=readFileSync(new URL('../src/music-dock.js',import.meta.url),'utf8');
 assert.match(app,/onPlayback\(item,playing\)\{broadcastMusicActivity/);
 assert.match(app,/privacy==='nobody'/);
 assert.match(dock,/audio\.addEventListener\('playing'/);
 assert.match(dock,/audio\.addEventListener\('pause'/);
 assert.match(dock,/close\(\)\{if\(this\.current\)this\.onPlayback\(this\.current,false\)/);
 assert.match(dock,/this\.onTrack\(item,\{embedded:true\}\)/);
 assert.doesNotMatch(dock.slice(dock.indexOf("if(source.kind==='iframe')"),dock.indexOf('const audio=document.createElement')),/this\.onPlayback\(item,true\)/);
});
test('friends and music pages render viewer-authorized, fresh now-playing UI',()=>{
 const social=readFileSync(new URL('../src/modules/social.js',import.meta.url),'utf8');
 const music=readFileSync(new URL('../src/modules/music.js',import.meta.url),'utf8');
 const profile=readFileSync(new URL('../src/member-profile.js',import.meta.url),'utf8');
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(social,/db\.rpc\('lx_presence_for_viewer'\)/);
 assert.match(music,/db\.rpc\('lx_presence_for_viewer'\)/);
 assert.match(music,/relation==='accepted'/);
 assert.match(social,/data-social-now-playing/);
 assert.match(profile,/lx-member-listening/);
 assert.match(music,/groupSelection=\{kind:b\.dataset\.groupKey/);
 assert.match(index,/lx-music-refresh\.css/);
});
